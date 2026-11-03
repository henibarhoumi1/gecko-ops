-- View as client (technical specification, A9): the Gecko owner and producers open a client's portal
-- exactly as a chosen client role sees it, read-only, without ever signing in as the client.
--
-- How: team_preview checks the caller is founder or sales with access to that client, makes the rest of
-- its transaction read-only, marks the transaction as a preview of (workspace, client, role), and calls
-- one of the portal's own read functions. Inside that transaction only, my_client_account answers with a
-- stand-in account of the chosen role, so every rule of the portal (what a viewer can't see, prices for
-- owner and finance only, drafts hidden) applies unchanged. The mark is a transaction-local setting that
-- only team_preview sets; nothing a browser sends can set it. Writes are impossible during a preview
-- (read-only transaction), and outside team_preview my_client_account behaves exactly as before.

create or replace function public.my_client_account(p_workspace_id uuid, p_client_id text)
returns public.client_accounts
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.client_accounts a
  where a.workspace_id = p_workspace_id and a.client_id = p_client_id
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
  where coalesce(current_setting('gecko.preview', true), '') <> ''
    and current_setting('gecko.preview', true)
      = p_workspace_id::text || '|' || p_client_id || '|' || split_part(current_setting('gecko.preview', true), '|', 3)
  limit 1
$$;

create function public.team_preview(p_workspace_id uuid, p_client_id text, p_role text, p_read text)
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
  if p_read is null or p_read not in ('portal', 'team', 'production', 'cuts', 'invoices') then
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
  end;
  perform pg_catalog.set_config('gecko.preview', '', true);
  return result;
end
$$;

revoke all on function public.team_preview(uuid, text, text, text) from public, anon;
grant execute on function public.team_preview(uuid, text, text, text) to authenticated;
