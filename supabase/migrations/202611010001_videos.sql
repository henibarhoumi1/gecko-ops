-- Videos: each cut the team shares with the client. The client watches a watermarked preview
-- (Cloudflare Stream, signed links only), approves it or asks for changes, and downloads the clean
-- final file (Cloudflare R2) once the balance is paid. The files live at Cloudflare; this table only
-- holds their ids. The app's worker asks video_media_access before it hands out any link.

create table public.videos (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  concept_id uuid references public.concepts(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 160),
  position integer not null default 0 check (position between 0 and 100000),
  status text not null default 'draft' check (status in ('draft', 'review', 'changes', 'approved')),
  version integer not null default 1 check (version between 1 and 10000),
  -- Cloudflare Stream id of the watermarked preview.
  preview_uid text check (preview_uid ~ '^[0-9a-f]{32}$'),
  -- R2 object of the clean final, always under <workspace>/<client>/.
  final_key text check (length(final_key) <= 400),
  final_name text check (length(final_name) <= 200),
  final_size bigint check (final_size >= 0),
  approved_version integer,
  approved_at timestamptz,
  approved_by text check (length(approved_by) <= 120),
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check ((status = 'approved') = (approved_at is not null)),
  check ((status = 'approved') = (approved_version is not null)),
  -- Nothing reaches the client without a preview to watch.
  check (status = 'draft' or preview_uid is not null),
  check (final_key is null or starts_with(final_key, workspace_id::text || '/' || client_id || '/')),
  check ((final_key is null) = (final_name is null))
);

create index videos_client on public.videos(workspace_id, client_id, position);

create table public.video_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  video_id uuid not null references public.videos(id) on delete cascade,
  kind text not null default 'comment' check (kind in ('comment', 'approve', 'changes')),
  from_client boolean not null default false,
  author_user uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  body text not null default '' check (length(body) <= 4000),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check (kind = 'comment' or from_client),
  check (kind <> 'comment' or length(trim(body)) > 0)
);

create index video_notes_video on public.video_notes(video_id, created_at);

-- Rules for team writes, as for concepts: requests from the app run as the authenticated role,
-- the client functions run as the owner and set every field themselves.
create function public.videos_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    new.updated_at := now();
    return new;
  end if;
  if new.concept_id is not null and not exists (
    select 1 from public.concepts c
    where c.id = new.concept_id and c.workspace_id = new.workspace_id and c.client_id = new.client_id
  ) then
    raise exception 'invalid_video';
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'review') then raise exception 'client_only'; end if;
    new.version := 1;
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
    new.created_by := (select auth.uid());
    new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.client_id := old.client_id;
  new.created_by := old.created_by;
  new.author_name := old.author_name;
  new.created_at := old.created_at;
  if new.status is distinct from old.status and new.status in ('approved', 'changes') then
    raise exception 'client_only';
  end if;
  new.approved_version := old.approved_version;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  -- A new cut is a new version, and it goes back to the client: an old approval no longer covers it.
  if new.preview_uid is distinct from old.preview_uid and old.preview_uid is not null then
    new.version := old.version + 1;
    if old.status in ('approved', 'changes') and new.status = old.status then new.status := 'review'; end if;
  else
    new.version := old.version;
  end if;
  if new.status <> 'approved' then
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger videos_guard before insert or update on public.videos
  for each row execute function public.videos_guard();

create function public.video_notes_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v public.videos%rowtype;
begin
  if current_user <> 'authenticated' then return new; end if;
  select * into v from public.videos where id = new.video_id;
  if not found or v.workspace_id <> new.workspace_id or v.client_id <> new.client_id then
    raise exception 'invalid_note';
  end if;
  if new.kind <> 'comment' then raise exception 'client_only'; end if;
  new.from_client := false;
  new.author_user := (select auth.uid());
  new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
  new.version := v.version;
  new.created_at := now();
  return new;
end
$$;

create trigger video_notes_guard before insert on public.video_notes
  for each row execute function public.video_notes_guard();

alter table public.videos enable row level security;
alter table public.video_notes enable row level security;
revoke all on public.videos, public.video_notes from public, anon, authenticated;
grant select, insert, update, delete on public.videos to authenticated;
grant select, insert, delete on public.video_notes to authenticated;

create policy videos_read on public.videos for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy videos_insert on public.videos for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy videos_update on public.videos for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy videos_delete on public.videos for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));

create policy video_notes_read on public.video_notes for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy video_notes_insert on public.video_notes for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy video_notes_delete on public.video_notes for delete to authenticated
  using (author_user = (select auth.uid()) and not from_client and public.member_role(workspace_id) is not null);

-- ---------- what the client can do ----------

-- Whether the client has paid the balance, which unlocks the final files.
create function public.balance_paid(p_workspace_id uuid, p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select p.balance_status = 'paid' from public.client_portals p
    where p.workspace_id = p_workspace_id and p.client_id = p_client_id
  ), false)
$$;

create function public.video_to_json(v public.videos)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', v.id, 'title', v.title, 'position', v.position, 'status', v.status, 'version', v.version,
    'hasPreview', v.preview_uid is not null, 'hasFinal', v.final_key is not null,
    'finalName', v.final_name, 'finalSize', v.final_size,
    'approvedVersion', v.approved_version, 'approvedAt', v.approved_at, 'approvedBy', v.approved_by,
    'authorName', v.author_name, 'createdAt', v.created_at, 'updatedAt', v.updated_at,
    'conceptTitle', (select c.title from public.concepts c where c.id = v.concept_id and c.status <> 'draft'),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'fromClient', n.from_client, 'authorName', n.author_name,
        'body', n.body, 'version', n.version, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.video_notes n where n.video_id = v.id
    ), '[]'::jsonb)
  )
$$;

-- Every video the team shared (never drafts), and whether the finals can be downloaded yet.
create function public.get_my_videos(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'balancePaid', public.balance_paid(p_workspace_id, p_client_id),
    'videos', coalesce((
      select jsonb_agg(public.video_to_json(v) order by v.position, v.created_at)
      from public.videos v
      where v.workspace_id = p_workspace_id and v.client_id = p_client_id and v.status <> 'draft'
    ), '[]'::jsonb)
  );
end
$$;

-- Approve, ask for changes, or comment on the version the client watched.
create function public.client_video_note(
  p_workspace_id uuid, p_client_id text, p_video_id uuid, p_kind text, p_body text, p_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  v public.videos%rowtype;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('comment', 'approve', 'changes') or p_body is null or length(p_body) > 4000
     or (p_kind in ('comment', 'changes') and length(trim(p_body)) = 0) then
    raise exception 'invalid_note';
  end if;
  select * into v from public.videos
  where id = p_video_id and workspace_id = p_workspace_id and client_id = p_client_id and status <> 'draft'
  for update;
  if not found then raise exception 'invalid_note'; end if;
  if p_kind <> 'comment' and (v.status not in ('review', 'changes') or v.version is distinct from p_version) then
    raise exception 'video_changed';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.notes.' || acc.id::text, 0));
  if (select count(*) from public.video_notes n
      where n.workspace_id = p_workspace_id and n.client_id = p_client_id and n.from_client
        and n.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'feedback_rate_limited';
  end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  insert into public.video_notes(workspace_id, client_id, video_id, kind, from_client, author_user, author_name, body, version)
  values (p_workspace_id, p_client_id, v.id, p_kind, true, (select auth.uid()), who, trim(p_body), v.version);
  if p_kind = 'approve' then
    update public.videos set status = 'approved', approved_version = v.version, approved_at = now(), approved_by = who
    where id = v.id returning * into v;
  elsif p_kind = 'changes' then
    update public.videos set status = 'changes', approved_version = null, approved_at = null, approved_by = null
    where id = v.id returning * into v;
  end if;
  return public.video_to_json(v);
end
$$;

-- What the app's worker may do with one video's files for the signed-in person. Team members on the
-- client can watch, upload and download. A client can watch what was shared with them, and download
-- the final once the balance is paid. Anyone else gets 'forbidden'.
create function public.video_media_access(p_video_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v public.videos%rowtype;
  role_name text;
  is_client boolean;
  download boolean;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into v from public.videos where id = p_video_id;
  if not found then raise exception 'forbidden'; end if;
  role_name := public.member_role(v.workspace_id);
  if role_name is not null and public.has_client_access(v.workspace_id, v.client_id) then
    is_client := false;
    download := v.final_key is not null;
  elsif v.status <> 'draft' and (public.my_client_account(v.workspace_id, v.client_id)).id is not null then
    is_client := true;
    download := v.final_key is not null and public.balance_paid(v.workspace_id, v.client_id);
  else
    raise exception 'forbidden';
  end if;
  return jsonb_build_object(
    'workspaceId', v.workspace_id,
    'clientId', v.client_id,
    'videoId', v.id,
    'who', case when is_client then 'client' else 'team' end,
    'previewUid', v.preview_uid,
    'canUpload', not is_client and role_name in ('founder', 'sales', 'editor'),
    'canDownload', download,
    'finalKey', case when download then v.final_key end,
    'finalName', case when download then v.final_name end
  );
end
$$;

revoke all on function public.videos_guard(), public.video_notes_guard(),
  public.balance_paid(uuid, text), public.video_to_json(public.videos),
  public.get_my_videos(uuid, text),
  public.client_video_note(uuid, text, uuid, text, text, integer),
  public.video_media_access(uuid)
  from public, anon, authenticated;
grant execute on function public.videos_guard(), public.video_notes_guard() to authenticated;
grant execute on function public.get_my_videos(uuid, text),
  public.client_video_note(uuid, text, uuid, text, text, integer),
  public.video_media_access(uuid)
  to authenticated;
