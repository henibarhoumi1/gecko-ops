-- Portal v2, phase D: review and delivery, on the free tier.
-- Each deliverable is a "cut". The team uploads preview versions (720p, watermarked in the edit, up to 50 MB) to the
-- private "previews" bucket; the client watches them, leaves notes pinned to a moment, and the owner or approver
-- approves a version or asks for changes. Every version stays on record. Once a cut is approved the team adds the
-- link to the final file (Google Drive for now); the client sees it on their delivery shelf only once the balance
-- is paid (client_portals.balance_status = 'paid').

create table public.cuts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  title text not null check (length(trim(title)) between 1 and 160),
  position integer not null default 0 check (position between 0 and 100000),
  status text not null default 'draft' check (status in ('draft', 'review', 'changes', 'approved')),
  -- The latest version uploaded; 0 until the first one.
  version integer not null default 0 check (version between 0 and 1000),
  approved_version integer,
  approved_at timestamptz,
  approved_by text check (length(approved_by) <= 120),
  final_link text check (final_link ~ '^https://' and length(final_link) <= 600),
  final_note text not null default '' check (length(final_note) <= 500),
  delivered_at timestamptz,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check ((status = 'approved') = (approved_version is not null)),
  check (status = 'draft' or version > 0),
  check (final_link is null or status = 'approved'),
  check ((final_link is null) = (delivered_at is null))
);

create index cuts_client on public.cuts(workspace_id, client_id, position);

-- One row per uploaded preview. Never edited: the record of what the client saw.
create table public.cut_versions (
  id uuid primary key default gen_random_uuid(),
  cut_id uuid not null references public.cuts(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  version integer not null check (version between 1 and 1000),
  path text not null check (length(path) <= 400),
  size bigint not null default 0 check (size between 0 and 60000000),
  seconds numeric(7, 2) check (seconds between 0 and 36000),
  what_changed text not null default '' check (length(what_changed) <= 500),
  uploaded_by text not null default '' check (length(uploaded_by) <= 120),
  created_at timestamptz not null default now(),
  unique (cut_id, version),
  check (starts_with(path, workspace_id::text || '/' || client_id || '/' || cut_id::text || '/'))
);

create table public.cut_notes (
  id uuid primary key default gen_random_uuid(),
  cut_id uuid not null references public.cuts(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  version integer not null,
  -- The moment in the video the note is about; null for a note on the whole cut.
  at_seconds numeric(7, 2) check (at_seconds between 0 and 36000),
  kind text not null default 'comment' check (kind in ('comment', 'approve', 'changes')),
  from_client boolean not null default false,
  author_name text not null default '' check (length(author_name) <= 120),
  body text not null default '' check (length(body) <= 2000),
  done boolean not null default false,
  created_at timestamptz not null default now(),
  check (kind = 'comment' or from_client),
  check (kind = 'approve' or length(trim(body)) > 0)
);

create index cut_notes_cut on public.cut_notes(cut_id, created_at);

alter table public.cuts enable row level security;
alter table public.cut_versions enable row level security;
alter table public.cut_notes enable row level security;
revoke all on public.cuts, public.cut_versions, public.cut_notes from public, anon, authenticated;

-- ---------- helpers ----------

-- Founders, sales and editors with access to the client make and upload cuts. Returns the member's name.
create function public.cut_team_check(p_workspace_id uuid, p_client_id text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales', 'editor')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return coalesce(public.my_member_name(p_workspace_id), 'Gecko');
end
$$;

-- p_team: the team's view (drafts, every note). p_paid: whether the client's balance is in, which unlocks finals.
create function public.cut_to_json(c public.cuts, p_team boolean, p_paid boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'position', c.position, 'status', c.status, 'version', c.version,
    'approvedVersion', c.approved_version, 'approvedAt', c.approved_at, 'approvedBy', c.approved_by,
    'authorName', c.author_name, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
    'delivered', c.final_link is not null, 'deliveredAt', c.delivered_at,
    'finalLink', case when p_team or p_paid then c.final_link end,
    'finalNote', case when p_team or p_paid then c.final_note else '' end,
    'versions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'version', v.version, 'path', v.path, 'size', v.size, 'seconds', v.seconds,
        'whatChanged', v.what_changed, 'uploadedBy', v.uploaded_by, 'createdAt', v.created_at
      ) order by v.version)
      from public.cut_versions v where v.cut_id = c.id
    ), '[]'::jsonb),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'version', n.version, 'at', n.at_seconds, 'kind', n.kind, 'fromClient', n.from_client,
        'authorName', n.author_name, 'body', n.body, 'done', n.done, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.cut_notes n where n.cut_id = c.id
    ), '[]'::jsonb)
  )
$$;

create function public.cuts_page(p_workspace_id uuid, p_client_id text, p_team boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with paid as (
    select coalesce((select p.balance_status = 'paid' from public.client_portals p
                     where p.workspace_id = p_workspace_id and p.client_id = p_client_id), false) as yes
  )
  select jsonb_build_object(
    'balancePaid', (select yes from paid),
    'cuts', coalesce((
      select jsonb_agg(public.cut_to_json(c, p_team, (select yes from paid)) order by c.position, c.created_at)
      from public.cuts c
      where c.workspace_id = p_workspace_id and c.client_id = p_client_id and (p_team or c.status <> 'draft')
    ), '[]'::jsonb)
  )
$$;

-- ---------- the team ----------

create function public.get_cuts(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.cut_team_check(p_workspace_id, p_client_id);
  return public.cuts_page(p_workspace_id, p_client_id, true);
end
$$;

-- New cut (p_id null) or a new title.
create function public.save_cut(p_workspace_id uuid, p_client_id text, p_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.cut_team_check(p_workspace_id, p_client_id);
  new_id uuid;
begin
  begin
    if p_id is null then
      if (select count(*) from public.cuts c where c.workspace_id = p_workspace_id and c.client_id = p_client_id) >= 300 then
        raise exception 'too_many_cuts';
      end if;
      insert into public.cuts(workspace_id, client_id, title, position, author_name)
      values (p_workspace_id, p_client_id, trim(coalesce(p_title, '')),
        coalesce((select max(c.position) + 1 from public.cuts c
                  where c.workspace_id = p_workspace_id and c.client_id = p_client_id), 0), who)
      returning id into new_id;
      return new_id;
    end if;
    update public.cuts set title = trim(coalesce(p_title, '')), updated_at = now()
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
    if not found then raise exception 'cut_not_found'; end if;
  exception when check_violation then
    raise exception 'invalid_cut';
  end;
  return p_id;
end
$$;

-- Record a preview the team just uploaded. A new version of a cut the client has seen goes back to them:
-- the old approval doesn't cover it.
create function public.add_cut_version(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_path text, p_size bigint, p_seconds numeric, p_what_changed text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.cut_team_check(p_workspace_id, p_client_id);
  c public.cuts%rowtype;
begin
  select * into c from public.cuts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'cut_not_found'; end if;
  if c.final_link is not null then raise exception 'cut_delivered'; end if;
  begin
    insert into public.cut_versions(cut_id, workspace_id, client_id, version, path, size, seconds, what_changed, uploaded_by)
    values (c.id, p_workspace_id, p_client_id, c.version + 1, coalesce(p_path, ''), coalesce(p_size, 0), p_seconds,
      trim(coalesce(p_what_changed, '')), who);
  exception when check_violation then
    raise exception 'invalid_cut';
  end;
  update public.cuts set version = c.version + 1,
    status = case when c.status = 'draft' then 'draft' else 'review' end,
    approved_version = null, approved_at = null, approved_by = null, updated_at = now()
  where id = c.id returning * into c;
  return public.cut_to_json(c, true, false);
end
$$;

-- Send a draft to the client, or take it back before they've said anything.
create function public.set_cut_status(p_workspace_id uuid, p_client_id text, p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cuts%rowtype;
begin
  perform public.cut_team_check(p_workspace_id, p_client_id);
  select * into c from public.cuts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'cut_not_found'; end if;
  if p_status = 'review' and c.status = 'draft' then
    if c.version = 0 then raise exception 'cut_needs_preview'; end if;
  elsif p_status = 'draft' and c.status <> 'draft' then
    if exists (select 1 from public.cut_notes n where n.cut_id = c.id and n.from_client) then
      raise exception 'cut_seen';
    end if;
    if c.status <> 'review' then raise exception 'invalid_cut'; end if;
  else
    raise exception 'invalid_cut';
  end if;
  update public.cuts set status = p_status, updated_at = now() where id = c.id;
end
$$;

-- The final file, once the cut is approved. An empty link takes it off the shelf.
create function public.set_cut_final(p_workspace_id uuid, p_client_id text, p_id uuid, p_link text, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.cuts%rowtype;
  link text := nullif(trim(coalesce(p_link, '')), '');
begin
  perform public.cut_team_check(p_workspace_id, p_client_id);
  select * into c from public.cuts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'cut_not_found'; end if;
  if c.status <> 'approved' then raise exception 'cut_not_approved'; end if;
  begin
    update public.cuts set final_link = link, final_note = trim(coalesce(p_note, '')),
      delivered_at = case when link is null then null else coalesce(c.delivered_at, now()) end, updated_at = now()
    where id = c.id;
  exception when check_violation then
    raise exception 'invalid_link';
  end;
end
$$;

create function public.team_cut_note(p_workspace_id uuid, p_client_id text, p_id uuid, p_at numeric, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.cut_team_check(p_workspace_id, p_client_id);
  c public.cuts%rowtype;
begin
  select * into c from public.cuts where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
  if not found then raise exception 'cut_not_found'; end if;
  begin
    insert into public.cut_notes(cut_id, workspace_id, client_id, version, at_seconds, body, author_name)
    values (c.id, p_workspace_id, p_client_id, greatest(c.version, 1), p_at, trim(coalesce(p_body, '')), who);
  exception when check_violation then
    raise exception 'invalid_note';
  end;
end
$$;

-- The editor ticks off a note once it's handled in the next version.
create function public.set_cut_note_done(p_workspace_id uuid, p_client_id text, p_note uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.cut_team_check(p_workspace_id, p_client_id);
  update public.cut_notes set done = coalesce(p_done, false)
  where id = p_note and workspace_id = p_workspace_id and client_id = p_client_id;
  if not found then raise exception 'invalid_note'; end if;
end
$$;

-- Founders and sales remove a cut. Its preview files are removed by the app first.
create function public.delete_cut(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  delete from public.cuts where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id;
  if not found then raise exception 'cut_not_found'; end if;
end
$$;

-- ---------- the client ----------

create function public.get_my_cuts(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if (public.my_client_account(p_workspace_id, p_client_id)).id is null then raise exception 'forbidden'; end if;
  return public.cuts_page(p_workspace_id, p_client_id, false);
end
$$;

-- A note on a moment (or the whole cut), an approval of the version on screen, or a request for changes.
-- Everyone on the client's side comments; the owner and approvers decide.
create function public.client_cut_note(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_kind text, p_version integer, p_at numeric, p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.cuts%rowtype;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('comment', 'approve', 'changes') then raise exception 'invalid_note'; end if;
  if p_kind <> 'comment' and acc.role not in ('owner', 'approver') then raise exception 'approver_only'; end if;
  select * into c from public.cuts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and status <> 'draft' for update;
  if not found then raise exception 'cut_not_found'; end if;
  if p_kind <> 'comment' and (c.status not in ('review', 'changes') or c.version is distinct from p_version) then
    raise exception 'cut_changed';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.cutnotes.' || acc.id::text, 0));
  if (select count(*) from public.cut_notes n
      where n.workspace_id = p_workspace_id and n.client_id = p_client_id and n.from_client
        and n.created_at > now() - interval '1 hour') >= 150 then
    raise exception 'feedback_rate_limited';
  end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  begin
    insert into public.cut_notes(cut_id, workspace_id, client_id, version, at_seconds, kind, from_client, author_name, body)
    values (c.id, p_workspace_id, p_client_id, coalesce(p_version, c.version),
      case when p_kind = 'comment' then p_at end, p_kind, true, who, trim(coalesce(p_body, '')));
  exception when check_violation then
    raise exception 'invalid_note';
  end;
  if p_kind = 'approve' then
    update public.cuts set status = 'approved', approved_version = c.version, approved_at = now(), approved_by = who,
      updated_at = now() where id = c.id;
  elsif p_kind = 'changes' then
    update public.cuts set status = 'changes', updated_at = now() where id = c.id;
  end if;
end
$$;

-- ---------- preview files ----------
-- Paths are <workspace>/<client>/<cut>/<file>. The team reads and writes them; the client reads them once the
-- cut has been sent (never a draft).

create function public.cut_file_access(p_name text, p_write boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := string_to_array(p_name, '/');
  ws uuid;
  cut uuid;
begin
  if array_length(parts, 1) <> 4 or parts[1] !~ '^[0-9a-f-]{36}$' or parts[3] !~ '^[0-9a-f-]{36}$' then
    return false;
  end if;
  ws := parts[1]::uuid;
  cut := parts[3]::uuid;
  if not exists (select 1 from public.cuts c where c.id = cut and c.workspace_id = ws and c.client_id = parts[2]) then
    return false;
  end if;
  if coalesce(public.member_role(ws), '') in ('founder', 'sales', 'editor') and public.has_client_access(ws, parts[2]) then
    return true;
  end if;
  return not p_write
    and (public.my_client_account(ws, parts[2])).id is not null
    and exists (select 1 from public.cuts c where c.id = cut and c.status <> 'draft');
end
$$;

revoke all on function public.cut_team_check(uuid, text), public.cut_to_json(public.cuts, boolean, boolean),
  public.cuts_page(uuid, text, boolean), public.get_cuts(uuid, text), public.save_cut(uuid, text, uuid, text),
  public.add_cut_version(uuid, text, uuid, text, bigint, numeric, text), public.set_cut_status(uuid, text, uuid, text),
  public.set_cut_final(uuid, text, uuid, text, text), public.team_cut_note(uuid, text, uuid, numeric, text),
  public.set_cut_note_done(uuid, text, uuid, boolean), public.delete_cut(uuid, text, uuid),
  public.get_my_cuts(uuid, text), public.client_cut_note(uuid, text, uuid, text, integer, numeric, text),
  public.cut_file_access(text, boolean)
  from public, anon;
revoke all on function public.cut_to_json(public.cuts, boolean, boolean), public.cuts_page(uuid, text, boolean)
  from authenticated;
grant execute on function public.get_cuts(uuid, text), public.save_cut(uuid, text, uuid, text),
  public.add_cut_version(uuid, text, uuid, text, bigint, numeric, text), public.set_cut_status(uuid, text, uuid, text),
  public.set_cut_final(uuid, text, uuid, text, text), public.team_cut_note(uuid, text, uuid, numeric, text),
  public.set_cut_note_done(uuid, text, uuid, boolean), public.delete_cut(uuid, text, uuid),
  public.get_my_cuts(uuid, text), public.client_cut_note(uuid, text, uuid, text, integer, numeric, text),
  public.cut_file_access(text, boolean)
  to authenticated;

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('previews', 'previews', false, 52428800, array['video/mp4', 'video/quicktime', 'video/webm'])
    on conflict (id) do nothing;
    execute $p$create policy previews_read on storage.objects for select to authenticated
      using (bucket_id = 'previews' and public.cut_file_access(name, false))$p$;
    execute $p$create policy previews_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'previews' and public.cut_file_access(name, true))$p$;
    execute $p$create policy previews_delete on storage.objects for delete to authenticated
      using (bucket_id = 'previews' and public.cut_file_access(name, true))$p$;
  end if;
end
$$;
