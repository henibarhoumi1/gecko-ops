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
