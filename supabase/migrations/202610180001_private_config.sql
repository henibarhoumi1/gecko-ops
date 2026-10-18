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
