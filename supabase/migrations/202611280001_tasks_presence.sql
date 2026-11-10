-- Tasks and presence (Gecko World V1, phase 5).
--
-- Tasks: one list both sides share. Anyone adds a to-do for Gecko or for the client, with an owner and a
-- due date; either side ticks it. Gecko can keep a task private (the client never sees it), and the team
-- can keep tasks that belong to no client. A deleted task goes to the trash like everything else.
--   team with access to the client   read, add, edit, tick, remove anything on that client
--   any team member                  tasks with no client
--   client owner, approver, finance  read the shared tasks, add, tick, edit and remove the ones they added
--   client viewer                    read
--
-- Presence: who else has the same page open. Each open page pings every 20 seconds; one row per person,
-- overwritten each time, so the table never grows past the number of people.
--
-- Nobody touches these tables directly: everyone goes through the functions below.

-- ---------- tables ----------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text,
  project_id text,
  title text not null check (length(trim(title)) between 1 and 200),
  notes text not null default '' check (length(notes) <= 2000),
  -- Whose job it is: Gecko or the client.
  side text not null default 'gecko' check (side in ('gecko', 'client')),
  assignee_name text not null default '' check (length(assignee_name) <= 120),
  due date,
  -- Team only: the client never sees it.
  private boolean not null default false,
  -- Where in the app it's about, as a path: /scripts#script-…
  link text not null default '' check (length(link) <= 300 and (link = '' or link ~ '^/[^\s]*$')),
  done_at timestamptz,
  done_by_name text not null default '' check (length(done_by_name) <= 120),
  from_client boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check (client_id is not null or (not from_client and side = 'gecko'))
);

create index tasks_client on public.tasks(workspace_id, client_id, done_at);
create index tasks_open on public.tasks(workspace_id, due) where done_at is null;

create trigger tasks_project before insert or update of project_id on public.tasks
  for each row execute function public.fill_project_id();
create trigger tasks_to_trash before delete on public.tasks
  for each row execute function public.to_trash();

create table public.presence (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null default '' check (length(client_id) <= 128),
  path text not null default '' check (length(path) <= 300),
  name text not null default '' check (length(name) <= 120),
  team boolean not null,
  seen_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

alter table public.tasks enable row level security;
alter table public.presence enable row level security;
revoke all on public.tasks, public.presence from public, anon, authenticated;

-- ---------- who is asking ----------

-- p_need: 'read' or 'write'. Raises when the caller may not do it. A null client means a team-only task.
create function public.task_actor(p_workspace_id uuid, p_client_id text, p_need text)
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
     and (p_client_id is null or public.has_client_access(p_workspace_id, p_client_id)) then
    return jsonb_build_object('team', true, 'who', coalesce(public.my_member_name(p_workspace_id), 'Gecko'));
  end if;
  if p_client_id is null then raise exception 'forbidden'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_need = 'write' and acc.role not in ('owner', 'approver', 'finance') then
    raise exception 'task_not_allowed';
  end if;
  return jsonb_build_object('team', false,
    'who', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120));
end
$$;

-- ---------- reading ----------

create function public.task_to_json(t public.tasks, p_brand text default null)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', t.id, 'clientId', t.client_id, 'brand', p_brand, 'projectId', t.project_id, 'title', t.title,
    'notes', t.notes, 'side', t.side, 'assignee', t.assignee_name, 'due', t.due, 'private', t.private,
    'link', t.link, 'doneAt', t.done_at, 'doneBy', t.done_by_name, 'fromClient', t.from_client,
    'mine', t.created_by = (select auth.uid()), 'author', t.author_name,
    'createdAt', t.created_at, 'updatedAt', t.updated_at)
$$;

-- One client's tasks, for the team with access and for the client's own people (shared ones only).
-- Open first by due date, then the ones done in the last 14 days.
create function public.get_tasks(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  team boolean := (public.task_actor(p_workspace_id, p_client_id, 'read')->>'team')::boolean;
begin
  return coalesce((
    select jsonb_agg(public.task_to_json(t) order by t.done_at is not null, t.due nulls last, t.created_at)
    from public.tasks t
    where t.workspace_id = p_workspace_id and t.client_id = p_client_id
      and (team or not t.private)
      and (t.done_at is null or t.done_at > now() - interval '14 days')
  ), '[]'::jsonb);
end
$$;

-- Every open task the team member can see, across clients, plus the team's own (no client).
create function public.get_team_tasks(p_workspace_id uuid)
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
    select jsonb_agg(public.task_to_json(t, c.brand) order by t.done_at is not null, t.due nulls last, t.created_at)
    from public.tasks t
    left join public.clients c on c.workspace_id = t.workspace_id and c.id = t.client_id
    where t.workspace_id = p_workspace_id
      and (t.client_id is null or public.has_client_access(p_workspace_id, t.client_id))
      and (t.done_at is null or t.done_at > now() - interval '2 days')
  ), '[]'::jsonb);
end
$$;

-- ---------- writing ----------

-- Adds a task (no id) or changes one. The client can't make a task private, and edits only what they added.
create function public.save_task(p_workspace_id uuid, p_client_id text, p_task jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me jsonb := public.task_actor(p_workspace_id, p_client_id, 'write');
  team boolean := (me->>'team')::boolean;
  v_id uuid;
  v_due date;
begin
  if p_task is null or jsonb_typeof(p_task) <> 'object' then raise exception 'invalid_task'; end if;
  begin
    v_due := nullif(p_task->>'due', '')::date;
  exception when others then
    raise exception 'invalid_task';
  end;
  begin
    if p_task->>'id' is null then
      insert into public.tasks (workspace_id, client_id, project_id, title, notes, side, assignee_name, due,
        private, link, from_client, created_by, author_name)
      values (p_workspace_id, p_client_id, nullif(p_task->>'projectId', ''),
        trim(coalesce(p_task->>'title', '')), coalesce(p_task->>'notes', ''),
        coalesce(p_task->>'side', case when team then 'gecko' else 'client' end),
        left(trim(coalesce(p_task->>'assignee', '')), 120), v_due,
        team and coalesce((p_task->>'private')::boolean, false),
        coalesce(p_task->>'link', ''), not team, (select auth.uid()), me->>'who')
      returning id into v_id;
    else
      update public.tasks set
        title = trim(coalesce(p_task->>'title', title)),
        notes = coalesce(p_task->>'notes', notes),
        side = coalesce(p_task->>'side', side),
        assignee_name = left(trim(coalesce(p_task->>'assignee', assignee_name)), 120),
        due = case when p_task ? 'due' then v_due else due end,
        private = case when team then coalesce((p_task->>'private')::boolean, private) else private end,
        link = coalesce(p_task->>'link', link),
        updated_at = now()
      where workspace_id = p_workspace_id and client_id is not distinct from p_client_id
        and id = (p_task->>'id')::uuid
        and (team or (created_by = (select auth.uid()) and not private))
      returning id into v_id;
      if v_id is null then raise exception 'task_not_found'; end if;
    end if;
  exception when check_violation or invalid_text_representation then
    raise exception 'invalid_task';
  end;
  return v_id;
end
$$;

-- Ticks a task done, or opens it again. Either side, on anything it can see.
create function public.set_task_done(p_workspace_id uuid, p_client_id text, p_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me jsonb := public.task_actor(p_workspace_id, p_client_id, 'write');
begin
  update public.tasks set
    done_at = case when p_done then coalesce(done_at, now()) end,
    done_by_name = case when p_done then me->>'who' else '' end,
    updated_at = now()
  where workspace_id = p_workspace_id and client_id is not distinct from p_client_id and id = p_id
    and ((me->>'team')::boolean or not private);
  if not found then raise exception 'task_not_found'; end if;
end
$$;

-- Removes a task (it goes to the trash). The team removes any; the client only what they added.
create function public.remove_task(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me jsonb := public.task_actor(p_workspace_id, p_client_id, 'write');
begin
  delete from public.tasks
  where workspace_id = p_workspace_id and client_id is not distinct from p_client_id and id = p_id
    and ((me->>'team')::boolean or (created_by = (select auth.uid()) and not private));
  if not found then raise exception 'task_not_found'; end if;
end
$$;

-- ---------- presence ----------

-- "I'm on this page": records the caller and returns the others seen on the same page of the same client
-- in the last 45 seconds. In View as client nothing is written and nobody is returned.
create function public.ping_presence(p_workspace_id uuid, p_client_id text, p_path text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me jsonb;
  v_path text := left(coalesce(p_path, ''), 300);
  v_client text := coalesce(p_client_id, '');
begin
  if coalesce(current_setting('gecko.preview', true), '') <> ''
     or current_setting('transaction_read_only', true) = 'on' then
    return '[]'::jsonb;
  end if;
  me := public.task_actor(p_workspace_id, nullif(v_client, ''), 'read');
  insert into public.presence (workspace_id, user_id, client_id, path, name, team, seen_at)
  values (p_workspace_id, (select auth.uid()), v_client, v_path, left(me->>'who', 120), (me->>'team')::boolean, now())
  on conflict (workspace_id, user_id) do update set
    client_id = excluded.client_id, path = excluded.path, name = excluded.name, team = excluded.team,
    seen_at = excluded.seen_at;
  return coalesce((
    select jsonb_agg(jsonb_build_object('name', p.name, 'team', p.team) order by p.name)
    from public.presence p
    where p.workspace_id = p_workspace_id and p.client_id = v_client and p.path = v_path
      and p.user_id <> (select auth.uid()) and p.seen_at > now() - interval '45 seconds'
      -- The client only ever sees people working on their own space.
      and ((me->>'team')::boolean or p.client_id <> '')
  ), '[]'::jsonb);
end
$$;

-- ---------- View as client reads tasks too ----------

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
  if p_read is null or p_read not in ('portal', 'team', 'production', 'cuts', 'invoices', 'shoot', 'tasks') then
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
    when 'tasks' then public.get_tasks(p_workspace_id, p_client_id)
  end;
  perform pg_catalog.set_config('gecko.preview', '', true);
  return result;
end
$$;

-- ---------- grants ----------

revoke all on function public.task_actor(uuid, text, text), public.task_to_json(public.tasks, text)
  from public, anon, authenticated;
revoke all on function public.get_tasks(uuid, text), public.get_team_tasks(uuid),
  public.save_task(uuid, text, jsonb), public.set_task_done(uuid, text, uuid, boolean),
  public.remove_task(uuid, text, uuid), public.ping_presence(uuid, text, text)
  from public, anon;
grant execute on function public.get_tasks(uuid, text), public.get_team_tasks(uuid),
  public.save_task(uuid, text, jsonb), public.set_task_done(uuid, text, uuid, boolean),
  public.remove_task(uuid, text, uuid), public.ping_presence(uuid, text, text)
  to authenticated;
