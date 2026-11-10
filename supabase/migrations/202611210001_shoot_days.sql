-- Shoot Day (Gecko World V1, phase 1): one live page per shoot day that everyone on the project opens.
-- The plan of the day (call time, place, people, the reels to shoot in order), a one-tap status per reel,
-- notes for the edit, the lines read on set, and a running log.
--
-- Who does what (shoot_actor):
--   founder and producers with access to the client  plan the day, and everything below
--   editors and production with access              tick reels, write reel notes, log, start and wrap the day
--   the client's owner and approvers                tick reels, write reel notes, log
--   the client's finance and viewers                read and log
-- The client sees the whole page except Gecko's private notes and crew phone numbers, and the lines of a
-- script only once it has been sent to them.
--
-- Nothing is ever deleted here: a removed day, reel or person gets removed_at and can be brought back.
-- Nobody touches these tables directly: everyone goes through the functions below.

-- ---------- tables ----------

create table public.shoot_days (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  day date not null,
  title text not null default '' check (length(title) <= 80),
  call_time time,
  wrap_time time,
  place text not null default '' check (length(place) <= 160),
  address text not null default '' check (length(address) <= 300),
  map_link text not null default '' check (length(map_link) <= 1000 and (map_link = '' or map_link ~* '^https?://\S+$')),
  -- The brief of the day for everyone: set design, what to bring, parking.
  notes text not null default '' check (length(notes) <= 4000),
  -- Team only: rates, contacts, anything the client should not read.
  private_notes text not null default '' check (length(private_notes) <= 2000),
  state text not null default 'planned' check (state in ('planned', 'live', 'wrapped')),
  removed_at timestamptz,
  removed_by text not null default '' check (length(removed_by) <= 120),
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create index shoot_days_client on public.shoot_days(workspace_id, client_id, day);
create index shoot_days_workspace_day on public.shoot_days(workspace_id, day);

-- The line keys a script uses for its notes: hook-0..hook-2, beat-0..beat-99, cta.
create function public.shoot_line_keys_ok(p text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p) <= 120
    and not exists (select 1 from unnest(p) k where k is null or k !~ '^(hook-[0-2]|beat-[0-9]{1,2}|cta)$')
$$;

-- Lines said differently on set: { "<line key>": "the words as said" }.
create function public.shoot_line_changes_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'object'
    and (select count(*) from jsonb_object_keys(p)) <= 60
    and not exists (
      select 1 from jsonb_each(p) e
      where e.key !~ '^(hook-[0-2]|beat-[0-9]{1,2}|cta)$' or jsonb_typeof(e.value) <> 'string'
        or length(e.value #>> '{}') > 600
    )
$$;

create table public.shoot_day_reels (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.shoot_days(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  script_id uuid not null references public.scripts(id) on delete cascade,
  position integer not null default 0 check (position between 0 and 100000),
  -- A time or a set, as people say it on the day: "10:30", "kitchen".
  slot text not null default '' check (length(slot) <= 40),
  status text not null default 'todo' check (status in ('todo', 'shooting', 'done', 'pickup')),
  -- For the edit: best take, what changed from the script, which hooks were shot.
  note text not null default '' check (length(note) <= 2000),
  lines_done text[] not null default '{}' check (public.shoot_line_keys_ok(lines_done)),
  line_changes jsonb not null default '{}'::jsonb check (public.shoot_line_changes_ok(line_changes)),
  removed_at timestamptz,
  updated_by_name text not null default '' check (length(updated_by_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (day_id, script_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create index shoot_day_reels_day on public.shoot_day_reels(day_id, position);
create index shoot_day_reels_script on public.shoot_day_reels(script_id);

create table public.shoot_day_people (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.shoot_days(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  name text not null check (length(trim(name)) between 1 and 120),
  role text not null default '' check (length(role) <= 80),
  side text not null default 'crew' check (side in ('gecko', 'crew', 'talent', 'client')),
  call_time time,
  -- Team only.
  phone text not null default '' check (length(phone) <= 40),
  position integer not null default 0 check (position between 0 and 100000),
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create index shoot_day_people_day on public.shoot_day_people(day_id, position);

-- The running log of the day, never edited or deleted.
create table public.shoot_day_log (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.shoot_days(id) on delete cascade,
  workspace_id uuid not null,
  client_id text not null,
  body text not null check (length(trim(body)) between 1 and 1000),
  from_client boolean not null default false,
  author_user uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now()
);

create index shoot_day_log_day on public.shoot_day_log(day_id, created_at);

alter table public.shoot_days enable row level security;
alter table public.shoot_day_reels enable row level security;
alter table public.shoot_day_people enable row level security;
alter table public.shoot_day_log enable row level security;
revoke all on public.shoot_days, public.shoot_day_reels, public.shoot_day_people, public.shoot_day_log
  from public, anon, authenticated;

-- ---------- who is asking ----------

-- p_need: 'read', 'log', 'tick' or 'plan'. Raises when the caller may not do it.
-- During View as client the team is never "the team": the preview's stand-in client account answers.
create function public.shoot_actor(p_workspace_id uuid, p_client_id text, p_need text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  acc public.client_accounts;
  r text := coalesce(public.member_role(p_workspace_id), '');
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(current_setting('gecko.preview', true), '') = '' and r <> ''
     and public.has_client_access(p_workspace_id, p_client_id) then
    if p_need = 'plan' and r not in ('founder', 'sales') then raise exception 'forbidden'; end if;
    return jsonb_build_object('team', true, 'who', coalesce(public.my_member_name(p_workspace_id), 'Gecko'),
      'role', r, 'plan', r in ('founder', 'sales'), 'tick', true);
  end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null or p_need = 'plan' then raise exception 'forbidden'; end if;
  if p_need = 'tick' and acc.role not in ('owner', 'approver') then raise exception 'shoot_tick_not_allowed'; end if;
  return jsonb_build_object('team', false,
    'who', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120),
    'role', acc.role, 'plan', false, 'tick', acc.role in ('owner', 'approver'));
end
$$;

-- ---------- reading ----------

create function public.shoot_reel_to_json(r public.shoot_day_reels, s public.scripts, p_team boolean)
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
    'talent', coalesce(s.shoot->'talent', '[]'::jsonb),
    'set', s.shoot->'set',
    'props', coalesce(s.shoot->'props', '[]'::jsonb),
    'extraProps', case when p_team then coalesce(s.shoot->>'extraProps', '') else '' end
  )
$$;

create function public.shoot_day_to_json(d public.shoot_days, p_team boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id, 'day', d.day, 'title', d.title,
    'callTime', to_char(d.call_time, 'HH24:MI'), 'wrapTime', to_char(d.wrap_time, 'HH24:MI'),
    'place', d.place, 'address', d.address, 'mapLink', d.map_link, 'notes', d.notes, 'state', d.state,
    'privateNotes', case when p_team then d.private_notes else null end,
    'authorName', d.author_name, 'createdAt', d.created_at, 'updatedAt', d.updated_at,
    'reels', coalesce((
      select jsonb_agg(public.shoot_reel_to_json(r, s, p_team) order by r.position, r.created_at)
      from public.shoot_day_reels r join public.scripts s on s.id = r.script_id
      where r.day_id = d.id and r.removed_at is null
    ), '[]'::jsonb),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'name', p.name, 'role', p.role, 'side', p.side,
        'callTime', to_char(p.call_time, 'HH24:MI'),
        'phone', case when p_team then p.phone else null end
      ) order by p.position, p.created_at)
      from public.shoot_day_people p where p.day_id = d.id and p.removed_at is null
    ), '[]'::jsonb),
    'log', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', l.id, 'body', l.body, 'fromClient', l.from_client, 'authorName', l.author_name,
        'createdAt', l.created_at
      ) order by l.created_at desc)
      from (
        select * from public.shoot_day_log x where x.day_id = d.id order by x.created_at desc limit 100
      ) l
    ), '[]'::jsonb)
  )
$$;

-- Every shoot day of a client, for the team and the client alike.
create function public.get_shoot_days(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.shoot_actor(p_workspace_id, p_client_id, 'read');
  team boolean := (actor->>'team')::boolean;
  can_plan boolean := (actor->>'plan')::boolean;
begin
  return jsonb_build_object(
    'team', team,
    'canPlan', can_plan,
    'canTick', (actor->>'tick')::boolean,
    'days', coalesce((
      select jsonb_agg(public.shoot_day_to_json(d, team) order by d.day, d.call_time nulls last, d.created_at)
      from public.shoot_days d
      where d.workspace_id = p_workspace_id and d.client_id = p_client_id and d.removed_at is null
    ), '[]'::jsonb),
    -- The scripts to put on a day, for the people who plan it.
    'scripts', case when can_plan then coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'title', s.title, 'status', s.status, 'style', s.style)
        order by s.position, s.created_at)
      from public.scripts s where s.workspace_id = p_workspace_id and s.client_id = p_client_id
    ), '[]'::jsonb) else '[]'::jsonb end
  );
end
$$;

-- The team's shoots across every client they can open, from two days ago on.
create function public.get_team_shoots(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.member_role(p_workspace_id) is null then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', d.id, 'clientId', d.client_id, 'brand', c.brand, 'day', d.day, 'title', d.title,
      'callTime', to_char(d.call_time, 'HH24:MI'), 'place', d.place, 'state', d.state,
      'reels', (select count(*) from public.shoot_day_reels r where r.day_id = d.id and r.removed_at is null),
      'done', (select count(*) from public.shoot_day_reels r
               where r.day_id = d.id and r.removed_at is null and r.status = 'done')
    ) order by d.day, d.call_time nulls last, d.created_at)
    from public.shoot_days d
    join public.clients c on c.workspace_id = d.workspace_id and c.id = d.client_id
    where d.workspace_id = p_workspace_id and d.removed_at is null and d.day >= current_date - 2
      and public.has_client_access(p_workspace_id, d.client_id)
  ), '[]'::jsonb);
end
$$;

-- ---------- planning the day (founder and producers) ----------

create function public.save_shoot_day(p_workspace_id uuid, p_client_id text, p_day jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  who text := actor->>'who';
  v_id uuid;
begin
  if p_day is null or jsonb_typeof(p_day) <> 'object' then raise exception 'invalid_shoot_day'; end if;
  begin
    if p_day->>'id' is null then
      insert into public.shoot_days(workspace_id, client_id, day, title, call_time, wrap_time, place, address,
        map_link, notes, private_notes, created_by, author_name)
      values (p_workspace_id, p_client_id, (p_day->>'day')::date, trim(coalesce(p_day->>'title', '')),
        nullif(trim(coalesce(p_day->>'callTime', '')), '')::time,
        nullif(trim(coalesce(p_day->>'wrapTime', '')), '')::time,
        trim(coalesce(p_day->>'place', '')), trim(coalesce(p_day->>'address', '')),
        trim(coalesce(p_day->>'mapLink', '')), trim(coalesce(p_day->>'notes', '')),
        trim(coalesce(p_day->>'privateNotes', '')), (select auth.uid()), who)
      returning id into v_id;
    else
      update public.shoot_days set
        day = (p_day->>'day')::date, title = trim(coalesce(p_day->>'title', '')),
        call_time = nullif(trim(coalesce(p_day->>'callTime', '')), '')::time,
        wrap_time = nullif(trim(coalesce(p_day->>'wrapTime', '')), '')::time,
        place = trim(coalesce(p_day->>'place', '')), address = trim(coalesce(p_day->>'address', '')),
        map_link = trim(coalesce(p_day->>'mapLink', '')), notes = trim(coalesce(p_day->>'notes', '')),
        private_notes = trim(coalesce(p_day->>'privateNotes', '')), updated_at = now()
      where id = (p_day->>'id')::uuid and workspace_id = p_workspace_id and client_id = p_client_id
        and removed_at is null
      returning id into v_id;
      if v_id is null then raise exception 'shoot_day_not_found'; end if;
    end if;
  exception when check_violation or not_null_violation or invalid_text_representation
    or invalid_datetime_format or datetime_field_overflow then
    raise exception 'invalid_shoot_day';
  end;
  return v_id;
end
$$;

-- Removing a day keeps it, with everything on it, so it can be brought back.
create function public.remove_shoot_day(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.shoot_actor(p_workspace_id, p_client_id, 'plan');
begin
  update public.shoot_days set removed_at = now(), removed_by = actor->>'who', updated_at = now()
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and removed_at is null;
  if not found then raise exception 'shoot_day_not_found'; end if;
end
$$;

create function public.restore_shoot_day(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  update public.shoot_days set removed_at = null, removed_by = '', updated_at = now()
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and removed_at is not null;
  if not found then raise exception 'shoot_day_not_found'; end if;
end
$$;

-- The reels of the day, in shooting order. A reel already shot can't be taken off the day.
create function public.set_shoot_reels(p_workspace_id uuid, p_client_id text, p_day_id uuid, p_script_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  ids uuid[] := coalesce(p_script_ids, '{}');
begin
  if not exists (select 1 from public.shoot_days d where d.id = p_day_id and d.workspace_id = p_workspace_id
                 and d.client_id = p_client_id and d.removed_at is null) then
    raise exception 'shoot_day_not_found';
  end if;
  if cardinality(ids) > 60 or cardinality(ids) <> (select count(distinct x) from unnest(ids) x) then
    raise exception 'invalid_reels';
  end if;
  if exists (select 1 from unnest(ids) x where not exists (
      select 1 from public.scripts s where s.id = x and s.workspace_id = p_workspace_id and s.client_id = p_client_id)) then
    raise exception 'script_not_found';
  end if;
  if exists (select 1 from public.shoot_day_reels r where r.day_id = p_day_id and r.removed_at is null
             and r.status = 'done' and not (r.script_id = any(ids))) then
    raise exception 'reel_shot';
  end if;
  update public.shoot_day_reels set removed_at = now(), updated_by_name = actor->>'who', updated_at = now()
  where day_id = p_day_id and removed_at is null and not (script_id = any(ids));
  insert into public.shoot_day_reels(day_id, workspace_id, client_id, script_id, position, updated_by_name)
  select p_day_id, p_workspace_id, p_client_id, x.id, x.n::integer, actor->>'who'
  from unnest(ids) with ordinality as x(id, n)
  on conflict (day_id, script_id) do update set
    position = excluded.position, removed_at = null, updated_at = now();
end
$$;

create function public.save_shoot_person(p_workspace_id uuid, p_client_id text, p_day_id uuid, p_person jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  if p_person is null or jsonb_typeof(p_person) <> 'object' then raise exception 'invalid_person'; end if;
  if not exists (select 1 from public.shoot_days d where d.id = p_day_id and d.workspace_id = p_workspace_id
                 and d.client_id = p_client_id and d.removed_at is null) then
    raise exception 'shoot_day_not_found';
  end if;
  begin
    if p_person->>'id' is null then
      insert into public.shoot_day_people(day_id, workspace_id, client_id, name, role, side, call_time, phone, position)
      values (p_day_id, p_workspace_id, p_client_id, trim(coalesce(p_person->>'name', '')),
        trim(coalesce(p_person->>'role', '')), coalesce(p_person->>'side', 'crew'),
        nullif(trim(coalesce(p_person->>'callTime', '')), '')::time, trim(coalesce(p_person->>'phone', '')),
        coalesce((select max(p.position) + 1 from public.shoot_day_people p where p.day_id = p_day_id), 0))
      returning id into v_id;
    else
      update public.shoot_day_people set
        name = trim(coalesce(p_person->>'name', '')), role = trim(coalesce(p_person->>'role', '')),
        side = coalesce(p_person->>'side', side),
        call_time = nullif(trim(coalesce(p_person->>'callTime', '')), '')::time,
        phone = trim(coalesce(p_person->>'phone', '')), updated_at = now()
      where id = (p_person->>'id')::uuid and day_id = p_day_id and removed_at is null
      returning id into v_id;
      if v_id is null then raise exception 'person_not_found'; end if;
    end if;
  exception when check_violation or not_null_violation or invalid_text_representation
    or invalid_datetime_format or datetime_field_overflow then
    raise exception 'invalid_person';
  end;
  return v_id;
end
$$;

create function public.remove_shoot_person(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.shoot_actor(p_workspace_id, p_client_id, 'plan');
  update public.shoot_day_people set removed_at = now(), updated_at = now()
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and removed_at is null;
  if not found then raise exception 'person_not_found'; end if;
end
$$;

-- ---------- on the day (whoever may tick) ----------

-- Change any of: status, note, slot, linesDone, lineChanges. Keys left out stay as they are.
create function public.update_shoot_reel(p_workspace_id uuid, p_client_id text, p_id uuid, p_changes jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.shoot_actor(p_workspace_id, p_client_id, 'tick');
begin
  if p_changes is null or jsonb_typeof(p_changes) <> 'object'
     or (p_changes ? 'linesDone' and jsonb_typeof(p_changes->'linesDone') <> 'array') then
    raise exception 'invalid_reel';
  end if;
  begin
    update public.shoot_day_reels r set
      status = coalesce(p_changes->>'status', r.status),
      note = case when p_changes ? 'note' then trim(coalesce(p_changes->>'note', '')) else r.note end,
      slot = case when p_changes ? 'slot' then trim(coalesce(p_changes->>'slot', '')) else r.slot end,
      lines_done = case when p_changes ? 'linesDone'
        then array(select distinct x from jsonb_array_elements_text(p_changes->'linesDone') x order by x)
        else r.lines_done end,
      line_changes = case when p_changes ? 'lineChanges' then p_changes->'lineChanges' else r.line_changes end,
      updated_by_name = actor->>'who', updated_at = now()
    where r.id = p_id and r.workspace_id = p_workspace_id and r.client_id = p_client_id and r.removed_at is null
      and exists (select 1 from public.shoot_days d where d.id = r.day_id and d.removed_at is null);
    if not found then raise exception 'reel_not_found'; end if;
  exception when check_violation or not_null_violation or invalid_text_representation
    or invalid_parameter_value then
    raise exception 'invalid_reel';
  end;
end
$$;

-- The real order of the day, as it changes on set.
create function public.order_shoot_reels(p_workspace_id uuid, p_client_id text, p_day_id uuid, p_reel_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.shoot_actor(p_workspace_id, p_client_id, 'tick');
  if cardinality(coalesce(p_reel_ids, '{}')) > 60 then raise exception 'invalid_reels'; end if;
  update public.shoot_day_reels r set position = x.n::integer, updated_at = now()
  from unnest(p_reel_ids) with ordinality as x(id, n)
  where r.id = x.id and r.day_id = p_day_id and r.workspace_id = p_workspace_id and r.client_id = p_client_id
    and r.removed_at is null;
end
$$;

-- Planned, live or wrapped.
create function public.set_shoot_day_state(p_workspace_id uuid, p_client_id text, p_id uuid, p_state text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.shoot_actor(p_workspace_id, p_client_id, 'tick');
begin
  if not (actor->>'team')::boolean then raise exception 'forbidden'; end if;
  if p_state is null or p_state not in ('planned', 'live', 'wrapped') then raise exception 'invalid_shoot_day'; end if;
  update public.shoot_days set state = p_state, updated_at = now()
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and removed_at is null;
  if not found then raise exception 'shoot_day_not_found'; end if;
end
$$;

create function public.add_shoot_log(p_workspace_id uuid, p_client_id text, p_day_id uuid, p_body text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.shoot_actor(p_workspace_id, p_client_id, 'log');
  is_team boolean := (actor->>'team')::boolean;
begin
  if length(trim(coalesce(p_body, ''))) = 0 or length(p_body) > 1000 then raise exception 'invalid_note'; end if;
  if not exists (select 1 from public.shoot_days d where d.id = p_day_id and d.workspace_id = p_workspace_id
                 and d.client_id = p_client_id and d.removed_at is null) then
    raise exception 'shoot_day_not_found';
  end if;
  if not is_team then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.shootlog.' || (select auth.uid())::text, 0));
    if (select count(*) from public.shoot_day_log l
        where l.workspace_id = p_workspace_id and l.client_id = p_client_id and l.author_user = (select auth.uid())
          and l.created_at > now() - interval '1 hour') >= 60 then
      raise exception 'feedback_rate_limited';
    end if;
  end if;
  insert into public.shoot_day_log(day_id, workspace_id, client_id, body, from_client, author_user, author_name)
  values (p_day_id, p_workspace_id, p_client_id, trim(p_body), not is_team, (select auth.uid()), actor->>'who');
end
$$;

-- ---------- View as client reads shoot days too ----------

create or replace function public.team_preview(p_workspace_id uuid, p_client_id text, p_role text, p_read text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  result jsonb;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id)
     or not exists (select 1 from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id) then
    raise exception 'forbidden';
  end if;
  if p_role is null or p_role not in ('owner', 'approver', 'finance', 'viewer') then
    raise exception 'invalid_role';
  end if;
  if p_read is null or p_read not in ('portal', 'team', 'production', 'cuts', 'invoices', 'shoot') then
    raise exception 'invalid_read';
  end if;
  -- Nothing can be written from here to the end of this transaction.
  perform pg_catalog.set_config('transaction_read_only', 'on', true);
  perform pg_catalog.set_config('gecko.preview', p_workspace_id::text || '|' || p_client_id || '|' || p_role, true);
  result := case p_read
    when 'portal' then public.get_my_portal(p_workspace_id, p_client_id)
    when 'team' then public.get_my_team(p_workspace_id, p_client_id)
    when 'production' then public.get_my_production(p_workspace_id, p_client_id)
    when 'cuts' then public.get_my_cuts(p_workspace_id, p_client_id)
    when 'invoices' then public.get_my_invoices(p_workspace_id, p_client_id)
    when 'shoot' then public.get_shoot_days(p_workspace_id, p_client_id)
  end;
  perform pg_catalog.set_config('gecko.preview', '', true);
  return result;
end
$$;

-- ---------- grants ----------

-- Helpers are only ever called from inside the functions above.
revoke all on function public.shoot_line_keys_ok(text[]), public.shoot_line_changes_ok(jsonb),
  public.shoot_actor(uuid, text, text), public.shoot_reel_to_json(public.shoot_day_reels, public.scripts, boolean),
  public.shoot_day_to_json(public.shoot_days, boolean)
  from public, anon, authenticated;

revoke all on function public.get_shoot_days(uuid, text), public.get_team_shoots(uuid),
  public.save_shoot_day(uuid, text, jsonb), public.remove_shoot_day(uuid, text, uuid),
  public.restore_shoot_day(uuid, text, uuid), public.set_shoot_reels(uuid, text, uuid, uuid[]),
  public.save_shoot_person(uuid, text, uuid, jsonb), public.remove_shoot_person(uuid, text, uuid),
  public.update_shoot_reel(uuid, text, uuid, jsonb), public.order_shoot_reels(uuid, text, uuid, uuid[]),
  public.set_shoot_day_state(uuid, text, uuid, text), public.add_shoot_log(uuid, text, uuid, text)
  from public, anon;
grant execute on function public.get_shoot_days(uuid, text), public.get_team_shoots(uuid),
  public.save_shoot_day(uuid, text, jsonb), public.remove_shoot_day(uuid, text, uuid),
  public.restore_shoot_day(uuid, text, uuid), public.set_shoot_reels(uuid, text, uuid, uuid[]),
  public.save_shoot_person(uuid, text, uuid, jsonb), public.remove_shoot_person(uuid, text, uuid),
  public.update_shoot_reel(uuid, text, uuid, jsonb), public.order_shoot_reels(uuid, text, uuid, uuid[]),
  public.set_shoot_day_state(uuid, text, uuid, text), public.add_shoot_log(uuid, text, uuid, text)
  to authenticated;
