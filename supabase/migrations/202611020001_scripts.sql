-- Scripts: the written reel, in the shape it will be filmed. Two or three hook options, then the body as beats
-- (what we see, what we hear, the words on screen), then the call to action. The team writes them; the client
-- picks a hook, comments on any line, and approves. Every version the client is shown is frozen in
-- script_versions, so the client can see exactly what changed, and an approval always names the version it covers.

-- ---------- checks ----------

-- A list of lines: [{"see": "...", "hear": "...", "text": "..."}, ...], each field optional, at most p_max lines.
create function public.script_lines_ok(p_lines jsonb, p_max integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_lines) = 'array'
    and jsonb_array_length(p_lines) <= p_max
    and coalesce((
      select bool_and(
        jsonb_typeof(l) = 'object'
        and (select count(*) from jsonb_object_keys(l)) <= 3
        and (select bool_and(k in ('see', 'hear', 'text')) from jsonb_object_keys(l) as keys(k))
        and (l->'see' is null or (jsonb_typeof(l->'see') = 'string' and length(l->>'see') <= 1000))
        and (l->'hear' is null or (jsonb_typeof(l->'hear') = 'string' and length(l->>'hear') <= 1000))
        and (l->'text' is null or (jsonb_typeof(l->'text') = 'string' and length(l->>'text') <= 300))
      )
      from jsonb_array_elements(p_lines) as lines(l)
    ), true)
$$;

-- ---------- scripts ----------
-- status: draft (team only), review (waiting for the client), changes (the client asked for changes),
-- approved (the client approved this version, with the hook they picked). An approved script is locked:
-- editing it makes a new version that goes back to the client.

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  concept_id uuid references public.concepts(id) on delete set null,
  title text not null check (length(trim(title)) between 1 and 160),
  style text not null default 'talking-head'
    check (style in ('talking-head', 'demo', 'problem-fix', 'skit', 'ugc', 'voiceover', 'other')),
  seconds integer not null default 30 check (seconds between 5 and 180),
  goal text not null default '' check (length(goal) <= 300),
  hooks jsonb not null default '[]' check (public.script_lines_ok(hooks, 3)),
  beats jsonb not null default '[]' check (public.script_lines_ok(beats, 40)),
  cta text not null default '' check (length(cta) <= 300),
  position integer not null default 0 check (position between 0 and 100000),
  status text not null default 'draft' check (status in ('draft', 'review', 'changes', 'approved')),
  version integer not null default 1 check (version between 1 and 10000),
  hook integer check (hook between 0 and 2),
  approved_version integer,
  approved_at timestamptz,
  approved_by text check (length(approved_by) <= 120),
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check ((status = 'approved') = (approved_at is not null)),
  check ((status = 'approved') = (approved_version is not null))
);

create index scripts_client on public.scripts(workspace_id, client_id, position);

-- What the client was shown, version by version. Written only by the trigger below.
create table public.script_versions (
  script_id uuid not null references public.scripts(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  version integer not null,
  content jsonb not null,
  created_at timestamptz not null default now(),
  primary key (script_id, version)
);

-- line: which part a comment is about (hook-0..hook-2, beat-0..beat-39, goal, cta), or null for the whole script.
create table public.script_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  script_id uuid not null references public.scripts(id) on delete cascade,
  kind text not null default 'comment' check (kind in ('comment', 'approve', 'changes')),
  line text check (line ~ '^(hook-[0-2]|beat-([0-9]|[1-3][0-9])|goal|cta)$'),
  hook integer check (hook between 0 and 2),
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

create index script_notes_script on public.script_notes(script_id, created_at);

create function public.script_content(s public.scripts)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'title', s.title, 'style', s.style, 'seconds', s.seconds, 'goal', s.goal,
    'hooks', s.hooks, 'beats', s.beats, 'cta', s.cta
  )
$$;

-- Team writes run as the authenticated role; the client function below runs as the owner and sets every field
-- itself, so these rules only bind the team. Same pattern as concepts_guard.
create function public.scripts_guard()
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
    raise exception 'invalid_script';
  end if;
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'review') then raise exception 'client_only'; end if;
    new.version := 1;
    new.hook := null;
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
  new.hook := old.hook;
  new.approved_version := old.approved_version;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  if public.script_content(new) is distinct from public.script_content(old) then
    new.version := old.version + 1;
    -- A changed script goes back to the client: the old approval no longer covers it.
    if old.status in ('approved', 'changes') and new.status = old.status then new.status := 'review'; end if;
  else
    new.version := old.version;
  end if;
  if new.status <> 'approved' then
    new.hook := null;
    new.approved_version := null;
    new.approved_at := null;
    new.approved_by := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger scripts_guard before insert or update on public.scripts
  for each row execute function public.scripts_guard();

-- Freeze each version the client can see. A draft is never kept; the version it becomes when shared is.
create function public.scripts_keep_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'draft' and (tg_op = 'INSERT' or old.status = 'draft' or old.version <> new.version) then
    insert into public.script_versions(script_id, workspace_id, client_id, version, content)
    values (new.id, new.workspace_id, new.client_id, new.version, public.script_content(new))
    on conflict (script_id, version) do update set content = excluded.content, created_at = now();
  end if;
  return null;
end
$$;

create trigger scripts_keep_version after insert or update on public.scripts
  for each row execute function public.scripts_keep_version();

create function public.script_notes_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  s public.scripts%rowtype;
begin
  if current_user <> 'authenticated' then return new; end if;
  select * into s from public.scripts where id = new.script_id;
  if not found or s.workspace_id <> new.workspace_id or s.client_id <> new.client_id then
    raise exception 'invalid_note';
  end if;
  if new.kind <> 'comment' then raise exception 'client_only'; end if;
  new.from_client := false;
  new.hook := null;
  new.author_user := (select auth.uid());
  new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
  new.version := s.version;
  new.created_at := now();
  return new;
end
$$;

create trigger script_notes_guard before insert on public.script_notes
  for each row execute function public.script_notes_guard();

alter table public.scripts enable row level security;
alter table public.script_versions enable row level security;
alter table public.script_notes enable row level security;
revoke all on public.scripts, public.script_versions, public.script_notes from public, anon, authenticated;
grant select, insert, update, delete on public.scripts to authenticated;
grant select on public.script_versions to authenticated;
grant select, insert, delete on public.script_notes to authenticated;

create policy scripts_read on public.scripts for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy scripts_insert on public.scripts for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy scripts_update on public.scripts for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy scripts_delete on public.scripts for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));

create policy script_versions_read on public.script_versions for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));

create policy script_notes_read on public.script_notes for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy script_notes_insert on public.script_notes for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy script_notes_delete on public.script_notes for delete to authenticated
  using (author_user = (select auth.uid()) and not from_client and public.member_role(workspace_id) is not null);

-- ---------- what the client sees and does ----------

create function public.script_to_json(s public.scripts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.script_content(s) || jsonb_build_object(
    'id', s.id, 'conceptId', s.concept_id, 'position', s.position, 'status', s.status, 'version', s.version,
    'hook', s.hook, 'approvedVersion', s.approved_version, 'approvedAt', s.approved_at, 'approvedBy', s.approved_by,
    'authorName', s.author_name, 'createdAt', s.created_at, 'updatedAt', s.updated_at,
    -- The version the client saw before this one, so the portal can show what changed.
    'previous', (
      select v.content from public.script_versions v
      where v.script_id = s.id and v.version < s.version
      order by v.version desc limit 1
    ),
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'line', n.line, 'hook', n.hook, 'fromClient', n.from_client,
        'authorName', n.author_name, 'body', n.body, 'version', n.version, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.script_notes n where n.script_id = s.id
    ), '[]'::jsonb)
  )
$$;

-- The portal, now with scripts. Same as before plus the 'scripts' key (never drafts).
create or replace function public.get_my_portal(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  p public.client_portals%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  select * into p from public.client_portals where workspace_id = p_workspace_id and client_id = p_client_id;
  return jsonb_build_object(
    'brand', (select c.brand from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id),
    'me', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120),
    'overview', case when p.client_id is null then null else jsonb_build_object(
      'campaign', p.campaign, 'summary', p.summary, 'included', to_jsonb(p.included),
      'shootDate', p.shoot_date, 'shootPlace', p.shoot_place, 'nextStep', p.next_step,
      'milestones', p.milestones, 'price', p.price,
      'depositStatus', p.deposit_status, 'balanceStatus', p.balance_status, 'updatedAt', p.updated_at
    ) end,
    'concepts', coalesce((
      select jsonb_agg(public.concept_to_json(c) order by c.position, c.created_at)
      from public.concepts c
      where c.workspace_id = p_workspace_id and c.client_id = p_client_id and c.status <> 'draft'
    ), '[]'::jsonb),
    'scripts', coalesce((
      select jsonb_agg(public.script_to_json(s) order by s.position, s.created_at)
      from public.scripts s
      where s.workspace_id = p_workspace_id and s.client_id = p_client_id and s.status <> 'draft'
    ), '[]'::jsonb)
  );
end
$$;

-- Approve (with the hook picked), ask for changes, or comment on the whole script or one line. Approving and
-- asking for changes name the version the client read, so nobody signs off on a script that changed under them.
create function public.client_script_note(
  p_workspace_id uuid, p_client_id text, p_script_id uuid, p_kind text, p_body text, p_version integer,
  p_line text, p_hook integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  s public.scripts%rowtype;
  who text;
  hooks integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('comment', 'approve', 'changes') or p_body is null or length(p_body) > 4000
     or (p_kind in ('comment', 'changes') and length(trim(p_body)) = 0)
     or (p_line is not null and p_line !~ '^(hook-[0-2]|beat-([0-9]|[1-3][0-9])|goal|cta)$')
     or (p_line is not null and p_kind = 'approve') then
    raise exception 'invalid_note';
  end if;
  select * into s from public.scripts
  where id = p_script_id and workspace_id = p_workspace_id and client_id = p_client_id and status <> 'draft'
  for update;
  if not found then raise exception 'invalid_note'; end if;
  if p_kind <> 'comment' and (s.status not in ('review', 'changes') or s.version is distinct from p_version) then
    raise exception 'script_changed';
  end if;
  hooks := jsonb_array_length(s.hooks);
  if p_kind = 'approve' then
    if hooks > 1 and (p_hook is null or p_hook < 0 or p_hook >= hooks) then raise exception 'hook_required'; end if;
    if hooks <= 1 then p_hook := case when hooks = 1 then 0 else null end; end if;
  else
    p_hook := null;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.notes.' || acc.id::text, 0));
  if (select count(*) from public.script_notes n
      where n.workspace_id = p_workspace_id and n.client_id = p_client_id and n.from_client
        and n.created_at > now() - interval '1 hour') >= 120 then
    raise exception 'feedback_rate_limited';
  end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  insert into public.script_notes(workspace_id, client_id, script_id, kind, line, hook, from_client, author_user, author_name, body, version)
  values (p_workspace_id, p_client_id, s.id, p_kind, p_line, p_hook, true, (select auth.uid()), who, trim(p_body), s.version);
  if p_kind = 'approve' then
    update public.scripts set status = 'approved', hook = p_hook, approved_version = s.version, approved_at = now(), approved_by = who
    where id = s.id returning * into s;
  elsif p_kind = 'changes' then
    update public.scripts set status = 'changes', hook = null, approved_version = null, approved_at = null, approved_by = null
    where id = s.id returning * into s;
  end if;
  return public.script_to_json(s);
end
$$;

revoke all on function public.script_lines_ok(jsonb, integer), public.script_content(public.scripts),
  public.scripts_guard(), public.scripts_keep_version(), public.script_notes_guard(),
  public.script_to_json(public.scripts),
  public.client_script_note(uuid, text, uuid, text, text, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.script_lines_ok(jsonb, integer), public.script_content(public.scripts),
  public.scripts_guard(), public.scripts_keep_version(), public.script_notes_guard() to authenticated;
grant execute on function public.client_script_note(uuid, text, uuid, text, text, integer, text, integer)
  to authenticated;
-- create or replace keeps the old grants on get_my_portal; restate them so a fresh project matches.
revoke all on function public.get_my_portal(uuid, text) from public, anon;
grant execute on function public.get_my_portal(uuid, text) to authenticated;
