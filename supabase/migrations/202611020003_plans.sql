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
