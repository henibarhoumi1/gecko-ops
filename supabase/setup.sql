-- Gecko Ops database setup. Paste all of this into Supabase > SQL Editor and press Run, once.

-- ==== 202610140001_phase0_foundation.sql ====
create extension if not exists pgcrypto with schema extensions;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  member_id text not null check (length(member_id) between 1 and 64),
  user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  display_name text not null default '',
  role text not null check (role in ('founder', 'sales', 'editor', 'assistant')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (workspace_id, member_id),
  unique (workspace_id, user_id),
  unique (workspace_id, email)
);

create unique index workspace_one_founder_per_workspace
  on public.workspace_members(workspace_id)
  where role = 'founder' and active;

create table public.clients (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  brand text not null check (length(trim(brand)) between 1 and 160),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id)
);

create table public.projects (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null check (length(id) between 1 and 64),
  client_id text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete restrict
);

create table public.client_assignments (
  workspace_id uuid not null,
  client_id text not null,
  member_id text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, client_id, member_id),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id)
    references public.workspace_members(workspace_id, member_id) on delete cascade
);

create table public.project_assignments (
  workspace_id uuid not null,
  project_id text not null,
  member_id text not null,
  created_at timestamptz not null default now(),
  primary key (workspace_id, project_id, member_id),
  foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id)
    references public.workspace_members(workspace_id, member_id) on delete cascade
);

-- Temporary compatibility storage for non-core collections while existing
-- modules are moved incrementally to relational tables. Scope and ownership
-- are stored in indexed, constrained columns, never inferred from JSON alone.
create table public.workspace_records (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  collection text not null check (collection in (
    'leads', 'outreach', 'contracts', 'invoices', 'tasks', 'msgs',
    'ideas', 'boards', 'expenses', 'quotes'
  )),
  id text not null check (length(id) between 1 and 128),
  client_id text,
  project_id text,
  assigned_member_id text,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, collection, id),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete restrict,
  foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id) on delete restrict,
  foreign key (workspace_id, assigned_member_id)
    references public.workspace_members(workspace_id, member_id) on delete restrict,
  check (project_id is null or client_id is not null)
);

create table public.client_shares (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  project_id text,
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  feedback_targets jsonb not null default '{}'::jsonb
    check (jsonb_typeof(feedback_targets) = 'object'),
  expires_at timestamptz,
  revoked_at timestamptz,
  published_at timestamptz not null default now(),
  published_by uuid not null references auth.users(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete cascade,
  foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id) on delete restrict
);

create table public.client_feedback (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  share_id uuid not null references public.client_shares(id) on delete cascade,
  client_id text not null,
  project_id text,
  kind text not null check (kind in ('comment', 'approve', 'changes')),
  target text not null check (length(target) between 1 and 256),
  text text not null default '' check (length(text) <= 4000),
  who text not null default 'Client' check (length(who) <= 120),
  created_at timestamptz not null default now(),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete cascade,
  foreign key (workspace_id, project_id)
    references public.projects(workspace_id, id) on delete restrict
);

create table public.workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('sales', 'editor', 'assistant')),
  token_hash bytea not null unique check (octet_length(token_hash) = 32),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create table public.workspace_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now()
);

create table public.invoice_sequences (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  year integer not null check (year between 2000 and 9999),
  next_number integer not null default 1 check (next_number > 0),
  primary key (workspace_id, year)
);

create index projects_client_idx on public.projects(workspace_id, client_id);
create index records_project_idx on public.workspace_records(workspace_id, project_id);
create index records_client_idx on public.workspace_records(workspace_id, client_id);
create index records_assignee_idx on public.workspace_records(workspace_id, assigned_member_id);
create index shares_client_idx on public.client_shares(workspace_id, client_id);
create index feedback_share_idx on public.client_feedback(share_id, created_at desc);
create index invites_workspace_idx on public.workspace_invites(workspace_id, email);

create function public.validate_workspace_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  project_client text;
  client_in_data text := nullif(new.data->>'clientId', '');
  project_in_data text := nullif(new.data->>'projectId', '');
begin
  if jsonb_typeof(new.data) is distinct from 'object'
     or (new.data ? 'id' and new.data->>'id' <> new.id) then
    raise exception 'invalid_record';
  end if;
  if project_in_data is not null and project_in_data <> coalesce(new.project_id, '') then
    raise exception 'invalid_project_reference';
  end if;
  if client_in_data is not null and client_in_data <> coalesce(new.client_id, '') then
    raise exception 'invalid_client_reference';
  end if;
  if new.project_id is not null then
    select p.client_id into project_client
    from public.projects p
    where p.workspace_id = new.workspace_id and p.id = new.project_id;
    if project_client is null or new.client_id is distinct from project_client then
      raise exception 'project_client_mismatch';
    end if;
  end if;
  if new.client_id is not null and not exists (
    select 1 from public.clients c
    where c.workspace_id = new.workspace_id and c.id = new.client_id
  ) then raise exception 'unknown_client'; end if;

  case new.collection
    when 'leads' then
      if length(trim(coalesce(new.data->>'brand', ''))) not between 1 and 160
         or new.data->>'stage' not in (
           'prospect', 'contacted', 'conversation', 'meeting_booked', 'qualified',
           'proposal_sent', 'negotiation', 'accepted', 'signed', 'won', 'lost', 'nurture'
         ) then raise exception 'invalid_lead'; end if;
    when 'outreach' then
      if new.data->>'date' is null or
         jsonb_typeof(new.data->'dms') is distinct from 'number' or
         jsonb_typeof(new.data->'replies') is distinct from 'number' or
         jsonb_typeof(new.data->'calls') is distinct from 'number' then raise exception 'invalid_outreach'; end if;
    when 'contracts' then
      if new.client_id is null or new.data->>'pack' is null
         or new.data->>'start' is null
         or new.data->>'status' not in ('active', 'ended') then raise exception 'invalid_contract'; end if;
    when 'invoices' then
      if new.client_id is null
         or new.data->>'kind' not in ('deposit', 'balance', 'month', 'extra', 'credit')
         or jsonb_typeof(new.data->'amount') is distinct from 'number'
         or jsonb_typeof(new.data->'payments') is distinct from 'array'
         or coalesce(new.data->>'no', '') <> '' then raise exception 'invalid_invoice'; end if;
    when 'tasks' then
      if length(trim(coalesce(new.data->>'title', ''))) not between 1 and 200 then
        raise exception 'invalid_task';
      end if;
    when 'msgs' then
      if length(trim(coalesce(new.data->>'text', ''))) not between 1 and 2000
         or new.data->>'ch' is null then raise exception 'invalid_message'; end if;
    when 'ideas' then
      if new.data->>'stage' not in ('idea', 'concept', 'script', 'ready', 'shot', 'parked') then
        raise exception 'invalid_idea';
      end if;
    when 'boards' then
      if jsonb_typeof(new.data->'items') is distinct from 'array'
         or jsonb_array_length(new.data->'items') > 500 then raise exception 'invalid_board'; end if;
    when 'expenses' then
      if length(trim(coalesce(new.data->>'label', ''))) not between 1 and 200
         or (new.data->>'amount') !~ '^[0-9]+(\.[0-9]{1,3})?$'
         or (new.data->>'amount')::numeric <= 0
         or new.data->>'date' is null then raise exception 'invalid_expense'; end if;
    when 'quotes' then
      if new.client_id is null or jsonb_typeof(new.data->'lines') is distinct from 'array'
         or new.data->>'status' not in ('draft', 'sent', 'accepted', 'declined', 'expired') then
        raise exception 'invalid_quote';
      end if;
  end case;
  new.updated_at := now();
  return new;
end
$$;

create function public.add_team_client_feedback(
  p_workspace_id uuid, p_share_id uuid, p_project_id text,
  p_kind text, p_target text, p_text text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.client_shares%rowtype;
  f_id uuid;
  feedback_project text;
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  if p_kind not in ('comment', 'approve', 'changes')
     or p_target is null or length(p_target) not between 1 and 256
     or p_text is null or length(p_text) > 4000 then raise exception 'invalid_feedback'; end if;
  select * into s from public.client_shares
  where workspace_id = p_workspace_id and id = p_share_id and revoked_at is null
    and public.has_client_access(workspace_id, client_id);
  if not found or not coalesce(s.feedback_targets->p_target, '[]'::jsonb) @> jsonb_build_array(p_kind) then
    raise exception 'invalid_share_or_target';
  end if;
  feedback_project := coalesce(nullif(p_project_id, ''), s.project_id);
  if feedback_project is not null and (
    (s.project_id is not null and feedback_project <> s.project_id)
    or not exists (
      select 1 from jsonb_array_elements(coalesce(s.snapshot->'projects', '[]'::jsonb)) as projects(project)
      where project->>'id' = feedback_project
    )
  ) then raise exception 'invalid_feedback_project'; end if;
  insert into public.client_feedback(
    workspace_id, share_id, client_id, project_id, kind, target, text, who
  ) values (s.workspace_id, s.id, s.client_id, feedback_project, p_kind, p_target, p_text, 'Client (WhatsApp)')
  returning id into f_id;
  return f_id;
end
$$;

create trigger workspace_records_validate
  before insert or update on public.workspace_records
  for each row execute function public.validate_workspace_record();

create function public.member_role(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select wm.role
  from public.workspace_members wm
  where wm.workspace_id = p_workspace_id
    and wm.user_id = (select auth.uid())
    and wm.active
  limit 1
$$;

create function public.is_workspace_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.member_role(p_workspace_id) is not null
$$;

create function public.has_client_access(p_workspace_id uuid, p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.member_role(p_workspace_id) in ('founder', 'sales') then true
    when public.member_role(p_workspace_id) in ('editor', 'assistant') then
      exists (
        select 1 from public.client_assignments ca
        join public.workspace_members wm
          on wm.workspace_id = ca.workspace_id and wm.member_id = ca.member_id
        where ca.workspace_id = p_workspace_id
          and ca.client_id = p_client_id
          and wm.user_id = (select auth.uid())
          and wm.active
      ) or exists (
        select 1 from public.project_assignments pa
        join public.projects p
          on p.workspace_id = pa.workspace_id and p.id = pa.project_id
        join public.workspace_members wm
          on wm.workspace_id = pa.workspace_id and wm.member_id = pa.member_id
        where pa.workspace_id = p_workspace_id and p.client_id = p_client_id
          and wm.user_id = (select auth.uid()) and wm.active
      )
    else false
  end
$$;

create function public.has_project_access(p_workspace_id uuid, p_project_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.member_role(p_workspace_id) in ('founder', 'sales') then true
    when public.member_role(p_workspace_id) in ('editor', 'assistant') then
      exists (
        select 1 from public.project_assignments pa
        join public.workspace_members wm
          on wm.workspace_id = pa.workspace_id and wm.member_id = pa.member_id
        where pa.workspace_id = p_workspace_id and pa.project_id = p_project_id
          and wm.user_id = (select auth.uid()) and wm.active
      )
    else false
  end
$$;

create function public.can_read_collection(p_workspace_id uuid, p_collection text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.member_role(p_workspace_id)
    when 'founder' then true
    when 'sales' then p_collection in (
      'clients', 'projects', 'leads', 'outreach', 'contracts', 'tasks',
      'msgs', 'ideas', 'boards', 'shares', 'feedback', 'quotes', 'team'
    )
    when 'editor' then p_collection in (
      'clients', 'projects', 'tasks', 'msgs', 'ideas', 'boards', 'team'
    )
    when 'assistant' then p_collection in (
      'clients', 'projects', 'tasks', 'msgs', 'boards', 'team'
    )
    else false
  end
$$;

create function public.can_write_collection(p_workspace_id uuid, p_collection text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.member_role(p_workspace_id)
    when 'founder' then true
    when 'sales' then p_collection in (
      'clients', 'projects', 'leads', 'outreach', 'tasks', 'msgs',
      'ideas', 'boards', 'shares', 'feedback', 'quotes'
    )
    when 'editor' then p_collection in (
      'projects', 'tasks', 'msgs', 'ideas', 'boards'
    )
    when 'assistant' then p_collection in ('tasks', 'msgs', 'boards')
    else false
  end
$$;

create function public.sanitize_public_snapshot(p_snapshot jsonb)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  out_snapshot jsonb;
  brand_out jsonb;
  contact_out jsonb;
  company_out jsonb;
  sections_out jsonb;
  progress_out jsonb;
  project_item jsonb;
  reel_item jsonb;
  hook_item jsonb;
  carousel_item jsonb;
  idea_item jsonb;
  need_item jsonb;
  timeline_item jsonb;
  invoice_item jsonb;
  board_item jsonb;
  projects_out jsonb := '[]'::jsonb;
  invoices_out jsonb := '[]'::jsonb;
  boards_out jsonb := '[]'::jsonb;
  reels_out jsonb;
  hooks_out jsonb;
  carousels_out jsonb;
  ideas_out jsonb;
  needs_out jsonb;
  timeline_out jsonb;
  angles_out jsonb;
  angles_item jsonb;
  filtered_projects jsonb := '[]'::jsonb;
  filtered_project jsonb;
  filtered_reels jsonb;
  filtered_reel jsonb;
  has_scripts boolean;
  has_files boolean;
  has_plan boolean;
  has_timeline boolean;
  has_invoices boolean;
  has_boards boolean;
begin
  if jsonb_typeof(p_snapshot) is distinct from 'object' then
    raise exception 'invalid_snapshot';
  end if;
  brand_out := jsonb_strip_nulls(jsonb_build_object('name', p_snapshot->'brand'->'name'));
  contact_out := jsonb_strip_nulls(jsonb_build_object('name', p_snapshot->'contact'->'name'));
  company_out := jsonb_strip_nulls(jsonb_build_object(
    'name', p_snapshot->'company'->'name', 'phone', p_snapshot->'company'->'phone',
    'email', p_snapshot->'company'->'email', 'instagram', p_snapshot->'company'->'instagram'
  ));
  sections_out := jsonb_build_object(
    'plan', coalesce((p_snapshot->'sections'->>'plan')::boolean, false),
    'scripts', coalesce((p_snapshot->'sections'->>'scripts')::boolean, false),
    'files', coalesce((p_snapshot->'sections'->>'files')::boolean, false),
    'timeline', coalesce((p_snapshot->'sections'->>'timeline')::boolean, false),
    'invoices', coalesce((p_snapshot->'sections'->>'invoices')::boolean, false),
    'boards', coalesce((p_snapshot->'sections'->>'boards')::boolean, false)
  );
  has_plan := (sections_out->>'plan')::boolean;
  has_scripts := (sections_out->>'scripts')::boolean;
  has_files := (sections_out->>'files')::boolean;
  has_timeline := (sections_out->>'timeline')::boolean;
  has_invoices := (sections_out->>'invoices')::boolean;
  has_boards := (sections_out->>'boards')::boolean;
  for project_item in
    select value from jsonb_array_elements(coalesce(p_snapshot->'projects', '[]'::jsonb))
  loop
    reels_out := '[]'::jsonb;
    for reel_item in select value from jsonb_array_elements(coalesce(project_item->'reels', '[]'::jsonb))
    loop
      hooks_out := '[]'::jsonb;
      for hook_item in select value from jsonb_array_elements(coalesce(reel_item->'hooks', '[]'::jsonb))
      loop
        hooks_out := hooks_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
          'text', hook_item->'text', 'status', hook_item->'status'
        )));
      end loop;
      reels_out := reels_out || jsonb_build_array(
        jsonb_strip_nulls(jsonb_build_object(
          'id', reel_item->'id', 'angle', reel_item->'angle', 'mode', reel_item->'mode',
          'script', reel_item->'script', 'ideaId', reel_item->'ideaId', 'hooks', hooks_out,
          'files', (
            select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
              'code', f->'code', 'status', f->'status', 'drive', f->'drive', 'clientOk', f->'clientOk'
            ))), '[]'::jsonb)
            from jsonb_array_elements(coalesce(reel_item->'files', '[]'::jsonb)) f
          )
        ))
      );
    end loop;
    carousels_out := '[]'::jsonb;
    for carousel_item in select value from jsonb_array_elements(coalesce(project_item->'carousels', '[]'::jsonb))
    loop
      carousels_out := carousels_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'id', carousel_item->'id', 'angle', carousel_item->'angle', 'title', carousel_item->'title',
        'status', carousel_item->'status', 'code', carousel_item->'code', 'drive', carousel_item->'drive',
        'clientOk', carousel_item->'clientOk'
      )));
    end loop;
    ideas_out := '[]'::jsonb;
    for idea_item in select value from jsonb_array_elements(coalesce(project_item->'ideas', '[]'::jsonb))
    loop
      ideas_out := ideas_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'id', idea_item->'id', 'title', idea_item->'title', 'hook', idea_item->'hook',
        'concept', idea_item->'concept', 'script', idea_item->'script', 'mode', idea_item->'mode'
      )));
    end loop;
    needs_out := '[]'::jsonb;
    for need_item in select value from jsonb_array_elements(coalesce(project_item->'needs', '[]'::jsonb))
    loop
      needs_out := needs_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'kind', need_item->'kind', 'project', need_item->'project', 'no', need_item->'no',
        'amount', need_item->'amount', 'due', need_item->'due', 'late', need_item->'late',
        'date', need_item->'date', 'text', need_item->'text'
      )));
    end loop;
    timeline_out := '[]'::jsonb;
    for timeline_item in select value from jsonb_array_elements(coalesce(project_item->'timeline', '[]'::jsonb))
    loop
      timeline_out := timeline_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'key', timeline_item->'key', 'label', timeline_item->'label',
        'date', timeline_item->'date', 'done', timeline_item->'done'
      )));
    end loop;
    angles_out := '[]'::jsonb;
    for angles_item in select value from jsonb_array_elements(coalesce(project_item->'angles', '[]'::jsonb))
    loop
      angles_out := angles_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
        'name', angles_item->'name', 'why', angles_item->'why'
      )));
    end loop;
    progress_out := jsonb_strip_nulls(jsonb_build_object(
      'done', project_item->'progress'->'done',
      'total', project_item->'progress'->'total'
    ));
    projects_out := projects_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'id', project_item->'id', 'name', project_item->'name', 'pack', project_item->'pack',
      'monthly', project_item->'monthly', 'stage', project_item->'stage',
      'stageIdx', project_item->'stageIdx', 'shootDate', project_item->'shootDate',
      'planApproved', project_item->'planApproved', 'planApprovedOn', project_item->'planApprovedOn',
      'unlocked', project_item->'unlocked', 'progress', progress_out,
      'angles', angles_out, 'reels', reels_out, 'carousels', carousels_out,
      'ideas', ideas_out, 'needs', needs_out, 'timeline', timeline_out
    )));
  end loop;
  for invoice_item in select value from jsonb_array_elements(coalesce(p_snapshot->'invoices', '[]'::jsonb))
  loop
    invoices_out := invoices_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'no', invoice_item->'no', 'label', invoice_item->'label', 'project', invoice_item->'project',
      'kind', invoice_item->'kind', 'amount', invoice_item->'amount', 'total', invoice_item->'total',
      'status', invoice_item->'status', 'issued', invoice_item->'issued', 'due', invoice_item->'due',
      'balance', invoice_item->'balance'
    )));
  end loop;
  for board_item in select value from jsonb_array_elements(coalesce(p_snapshot->'boards', '[]'::jsonb))
  loop
    boards_out := boards_out || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object(
      'title', board_item->'title', 'svg', board_item->'svg'
    )));
  end loop;
  for filtered_project in select value from jsonb_array_elements(projects_out)
  loop
    filtered_reels := '[]'::jsonb;
    for filtered_reel in
      select value from jsonb_array_elements(coalesce(filtered_project->'reels', '[]'::jsonb))
    loop
      if not has_scripts then
        filtered_reel := filtered_reel - 'hooks' - 'script' - 'ideaId';
      end if;
      if not has_files then
        filtered_reel := filtered_reel - 'files';
      end if;
      filtered_reels := filtered_reels || jsonb_build_array(filtered_reel);
    end loop;
    filtered_project := jsonb_set(filtered_project, '{angles}',
      case when has_plan then filtered_project->'angles' else '[]'::jsonb end, true);
    filtered_project := jsonb_set(filtered_project, '{reels}',
      case when has_scripts or has_files then filtered_reels else '[]'::jsonb end, true);
    filtered_project := jsonb_set(filtered_project, '{carousels}',
      case when has_scripts or has_files then filtered_project->'carousels' else '[]'::jsonb end, true);
    filtered_project := jsonb_set(filtered_project, '{ideas}',
      case when has_scripts then filtered_project->'ideas' else '[]'::jsonb end, true);
    filtered_project := jsonb_set(filtered_project, '{needs}',
      case when has_invoices then filtered_project->'needs' else (
        select coalesce(jsonb_agg(n), '[]'::jsonb)
        from jsonb_array_elements(coalesce(filtered_project->'needs', '[]'::jsonb)) n
        where n->>'kind' not in ('deposit', 'balance', 'month', 'invoice')
      ) end, true);
    filtered_project := jsonb_set(filtered_project, '{timeline}',
      case when has_timeline then filtered_project->'timeline' else '[]'::jsonb end, true);
    filtered_projects := filtered_projects || jsonb_build_array(filtered_project);
  end loop;
  out_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'v', p_snapshot->'v', 'brand', brand_out, 'contact', contact_out,
    'company', company_out, 'lang', p_snapshot->'lang', 'title', p_snapshot->'title',
    'sections', sections_out, 'projects', filtered_projects,
    'invoices', case when has_invoices then invoices_out else '[]'::jsonb end,
    'boards', case when has_boards then boards_out else '[]'::jsonb end
  ));
  return out_snapshot;
end
$$;

create function public.validate_feedback_targets(p_snapshot jsonb, p_targets jsonb)
returns void
language plpgsql
immutable
set search_path = ''
as $$
declare
  target_key text;
  allowed_kinds jsonb;
begin
  if jsonb_typeof(p_targets) is distinct from 'object' then raise exception 'invalid_targets'; end if;
  for target_key, allowed_kinds in select key, value from jsonb_each(p_targets)
  loop
    if jsonb_typeof(allowed_kinds) is distinct from 'array'
       or jsonb_array_length(allowed_kinds) = 0
       or exists (
         select 1 from jsonb_array_elements_text(allowed_kinds) as kinds(kind)
         where kind not in ('comment', 'approve', 'changes')
       ) then raise exception 'invalid_targets'; end if;
    if target_key = 'plan' then
      if coalesce((p_snapshot->'sections'->>'plan')::boolean, false) is not true then
        raise exception 'invalid_target';
      end if;
    elsif target_key <> 'other' then
      if not (
        target_key like 'reel:%' and exists (
          select 1 from jsonb_array_elements(coalesce(p_snapshot->'projects', '[]'::jsonb)) as projects(project)
          cross join lateral jsonb_array_elements(coalesce(project->'reels', '[]'::jsonb)) as reels(reel)
          where 'reel:' || coalesce(reel->>'id', '') = target_key
        )
      ) and not (
        target_key like 'idea:%' and exists (
          select 1 from jsonb_array_elements(coalesce(p_snapshot->'projects', '[]'::jsonb)) as projects(project)
          where exists (
            select 1 from jsonb_array_elements(coalesce(project->'ideas', '[]'::jsonb)) as ideas(idea)
            where 'idea:' || coalesce(idea->>'id', '') = target_key
          ) or exists (
            select 1 from jsonb_array_elements(coalesce(project->'reels', '[]'::jsonb)) as reels(reel)
            where 'idea:' || coalesce(reel->>'ideaId', '') = target_key
          )
        )
      ) then raise exception 'invalid_target'; end if;
    end if;
  end loop;
end
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invites enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.client_assignments enable row level security;
alter table public.project_assignments enable row level security;
alter table public.workspace_records enable row level security;
alter table public.client_shares enable row level security;
alter table public.client_feedback enable row level security;
alter table public.workspace_settings enable row level security;
alter table public.invoice_sequences enable row level security;

create policy workspaces_member_read on public.workspaces
  for select to authenticated using (public.is_workspace_member(id));
create policy members_same_workspace_read on public.workspace_members
  for select to authenticated using (public.is_workspace_member(workspace_id));
create policy invites_founder_read on public.workspace_invites
  for select to authenticated using (public.member_role(workspace_id) = 'founder');
create policy clients_assigned_read on public.clients
  for select to authenticated using (public.has_client_access(workspace_id, id));
create policy projects_assigned_read on public.projects
  for select to authenticated using (public.has_project_access(workspace_id, id));
create policy client_assignments_founder_manage on public.client_assignments
  for all to authenticated
  using (public.member_role(workspace_id) = 'founder')
  with check (public.member_role(workspace_id) = 'founder');
create policy project_assignments_founder_manage on public.project_assignments
  for all to authenticated
  using (public.member_role(workspace_id) = 'founder')
  with check (public.member_role(workspace_id) = 'founder');
create policy records_role_read on public.workspace_records
  for select to authenticated
  using (
    public.can_read_collection(workspace_id, collection)
    and (project_id is null or public.has_project_access(workspace_id, project_id))
    and (client_id is null or public.has_client_access(workspace_id, client_id))
    and (assigned_member_id is null or assigned_member_id in (
      select wm.member_id from public.workspace_members wm
      where wm.workspace_id = workspace_records.workspace_id
        and wm.user_id = (select auth.uid()) and wm.active
    ) or public.member_role(workspace_id) in ('founder', 'sales'))
  );
create policy shares_team_read on public.client_shares
  for select to authenticated using (
    public.can_read_collection(workspace_id, 'shares')
    and public.has_client_access(workspace_id, client_id)
  );
create policy feedback_team_read on public.client_feedback
  for select to authenticated using (
    public.can_read_collection(workspace_id, 'feedback')
    and public.has_client_access(workspace_id, client_id)
  );
create policy settings_founder_read on public.workspace_settings
  for select to authenticated using (public.member_role(workspace_id) = 'founder');
create policy invoice_sequence_founder_read on public.invoice_sequences
  for select to authenticated using (public.member_role(workspace_id) = 'founder');

-- Browser roles cannot read JSONB rows directly. All app data is served by
-- role-aware RPCs, which also strip sensitive project fields for non-founders.
revoke all on public.workspaces, public.workspace_members, public.clients,
  public.projects, public.client_assignments, public.project_assignments,
  public.workspace_records, public.client_shares, public.client_feedback
  , public.workspace_invites, public.workspace_settings, public.invoice_sequences
  from anon, authenticated;

create function public.get_public_client_share(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_snapshot jsonb;
begin
  if p_token is null or length(p_token) < 40 or length(p_token) > 128 then
    return null;
  end if;
  select jsonb_build_object(
    'v', s.snapshot->'v',
    'brand', s.snapshot->'brand',
    'contact', s.snapshot->'contact',
    'company', s.snapshot->'company',
    'lang', s.snapshot->'lang',
    'title', s.snapshot->'title',
    'sections', s.snapshot->'sections',
    'projects', s.snapshot->'projects',
    'invoices', s.snapshot->'invoices',
    'boards', s.snapshot->'boards'
  )
  into v_snapshot
  from public.client_shares s
  where s.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and s.revoked_at is null
    and (s.expires_at is null or s.expires_at > now());
  if v_snapshot is null then return null; end if;
  return jsonb_build_object(
    'enabled', true, 'snapshot', v_snapshot,
    'publishedAt', (
      select s.published_at from public.client_shares s
      where s.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
        and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())
    )
  );
end
$$;

create function public.submit_client_feedback(
  p_token text, p_kind text, p_target text, p_text text,
  p_who text default 'Client', p_project_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.client_shares%rowtype;
  f_id uuid;
  feedback_project text;
begin
  if p_token is null or length(p_token) < 40 or length(p_token) > 128 then
    raise exception 'invalid_share';
  end if;
  if p_kind not in ('comment', 'approve', 'changes')
     or p_target is null or length(p_target) not between 1 and 256
     or p_text is null or length(p_text) > 4000 then
    raise exception 'invalid_feedback';
  end if;
  select * into s from public.client_shares
  where token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and revoked_at is null
    and (expires_at is null or expires_at > now());
  if not found or not (s.feedback_targets ? p_target)
     or not coalesce(s.feedback_targets->p_target, '[]'::jsonb) @> jsonb_build_array(p_kind) then
    raise exception 'invalid_share_or_target';
  end if;
  if p_target = 'other' then raise exception 'invalid_share_or_target'; end if;
  feedback_project := coalesce(nullif(p_project_id, ''), s.project_id);
  if feedback_project is not null and (
    (s.project_id is not null and feedback_project <> s.project_id)
    or not exists (
      select 1 from jsonb_array_elements(coalesce(s.snapshot->'projects', '[]'::jsonb)) as projects(project)
      where project->>'id' = feedback_project
    )
  ) then raise exception 'invalid_feedback_project'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(s.id::text, 0));
  if (
    select count(*) from public.client_feedback f
    where f.share_id = s.id and f.created_at > now() - interval '1 hour'
  ) >= 10 then raise exception 'feedback_rate_limited'; end if;
  insert into public.client_feedback(
    workspace_id, share_id, client_id, project_id, kind, target, text, who
  ) values (
    s.workspace_id, s.id, s.client_id, feedback_project, p_kind, p_target,
    p_text, 'Client'
  ) returning id into f_id;
  return f_id;
end
$$;

create function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  w_id uuid;
  member_key text;
  user_email text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  user_email := lower(coalesce((select auth.jwt()->>'email'), ''));
  if user_email = '' or not exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  ) then raise exception 'verified_email_required'; end if;
  insert into public.workspaces(name) values (trim(p_name)) returning id into w_id;
  member_key := 'm' || left(replace((select auth.uid())::text, '-', ''), 16);
  insert into public.workspace_members(
    workspace_id, member_id, user_id, email, display_name, role
  ) values (
    w_id, member_key, (select auth.uid()), user_email,
    coalesce(nullif(trim((select auth.jwt()->>'user_metadata')::jsonb->>'name'), ''), 'Founder'),
    'founder'
  );
  insert into public.workspace_settings(workspace_id, data) values (w_id, '{}'::jsonb);
  return w_id;
end
$$;

create function public.get_my_workspaces()
returns table (id uuid, name text, role text)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.name, wm.role
  from public.workspace_members wm
  join public.workspaces w on w.id = wm.workspace_id
  where wm.user_id = (select auth.uid()) and wm.active
  order by w.created_at
$$;

create function public.invite_workspace_member(
  p_workspace_id uuid, p_email text, p_role text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text;
begin
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  if p_role not in ('sales', 'editor', 'assistant')
     or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'invalid_invite';
  end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.workspace_invites(
    workspace_id, email, role, token_hash, expires_at, invited_by
  ) values (
    p_workspace_id, lower(trim(p_email)), p_role,
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    now() + interval '7 days', (select auth.uid())
  )
  on conflict (workspace_id, email) do update set
    role = excluded.role, token_hash = excluded.token_hash,
    expires_at = excluded.expires_at, accepted_at = null,
    invited_by = excluded.invited_by, created_at = now();
  return raw_token;
end
$$;

create function public.accept_workspace_invite(p_token text, p_display_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.workspace_invites%rowtype;
  user_email text;
  member_key text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  user_email := lower(coalesce((select auth.jwt()->>'email'), ''));
  if p_token is null or length(p_token) <> 64 or not exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  ) then raise exception 'invalid_invite'; end if;
  select * into inv from public.workspace_invites
  where token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and accepted_at is null and expires_at > now()
    and email = user_email
  for update;
  if not found then raise exception 'invalid_invite'; end if;
  member_key := 'm' || left(replace((select auth.uid())::text, '-', ''), 16);
  insert into public.workspace_members(
    workspace_id, member_id, user_id, email, display_name, role
  ) values (
    inv.workspace_id, member_key, (select auth.uid()), user_email,
    left(coalesce(nullif(trim(p_display_name), ''), 'Team member'), 120), inv.role
  );
  update public.workspace_invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end
$$;

create function public.remove_workspace_member(p_workspace_id uuid, p_member_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  update public.workspace_members set active = false
  where workspace_id = p_workspace_id and member_id = p_member_id and role <> 'founder';
  if not found then raise exception 'member_not_found'; end if;
end
$$;

create function public.get_workspace_config(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  role_name text := public.member_role(p_workspace_id);
  cfg jsonb;
  safe_packs jsonb;
begin
  if role_name is null then raise exception 'forbidden'; end if;
  select data into cfg from public.workspace_settings where workspace_id = p_workspace_id;
  if role_name = 'founder' then return cfg; end if;
  -- Non-founders get operational offer data, not costs, payroll, tax, cap,
  -- commission, or opening-cash figures.
  cfg := coalesce(cfg, '{}'::jsonb) - array['rates', 'levels']::text[];
  select coalesce(jsonb_object_agg(k, v - 'cost'), '{}'::jsonb)
    into safe_packs from jsonb_each(coalesce(cfg->'packs', '{}'::jsonb)) e(k, v);
  cfg := jsonb_set(cfg, '{packs}', safe_packs, true);
  cfg := jsonb_set(cfg, '{company}',
    coalesce(cfg->'company', '{}'::jsonb) - array['mf', 'legal', 'address', 'invoiceNote']::text[], true);
  return jsonb_set(
    cfg,
    '{rules}',
    coalesce(cfg->'rules', '{}'::jsonb) - array[
      'salary', 'commission', 'finderPct', 'shareClients', 'retainer',
      'retainerFrom', 'sharePayee', 'cap', 'reserve', 'stamp',
      'withholding', 'vat', 'openingCash', 'dueDays', 'extrasDirect',
      'floor', 'adBudget', 'spendApproval'
    ]::text[],
    true
  );
end
$$;

create function public.set_workspace_config(p_workspace_id uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  if jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_config'; end if;
  insert into public.workspace_settings(workspace_id, data, updated_at)
  values (p_workspace_id, p_data, now())
  on conflict (workspace_id) do update set data = excluded.data, updated_at = now();
end
$$;

create function public.get_workspace_records(p_workspace_id uuid, p_collection text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  role_name text := public.member_role(p_workspace_id);
begin
  if role_name is null or not public.can_read_collection(p_workspace_id, p_collection) then
    raise exception 'forbidden';
  end if;
  if p_collection = 'clients' then
    return query
      select jsonb_set(c.data, '{id}', to_jsonb(c.id), true)
      from public.clients c
      where c.workspace_id = p_workspace_id
        and public.has_client_access(c.workspace_id, c.id);
  elsif p_collection = 'projects' then
    return query
      select jsonb_set(
        case when role_name = 'founder' then p.data
          else p.data - array['costs', 'payout', 'mohamed', 'commission', 'profit']::text[]
        end,
        '{clientId}', to_jsonb(p.client_id), true
      ) || jsonb_build_object('id', p.id)
      from public.projects p
      where p.workspace_id = p_workspace_id
        and public.has_project_access(p.workspace_id, p.id);
  elsif p_collection = 'team' then
    return query
      select jsonb_build_object(
        'id', wm.member_id, 'name', wm.display_name, 'role', wm.role,
        'userId', case when wm.user_id = (select auth.uid()) then wm.user_id::text else null end
      )
      from public.workspace_members wm
      where wm.workspace_id = p_workspace_id and wm.active
        and public.is_workspace_member(wm.workspace_id);
  elsif p_collection = 'shares' then
    return query
      select jsonb_build_object(
        'id', s.id::text, 'clientId', s.client_id,
        'projectId', coalesce(s.project_id, ''),
        'enabled', s.revoked_at is null and (s.expires_at is null or s.expires_at > now()),
        'expiresAt', s.expires_at, 'snapshot', public.sanitize_public_snapshot(s.snapshot),
        'feedbackTargets', s.feedback_targets, 'publishedAt', s.published_at,
        'publishedBy', s.published_by::text
      )
      from public.client_shares s
      where s.workspace_id = p_workspace_id
        and public.has_client_access(s.workspace_id, s.client_id);
  elsif p_collection = 'feedback' then
    return query
      select jsonb_build_object(
        'id', f.id::text, 'shareId', f.share_id::text, 'clientId', f.client_id,
        'projectId', coalesce(f.project_id, ''), 'kind', f.kind, 'target', f.target,
        'text', f.text, 'who', f.who, 'at', f.created_at
      )
      from public.client_feedback f
      where f.workspace_id = p_workspace_id
        and public.has_client_access(f.workspace_id, f.client_id);
  else
    return query
      select r.data || jsonb_build_object('id', r.id)
      from public.workspace_records r
      where r.workspace_id = p_workspace_id and r.collection = p_collection
        and public.can_read_collection(r.workspace_id, r.collection)
        and (r.project_id is null or public.has_project_access(r.workspace_id, r.project_id))
        and (r.client_id is null or public.has_client_access(r.workspace_id, r.client_id))
        and (r.assigned_member_id is null or r.assigned_member_id in (
          select wm.member_id from public.workspace_members wm
          where wm.workspace_id = r.workspace_id
            and wm.user_id = (select auth.uid()) and wm.active
        ) or role_name in ('founder', 'sales'));
  end if;
end
$$;

create function public.put_workspace_record(
  p_workspace_id uuid, p_collection text, p_id text, p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_name text := public.member_role(p_workspace_id);
  c_id text;
  p_id_ref text;
  assigned_id text;
  old_data jsonb;
  old_client_id text;
  old_project_id text;
  old_assigned_id text;
  old_record boolean := false;
  saved jsonb;
begin
  if role_name is null or not public.can_write_collection(p_workspace_id, p_collection) then
    raise exception 'forbidden';
  end if;
  if p_id is null or length(p_id) not between 1 and 128
     or jsonb_typeof(p_data) <> 'object' then raise exception 'invalid_record'; end if;
  if p_data ? 'id' and p_data->>'id' <> p_id then raise exception 'id_mismatch'; end if;

  if p_collection = 'clients' then
    if role_name not in ('founder', 'sales') then raise exception 'forbidden'; end if;
    if not public.has_client_access(p_workspace_id, p_id) then raise exception 'forbidden_client'; end if;
    if length(trim(coalesce(p_data->>'brand', ''))) not between 1 and 160 then raise exception 'invalid_client'; end if;
    insert into public.clients(workspace_id, id, brand, data, updated_at)
    values (p_workspace_id, p_id, trim(p_data->>'brand'), p_data, now())
    on conflict (workspace_id, id) do update set
      brand = excluded.brand, data = excluded.data, updated_at = now()
    where public.has_client_access(p_workspace_id, p_id);
    return p_data || jsonb_build_object('id', p_id);
  elsif p_collection = 'projects' then
    c_id := p_data->>'clientId';
    if c_id is null or not public.has_client_access(p_workspace_id, c_id) then raise exception 'invalid_client_scope'; end if;
    select data into old_data from public.projects
      where workspace_id = p_workspace_id and id = p_id;
    if role_name = 'editor' then
      if old_data is null or not public.has_project_access(p_workspace_id, p_id)
         or p_data ?| array['costs', 'payout', 'mohamed', 'commission', 'profit']
         or (old_data - array['reels', 'carousels', 'log', 'costs', 'payout', 'mohamed', 'commission', 'profit', 'id']::text[])
            <> (p_data - array['reels', 'carousels', 'log', 'costs', 'payout', 'mohamed', 'commission', 'profit', 'id']::text[]) then
        raise exception 'forbidden_project_update';
      end if;
      p_data := old_data || p_data;
    elsif role_name = 'sales' then
      if p_data ?| array['costs', 'payout', 'mohamed', 'commission', 'profit'] then
        raise exception 'forbidden_finance_fields';
      end if;
      if old_data is not null then
        p_data := p_data || coalesce((
          select jsonb_object_agg(k, v)
          from jsonb_each(old_data) as fields(k, v)
          where k = any(array['costs', 'payout', 'mohamed', 'commission', 'profit'])
        ), '{}'::jsonb);
      end if;
    elsif role_name not in ('founder', 'editor') then
      raise exception 'forbidden';
    end if;
    insert into public.projects(workspace_id, id, client_id, data, updated_at)
    values (p_workspace_id, p_id, c_id, p_data, now())
    on conflict (workspace_id, id) do update set
      client_id = excluded.client_id, data = excluded.data, updated_at = now();
    return p_data || jsonb_build_object('id', p_id, 'clientId', c_id);
  elsif p_collection = 'team' or p_collection in ('settings', 'finance') then
    raise exception 'use_dedicated_operation';
  end if;

  c_id := nullif(p_data->>'clientId', '');
  p_id_ref := nullif(p_data->>'projectId', '');
  if p_collection = 'tasks' then
    assigned_id := nullif(p_data->>'who', '');
  end if;
  if p_id_ref is not null then
    select client_id into c_id from public.projects
    where workspace_id = p_workspace_id and id = p_id_ref;
    if c_id is null then raise exception 'invalid_project_scope'; end if;
  end if;
  if c_id is not null and not public.has_client_access(p_workspace_id, c_id) then raise exception 'forbidden_client'; end if;
  if p_id_ref is not null and not public.has_project_access(p_workspace_id, p_id_ref) then raise exception 'forbidden_project'; end if;
  if assigned_id is not null and not exists (
    select 1 from public.workspace_members wm where wm.workspace_id = p_workspace_id
      and wm.member_id = assigned_id and wm.active
  ) then raise exception 'invalid_assignee'; end if;

  select r.client_id, r.project_id, r.assigned_member_id
    into old_client_id, old_project_id, old_assigned_id
  from public.workspace_records r
  where r.workspace_id = p_workspace_id
    and r.collection = p_collection and r.id = p_id;
  old_record := found;
  if old_record and role_name in ('editor', 'assistant') then
    if (old_client_id is not null and not public.has_client_access(p_workspace_id, old_client_id))
       or (old_project_id is not null and not public.has_project_access(p_workspace_id, old_project_id))
       or (old_assigned_id is not null and old_assigned_id <> (
         select wm.member_id from public.workspace_members wm
         where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.active
       )) then raise exception 'forbidden_record'; end if;
    if old_client_id is distinct from c_id
       or old_project_id is distinct from p_id_ref
       or old_assigned_id is distinct from assigned_id then
      raise exception 'record_scope_immutable';
    end if;
  end if;

  if role_name in ('editor', 'assistant') and p_collection = 'tasks'
     and assigned_id is not null and assigned_id <> (
       select wm.member_id from public.workspace_members wm
       where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.active
     ) then raise exception 'cannot_assign_other_member'; end if;

  insert into public.workspace_records(
    workspace_id, collection, id, client_id, project_id, assigned_member_id, data, updated_at
  ) values (
    p_workspace_id, p_collection, p_id, c_id, p_id_ref, assigned_id, p_data, now()
  )
  on conflict (workspace_id, collection, id) do update set
    client_id = excluded.client_id, project_id = excluded.project_id,
    assigned_member_id = excluded.assigned_member_id, data = excluded.data, updated_at = now()
  where public.can_write_collection(p_workspace_id, p_collection)
    and (excluded.project_id is null or public.has_project_access(p_workspace_id, excluded.project_id))
    and (excluded.client_id is null or public.has_client_access(p_workspace_id, excluded.client_id));
  saved := p_data || jsonb_build_object('id', p_id);
  return saved;
end
$$;

create function public.delete_workspace_record(
  p_workspace_id uuid, p_collection text, p_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) is null
     or not public.can_write_collection(p_workspace_id, p_collection) then raise exception 'forbidden'; end if;
  if p_collection = 'clients' then
    if public.member_role(p_workspace_id) not in ('founder', 'sales') then raise exception 'forbidden'; end if;
    delete from public.clients where workspace_id = p_workspace_id and id = p_id;
  elsif p_collection = 'projects' then
    if public.member_role(p_workspace_id) not in ('founder', 'sales') then raise exception 'forbidden'; end if;
    delete from public.projects where workspace_id = p_workspace_id and id = p_id;
  elsif p_collection in ('shares', 'feedback', 'team', 'invoices', 'expenses', 'quotes') then
    raise exception 'use_dedicated_operation';
  else
    delete from public.workspace_records
      where workspace_id = p_workspace_id and collection = p_collection and id = p_id
        and (project_id is null or public.has_project_access(p_workspace_id, project_id))
        and (client_id is null or public.has_client_access(p_workspace_id, client_id))
        and (assigned_member_id is null or assigned_member_id in (
          select wm.member_id from public.workspace_members wm where wm.workspace_id = p_workspace_id
            and wm.user_id = (select auth.uid()) and wm.active
        ) or public.member_role(p_workspace_id) in ('founder', 'sales'));
  end if;
  return found;
end
$$;

create function public.create_client_share(
  p_workspace_id uuid, p_client_id text, p_project_id text,
  p_snapshot jsonb, p_feedback_targets jsonb, p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
  share_id uuid;
  safe_snapshot jsonb;
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.can_write_collection(p_workspace_id, 'shares')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  if p_project_id is not null and not exists (
    select 1 from public.projects p where p.workspace_id = p_workspace_id
      and p.id = p_project_id and p.client_id = p_client_id
  ) then
    raise exception 'invalid_project_scope';
  end if;
  safe_snapshot := public.sanitize_public_snapshot(p_snapshot);
  perform public.validate_feedback_targets(safe_snapshot, p_feedback_targets);
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'invalid_expiry'; end if;
  insert into public.client_shares(
    workspace_id, client_id, project_id, token_hash, snapshot,
    feedback_targets, expires_at, published_at, published_by, created_by
  ) values (
    p_workspace_id, p_client_id, nullif(p_project_id, ''),
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    safe_snapshot, p_feedback_targets,
    p_expires_at, now(), (select auth.uid()), (select auth.uid())
  ) returning id into share_id;
  return jsonb_build_object('id', share_id, 'token', raw_token);
end
$$;

create function public.update_client_share(
  p_workspace_id uuid, p_share_id uuid, p_snapshot jsonb,
  p_feedback_targets jsonb, p_expires_at timestamptz default null,
  p_publish boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  safe_snapshot jsonb;
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'invalid_expiry'; end if;
  if p_publish and jsonb_typeof(p_snapshot) is distinct from 'object' then raise exception 'invalid_snapshot'; end if;
  if p_publish then safe_snapshot := public.sanitize_public_snapshot(p_snapshot); else
    select s.snapshot into safe_snapshot from public.client_shares s
    where s.workspace_id = p_workspace_id and s.id = p_share_id;
  end if;
  perform public.validate_feedback_targets(safe_snapshot, p_feedback_targets);
  update public.client_shares set
    snapshot = case when p_publish then safe_snapshot else snapshot end,
    feedback_targets = p_feedback_targets,
    expires_at = p_expires_at,
    published_at = case when p_publish then now() else published_at end,
    published_by = case when p_publish then (select auth.uid()) else published_by end,
    updated_at = now()
  where workspace_id = p_workspace_id and id = p_share_id and revoked_at is null
    and public.has_client_access(workspace_id, client_id);
  if not found then raise exception 'share_not_found'; end if;
end
$$;

create function public.revoke_client_share(p_workspace_id uuid, p_share_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  update public.client_shares set revoked_at = now(), updated_at = now()
  where workspace_id = p_workspace_id and id = p_share_id and revoked_at is null
    and public.has_client_access(workspace_id, client_id);
  if not found then raise exception 'share_not_found'; end if;
end
$$;

create function public.rotate_client_share_token(p_workspace_id uuid, p_share_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  update public.client_shares set
    token_hash = extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    updated_at = now()
  where workspace_id = p_workspace_id and id = p_share_id and revoked_at is null
    and public.has_client_access(workspace_id, client_id);
  if not found then raise exception 'share_not_found'; end if;
  return raw_token;
end
$$;

create function public.enable_client_share(p_workspace_id uuid, p_share_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  update public.client_shares set
    token_hash = extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'),
    revoked_at = null, updated_at = now()
  where workspace_id = p_workspace_id and id = p_share_id
    and (expires_at is null or expires_at > now())
    and public.has_client_access(workspace_id, client_id);
  if not found then raise exception 'share_not_found_or_expired'; end if;
  return raw_token;
end
$$;

create function public.allocate_invoice_number(p_workspace_id uuid, p_year integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  if p_year not between 2000 and 9999 then raise exception 'invalid_year'; end if;
  insert into public.invoice_sequences(workspace_id, year, next_number)
  values (p_workspace_id, p_year, 2)
  on conflict (workspace_id, year) do update
    set next_number = public.invoice_sequences.next_number + 1
  returning next_number - 1 into n;
  return 'GK-' || p_year::text || '-' || lpad(n::text, 3, '0');
end
$$;

create function public.assign_client_member(
  p_workspace_id uuid, p_client_id text, p_member_id text, p_assigned boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.member_id = p_member_id
      and wm.role in ('editor', 'assistant') and wm.active
  ) then raise exception 'invalid_assignee'; end if;
  if p_assigned then
    insert into public.client_assignments(workspace_id, client_id, member_id)
    values (p_workspace_id, p_client_id, p_member_id) on conflict do nothing;
  else
    delete from public.client_assignments
      where workspace_id = p_workspace_id and client_id = p_client_id and member_id = p_member_id;
  end if;
end
$$;

create function public.assign_project_member(
  p_workspace_id uuid, p_project_id text, p_member_id text, p_assigned boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  if not exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.member_id = p_member_id
      and wm.role in ('editor', 'assistant') and wm.active
  ) then raise exception 'invalid_assignee'; end if;
  if p_assigned then
    insert into public.project_assignments(workspace_id, project_id, member_id)
    values (p_workspace_id, p_project_id, p_member_id) on conflict do nothing;
  else
    delete from public.project_assignments
      where workspace_id = p_workspace_id and project_id = p_project_id and member_id = p_member_id;
  end if;
end
$$;

create function public.get_workspace_assignments(p_workspace_id uuid)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'forbidden'; end if;
  return query
    select jsonb_build_object(
      'type', 'client', 'entityId', ca.client_id, 'memberId', ca.member_id
    ) from public.client_assignments ca where ca.workspace_id = p_workspace_id
    union all
    select jsonb_build_object(
      'type', 'project', 'entityId', pa.project_id, 'memberId', pa.member_id
    ) from public.project_assignments pa where pa.workspace_id = p_workspace_id;
end
$$;

revoke all on function public.get_public_client_share(text) from public;
revoke all on function public.submit_client_feedback(text, text, text, text, text, text) from public;
revoke all on function public.member_role(uuid), public.is_workspace_member(uuid),
  public.has_client_access(uuid, text), public.has_project_access(uuid, text),
  public.can_read_collection(uuid, text), public.can_write_collection(uuid, text),
  public.sanitize_public_snapshot(jsonb), public.validate_feedback_targets(jsonb, jsonb),
  public.create_workspace(text),
  public.get_my_workspaces(),
  public.invite_workspace_member(uuid, text, text),
  public.accept_workspace_invite(text, text), public.get_workspace_config(uuid),
  public.remove_workspace_member(uuid, text),
  public.set_workspace_config(uuid, jsonb), public.get_workspace_records(uuid, text),
  public.put_workspace_record(uuid, text, text, jsonb),
  public.delete_workspace_record(uuid, text, text),
  public.create_client_share(uuid, text, text, jsonb, jsonb, timestamptz),
  public.update_client_share(uuid, uuid, jsonb, jsonb, timestamptz, boolean),
  public.add_team_client_feedback(uuid, uuid, text, text, text, text),
  public.revoke_client_share(uuid, uuid), public.rotate_client_share_token(uuid, uuid),
  public.enable_client_share(uuid, uuid),
  public.allocate_invoice_number(uuid, integer),
  public.assign_client_member(uuid, text, text, boolean),
  public.assign_project_member(uuid, text, text, boolean),
  public.get_workspace_assignments(uuid)
  from public;
grant execute on function public.get_public_client_share(text) to anon, authenticated;
grant execute on function public.submit_client_feedback(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.member_role(uuid), public.is_workspace_member(uuid),
  public.has_client_access(uuid, text), public.has_project_access(uuid, text),
  public.can_read_collection(uuid, text), public.can_write_collection(uuid, text)
  to authenticated;
grant execute on function public.create_workspace(text), public.invite_workspace_member(uuid, text, text),
  public.accept_workspace_invite(text, text), public.get_my_workspaces(),
  public.remove_workspace_member(uuid, text),
  public.get_workspace_config(uuid),
  public.set_workspace_config(uuid, jsonb), public.get_workspace_records(uuid, text),
  public.put_workspace_record(uuid, text, text, jsonb),
  public.delete_workspace_record(uuid, text, text),
  public.create_client_share(uuid, text, text, jsonb, jsonb, timestamptz),
  public.update_client_share(uuid, uuid, jsonb, jsonb, timestamptz, boolean),
  public.add_team_client_feedback(uuid, uuid, text, text, text, text),
  public.revoke_client_share(uuid, uuid), public.rotate_client_share_token(uuid, uuid),
  public.enable_client_share(uuid, uuid),
  public.allocate_invoice_number(uuid, integer),
  public.assign_client_member(uuid, text, text, boolean),
  public.assign_project_member(uuid, text, text, boolean),
  public.get_workspace_assignments(uuid)
  to authenticated;

-- ==== 202610160001_production_scripts.sql ====
-- Production (the assistant role) runs the shoot day: it reads the scripts of its assigned
-- projects and saves takes and shot ticks on them. Money collections stay closed to it.
-- Record scope is unchanged: put_workspace_record still checks client and project access.

create or replace function public.can_read_collection(p_workspace_id uuid, p_collection text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.member_role(p_workspace_id)
    when 'founder' then true
    when 'sales' then p_collection in (
      'clients', 'projects', 'leads', 'outreach', 'contracts', 'tasks',
      'msgs', 'ideas', 'boards', 'shares', 'feedback', 'quotes', 'team'
    )
    when 'editor' then p_collection in (
      'clients', 'projects', 'tasks', 'msgs', 'ideas', 'boards', 'team'
    )
    when 'assistant' then p_collection in (
      'clients', 'projects', 'tasks', 'msgs', 'ideas', 'boards', 'team'
    )
    else false
  end
$$;

create or replace function public.can_write_collection(p_workspace_id uuid, p_collection text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case public.member_role(p_workspace_id)
    when 'founder' then true
    when 'sales' then p_collection in (
      'clients', 'projects', 'leads', 'outreach', 'tasks', 'msgs',
      'ideas', 'boards', 'shares', 'feedback', 'quotes'
    )
    when 'editor' then p_collection in (
      'projects', 'tasks', 'msgs', 'ideas', 'boards'
    )
    when 'assistant' then p_collection in ('tasks', 'msgs', 'ideas', 'boards')
    else false
  end
$$;

-- ==== 202610180001_private_config.sql ====
-- Team pay, credentials, role pay defaults and the cash book live in workspace config.
-- Only the founder may read them: strip them for every other role.
create or replace function public.get_workspace_config(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  role_name text := public.member_role(p_workspace_id);
  cfg jsonb;
  safe_packs jsonb;
begin
  if role_name is null then raise exception 'forbidden'; end if;
  select data into cfg from public.workspace_settings where workspace_id = p_workspace_id;
  if role_name = 'founder' then return cfg; end if;
  -- Non-founders get operational offer data, not costs, payroll, tax, cap,
  -- commission, or opening-cash figures.
  cfg := coalesce(cfg, '{}'::jsonb) - array['rates', 'levels', 'teamPrivate', 'rolePay', 'cash']::text[];
  select coalesce(jsonb_object_agg(k, v - 'cost'), '{}'::jsonb)
    into safe_packs from jsonb_each(coalesce(cfg->'packs', '{}'::jsonb)) e(k, v);
  cfg := jsonb_set(cfg, '{packs}', safe_packs, true);
  cfg := jsonb_set(cfg, '{company}',
    coalesce(cfg->'company', '{}'::jsonb) - array['mf', 'legal', 'address', 'invoiceNote']::text[], true);
  return jsonb_set(
    cfg,
    '{rules}',
    coalesce(cfg->'rules', '{}'::jsonb) - array[
      'salary', 'commission', 'finderPct', 'shareClients', 'retainer',
      'retainerFrom', 'sharePayee', 'cap', 'reserve', 'stamp',
      'withholding', 'vat', 'openingCash', 'dueDays', 'extrasDirect',
      'floor', 'adBudget', 'spendApproval'
    ]::text[],
    true
  );
end
$$;

-- ==== 202610180002_shared_config_keys.sql ====
-- Marketing plans and the creative reference library are team data kept in workspace config.
-- set_workspace_config stays founder-only; this writes one shared key for the roles that own it.
create or replace function public.set_workspace_config_key(p_workspace_id uuid, p_key text, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_name text := public.member_role(p_workspace_id);
begin
  if role_name is null then raise exception 'forbidden'; end if;
  if not (
    (p_key = 'marketing' and role_name in ('founder', 'sales')) or
    (p_key = 'creativeRefs' and role_name in ('founder', 'sales', 'editor', 'assistant'))
  ) then raise exception 'forbidden'; end if;
  insert into public.workspace_settings(workspace_id, data, updated_at)
  values (p_workspace_id, jsonb_build_object(p_key, p_value), now())
  on conflict (workspace_id) do update
    set data = coalesce(public.workspace_settings.data, '{}'::jsonb) || jsonb_build_object(p_key, p_value),
        updated_at = now();
end
$$;

revoke all on function public.set_workspace_config_key(uuid, text, jsonb) from public, anon;
grant execute on function public.set_workspace_config_key(uuid, text, jsonb) to authenticated;

-- ==== 202610260001_client_accounts.sql ====
-- Client accounts: a client signs in with their own email and sees only their own published client page.
-- One Gecko workspace per install: only the first workspace can be created from the app.

create or replace function public.create_workspace(p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  w_id uuid;
  member_key text;
  user_email text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  user_email := lower(coalesce((select auth.jwt()->>'email'), ''));
  if user_email = '' or not exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  ) then raise exception 'verified_email_required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.create_workspace', 0));
  if exists (select 1 from public.workspaces) then raise exception 'workspace_exists'; end if;
  insert into public.workspaces(name) values (trim(p_name)) returning id into w_id;
  member_key := 'm' || left(replace((select auth.uid())::text, '-', ''), 16);
  insert into public.workspace_members(
    workspace_id, member_id, user_id, email, display_name, role
  ) values (
    w_id, member_key, (select auth.uid()), user_email,
    coalesce(nullif(trim((select auth.jwt()->>'user_metadata')::jsonb->>'name'), ''), 'Founder'),
    'founder'
  );
  insert into public.workspace_settings(workspace_id, data) values (w_id, '{}'::jsonb);
  return w_id;
end
$$;

create table public.client_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id text not null,
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  display_name text not null default '' check (length(display_name) <= 120),
  user_id uuid references auth.users(id) on delete set null,
  token_hash bytea unique check (token_hash is null or octet_length(token_hash) = 32),
  expires_at timestamptz,
  accepted_at timestamptz,
  revoked_at timestamptz,
  invited_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (workspace_id, client_id, email),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete cascade
);
alter table public.client_accounts enable row level security;
revoke all on public.client_accounts from anon, authenticated;

-- Team side: founder or sales (with access to that client) invites a client email. Returns the one-time invite code.
create function public.invite_client_account(p_workspace_id uuid, p_client_id text, p_email text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  raw_token text;
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  if p_email is null or p_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'invalid_invite'; end if;
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.client_accounts(workspace_id, client_id, email, token_hash, expires_at, invited_by)
  values (p_workspace_id, p_client_id, lower(trim(p_email)),
    extensions.digest(convert_to(raw_token, 'UTF8'), 'sha256'), now() + interval '14 days', (select auth.uid()))
  on conflict (workspace_id, client_id, email) do update set
    token_hash = excluded.token_hash, expires_at = excluded.expires_at,
    revoked_at = null, invited_by = excluded.invited_by,
    accepted_at = case when public.client_accounts.user_id is null then null else public.client_accounts.accepted_at end;
  return raw_token;
end
$$;

create function public.list_client_accounts(p_workspace_id uuid, p_client_id text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return query
    select jsonb_build_object('id', a.id, 'email', a.email, 'name', a.display_name,
      'joined', a.accepted_at is not null and a.user_id is not null,
      'expires', a.expires_at, 'revoked', a.revoked_at is not null, 'createdAt', a.created_at)
    from public.client_accounts a
    where a.workspace_id = p_workspace_id and a.client_id = p_client_id
    order by a.created_at;
end
$$;

create function public.revoke_client_account(p_workspace_id uuid, p_account_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c_id text;
begin
  select client_id into c_id from public.client_accounts where workspace_id = p_workspace_id and id = p_account_id;
  if c_id is null or public.member_role(p_workspace_id) not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, c_id) then raise exception 'forbidden'; end if;
  update public.client_accounts set revoked_at = now(), token_hash = null
  where workspace_id = p_workspace_id and id = p_account_id;
end
$$;

-- Client side: the signed-in client claims the invite sent to their verified email.
create function public.accept_client_invite(p_token text, p_display_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts%rowtype;
  user_email text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  user_email := lower(coalesce((select auth.jwt()->>'email'), ''));
  if p_token is null or length(p_token) <> 64 or not exists (
    select 1 from auth.users u where u.id = (select auth.uid()) and u.email_confirmed_at is not null
  ) then raise exception 'invalid_invite'; end if;
  select * into acc from public.client_accounts
  where token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and revoked_at is null and expires_at > now() and email = user_email
  for update;
  if not found then raise exception 'invalid_invite'; end if;
  update public.client_accounts set user_id = (select auth.uid()), accepted_at = now(), token_hash = null,
    display_name = left(coalesce(nullif(trim(p_display_name), ''), display_name), 120)
  where id = acc.id;
  return jsonb_build_object('workspaceId', acc.workspace_id, 'clientId', acc.client_id);
end
$$;

create function public.get_my_client_portals()
returns table (workspace_id uuid, client_id text, brand text)
language sql
stable
security definer
set search_path = ''
as $$
  select a.workspace_id, a.client_id, c.brand
  from public.client_accounts a
  join public.clients c on c.workspace_id = a.workspace_id and c.id = a.client_id
  where a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
  order by c.brand
$$;

-- The newest live client page (whole-client share preferred) for a client this account belongs to.
create function public.my_client_share_id(p_workspace_id uuid, p_client_id text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id from public.client_shares s
  where s.workspace_id = p_workspace_id and s.client_id = p_client_id
    and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())
    and exists (
      select 1 from public.client_accounts a
      where a.workspace_id = p_workspace_id and a.client_id = p_client_id
        and a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
    )
  order by (s.project_id is null) desc, s.published_at desc
  limit 1
$$;

create function public.get_my_client_share(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.client_shares%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  select * into s from public.client_shares where id = public.my_client_share_id(p_workspace_id, p_client_id);
  if not found then return null; end if;
  return jsonb_build_object(
    'enabled', true,
    'snapshot', jsonb_build_object(
      'v', s.snapshot->'v', 'brand', s.snapshot->'brand', 'contact', s.snapshot->'contact',
      'company', s.snapshot->'company', 'lang', s.snapshot->'lang', 'title', s.snapshot->'title',
      'sections', s.snapshot->'sections', 'projects', s.snapshot->'projects',
      'invoices', s.snapshot->'invoices', 'boards', s.snapshot->'boards'
    ),
    'publishedAt', s.published_at
  );
end
$$;

create function public.submit_my_client_feedback(
  p_workspace_id uuid, p_client_id text, p_kind text, p_target text, p_text text, p_project_id text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.client_shares%rowtype;
  f_id uuid;
  feedback_project text;
  who_name text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if p_kind not in ('comment', 'approve', 'changes')
     or p_target is null or length(p_target) not between 1 and 256
     or p_text is null or length(p_text) > 4000 then
    raise exception 'invalid_feedback';
  end if;
  select * into s from public.client_shares where id = public.my_client_share_id(p_workspace_id, p_client_id);
  if not found or p_target = 'other' or not (s.feedback_targets ? p_target)
     or not coalesce(s.feedback_targets->p_target, '[]'::jsonb) @> jsonb_build_array(p_kind) then
    raise exception 'invalid_share_or_target';
  end if;
  feedback_project := coalesce(nullif(p_project_id, ''), s.project_id);
  if feedback_project is not null and (
    (s.project_id is not null and feedback_project <> s.project_id)
    or not exists (
      select 1 from jsonb_array_elements(coalesce(s.snapshot->'projects', '[]'::jsonb)) as projects(project)
      where project->>'id' = feedback_project
    )
  ) then raise exception 'invalid_feedback_project'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(s.id::text, 0));
  if (
    select count(*) from public.client_feedback f
    where f.share_id = s.id and f.created_at > now() - interval '1 hour'
  ) >= 30 then raise exception 'feedback_rate_limited'; end if;
  select left(coalesce(nullif(a.display_name, ''), a.email), 120) into who_name
  from public.client_accounts a
  where a.workspace_id = p_workspace_id and a.client_id = p_client_id and a.user_id = (select auth.uid())
  limit 1;
  insert into public.client_feedback(workspace_id, share_id, client_id, project_id, kind, target, text, who)
  values (s.workspace_id, s.id, s.client_id, feedback_project, p_kind, p_target, p_text, coalesce(who_name, 'Client'))
  returning id into f_id;
  return f_id;
end
$$;

revoke all on function public.invite_client_account(uuid, text, text), public.list_client_accounts(uuid, text),
  public.revoke_client_account(uuid, uuid), public.accept_client_invite(text, text),
  public.get_my_client_portals(), public.my_client_share_id(uuid, text),
  public.get_my_client_share(uuid, text),
  public.submit_my_client_feedback(uuid, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.invite_client_account(uuid, text, text), public.list_client_accounts(uuid, text),
  public.revoke_client_account(uuid, uuid), public.accept_client_invite(text, text),
  public.get_my_client_portals(), public.get_my_client_share(uuid, text),
  public.submit_my_client_feedback(uuid, text, text, text, text, text)
  to authenticated;

-- ==== 202610290001_client_onboarding.sql ====
-- Client onboarding: one sheet per client, filled by the client in their portal (signed in, or through their live page link)
-- and by the team in the client workspace. Answers are merged key by key, so two people can type at the same time.

create table public.client_onboarding (
  workspace_id uuid not null,
  client_id text not null,
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  primary key (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);
alter table public.client_onboarding enable row level security;
revoke all on public.client_onboarding from anon, authenticated;

-- Who may read and write a client's sheet: the founder or sales with access to the client, or a signed-in account of that client.
create function public.can_onboard(p_workspace_id uuid, p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (public.member_role(p_workspace_id) in ('founder', 'sales') and public.has_client_access(p_workspace_id, p_client_id))
    or exists (
      select 1 from public.client_accounts a
      where a.workspace_id = p_workspace_id and a.client_id = p_client_id
        and a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
    )
$$;

-- The client behind a live page link, or nothing.
create function public.onboarding_share_client(p_token text)
returns table (workspace_id uuid, client_id text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.workspace_id, s.client_id from public.client_shares s
  where p_token is not null and length(p_token) between 40 and 128
    and s.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and s.revoked_at is null and (s.expires_at is null or s.expires_at > now())
  limit 1
$$;

create function public.onboarding_row(p_workspace_id uuid, p_client_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select jsonb_build_object('data', o.data, 'updatedAt', o.updated_at, 'sentAt', o.sent_at)
     from public.client_onboarding o where o.workspace_id = p_workspace_id and o.client_id = p_client_id),
    jsonb_build_object('data', '{}'::jsonb, 'updatedAt', null, 'sentAt', null))
$$;

-- Merge changed answers (a key set to null is removed). p_sent marks the sheet as sent to Gecko.
create function public.onboarding_merge(p_workspace_id uuid, p_client_id text, p_patch jsonb, p_sent boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' or pg_catalog.pg_column_size(p_patch) > 200000 then
    raise exception 'invalid_onboarding';
  end if;
  insert into public.client_onboarding(workspace_id, client_id, data, sent_at)
  values (p_workspace_id, p_client_id, jsonb_strip_nulls(p_patch), case when p_sent then now() end)
  on conflict (workspace_id, client_id) do update set
    data = jsonb_strip_nulls(public.client_onboarding.data || p_patch),
    updated_at = now(),
    sent_at = case when p_sent then now() else public.client_onboarding.sent_at end;
  if pg_catalog.pg_column_size((select o.data from public.client_onboarding o
      where o.workspace_id = p_workspace_id and o.client_id = p_client_id)) > 400000 then
    raise exception 'onboarding_too_large';
  end if;
  return public.onboarding_row(p_workspace_id, p_client_id);
end
$$;

-- Team or signed-in client.
create function public.get_client_onboarding(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.can_onboard(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return public.onboarding_row(p_workspace_id, p_client_id);
end
$$;

create function public.save_client_onboarding(p_workspace_id uuid, p_client_id text, p_patch jsonb, p_sent boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.can_onboard(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return public.onboarding_merge(p_workspace_id, p_client_id, p_patch, coalesce(p_sent, false));
end
$$;

-- Anyone holding the client's live page link.
create function public.get_shared_onboarding(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  w uuid; c text;
begin
  select s.workspace_id, s.client_id into w, c from public.onboarding_share_client(p_token) s;
  if w is null then raise exception 'invalid_share'; end if;
  return public.onboarding_row(w, c);
end
$$;

create function public.save_shared_onboarding(p_token text, p_patch jsonb, p_sent boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  w uuid; c text;
begin
  select s.workspace_id, s.client_id into w, c from public.onboarding_share_client(p_token) s;
  if w is null then raise exception 'invalid_share'; end if;
  return public.onboarding_merge(w, c, p_patch, coalesce(p_sent, false));
end
$$;

revoke all on function public.can_onboard(uuid, text), public.onboarding_share_client(text), public.onboarding_row(uuid, text),
  public.onboarding_merge(uuid, text, jsonb, boolean), public.get_client_onboarding(uuid, text),
  public.save_client_onboarding(uuid, text, jsonb, boolean), public.get_shared_onboarding(text),
  public.save_shared_onboarding(text, jsonb, boolean)
  from public, anon, authenticated;
grant execute on function public.get_client_onboarding(uuid, text), public.save_client_onboarding(uuid, text, jsonb, boolean)
  to authenticated;
grant execute on function public.get_shared_onboarding(text), public.save_shared_onboarding(text, jsonb, boolean)
  to anon, authenticated;

-- ==== 202610300001_leads_table.sql ====
-- Leads get their own table with real columns instead of a JSON blob in workspace_records.
-- The new app reads and writes this table directly, guarded by row level security.
-- The current app keeps working: get/put/delete_workspace_record route the 'leads' collection here.

create table public.leads (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  id text not null check (length(id) between 1 and 128),
  brand text not null check (length(trim(brand)) between 1 and 160),
  stage text not null default 'prospect' check (stage in (
    'prospect', 'contacted', 'conversation', 'meeting_booked', 'qualified',
    'proposal_sent', 'negotiation', 'accepted', 'signed', 'won', 'lost', 'nurture'
  )),
  channel text check (length(channel) <= 60),
  contact text check (length(contact) <= 160),
  handle text check (length(handle) <= 160),
  phone text check (length(phone) <= 60),
  whatsapp text check (length(whatsapp) <= 60),
  url text check (length(url) <= 500),
  sector text check (length(sector) <= 120),
  pack text check (length(pack) <= 60),
  value numeric(12, 3) check (value >= 0),
  client_id text,
  owner_member_id text,
  next_step text check (length(next_step) <= 500),
  next_date date,
  lost_reason text check (length(lost_reason) <= 60),
  qualification boolean[] not null default '{}' check (cardinality(qualification) <= 12),
  history jsonb not null default '[]' check (jsonb_typeof(history) = 'array'),
  log jsonb not null default '[]' check (jsonb_typeof(log) = 'array'),
  -- Fields the old app stored that have no column yet; kept so nothing is lost.
  extra jsonb not null default '{}' check (jsonb_typeof(extra) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, id),
  foreign key (workspace_id, client_id)
    references public.clients(workspace_id, id) on delete set null (client_id),
  foreign key (workspace_id, owner_member_id)
    references public.workspace_members(workspace_id, member_id) on delete set null (owner_member_id)
);

create index leads_workspace_stage on public.leads(workspace_id, stage);

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end
$$;

create trigger leads_touch before update on public.leads
  for each row execute function public.touch_updated_at();

alter table public.leads enable row level security;
revoke all on public.leads from public, anon, authenticated;
grant select, insert, update, delete on public.leads to authenticated;

create policy leads_read on public.leads for select to authenticated
  using (
    public.can_read_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );
create policy leads_insert on public.leads for insert to authenticated
  with check (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );
create policy leads_update on public.leads for update to authenticated
  using (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  )
  with check (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );
create policy leads_delete on public.leads for delete to authenticated
  using (
    public.can_write_collection(workspace_id, 'leads')
    and (client_id is null or public.has_client_access(workspace_id, client_id))
  );

-- The JSON shape the current app uses, built from a row.
create function public.lead_to_json(l public.leads)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select l.extra || jsonb_build_object(
    'id', l.id, 'brand', l.brand, 'stage', l.stage,
    'channel', coalesce(l.channel, ''), 'contact', coalesce(l.contact, ''),
    'handle', coalesce(l.handle, ''), 'phone', coalesce(l.phone, ''),
    'whatsapp', coalesce(l.whatsapp, ''), 'url', coalesce(l.url, ''),
    'sector', coalesce(l.sector, ''), 'pack', coalesce(l.pack, ''),
    'value', l.value, 'owner', coalesce(l.owner_member_id, ''),
    'next', coalesce(l.next_step, ''), 'nextDate', coalesce(l.next_date::text, ''),
    'lostReason', coalesce(l.lost_reason, ''), 'q', to_jsonb(l.qualification),
    'history', l.history, 'log', l.log
  ) || case when l.client_id is null then '{}'::jsonb else jsonb_build_object('clientId', l.client_id) end
$$;

-- A row from the current app's JSON shape. Unknown fields go to `extra`; an owner who is not an active member is dropped.
create function public.lead_from_json(p_workspace_id uuid, p_id text, p_data jsonb)
returns public.leads
language plpgsql
stable
set search_path = ''
as $$
declare
  l public.leads;
  next_date_text text := nullif(p_data->>'nextDate', '');
  value_json jsonb := p_data->'value';
begin
  if next_date_text is not null and next_date_text !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'invalid_lead';
  end if;
  if value_json is not null and jsonb_typeof(value_json) not in ('number', 'null')
     and not (jsonb_typeof(value_json) = 'string' and (value_json #>> '{}') in ('', '0')) then
    raise exception 'invalid_lead';
  end if;
  l.workspace_id := p_workspace_id;
  l.id := p_id;
  l.brand := trim(coalesce(p_data->>'brand', ''));
  l.stage := coalesce(nullif(p_data->>'stage', ''), 'prospect');
  l.channel := nullif(p_data->>'channel', '');
  l.contact := nullif(p_data->>'contact', '');
  l.handle := nullif(p_data->>'handle', '');
  l.phone := nullif(p_data->>'phone', '');
  l.whatsapp := nullif(p_data->>'whatsapp', '');
  l.url := nullif(p_data->>'url', '');
  l.sector := nullif(p_data->>'sector', '');
  l.pack := nullif(p_data->>'pack', '');
  l.value := case when jsonb_typeof(value_json) = 'number' then (value_json #>> '{}')::numeric end;
  l.client_id := nullif(p_data->>'clientId', '');
  l.owner_member_id := (
    select wm.member_id from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.member_id = nullif(p_data->>'owner', '') and wm.active
  );
  l.next_step := nullif(p_data->>'next', '');
  l.next_date := next_date_text::date;
  l.lost_reason := nullif(p_data->>'lostReason', '');
  l.qualification := coalesce(
    (select array_agg(x::boolean) from jsonb_array_elements_text(
      case when jsonb_typeof(p_data->'q') = 'array' then p_data->'q' else '[]' end) as q(x)),
    '{}'
  );
  l.history := case when jsonb_typeof(p_data->'history') = 'array' then p_data->'history' else '[]' end;
  l.log := case when jsonb_typeof(p_data->'log') = 'array' then p_data->'log' else '[]' end;
  l.extra := p_data - array[
    'id', 'brand', 'stage', 'channel', 'contact', 'handle', 'phone', 'whatsapp', 'url',
    'sector', 'pack', 'value', 'clientId', 'owner', 'next', 'nextDate', 'lostReason',
    'q', 'history', 'log'
  ]::text[];
  l.created_at := now();
  l.updated_at := now();
  return l;
end
$$;

-- Copy existing leads across. The old rows stay in workspace_records untouched, as a backup.
insert into public.leads
select (public.lead_from_json(r.workspace_id, r.id, r.data)).*
from public.workspace_records r
where r.collection = 'leads'
on conflict (workspace_id, id) do nothing;
update public.leads l set created_at = r.created_at, updated_at = r.updated_at
from public.workspace_records r
where r.collection = 'leads' and r.workspace_id = l.workspace_id and r.id = l.id;

-- The current app's record functions: the originals keep handling every other collection.
alter function public.get_workspace_records(uuid, text) rename to get_workspace_records_base;
alter function public.put_workspace_record(uuid, text, text, jsonb) rename to put_workspace_record_base;
alter function public.delete_workspace_record(uuid, text, text) rename to delete_workspace_record_base;

create function public.get_workspace_records(p_workspace_id uuid, p_collection text)
returns setof jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_collection <> 'leads' then
    return query select * from public.get_workspace_records_base(p_workspace_id, p_collection);
    return;
  end if;
  if public.member_role(p_workspace_id) is null
     or not public.can_read_collection(p_workspace_id, 'leads') then raise exception 'forbidden'; end if;
  return query
    select public.lead_to_json(l) from public.leads l
    where l.workspace_id = p_workspace_id
      and (l.client_id is null or public.has_client_access(l.workspace_id, l.client_id));
end
$$;

create function public.put_workspace_record(
  p_workspace_id uuid, p_collection text, p_id text, p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  l public.leads;
begin
  if p_collection <> 'leads' then
    return public.put_workspace_record_base(p_workspace_id, p_collection, p_id, p_data);
  end if;
  if public.member_role(p_workspace_id) is null
     or not public.can_write_collection(p_workspace_id, 'leads') then raise exception 'forbidden'; end if;
  if p_id is null or length(p_id) not between 1 and 128
     or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid_record'; end if;
  if p_data ? 'id' and p_data->>'id' <> p_id then raise exception 'id_mismatch'; end if;
  l := public.lead_from_json(p_workspace_id, p_id, p_data);
  if length(l.brand) not between 1 and 160 or l.stage not in (
    'prospect', 'contacted', 'conversation', 'meeting_booked', 'qualified',
    'proposal_sent', 'negotiation', 'accepted', 'signed', 'won', 'lost', 'nurture'
  ) then raise exception 'invalid_lead'; end if;
  if l.client_id is not null and not public.has_client_access(p_workspace_id, l.client_id) then
    raise exception 'forbidden_client';
  end if;
  if exists (
    select 1 from public.leads o where o.workspace_id = p_workspace_id and o.id = p_id
      and o.client_id is not null and not public.has_client_access(p_workspace_id, o.client_id)
  ) then raise exception 'forbidden_record'; end if;
  insert into public.leads values (l.*)
  on conflict (workspace_id, id) do update set
    brand = excluded.brand, stage = excluded.stage, channel = excluded.channel,
    contact = excluded.contact, handle = excluded.handle, phone = excluded.phone,
    whatsapp = excluded.whatsapp, url = excluded.url, sector = excluded.sector,
    pack = excluded.pack, value = excluded.value, client_id = excluded.client_id,
    owner_member_id = excluded.owner_member_id, next_step = excluded.next_step,
    next_date = excluded.next_date, lost_reason = excluded.lost_reason,
    qualification = excluded.qualification, history = excluded.history,
    log = excluded.log, extra = excluded.extra;
  select * into l from public.leads where workspace_id = p_workspace_id and id = p_id;
  return public.lead_to_json(l);
end
$$;

create function public.delete_workspace_record(
  p_workspace_id uuid, p_collection text, p_id text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_collection <> 'leads' then
    return public.delete_workspace_record_base(p_workspace_id, p_collection, p_id);
  end if;
  if public.member_role(p_workspace_id) is null
     or not public.can_write_collection(p_workspace_id, 'leads') then raise exception 'forbidden'; end if;
  delete from public.leads
  where workspace_id = p_workspace_id and id = p_id
    and (client_id is null or public.has_client_access(workspace_id, client_id));
  return found;
end
$$;

revoke all on function public.get_workspace_records_base(uuid, text),
  public.put_workspace_record_base(uuid, text, text, jsonb),
  public.delete_workspace_record_base(uuid, text, text),
  public.lead_to_json(public.leads), public.lead_from_json(uuid, text, jsonb),
  public.touch_updated_at()
  from public, anon, authenticated;
revoke all on function public.get_workspace_records(uuid, text),
  public.put_workspace_record(uuid, text, text, jsonb),
  public.delete_workspace_record(uuid, text, text)
  from public, anon;
grant execute on function public.get_workspace_records(uuid, text),
  public.put_workspace_record(uuid, text, text, jsonb),
  public.delete_workspace_record(uuid, text, text)
  to authenticated;

-- ==== 202610310001_client_portal.sql ====
-- Client portal: the campaign overview each client sees, and the concepts Gecko and the client write,
-- discuss and approve together. The team reads and writes these tables directly under row level security.
-- Clients never touch the tables: they go through the get_my_portal and client_* functions below,
-- which check that the signed-in person holds a live account for that client.

-- ---------- checks used by the tables ----------

create function public.portal_items_ok(p_items text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select cardinality(p_items) <= 20
    and coalesce((select bool_and(length(trim(x)) between 1 and 200) from unnest(p_items) as items(x)), true)
$$;

-- Milestones: [{"label": "Shoot", "date": "2026-11-12", "done": false}, ...]
create function public.portal_milestones_ok(p_items jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p_items) = 'array'
    and jsonb_array_length(p_items) <= 20
    and coalesce((
      select bool_and(
        jsonb_typeof(m) = 'object'
        and jsonb_typeof(m->'label') = 'string'
        and length(trim(m->>'label')) between 1 and 120
        and (m->'date' is null or jsonb_typeof(m->'date') = 'null'
             or (jsonb_typeof(m->'date') = 'string' and (m->>'date') ~ '^\d{4}-\d{2}-\d{2}$'))
        and (m->'done' is null or jsonb_typeof(m->'done') = 'boolean')
        and (select count(*) from jsonb_object_keys(m)) <= 3
      )
      from jsonb_array_elements(p_items) as items(m)
    ), true)
$$;

-- ---------- the campaign overview ----------

create table public.client_portals (
  workspace_id uuid not null,
  client_id text not null,
  campaign text not null default '' check (length(campaign) <= 160),
  summary text not null default '' check (length(summary) <= 2000),
  included text[] not null default '{}' check (public.portal_items_ok(included)),
  shoot_date date,
  shoot_place text not null default '' check (length(shoot_place) <= 200),
  next_step text not null default '' check (length(next_step) <= 500),
  milestones jsonb not null default '[]' check (public.portal_milestones_ok(milestones)),
  price numeric(12, 3) check (price >= 0),
  deposit_status text not null default 'due' check (deposit_status in ('due', 'paid')),
  balance_status text not null default 'later' check (balance_status in ('later', 'due', 'paid')),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create trigger client_portals_touch before update on public.client_portals
  for each row execute function public.touch_updated_at();

alter table public.client_portals enable row level security;
revoke all on public.client_portals from public, anon, authenticated;
grant select, insert, update, delete on public.client_portals to authenticated;

-- The overview carries the price, so like the money screens it stays with the founder and the client lead.
create policy client_portals_read on public.client_portals for select to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));
create policy client_portals_insert on public.client_portals for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));
create policy client_portals_update on public.client_portals for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));
create policy client_portals_delete on public.client_portals for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales') and public.has_client_access(workspace_id, client_id));

-- ---------- concepts ----------
-- status: draft (team only), review (waiting for the client), changes (the client asked for changes),
-- approved (the client approved this version), idea (written by the client, not a concept yet).

create table public.concepts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  title text not null check (length(trim(title)) between 1 and 160),
  format text not null default 'reel' check (format in ('reel', 'carousel', 'static', 'other')),
  body text not null default '' check (length(body) <= 10000),
  refs text not null default '' check (length(refs) <= 2000),
  position integer not null default 0 check (position between 0 and 100000),
  from_client boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'review', 'changes', 'approved', 'idea')),
  version integer not null default 1 check (version between 1 and 10000),
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
  check (status <> 'idea' or from_client)
);

create index concepts_client on public.concepts(workspace_id, client_id, position);

create table public.concept_notes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  concept_id uuid not null references public.concepts(id) on delete cascade,
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

create index concept_notes_concept on public.concept_notes(concept_id, created_at);

-- The signed-in team member's name, for the record of who wrote what.
create function public.my_member_name(p_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select left(coalesce(nullif(trim(wm.display_name), ''), wm.email), 120)
  from public.workspace_members wm
  where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.active
  limit 1
$$;

-- Rules for team writes (requests run as the authenticated role). The client functions below run as the
-- table owner and set every field themselves, so these rules do not apply to them. The trigger runs as the
-- caller (security invoker) so current_user tells the two apart.
create function public.concepts_guard()
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
  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'review') then raise exception 'client_only'; end if;
    new.from_client := false;
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
  -- UPDATE: who wrote it, when and which client never change.
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.client_id := old.client_id;
  new.from_client := old.from_client;
  new.created_by := old.created_by;
  new.author_name := old.author_name;
  new.created_at := old.created_at;
  -- Only the client can approve or ask for changes; the approval record is theirs.
  if new.status is distinct from old.status and new.status in ('approved', 'changes', 'idea') then
    raise exception 'client_only';
  end if;
  new.approved_version := old.approved_version;
  new.approved_at := old.approved_at;
  new.approved_by := old.approved_by;
  if (new.title, new.format, new.body, new.refs) is distinct from (old.title, old.format, old.body, old.refs) then
    new.version := old.version + 1;
    -- A changed concept goes back to the client: an old approval no longer covers it.
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

create trigger concepts_guard before insert or update on public.concepts
  for each row execute function public.concepts_guard();

create function public.concept_notes_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  c public.concepts%rowtype;
begin
  if current_user <> 'authenticated' then return new; end if;
  select * into c from public.concepts where id = new.concept_id;
  if not found or c.workspace_id <> new.workspace_id or c.client_id <> new.client_id then
    raise exception 'invalid_note';
  end if;
  if new.kind <> 'comment' then raise exception 'client_only'; end if;
  new.from_client := false;
  new.author_user := (select auth.uid());
  new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
  new.version := c.version;
  new.created_at := now();
  return new;
end
$$;

create trigger concept_notes_guard before insert on public.concept_notes
  for each row execute function public.concept_notes_guard();

alter table public.concepts enable row level security;
alter table public.concept_notes enable row level security;
revoke all on public.concepts, public.concept_notes from public, anon, authenticated;
grant select, insert, update, delete on public.concepts to authenticated;
grant select, insert, delete on public.concept_notes to authenticated;

create policy concepts_read on public.concepts for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy concepts_insert on public.concepts for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy concepts_update on public.concepts for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy concepts_delete on public.concepts for delete to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));

create policy concept_notes_read on public.concept_notes for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy concept_notes_insert on public.concept_notes for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
-- Team members can take back their own comments; the client's approvals and requests stay on record.
create policy concept_notes_delete on public.concept_notes for delete to authenticated
  using (author_user = (select auth.uid()) and not from_client and public.member_role(workspace_id) is not null);

-- ---------- what the client can do ----------

-- The signed-in person's live account for this client, or nothing.
create function public.my_client_account(p_workspace_id uuid, p_client_id text)
returns public.client_accounts
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.client_accounts a
  where a.workspace_id = p_workspace_id and a.client_id = p_client_id
    and a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
  limit 1
$$;

create function public.concept_to_json(c public.concepts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'format', c.format, 'body', c.body, 'refs', c.refs,
    'position', c.position, 'fromClient', c.from_client, 'status', c.status, 'version', c.version,
    'approvedVersion', c.approved_version, 'approvedAt', c.approved_at, 'approvedBy', c.approved_by,
    'authorName', c.author_name, 'createdAt', c.created_at, 'updatedAt', c.updated_at,
    'notes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', n.id, 'kind', n.kind, 'fromClient', n.from_client, 'authorName', n.author_name,
        'body', n.body, 'version', n.version, 'createdAt', n.created_at
      ) order by n.created_at)
      from public.concept_notes n where n.concept_id = c.id
    ), '[]'::jsonb)
  )
$$;

-- Everything the portal shows: the overview, every concept the team shared (never drafts), and the client's ideas.
create function public.get_my_portal(p_workspace_id uuid, p_client_id text)
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
    ), '[]'::jsonb)
  );
end
$$;

-- Approve, ask for changes, or comment. Approving needs the version the client is looking at,
-- so nobody approves a concept that changed since they read it.
create function public.client_concept_note(
  p_workspace_id uuid, p_client_id text, p_concept_id uuid, p_kind text, p_body text, p_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.concepts%rowtype;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('comment', 'approve', 'changes') or p_body is null or length(p_body) > 4000
     or (p_kind in ('comment', 'changes') and length(trim(p_body)) = 0) then
    raise exception 'invalid_note';
  end if;
  select * into c from public.concepts
  where id = p_concept_id and workspace_id = p_workspace_id and client_id = p_client_id and status <> 'draft'
  for update;
  if not found then raise exception 'invalid_note'; end if;
  if p_kind <> 'comment' and (c.status not in ('review', 'changes') or c.version is distinct from p_version) then
    raise exception 'concept_changed';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.notes.' || acc.id::text, 0));
  if (select count(*) from public.concept_notes n
      where n.workspace_id = p_workspace_id and n.client_id = p_client_id and n.from_client
        and n.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'feedback_rate_limited';
  end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  insert into public.concept_notes(workspace_id, client_id, concept_id, kind, from_client, author_user, author_name, body, version)
  values (p_workspace_id, p_client_id, c.id, p_kind, true, (select auth.uid()), who, trim(p_body), c.version);
  if p_kind = 'approve' then
    update public.concepts set status = 'approved', approved_version = c.version, approved_at = now(), approved_by = who
    where id = c.id returning * into c;
  elsif p_kind = 'changes' then
    update public.concepts set status = 'changes', approved_version = null, approved_at = null, approved_by = null
    where id = c.id returning * into c;
  end if;
  return public.concept_to_json(c);
end
$$;

-- The client writes or edits one of their own ideas (p_id null adds a new one). Ideas the team
-- has already taken into a concept can no longer be edited by the client.
create function public.client_save_idea(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_title text, p_body text, p_refs text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  c public.concepts%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 160
     or coalesce(length(p_body), 0) > 10000 or coalesce(length(p_refs), 0) > 2000 then
    raise exception 'invalid_idea';
  end if;
  if p_id is null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.ideas.' || acc.id::text, 0));
    if (select count(*) from public.concepts x
        where x.workspace_id = p_workspace_id and x.client_id = p_client_id and x.from_client) >= 200 then
      raise exception 'too_many_ideas';
    end if;
    insert into public.concepts(workspace_id, client_id, title, body, refs, position, from_client, status, created_by, author_name)
    values (p_workspace_id, p_client_id, trim(p_title), coalesce(p_body, ''), coalesce(p_refs, ''),
      coalesce((select max(x.position) + 1 from public.concepts x
        where x.workspace_id = p_workspace_id and x.client_id = p_client_id), 0),
      true, 'idea', (select auth.uid()), left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120))
    returning * into c;
  else
    update public.concepts set title = trim(p_title), body = coalesce(p_body, ''), refs = coalesce(p_refs, ''),
      version = version + 1
    where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
      and from_client and status = 'idea' and created_by = (select auth.uid())
    returning * into c;
    if not found then raise exception 'invalid_idea'; end if;
  end if;
  return public.concept_to_json(c);
end
$$;

create function public.client_delete_idea(p_workspace_id uuid, p_client_id text, p_id uuid)
returns boolean
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
  delete from public.concepts
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and from_client and status = 'idea' and created_by = (select auth.uid());
  return found;
end
$$;

revoke all on function public.portal_items_ok(text[]), public.portal_milestones_ok(jsonb),
  public.my_member_name(uuid), public.concepts_guard(), public.concept_notes_guard(),
  public.my_client_account(uuid, text), public.concept_to_json(public.concepts),
  public.get_my_portal(uuid, text),
  public.client_concept_note(uuid, text, uuid, text, text, integer),
  public.client_save_idea(uuid, text, uuid, text, text, text),
  public.client_delete_idea(uuid, text, uuid)
  from public, anon, authenticated;
-- The table checks and triggers call these, so every role that writes the tables needs them.
grant execute on function public.portal_items_ok(text[]), public.portal_milestones_ok(jsonb),
  public.my_member_name(uuid), public.concepts_guard(), public.concept_notes_guard() to authenticated;
grant execute on function public.get_my_portal(uuid, text),
  public.client_concept_note(uuid, text, uuid, text, text, integer),
  public.client_save_idea(uuid, text, uuid, text, text, text),
  public.client_delete_idea(uuid, text, uuid)
  to authenticated;

-- ==== 202611010001_videos.sql ====
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

-- ==== 202611010002_team_reads_clients.sql ====
-- The Clients screen, a client's page and the Team screen read the client list straight from this table, but phase 0
-- revoked every privilege on it, so the read failed with "permission denied" and the screens showed an error.
-- Signed-in people may now read the plain columns. Row level security (clients_assigned_read) still limits each person
-- to the clients they can access, and the data column stays behind the role-aware RPCs.
grant select (workspace_id, id, brand, created_at, updated_at) on public.clients to authenticated;

-- ==== 202611020001_scripts.sql ====
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

-- ==== 202611020002_shared_space_and_invites.sql ====
-- The shared space: what Gecko and the client both fill in.
-- Brand notes: one short living page of do's and don'ts per client, edited by both sides.
-- References: links either side drops in ("this hook", "this light", "never this"), each with a note.
-- Requests: anything not tied to a script or a reel. Each gets an answer from Gecko and closes.
-- The team reads and writes the tables under row level security; clients go through the client_* functions.

-- ---------- brand notes ----------

create table public.client_brand_notes (
  workspace_id uuid not null,
  client_id text not null,
  body text not null default '' check (length(body) <= 8000),
  updated_by_name text not null default '' check (length(updated_by_name) <= 120),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, client_id),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create function public.brand_notes_guard()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user = 'authenticated' then
    new.updated_by_name := coalesce(public.my_member_name(new.workspace_id), '');
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger client_brand_notes_guard before insert or update on public.client_brand_notes
  for each row execute function public.brand_notes_guard();

-- ---------- references and requests ----------

create table public.shared_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  kind text not null check (kind in ('reference', 'request')),
  title text not null default '' check (length(title) <= 160),
  body text not null default '' check (length(body) <= 4000),
  url text not null default '' check (length(url) <= 1000 and (url = '' or url ~* '^https?://\S+$')),
  status text check (status in ('open', 'answered', 'closed')),
  answer text not null default '' check (length(answer) <= 4000),
  answered_by text not null default '' check (length(answered_by) <= 120),
  answered_at timestamptz,
  from_client boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check ((kind = 'request') = (status is not null)),
  check (kind <> 'request' or length(trim(body)) > 0),
  check (kind <> 'reference' or length(trim(url)) > 0 or length(trim(body)) > 0)
);

create index shared_items_client on public.shared_items(workspace_id, client_id, created_at);

-- Team writes: the database sets who wrote it, and answering a request stamps who answered and when.
create function public.shared_items_guard()
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
  if tg_op = 'INSERT' then
    if new.kind = 'request' then raise exception 'client_only'; end if;
    new.from_client := false;
    new.status := null;
    new.answer := '';
    new.answered_by := '';
    new.answered_at := null;
    new.created_by := (select auth.uid());
    new.author_name := coalesce(public.my_member_name(new.workspace_id), '');
    new.created_at := now();
    new.updated_at := now();
    return new;
  end if;
  new.id := old.id;
  new.workspace_id := old.workspace_id;
  new.client_id := old.client_id;
  new.kind := old.kind;
  new.from_client := old.from_client;
  new.created_by := old.created_by;
  new.author_name := old.author_name;
  new.created_at := old.created_at;
  if old.from_client then
    -- The team answers or closes a client's item but never rewrites what the client wrote.
    new.title := old.title;
    new.body := old.body;
    new.url := old.url;
  end if;
  if old.kind = 'request' then
    if new.answer is distinct from old.answer then
      new.answered_by := coalesce(public.my_member_name(new.workspace_id), '');
      new.answered_at := now();
      if new.status = 'open' and length(trim(new.answer)) > 0 then new.status := 'answered'; end if;
    else
      new.answered_by := old.answered_by;
      new.answered_at := old.answered_at;
    end if;
  else
    new.status := null;
  end if;
  new.updated_at := now();
  return new;
end
$$;

create trigger shared_items_guard before insert or update on public.shared_items
  for each row execute function public.shared_items_guard();

alter table public.client_brand_notes enable row level security;
alter table public.shared_items enable row level security;
revoke all on public.client_brand_notes, public.shared_items from public, anon, authenticated;
grant select, insert, update on public.client_brand_notes to authenticated;
grant select, insert, update, delete on public.shared_items to authenticated;

create policy brand_notes_read on public.client_brand_notes for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy brand_notes_insert on public.client_brand_notes for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy brand_notes_update on public.client_brand_notes for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));

create policy shared_items_read on public.shared_items for select to authenticated
  using (public.member_role(workspace_id) is not null and public.has_client_access(workspace_id, client_id));
create policy shared_items_insert on public.shared_items for insert to authenticated
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
create policy shared_items_update on public.shared_items for update to authenticated
  using (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id))
  with check (public.member_role(workspace_id) in ('founder', 'sales', 'editor') and public.has_client_access(workspace_id, client_id));
-- The team removes its own references; a client's items stay on record (requests close instead).
create policy shared_items_delete on public.shared_items for delete to authenticated
  using (not from_client and public.member_role(workspace_id) in ('founder', 'sales', 'editor')
    and public.has_client_access(workspace_id, client_id));

-- ---------- what the client sees and does ----------

create function public.shared_item_to_json(i public.shared_items)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'title', i.title, 'body', i.body, 'url', i.url, 'status', i.status,
    'answer', i.answer, 'answeredBy', i.answered_by, 'answeredAt', i.answered_at,
    'fromClient', i.from_client, 'mine', i.created_by = (select auth.uid()),
    'authorName', i.author_name, 'createdAt', i.created_at
  )
$$;

create function public.get_my_shared(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  n public.client_brand_notes%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  select * into n from public.client_brand_notes where workspace_id = p_workspace_id and client_id = p_client_id;
  return jsonb_build_object(
    'brandNotes', jsonb_build_object(
      'body', coalesce(n.body, ''), 'updatedBy', coalesce(n.updated_by_name, ''), 'updatedAt', n.updated_at
    ),
    'items', coalesce((
      select jsonb_agg(public.shared_item_to_json(i) order by i.created_at desc)
      from public.shared_items i where i.workspace_id = p_workspace_id and i.client_id = p_client_id
    ), '[]'::jsonb)
  );
end
$$;

create function public.client_save_brand_notes(p_workspace_id uuid, p_client_id text, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_body is null or length(p_body) > 8000 then raise exception 'invalid_notes'; end if;
  who := left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120);
  insert into public.client_brand_notes(workspace_id, client_id, body, updated_by_name)
  values (p_workspace_id, p_client_id, p_body, who)
  on conflict (workspace_id, client_id) do update set body = excluded.body, updated_by_name = excluded.updated_by_name;
  return public.get_my_shared(p_workspace_id, p_client_id);
end
$$;

-- Add a reference or a request.
create function public.client_add_shared(
  p_workspace_id uuid, p_client_id text, p_kind text, p_title text, p_body text, p_url text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  i public.shared_items%rowtype;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if p_kind not in ('reference', 'request') then raise exception 'invalid_item'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.shared.' || acc.id::text, 0));
  if (select count(*) from public.shared_items x
      where x.workspace_id = p_workspace_id and x.client_id = p_client_id and x.from_client
        and x.created_at > now() - interval '1 hour') >= 60 then
    raise exception 'feedback_rate_limited';
  end if;
  begin
    insert into public.shared_items(workspace_id, client_id, kind, title, body, url, status, from_client, created_by, author_name)
    values (p_workspace_id, p_client_id, p_kind, trim(coalesce(p_title, '')), trim(coalesce(p_body, '')),
      trim(coalesce(p_url, '')), case when p_kind = 'request' then 'open' end, true, (select auth.uid()),
      left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120))
    returning * into i;
  exception when check_violation then
    raise exception 'invalid_item';
  end;
  return public.shared_item_to_json(i);
end
$$;

-- The client removes a reference they added, or withdraws a request nobody has answered yet.
create function public.client_remove_shared(p_workspace_id uuid, p_client_id text, p_id uuid)
returns boolean
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
  delete from public.shared_items
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and from_client and created_by = (select auth.uid())
    and (kind = 'reference' or status = 'open');
  return found;
end
$$;

revoke all on function public.brand_notes_guard(), public.shared_items_guard(),
  public.shared_item_to_json(public.shared_items), public.get_my_shared(uuid, text),
  public.client_save_brand_notes(uuid, text, text),
  public.client_add_shared(uuid, text, text, text, text, text),
  public.client_remove_shared(uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.brand_notes_guard(), public.shared_items_guard() to authenticated;
grant execute on function public.get_my_shared(uuid, text),
  public.client_save_brand_notes(uuid, text, text),
  public.client_add_shared(uuid, text, text, text, text, text),
  public.client_remove_shared(uuid, text, uuid)
  to authenticated;

-- ---------- a friendlier invite ----------
-- Whoever holds a live invite link may see which brand it is for and which email it was sent to, so the invite
-- page can greet them by brand and fill in the email for them. Nothing else, and nothing for a used, revoked or
-- expired link. The link itself is the secret: it was sent only to that person.
create function public.peek_client_invite(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('brand', c.brand, 'email', a.email)
  from public.client_accounts a
  join public.clients c on c.workspace_id = a.workspace_id and c.id = a.client_id
  where p_token ~ '^[0-9a-f]{64}$'
    and a.token_hash = extensions.digest(convert_to(p_token, 'UTF8'), 'sha256')
    and a.revoked_at is null and a.accepted_at is null and a.expires_at > now()
  limit 1
$$;

revoke all on function public.peek_client_invite(text) from public;
grant execute on function public.peek_client_invite(text) to anon, authenticated;

-- ==== 202611020003_plans.sql ====

-- Plans: which Gecko offer a client is on (the Test, a monthly plan, or something custom) and how many reels it
-- holds. The client's Home counts reels against it: scripts approved, and later videos delivered.
-- Moving a client from the Test to a monthly plan is a change of plan on the same overview.

alter table public.client_portals
  add column plan text not null default 'custom'
    check (plan in ('test', 'regular', 'pro', 'partner', 'custom')),
  add column reels integer check (reels between 0 and 200);

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
      'depositStatus', p.deposit_status, 'balanceStatus', p.balance_status, 'updatedAt', p.updated_at,
      'plan', p.plan, 'reels', p.reels
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

revoke all on function public.get_my_portal(uuid, text) from public, anon;
grant execute on function public.get_my_portal(uuid, text) to authenticated;

-- ==== 202611030001_boards.sql ====

-- Boards: a shared canvas per client, for moodboards, shot lists, call sheets and anything else Gecko and the
-- client plan together. A board holds cards (notes, to-dos, links, videos played from their link, images,
-- tables, columns, arrows) and other boards. The team and the client both edit it.
--
-- Nobody touches the tables directly. Everyone goes through the functions below, which let in a team member with
-- access to the client, or a live client account for that client. Every change bumps the board's rev, so open
-- screens can poll one number and reload only when something changed.

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  parent_id uuid references public.boards(id) on delete cascade,
  title text not null default '' check (length(title) <= 120),
  rev bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade
);

create unique index boards_one_root on public.boards (workspace_id, client_id) where parent_id is null;
create index boards_parent on public.boards (parent_id);

create table public.board_items (
  id uuid primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  kind text not null check (kind in ('note', 'todo', 'link', 'video', 'image', 'table', 'column', 'board', 'arrow')),
  x double precision not null default 0 check (x between -100000 and 100000),
  y double precision not null default 0 check (y between -100000 and 100000),
  w double precision not null default 280 check (w between 40 and 4000),
  h double precision check (h is null or h between 40 and 4000),
  z integer not null default 0,
  column_id uuid,
  position double precision not null default 0,
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object' and length(data::text) <= 20000),
  author_name text not null default '' check (length(author_name) <= 120),
  from_client boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index board_items_board on public.board_items (board_id);

alter table public.boards enable row level security;
alter table public.board_items enable row level security;
revoke all on public.boards from public, anon, authenticated;
revoke all on public.board_items from public, anon, authenticated;

-- Who is asking: a team member with access to this client, or the client. Raises when neither.
create function public.board_actor(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
  who text;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.has_client_access(p_workspace_id, p_client_id) then
    select coalesce(nullif(trim(wm.display_name), ''), wm.email) into who
    from public.workspace_members wm
    where wm.workspace_id = p_workspace_id and wm.user_id = (select auth.uid()) and wm.active
    limit 1;
    return jsonb_build_object('name', left(coalesce(who, 'Gecko'), 120), 'client', false);
  end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  return jsonb_build_object('name', left(coalesce(nullif(trim(acc.display_name), ''), acc.email), 120), 'client', true);
end
$$;

-- Used by the storage policies on the board images bucket: true for the team with access, and for the client.
create function public.board_access(p_workspace_id text, p_client_id text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ws uuid;
begin
  if p_workspace_id !~ '^[0-9a-f-]{36}$' then return false; end if;
  ws := p_workspace_id::uuid;
  return public.has_client_access(ws, p_client_id) or (public.my_client_account(ws, p_client_id)).id is not null;
end
$$;

create function public.board_item_to_json(i public.board_items)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'x', i.x, 'y', i.y, 'w', i.w, 'h', i.h, 'z', i.z,
    'columnId', i.column_id, 'position', i.position, 'data', i.data,
    'author', i.author_name, 'fromClient', i.from_client, 'updatedAt', i.updated_at,
    'count', case when i.kind = 'board' then (
      select count(*) from public.board_items c
      where c.board_id = (case when i.data->>'boardId' ~ '^[0-9a-f-]{36}$' then (i.data->>'boardId')::uuid end)
        and c.kind <> 'arrow'
    ) end
  )
$$;

-- Finds the board and checks it belongs to this client. A null board means the client's top board, made on first open.
create function public.board_for(p_workspace_id uuid, p_client_id text, p_board_id uuid)
returns public.boards
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
begin
  if p_board_id is null then
    select * into b from public.boards
    where workspace_id = p_workspace_id and client_id = p_client_id and parent_id is null;
    if b.id is null then
      insert into public.boards (workspace_id, client_id, title)
      values (p_workspace_id, p_client_id,
        coalesce((select c.brand from public.clients c where c.workspace_id = p_workspace_id and c.id = p_client_id), 'Board'))
      on conflict do nothing;
      select * into b from public.boards
      where workspace_id = p_workspace_id and client_id = p_client_id and parent_id is null;
    end if;
  else
    select * into b from public.boards
    where id = p_board_id and workspace_id = p_workspace_id and client_id = p_client_id;
  end if;
  if b.id is null then raise exception 'board_not_found'; end if;
  return b;
end
$$;

create function public.get_board(p_workspace_id uuid, p_client_id text, p_board_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  b := public.board_for(p_workspace_id, p_client_id, p_board_id);
  return jsonb_build_object(
    'board', jsonb_build_object('id', b.id, 'title', b.title, 'parentId', b.parent_id, 'rev', b.rev),
    'path', (
      with recursive up as (
        select p.id, p.parent_id, p.title, 0 as depth from public.boards p where p.id = b.parent_id
        union all
        select p.id, p.parent_id, p.title, up.depth + 1 from public.boards p join up on p.id = up.parent_id
        where up.depth < 50
      )
      select coalesce(jsonb_agg(jsonb_build_object('id', id, 'title', title) order by depth desc), '[]'::jsonb) from up
    ),
    'items', coalesce((
      select jsonb_agg(public.board_item_to_json(i) order by i.z, i.created_at)
      from public.board_items i where i.board_id = b.id
    ), '[]'::jsonb)
  );
end
$$;

-- One cheap number for open screens to poll.
create function public.board_rev(p_workspace_id uuid, p_client_id text, p_board_id uuid)
returns bigint
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r bigint;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  select rev into r from public.boards
  where id = p_board_id and workspace_id = p_workspace_id and client_id = p_client_id;
  if r is null then raise exception 'board_not_found'; end if;
  return r;
end
$$;

-- Adds or updates cards, many at once (a template, a drag of several cards). Each card is a JSON object with an
-- id made by the app. A new board card gets its board made here. Returns the new rev.
create function public.save_board_items(p_workspace_id uuid, p_client_id text, p_board_id uuid, p_items jsonb)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor jsonb := public.board_actor(p_workspace_id, p_client_id);
  b public.boards := public.board_for(p_workspace_id, p_client_id, p_board_id);
  it jsonb;
  item_id uuid;
  d jsonb;
  child uuid;
  r bigint;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 200 then raise exception 'invalid_card'; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or coalesce(it->>'id', '') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
       or (it ? 'data' and jsonb_typeof(it->'data') <> 'object') then
      raise exception 'invalid_card';
    end if;
    item_id := (it->>'id')::uuid;
    if exists (select 1 from public.board_items where id = item_id and board_id <> b.id) then
      raise exception 'invalid_card';
    end if;
    d := coalesce(it->'data', (select data from public.board_items where id = item_id), '{}'::jsonb);

    if it->>'kind' = 'board' and not exists (select 1 from public.board_items where id = item_id) then
      if (select count(*) from public.boards where workspace_id = p_workspace_id and client_id = p_client_id) >= 200 then
        raise exception 'too_many_boards';
      end if;
      insert into public.boards (workspace_id, client_id, parent_id, title)
      values (p_workspace_id, p_client_id, b.id, left(coalesce(nullif(trim(d->>'title'), ''), 'Untitled board'), 120))
      returning id into child;
      d := d || jsonb_build_object('boardId', child);
    elsif exists (select 1 from public.board_items where id = item_id and kind = 'board') then
      -- the card keeps pointing at its own board, whatever the app sends
      d := d || jsonb_build_object('boardId', (select data->'boardId' from public.board_items where id = item_id));
    end if;

    insert into public.board_items as i (id, board_id, kind, x, y, w, h, z, column_id, position, data, author_name, from_client)
    values (
      item_id, b.id, it->>'kind',
      coalesce((it->>'x')::double precision, 0), coalesce((it->>'y')::double precision, 0),
      coalesce((it->>'w')::double precision, 280), (it->>'h')::double precision,
      coalesce((it->>'z')::integer, 0),
      case when it->>'columnId' ~ '^[0-9a-f-]{36}$' then (it->>'columnId')::uuid end,
      coalesce((it->>'position')::double precision, 0),
      d, actor->>'name', (actor->>'client')::boolean
    )
    on conflict (id) do update set
      x = coalesce((it->>'x')::double precision, i.x),
      y = coalesce((it->>'y')::double precision, i.y),
      w = coalesce((it->>'w')::double precision, i.w),
      h = case when it ? 'h' then (it->>'h')::double precision else i.h end,
      z = coalesce((it->>'z')::integer, i.z),
      column_id = case when it ? 'columnId' then
        case when it->>'columnId' ~ '^[0-9a-f-]{36}$' then (it->>'columnId')::uuid end else i.column_id end,
      position = coalesce((it->>'position')::double precision, i.position),
      data = excluded.data,
      updated_at = now();
  end loop;

  if (select count(*) from public.board_items where board_id = b.id) > 500 then raise exception 'board_full'; end if;
  -- a card can only sit in a column of the same board
  update public.board_items i set column_id = null
  where i.board_id = b.id and i.column_id is not null
    and not exists (select 1 from public.board_items c where c.id = i.column_id and c.board_id = b.id and c.kind = 'column');

  update public.boards set rev = rev + 1, updated_at = now() where id = b.id returning rev into r;
  -- a board card shows how many cards its board holds, so the parent changes too
  if b.parent_id is not null then update public.boards set rev = rev + 1 where id = b.parent_id; end if;
  return r;
end
$$;

-- Deletes cards. Cards in a deleted column stay on the board, arrows to a deleted card go with it, and a deleted
-- board card takes its board and everything in it.
create function public.delete_board_items(p_workspace_id uuid, p_client_id text, p_board_id uuid, p_ids uuid[])
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
  r bigint;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  b := public.board_for(p_workspace_id, p_client_id, p_board_id);
  if cardinality(p_ids) > 200 then raise exception 'invalid_card'; end if;

  update public.board_items set column_id = null where board_id = b.id and column_id = any(p_ids);
  delete from public.boards child
  using public.board_items i
  where i.board_id = b.id and i.id = any(p_ids) and i.kind = 'board'
    and i.data->>'boardId' ~ '^[0-9a-f-]{36}$' and child.id = (i.data->>'boardId')::uuid and child.parent_id = b.id;
  delete from public.board_items
  where board_id = b.id and (id = any(p_ids)
    or (kind = 'arrow' and (data->>'from' = any(p_ids::text[]) or data->>'to' = any(p_ids::text[]))));

  update public.boards set rev = rev + 1, updated_at = now() where id = b.id returning rev into r;
  if b.parent_id is not null then update public.boards set rev = rev + 1 where id = b.parent_id; end if;
  return r;
end
$$;

create function public.rename_board(p_workspace_id uuid, p_client_id text, p_board_id uuid, p_title text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  b public.boards;
  t text := left(trim(coalesce(p_title, '')), 120);
  r bigint;
begin
  perform public.board_actor(p_workspace_id, p_client_id);
  b := public.board_for(p_workspace_id, p_client_id, p_board_id);
  if t = '' then raise exception 'invalid_card'; end if;
  update public.boards set title = t, rev = rev + 1, updated_at = now() where id = b.id returning rev into r;
  if b.parent_id is not null then
    update public.board_items set data = data || jsonb_build_object('title', t), updated_at = now()
    where board_id = b.parent_id and kind = 'board' and data->>'boardId' = b.id::text;
    update public.boards set rev = rev + 1 where id = b.parent_id;
  end if;
  return r;
end
$$;

revoke all on function public.board_actor(uuid, text) from public, anon;
revoke all on function public.board_access(text, text) from public, anon;
revoke all on function public.board_for(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.board_item_to_json(public.board_items) from public, anon, authenticated;
revoke all on function public.get_board(uuid, text, uuid) from public, anon;
revoke all on function public.board_rev(uuid, text, uuid) from public, anon;
revoke all on function public.save_board_items(uuid, text, uuid, jsonb) from public, anon;
revoke all on function public.delete_board_items(uuid, text, uuid, uuid[]) from public, anon;
revoke all on function public.rename_board(uuid, text, uuid, text) from public, anon;
grant execute on function public.board_actor(uuid, text) to authenticated;
grant execute on function public.board_access(text, text) to authenticated;
grant execute on function public.get_board(uuid, text, uuid) to authenticated;
grant execute on function public.board_rev(uuid, text, uuid) to authenticated;
grant execute on function public.save_board_items(uuid, text, uuid, jsonb) to authenticated;
grant execute on function public.delete_board_items(uuid, text, uuid, uuid[]) to authenticated;
grant execute on function public.rename_board(uuid, text, uuid, text) to authenticated;

-- Images on boards: a private bucket, 5 MB per image, paths <workspace>/<client>/<file>. Only runs where Supabase
-- storage exists (not in the local test database).
do $do$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('boards', 'boards', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
    on conflict (id) do nothing;
    execute $p$create policy boards_read on storage.objects for select to authenticated
      using (bucket_id = 'boards' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
    execute $p$create policy boards_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'boards' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
    execute $p$create policy boards_delete on storage.objects for delete to authenticated
      using (bucket_id = 'boards' and public.board_access((storage.foldername(name))[1], (storage.foldername(name))[2]))$p$;
  end if;
end
$do$;
