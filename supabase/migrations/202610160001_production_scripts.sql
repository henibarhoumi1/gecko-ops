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
