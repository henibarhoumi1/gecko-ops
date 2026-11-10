-- Projects under clients, part 2 (Gecko World V1, phase 2b): every idea, script and shoot day says which
-- project it belongs to, so each screen can show one project at a time; a shoot day can be planned in a
-- chosen project; and a script written from an idea lands in that idea's project.

-- ---------- the client's ideas and scripts carry their project ----------

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
    'projectId', c.project_id,
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
    'projectId', s.project_id,
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

-- ---------- a script follows its idea ----------

create or replace function public.fill_project_id()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  from_idea uuid;
begin
  if new.project_id is null and tg_table_name = 'scripts' then
    from_idea := (to_jsonb(new)->>'concept_id')::uuid;
    if from_idea is not null then
      select c.project_id into new.project_id from public.concepts c
      where c.id = from_idea and c.workspace_id = new.workspace_id and c.client_id = new.client_id;
    end if;
  end if;
  if new.project_id is null then
    select p.id into new.project_id from public.projects p
    where p.workspace_id = new.workspace_id and p.client_id = new.client_id and p.status = 'active'
    order by p.position desc, p.created_at desc
    limit 1;
  elsif not exists (select 1 from public.projects p where p.workspace_id = new.workspace_id
                    and p.id = new.project_id and p.client_id = new.client_id) then
    raise exception 'project_not_found';
  end if;
  return new;
end
$$;

-- ---------- shoot days carry their project ----------

create or replace function public.shoot_day_to_json(d public.shoot_days, p_team boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', d.id, 'day', d.day, 'title', d.title, 'projectId', d.project_id,
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

-- A new shoot day can name its project; an edit leaves the project as it is.
create or replace function public.save_shoot_day(p_workspace_id uuid, p_client_id text, p_day jsonb)
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
      insert into public.shoot_days(workspace_id, client_id, project_id, day, title, call_time, wrap_time, place,
        address, map_link, notes, private_notes, created_by, author_name)
      values (p_workspace_id, p_client_id, nullif(p_day->>'projectId', ''), (p_day->>'day')::date,
        trim(coalesce(p_day->>'title', '')),
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
