-- Writing fixes (10 Nov 2026).
--
-- 1. The call to action can say what we see and what's on screen, not only what we hear. It's stored in
--    the same `cta` text: plain words as before, or a small JSON object {"see", "hear", "text"} when there's
--    more than words. Room for it: 1,500 characters instead of 300. Every existing call to action stays as is.
-- 2. The client can start their script from an approved idea, like the team: client_set_script_idea links
--    a script they can edit to one of their ideas (or unlinks it).

do $$
declare
  c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.scripts'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%length(cta)%'
  loop
    execute format('alter table public.scripts drop constraint %I', c);
  end loop;
end
$$;
alter table public.scripts add constraint scripts_cta_length check (length(cta) <= 1500);

create function public.client_set_script_idea(
  p_workspace_id uuid, p_client_id text, p_script_id uuid, p_concept_id uuid
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
  if acc.role not in ('owner', 'approver') then raise exception 'writer_only'; end if;
  if p_concept_id is not null and not exists (
    select 1 from public.concepts c
    where c.id = p_concept_id and c.workspace_id = p_workspace_id and c.client_id = p_client_id
      and c.status = 'approved'
  ) then
    raise exception 'concept_not_found';
  end if;
  update public.scripts set concept_id = p_concept_id
  where id = p_script_id and workspace_id = p_workspace_id and client_id = p_client_id
    and (written_by = 'client' or status in ('review', 'changes'));
  if not found then raise exception 'script_locked'; end if;
end
$$;

revoke all on function public.client_set_script_idea(uuid, text, uuid, uuid) from public, anon;
grant execute on function public.client_set_script_idea(uuid, text, uuid, uuid) to authenticated;
