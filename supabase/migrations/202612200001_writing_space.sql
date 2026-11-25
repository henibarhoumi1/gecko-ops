-- The writing space (Heni, 25 Nov 2026): "the client, when he's writing the script or an idea, always has the option
-- on the side: who is the talent in this video, what set, what props. The same on Gecko's side and the client's."
--
-- 1. A shoot plan can name several sets ("sets": an array). The old single "set" stays readable and is kept as the
--    first set, so older readers (shoot days, links) keep working.
-- 2. Sets get photos (paths in the private production bucket, like talent and location photos).
-- 3. The client reads the campaign's sets with its production page, and reads the shoot plan of its ideas and scripts.
-- 4. Ideas get a shoot plan too (talent, sets, props); the old talent column stays in step with it.
-- 5. The client can set the shoot plan of a script while it's with them (review or changes) and of its own ideas
--    while they're still ideas. Only ids of this client's talent, props and sets are accepted.
-- Changing a shoot plan is logistics: it never makes a new version and never touches an approval.

-- ---------- 1. a shoot plan with several sets ----------

create or replace function public.shoot_plan_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (select bool_and(k in ('talent', 'set', 'sets', 'props', 'extraProps')) from jsonb_object_keys(p) as keys(k)) is not false
    and (p->'talent' is null or (jsonb_typeof(p->'talent') = 'array' and jsonb_array_length(p->'talent') <= 12
         and not exists (select 1 from jsonb_array_elements(p->'talent') e where jsonb_typeof(e) <> 'string')))
    and (p->'set' is null or jsonb_typeof(p->'set') in ('string', 'null'))
    and (p->'sets' is null or (jsonb_typeof(p->'sets') = 'array' and jsonb_array_length(p->'sets') <= 12
         and not exists (select 1 from jsonb_array_elements(p->'sets') e where jsonb_typeof(e) <> 'string')))
    and (p->'props' is null or (jsonb_typeof(p->'props') = 'array' and jsonb_array_length(p->'props') <= 30
         and not exists (select 1 from jsonb_array_elements(p->'props') e where jsonb_typeof(e) <> 'string')))
    and (p->'extraProps' is null or (jsonb_typeof(p->'extraProps') = 'string' and length(p->>'extraProps') <= 1000))
$$;

-- Every set a plan names: the "sets" list, or else the old single "set".
create function public.shoot_plan_sets(p jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(p->'sets') = 'array' then array(select jsonb_array_elements_text(p->'sets'))
    when coalesce(p->>'set', '') <> '' then array[p->>'set']
    else '{}'::text[]
  end
$$;

-- A plan the client sends names only this client's own talent, props and sets.
create function public.shoot_plan_ids_ok(p_workspace_id uuid, p_client_id text, p jsonb)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.shoot_plan_ok(p)
    and not exists (
      select 1 from jsonb_array_elements_text(coalesce(p->'talent', '[]'::jsonb) || coalesce(p->'props', '[]'::jsonb)) as t(v)
      where not exists (
        select 1 from public.production_options o
        where o.id::text = t.v and o.workspace_id = p_workspace_id and o.client_id = p_client_id))
    and not exists (
      select 1 from unnest(public.shoot_plan_sets(p)) as t(v)
      where not exists (
        select 1 from public.project_sets s
        where s.id::text = t.v and s.workspace_id = p_workspace_id and s.client_id = p_client_id)
      and not exists (
        select 1 from public.production_options o
        where o.id::text = t.v and o.workspace_id = p_workspace_id and o.client_id = p_client_id))
$$;
revoke all on function public.shoot_plan_ids_ok(uuid, text, jsonb) from public, anon, authenticated;

-- The stored form: the sets list, with "set" kept as its first entry for older readers.
create function public.shoot_plan_tidy(p jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select (coalesce(p, '{}'::jsonb) - 'set' - 'sets')
    || jsonb_build_object('sets', to_jsonb(public.shoot_plan_sets(coalesce(p, '{}'::jsonb))))
    || case when cardinality(public.shoot_plan_sets(coalesce(p, '{}'::jsonb))) > 0
         then jsonb_build_object('set', (public.shoot_plan_sets(p))[1]) else '{}'::jsonb end
$$;

-- ---------- 2. sets have photos ----------

alter table public.project_sets
  add column photos text[] not null default '{}' check (cardinality(photos) <= 6);

-- Photos sit in this client's folder of the production bucket.
create function public.project_sets_photos_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from unnest(new.photos) p
             where p not like new.workspace_id::text || '/' || new.client_id || '/%' or length(p) > 300) then
    raise exception 'invalid_photo';
  end if;
  return new;
end
$$;

create trigger project_sets_photos before insert or update of photos on public.project_sets
  for each row execute function public.project_sets_photos_guard();

create function public.sets_to_json(p_workspace_id uuid, p_client_id text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'projectId', s.project_id, 'name', s.name, 'notes', s.notes, 'photos', to_jsonb(s.photos),
    'position', s.position
  ) order by s.position, s.name), '[]'::jsonb)
  from public.project_sets s
  where s.workspace_id = p_workspace_id and s.client_id = p_client_id
$$;
revoke all on function public.sets_to_json(uuid, text) from public, anon, authenticated;

-- ---------- 3. the client reads the sets with its production page ----------

create or replace function public.get_my_production(p_workspace_id uuid, p_client_id text)
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
  -- Viewers see who and where, not what it costs.
  return public.production_to_json(p_workspace_id, p_client_id, false, acc.role <> 'viewer')
    || jsonb_build_object('sets', public.sets_to_json(p_workspace_id, p_client_id));
end
$$;

-- ---------- 4. ideas have a shoot plan ----------

alter table public.concepts
  add column shoot jsonb not null default '{}'::jsonb check (public.shoot_plan_ok(shoot));

-- Ideas that already named their talent start with it.
update public.concepts set shoot = jsonb_build_object('talent', to_jsonb(talent)) where cardinality(talent) > 0;

-- The talent column follows the plan, so older readers of it stay right.
create function public.concepts_shoot_sync()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.shoot := coalesce(new.shoot, '{}'::jsonb);
  if tg_op = 'INSERT' and not (new.shoot ? 'talent') then
    -- Written with the talent column only (older app): the plan takes it.
    if cardinality(new.talent) > 0 then
      new.shoot := new.shoot || jsonb_build_object('talent', to_jsonb(new.talent));
    end if;
  elsif tg_op = 'INSERT' or new.shoot is distinct from old.shoot then
    new.talent := coalesce(array(select jsonb_array_elements_text(coalesce(new.shoot->'talent', '[]'::jsonb))), '{}');
  elsif new.talent is distinct from old.talent then
    new.shoot := (coalesce(new.shoot, '{}'::jsonb) - 'talent') || jsonb_build_object('talent', to_jsonb(new.talent));
  end if;
  return new;
end
$$;

create trigger concepts_shoot_sync before insert or update of shoot, talent on public.concepts
  for each row execute function public.concepts_shoot_sync();

-- ---------- the client reads the plans ----------

create or replace function public.concept_to_json(c public.concepts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'format', c.format, 'hook', c.hook, 'body', c.body, 'refs', c.refs,
    'position', c.position, 'fromClient', c.from_client, 'status', c.status, 'version', c.version,
    'approvedVersion', c.approved_version, 'approvedAt', c.approved_at, 'approvedBy', c.approved_by,
    'authorName', c.author_name, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
    'projectId', c.project_id, 'talent', to_jsonb(c.talent), 'shoot', c.shoot,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'fromClient', n.from_client, 'authorName', n.author_name,
        'body', n.body, 'version', n.version, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.concept_notes n where n.concept_id = c.id
    ), '[]'::jsonb)
  )
$$;

create or replace function public.script_to_json(s public.scripts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.script_content(s) || jsonb_build_object(
    'id', s.id, 'conceptId', s.concept_id, 'position', s.position, 'status', s.status, 'version', s.version,
    'hook', s.hook, 'approvedVersion', s.approved_version, 'approvedAt', s.approved_at, 'approvedBy', s.approved_by,
    'authorName', s.author_name, 'createdAt', s.created_at, 'updatedAt', s.updated_at,
    'writtenBy', s.written_by, 'mine', s.created_by = (select auth.uid()),
    'projectId', s.project_id, 'shoot', s.shoot,
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

-- ---------- 5. the client sets the plans ----------

-- A script's plan, while the script is with the client (review or changes).
create function public.client_set_script_shoot(p_workspace_id uuid, p_client_id text, p_id uuid, p_shoot jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  s public.scripts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role not in ('owner', 'approver') then raise exception 'writer_only'; end if;
  if p_shoot is null or not public.shoot_plan_ids_ok(p_workspace_id, p_client_id, p_shoot) then
    raise exception 'invalid_shoot_plan';
  end if;
  update public.scripts set shoot = public.shoot_plan_tidy(p_shoot)
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and status in ('review', 'changes')
  returning * into s;
  if not found then raise exception 'script_locked'; end if;
  return public.script_to_json(s);
end
$$;
revoke all on function public.client_set_script_shoot(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.client_set_script_shoot(uuid, text, uuid, jsonb) to authenticated;

-- The plan of an idea the client added, while it's still theirs (status idea).
create function public.client_set_idea_shoot(p_workspace_id uuid, p_client_id text, p_id uuid, p_shoot jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_shoot is null or not public.shoot_plan_ids_ok(p_workspace_id, p_client_id, p_shoot) then
    raise exception 'invalid_shoot_plan';
  end if;
  update public.concepts set shoot = public.shoot_plan_tidy(p_shoot)
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and from_client and status = 'idea' and created_by = (select auth.uid());
  if not found then raise exception 'invalid_idea'; end if;
end
$$;
revoke all on function public.client_set_idea_shoot(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.client_set_idea_shoot(uuid, text, uuid, jsonb) to authenticated;

-- ---------- shoot days name every set ----------

create or replace function public.shoot_reel_to_json(r public.shoot_day_reels, s public.scripts, p_team boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', r.id, 'scriptId', s.id, 'title', s.title, 'style', s.style, 'seconds', s.seconds,
    'scriptStatus', s.status, 'position', r.position, 'slot', r.slot, 'status', r.status, 'note', r.note,
    'linesDone', to_jsonb(r.lines_done), 'lineChanges', r.line_changes,
    'updatedBy', r.updated_by_name, 'updatedAt', r.updated_at,
    -- The client reads the lines once the script has been sent to them.
    'shared', p_team or s.status in ('review', 'changes', 'approved'),
    'hooks', case when p_team or s.status in ('review', 'changes', 'approved') then s.hooks else '[]'::jsonb end,
    'beats', case when p_team or s.status in ('review', 'changes', 'approved') then s.beats else '[]'::jsonb end,
    'cta', case when p_team or s.status in ('review', 'changes', 'approved') then s.cta else '' end,
    'hook', s.hook,
    'talent', coalesce((
      select jsonb_agg(coalesce(o.name, t.v) order by t.n)
      from jsonb_array_elements_text(coalesce(s.shoot->'talent', '[]'::jsonb)) with ordinality as t(v, n)
      left join public.production_options o on o.id::text = t.v and o.workspace_id = s.workspace_id
    ), '[]'::jsonb),
    -- One line, every set in the plan's order.
    'set', (
      select string_agg(coalesce(ps.name, o.name, x.v), ' · ' order by x.n)
      from unnest(public.shoot_plan_sets(s.shoot)) with ordinality as x(v, n)
      left join public.project_sets ps on ps.id::text = x.v and ps.workspace_id = s.workspace_id
      left join public.production_options o on o.id::text = x.v and o.workspace_id = s.workspace_id
      where x.v <> ''
    ),
    'props', coalesce((
      select jsonb_agg(coalesce(o.name, t.v) order by t.n)
      from jsonb_array_elements_text(coalesce(s.shoot->'props', '[]'::jsonb)) with ordinality as t(v, n)
      left join public.production_options o on o.id::text = t.v and o.workspace_id = s.workspace_id
    ), '[]'::jsonb),
    'extraProps', case when p_team then coalesce(s.shoot->>'extraProps', '') else '' end
  )
$$;
