-- Client logos: the brand's own logo, shown at the top of their portal and next to their name in the team app.
-- Stored on the overview row as a small image (PNG, JPEG or WebP, trimmed and shrunk in the browser to well
-- under 300 KB), so it loads with the portal in one call and needs no storage bucket the client could write to.

alter table public.client_portals
  add column logo text check (
    logo is null
    or (length(logo) <= 300000 and logo ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$')
  );

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
    'logo', p.logo,
    -- A row that only holds a logo is not a campaign plan yet.
    'overview', case when p.client_id is null or (
        p.campaign = '' and p.summary = '' and cardinality(p.included) = 0 and p.shoot_date is null
        and p.price is null and p.milestones = '[]'::jsonb and p.reels is null and p.next_step = ''
      ) then null else jsonb_build_object(
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
