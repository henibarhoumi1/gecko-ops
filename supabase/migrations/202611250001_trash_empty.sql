-- Emptying the trash (contract step: needs the "contract-step" label). Items deleted more than 7 days ago are
-- destroyed for good. This runs whenever the founder or a producer opens the Trash page, so it needs no
-- scheduled job. The founder can also empty the trash early.

create or replace function public.get_trash(p_workspace_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  delete from public.trash t
  where t.workspace_id = p_workspace_id and t.deleted_at < now() - interval '7 days';
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'batch', t.batch, 'kind', t.tbl, 'label', t.label, 'clientId', t.client_id,
      'brand', (select c.brand from public.clients c where c.workspace_id = t.workspace_id and c.id = t.client_id),
      'deletedBy', t.deleted_by_name, 'deletedAt', t.deleted_at,
      'withIt', (select count(*) - 1 from public.trash x where x.batch = t.batch),
      'restoredAt', t.restored_at, 'restoredBy', t.restored_by_name
    ) order by t.deleted_at desc)
    from public.trash t
    where t.workspace_id = p_workspace_id and t.top
      and (t.client_id is null or public.has_client_access(t.workspace_id, t.client_id))
  ), '[]'::jsonb);
end
$$;

-- The founder empties the trash now: everything in it is destroyed for good.
create function public.empty_trash(p_workspace_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') <> 'founder' then raise exception 'forbidden'; end if;
  delete from public.trash t where t.workspace_id = p_workspace_id and t.top and t.restored_at is null;
  get diagnostics n = row_count;
  delete from public.trash t where t.workspace_id = p_workspace_id;
  return n;
end
$$;

revoke all on function public.empty_trash(uuid) from public, anon;
grant execute on function public.empty_trash(uuid) to authenticated;
