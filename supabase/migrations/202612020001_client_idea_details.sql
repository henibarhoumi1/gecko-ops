-- The client's own ideas get the same parts as the team's: a hook line and a format (reel, carousel,
-- static, other). Set on an idea the client added, while it's still theirs (status idea).

create function public.client_set_idea_details(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_hook text, p_format text
)
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
  if coalesce(length(p_hook), 0) > 200 or coalesce(p_format, 'reel') not in ('reel', 'carousel', 'static', 'other') then
    raise exception 'invalid_idea';
  end if;
  update public.concepts set hook = trim(coalesce(p_hook, '')), format = coalesce(p_format, format)
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id
    and from_client and status = 'idea' and created_by = (select auth.uid());
  if not found then raise exception 'invalid_idea'; end if;
end
$$;

revoke all on function public.client_set_idea_details(uuid, text, uuid, text, text) from public, anon;
grant execute on function public.client_set_idea_details(uuid, text, uuid, text, text) to authenticated;
