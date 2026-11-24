-- A production cost (kind 'cost', 24 Nov 2026) shows as "Costs:" on the balance invoice, not "Props:".
-- Same function as 202611090001, only that label changes.

create or replace function public.create_invoice(p_workspace_id uuid, p_client_id text, p_kind text, p_lang text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  who text := public.invoice_team_check(p_workspace_id, p_client_id);
  portal public.client_portals%rowtype;
  settings jsonb := public.invoice_settings_json(p_workspace_id);
  lang text := case when p_lang = 'en' then 'en' else 'fr' end;
  en boolean := p_lang = 'en';
  what text;
  lines jsonb := '[]'::jsonb;
  bill jsonb;
  title text;
  new_id uuid;
  o record;
begin
  if p_kind is null or p_kind not in ('deposit', 'balance', 'month', 'extra') then raise exception 'invalid_invoice'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('gecko.invoices.' || p_client_id, 0));
  if (select count(*) from public.invoices i where i.workspace_id = p_workspace_id and i.client_id = p_client_id) >= 500 then
    raise exception 'too_many_invoices';
  end if;
  if p_kind in ('deposit', 'balance') and exists (
    select 1 from public.invoices i
    where i.workspace_id = p_workspace_id and i.client_id = p_client_id and i.kind = p_kind and i.status <> 'void'
  ) then raise exception 'invoice_exists'; end if;
  select * into portal from public.client_portals where workspace_id = p_workspace_id and client_id = p_client_id;
  if p_kind <> 'extra' and coalesce(portal.price, 0) <= 0 then raise exception 'invoice_needs_price'; end if;

  what := coalesce(nullif(trim(portal.campaign), ''), case portal.plan
    when 'test' then case when en then 'The Test' else 'Le Test' end
    when 'regular' then case when en then 'Regular plan' else 'Formule Regular' end
    when 'pro' then case when en then 'Pro plan' else 'Formule Pro' end
    when 'partner' then 'Creative Partner'
    else case when en then 'Video campaign' else 'Campagne vidéo' end end);

  if p_kind = 'deposit' then
    lines := jsonb_build_array(jsonb_build_object(
      'label', what || case when en then ', deposit (50%)' else ', acompte (50 %)' end,
      'qty', 1, 'unit', round(portal.price / 2, 3), 'taxed', true));
    title := '';
  elsif p_kind = 'balance' then
    lines := jsonb_build_array(jsonb_build_object(
      'label', what || case when en then ', balance (50%)' else ', solde (50 %)' end,
      'qty', 1, 'unit', portal.price - round(portal.price / 2, 3), 'taxed', true));
    title := '';
  elsif p_kind = 'month' then
    title := pg_catalog.to_char(current_date, 'MM/YYYY');
    lines := jsonb_build_array(jsonb_build_object(
      'label', what || ', ' || title, 'qty', 1, 'unit', portal.price, 'taxed', true));
    title := case when en then 'Month ' else 'Mois ' end || title;
  else
    title := '';
  end if;

  if p_kind in ('balance', 'month') then
    for o in
      select * from jsonb_to_recordset(public.invoice_open_costs(p_workspace_id, p_client_id))
        as x(id uuid, kind text, name text, role text, cost numeric, status text)
    loop
      lines := lines || jsonb_build_array(jsonb_build_object(
        'label', case o.kind
          when 'talent' then case when en then 'Talent: ' else 'Talent : ' end
          when 'location' then case when en then 'Location: ' else 'Lieu : ' end
          when 'cost' then case when en then 'Costs: ' else 'Frais : ' end
          else case when en then 'Props: ' else 'Accessoires : ' end end || o.name,
        'detail', case when en then 'Paid by Gecko on your behalf' else 'Avancé par Gecko pour votre compte' end,
        'qty', 1, 'unit', o.cost, 'taxed', false, 'optionId', o.id));
    end loop;
  end if;

  -- Bill the same company as last time; the first time, the name from onboarding.
  select i.bill_to into bill from public.invoices i
  where i.workspace_id = p_workspace_id and i.client_id = p_client_id and i.bill_to <> '{}'::jsonb
  order by i.created_at desc limit 1;
  if bill is null then
    select jsonb_build_object(
      'name', left(coalesce(nullif(trim(ob.data->>'company'), ''), nullif(trim(ob.data->>'brand'), ''), c.brand), 160),
      'address', '', 'taxId', '',
      'email', left(coalesce(nullif(trim(ob.data->>'email'), ''), ''), 160))
    into bill
    from public.clients c
    left join public.client_onboarding ob on ob.workspace_id = c.workspace_id and ob.client_id = c.id
    where c.workspace_id = p_workspace_id and c.id = p_client_id;
  end if;

  insert into public.invoices(workspace_id, client_id, kind, lang, title, issue_date, due_date, bill_to, lines, taxes,
    subtotal, tax_total, total, author_name)
  select p_workspace_id, p_client_id, p_kind, lang, title, current_date,
    current_date + (settings->>'dueDays')::integer, coalesce(bill, '{}'::jsonb), lines, settings->'taxes',
    t.subtotal, t.tax_total, greatest(t.total, 0), who
  from public.invoice_totals(lines, settings->'taxes') t
  returning id into new_id;
  return new_id;
end
$$;
