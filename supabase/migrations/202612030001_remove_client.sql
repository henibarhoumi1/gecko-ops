-- Deleting a client. The founder can take a client off the books: the client disappears from every team
-- page, its portal closes for the client's own accounts, and nobody on the team can open its ideas, scripts,
-- videos or invoices any more. Nothing is destroyed: the rows stay where they are and the client is listed on
-- the Trash page under "Deleted clients", where one click brings everything back exactly as it was.
-- (Destroying a client for good is a separate decision, so it isn't offered here.)

alter table public.clients
  add column removed_at timestamptz,
  add column removed_by_name text not null default '';

create function public.client_removed(p_workspace_id uuid, p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.clients c
    where c.workspace_id = p_workspace_id and c.id = p_client_id and c.removed_at is not null
  )
$$;

-- Every team read of a client goes through this check (the clients table itself, ideas, scripts, videos,
-- invoices, the portal pages), so a deleted client is closed to every role in one place.
create or replace function public.has_client_access(p_workspace_id uuid, p_client_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.clients rc
    where rc.workspace_id = p_workspace_id and rc.id = p_client_id and rc.removed_at is not null
  ) and case
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

-- The client's own people lose their portal too, and so does the team's "view as client" preview.
create or replace function public.my_client_account(p_workspace_id uuid, p_client_id text)
returns public.client_accounts
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.client_accounts a
  where not public.client_removed(p_workspace_id, p_client_id)
    and a.workspace_id = p_workspace_id and a.client_id = p_client_id
    and a.user_id = (select auth.uid()) and a.accepted_at is not null and a.revoked_at is null
    and coalesce(current_setting('gecko.preview', true), '') = ''
  union all
  select (jsonb_populate_record(null::public.client_accounts, jsonb_build_object(
    'id', '00000000-0000-4000-8000-0000000000aa',
    'workspace_id', p_workspace_id,
    'client_id', p_client_id,
    'email', 'preview@gecko.invalid',
    'display_name', 'Preview',
    'role', split_part(current_setting('gecko.preview', true), '|', 3),
    'accepted_at', now(),
    'invited_by', (select auth.uid()),
    'created_at', now()
  ))).*
  where not public.client_removed(p_workspace_id, p_client_id)
    and coalesce(current_setting('gecko.preview', true), '') <> ''
    and current_setting('gecko.preview', true)
      = p_workspace_id::text || '|' || p_client_id || '|' || split_part(current_setting('gecko.preview', true), '|', 3)
  limit 1
$$;

create or replace function public.get_my_client_portals()
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
    and c.removed_at is null
  order by c.brand
$$;

-- Founder only. Asks for the brand name back, so a client can't be deleted by a stray click.
create function public.remove_client(p_workspace_id uuid, p_client_id text, p_confirm_brand text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.clients;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') <> 'founder' then raise exception 'forbidden'; end if;
  select * into c from public.clients
  where workspace_id = p_workspace_id and id = p_client_id and removed_at is null
  for update;
  if c.id is null then raise exception 'client_not_found'; end if;
  if lower(trim(coalesce(p_confirm_brand, ''))) <> lower(trim(c.brand)) then
    raise exception 'brand_mismatch';
  end if;
  update public.clients
  set removed_at = now(), removed_by_name = coalesce(public.my_member_name(p_workspace_id), ''),
      updated_at = now()
  where workspace_id = p_workspace_id and id = p_client_id;
end
$$;

create function public.restore_client(p_workspace_id uuid, p_client_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') <> 'founder' then raise exception 'forbidden'; end if;
  update public.clients set removed_at = null, removed_by_name = '', updated_at = now()
  where workspace_id = p_workspace_id and id = p_client_id and removed_at is not null;
  if not found then raise exception 'client_not_found'; end if;
end
$$;

create function public.get_removed_clients(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') <> 'founder' then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'brand', c.brand, 'removedAt', c.removed_at, 'removedBy', c.removed_by_name
    ) order by c.removed_at desc)
    from public.clients c
    where c.workspace_id = p_workspace_id and c.removed_at is not null
  ), '[]'::jsonb);
end
$$;

revoke all on function public.client_removed(uuid, text),
  public.remove_client(uuid, text, text), public.restore_client(uuid, text),
  public.get_removed_clients(uuid) from public, anon;
grant execute on function public.client_removed(uuid, text),
  public.remove_client(uuid, text, text), public.restore_client(uuid, text),
  public.get_removed_clients(uuid) to authenticated;
