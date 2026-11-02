-- Portal v2, phase E: invoices.
-- Invoices are built from what's already in the app: the plan price on the client's overview, the 50/50 split,
-- and the talent, location and props costs Gecko paid upfront (phase B). Nobody retypes them.
-- A draft is team only. Sending gives it its number (GK-2026-001, in order through the year) and shows it in the
-- client's Money page; it can't be edited after that, only cancelled. Gecko records payments by hand: there is no
-- online payment. Paying the deposit or the balance invoice updates the overview, and a paid balance unlocks the
-- final files (phase D).
-- Tax and stamp lines come from Gecko's invoice settings. Nothing can be sent until the founder records that the
-- accountant has checked those lines, and changing them asks for that check again.
-- Money stays with the founder and sales on Gecko's side, and with the owner and finance on the client's side.

-- ---------- tables ----------

create function public.invoice_taxes_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 5 and not exists (
    select 1 from jsonb_array_elements(p) x
    where jsonb_typeof(x) <> 'object'
       or length(trim(coalesce(x->>'label', ''))) not between 1 and 80
       or coalesce(x->>'kind', '') not in ('rate', 'fixed')
       or jsonb_typeof(x->'value') is distinct from 'number'
       or (x->>'value')::numeric < 0
       or (x->>'kind' = 'rate' and (x->>'value')::numeric > 100)
       or (x->>'kind' = 'fixed' and (x->>'value')::numeric > 100000)
  )
$$;

create function public.invoice_lines_ok(p jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(p) = 'array' and jsonb_array_length(p) <= 40 and not exists (
    select 1 from jsonb_array_elements(p) x
    where jsonb_typeof(x) <> 'object'
       or length(trim(coalesce(x->>'label', ''))) not between 1 and 200
       or length(coalesce(x->>'detail', '')) > 300
       or jsonb_typeof(x->'qty') is distinct from 'number'
       or (x->>'qty')::numeric <= 0 or (x->>'qty')::numeric > 10000
       or jsonb_typeof(x->'unit') is distinct from 'number'
       or abs((x->>'unit')::numeric) > 10000000
       or jsonb_typeof(coalesce(x->'taxed', 'true'::jsonb)) <> 'boolean'
       or (x ? 'optionId' and coalesce(x->>'optionId', '') !~ '^[0-9a-f-]{36}$')
  )
$$;

-- Gecko's own details, printed on every invoice. One row per workspace.
create table public.invoice_settings (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  legal_name text not null default '' check (length(legal_name) <= 160),
  address text not null default '' check (length(address) <= 400),
  tax_id text not null default '' check (length(tax_id) <= 60),
  contact text not null default '' check (length(contact) <= 200),
  -- How to pay: bank and RIB, cash, cheque. Printed at the bottom of the invoice.
  payment text not null default '' check (length(payment) <= 1000),
  due_days integer not null default 7 check (due_days between 0 and 90),
  taxes jsonb not null default '[]' check (public.invoice_taxes_ok(taxes)),
  -- Who confirmed the accountant checked the tax lines above, and when. Cleared whenever the lines change.
  taxes_checked_by text not null default '' check (length(taxes_checked_by) <= 120),
  taxes_checked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  client_id text not null,
  kind text not null check (kind in ('deposit', 'balance', 'month', 'extra')),
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid', 'void')),
  number text check (number ~ '^GK-[0-9]{4}-[0-9]{3,}$'),
  lang text not null default 'fr' check (lang in ('fr', 'en')),
  title text not null default '' check (length(title) <= 160),
  issue_date date not null default current_date,
  due_date date not null default current_date,
  bill_to jsonb not null default '{}' check (jsonb_typeof(bill_to) = 'object' and pg_catalog.pg_column_size(bill_to) < 4000),
  -- Gecko's details as they were when the invoice was sent.
  seller jsonb not null default '{}' check (jsonb_typeof(seller) = 'object'),
  lines jsonb not null default '[]' check (public.invoice_lines_ok(lines)),
  taxes jsonb not null default '[]' check (public.invoice_taxes_ok(taxes)),
  note text not null default '' check (length(note) <= 1000),
  subtotal numeric(12, 3) not null default 0,
  tax_total numeric(12, 3) not null default 0,
  total numeric(12, 3) not null default 0 check (total >= 0),
  sent_at timestamptz,
  paid_on date,
  paid_how text not null default '' check (length(paid_how) <= 120),
  voided_at timestamptz,
  void_reason text not null default '' check (length(void_reason) <= 300),
  author_name text not null default '' check (length(author_name) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, number),
  foreign key (workspace_id, client_id) references public.clients(workspace_id, id) on delete cascade,
  check ((status = 'draft') = (number is null)),
  check ((status = 'paid') = (paid_on is not null)),
  check ((status = 'void') = (voided_at is not null)),
  check (due_date >= issue_date)
);

create index invoices_client on public.invoices(workspace_id, client_id, created_at);

alter table public.invoice_settings enable row level security;
alter table public.invoices enable row level security;
revoke all on public.invoice_settings, public.invoices from public, anon, authenticated;

-- ---------- helpers ----------

-- Founders and sales with access to the client handle money. Returns the member's name.
create function public.invoice_team_check(p_workspace_id uuid, p_client_id text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales')
     or not public.has_client_access(p_workspace_id, p_client_id) then raise exception 'forbidden'; end if;
  return coalesce(public.my_member_name(p_workspace_id), 'Gecko');
end
$$;

-- Subtotal, tax and total. Rates apply to the taxed lines; fixed amounts (a stamp) are added once.
create function public.invoice_totals(p_lines jsonb, p_taxes jsonb)
returns table (subtotal numeric, tax_total numeric, total numeric, tax_rows jsonb)
language sql
immutable
set search_path = ''
as $$
  with l as (
    select round((x->>'qty')::numeric * (x->>'unit')::numeric, 3) as amount,
           coalesce((x->>'taxed')::boolean, true) as taxed
    from jsonb_array_elements(coalesce(p_lines, '[]')) x
  ), s as (
    select coalesce(sum(amount), 0) as sub, coalesce(sum(amount) filter (where taxed), 0) as base from l
  ), t as (
    select x->>'label' as label, x->>'kind' as kind, (x->>'value')::numeric as value,
           case when x->>'kind' = 'rate' then round(s.base * (x->>'value')::numeric / 100, 3)
                else round((x->>'value')::numeric, 3) end as amount, n
    from s, jsonb_array_elements(coalesce(p_taxes, '[]')) with ordinality as e(x, n)
  )
  select s.sub, coalesce((select sum(amount) from t), 0), s.sub + coalesce((select sum(amount) from t), 0),
    coalesce((select jsonb_agg(jsonb_build_object('label', label, 'kind', kind, 'value', value, 'amount', amount)
                               order by n) from t), '[]'::jsonb)
  from s
$$;

create function public.invoice_to_json(i public.invoices, p_team boolean)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', i.id, 'kind', i.kind, 'status', i.status, 'number', i.number, 'lang', i.lang, 'title', i.title,
    'issueDate', i.issue_date, 'dueDate', i.due_date,
    'overdue', i.status = 'sent' and i.due_date < current_date,
    'billTo', i.bill_to, 'seller', i.seller, 'lines', i.lines,
    'taxes', (select tax_rows from public.invoice_totals(i.lines, i.taxes)),
    'note', i.note, 'subtotal', i.subtotal, 'taxTotal', i.tax_total, 'total', i.total,
    'sentAt', i.sent_at, 'paidOn', i.paid_on, 'paidHow', i.paid_how,
    'voidedAt', i.voided_at, 'voidReason', case when p_team then i.void_reason else '' end,
    'authorName', case when p_team then i.author_name else '' end,
    'createdAt', i.created_at, 'updatedAt', i.updated_at
  )
$$;

create function public.invoice_settings_json(p_workspace_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'legalName', coalesce(s.legal_name, ''), 'address', coalesce(s.address, ''), 'taxId', coalesce(s.tax_id, ''),
    'contact', coalesce(s.contact, ''), 'payment', coalesce(s.payment, ''), 'dueDays', coalesce(s.due_days, 7),
    'taxes', coalesce(s.taxes, '[]'::jsonb), 'taxesCheckedBy', coalesce(s.taxes_checked_by, ''),
    'taxesCheckedAt', s.taxes_checked_at
  )
  from (select 1) one
  left join public.invoice_settings s on s.workspace_id = p_workspace_id
$$;

-- Costs Gecko paid for this client that aren't on an invoice yet: approved, booked, shot or paid, bought by Gecko,
-- with a cost, and not on any draft or sent invoice.
create function public.invoice_open_costs(p_workspace_id uuid, p_client_id text, p_except uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id, 'kind', o.kind, 'name', o.name, 'role', o.role, 'cost', o.cost, 'status', o.status
  ) order by o.kind, o.created_at), '[]'::jsonb)
  from public.production_options o
  where o.workspace_id = p_workspace_id and o.client_id = p_client_id and o.bought_by = 'gecko' and o.cost > 0
    and o.status in ('approved', 'booked', 'shot', 'paid')
    and not exists (
      select 1 from public.invoices i, jsonb_array_elements(i.lines) x
      where i.workspace_id = p_workspace_id and i.client_id = p_client_id and i.status <> 'void'
        and (p_except is null or i.id <> p_except) and x->>'optionId' = o.id::text
    )
$$;

-- ---------- settings (founder edits, sales reads) ----------

create function public.get_invoice_settings(p_workspace_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if coalesce(public.member_role(p_workspace_id), '') not in ('founder', 'sales') then raise exception 'forbidden'; end if;
  return public.invoice_settings_json(p_workspace_id);
end
$$;

create function public.save_invoice_settings(p_workspace_id uuid, p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_taxes jsonb;
  new_taxes jsonb := coalesce(p->'taxes', '[]'::jsonb);
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'founder_only'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'invalid_invoice_settings'; end if;
  select taxes into old_taxes from public.invoice_settings where workspace_id = p_workspace_id;
  begin
    insert into public.invoice_settings as s
      (workspace_id, legal_name, address, tax_id, contact, payment, due_days, taxes)
    values (p_workspace_id, trim(coalesce(p->>'legalName', '')), trim(coalesce(p->>'address', '')),
      trim(coalesce(p->>'taxId', '')), trim(coalesce(p->>'contact', '')), trim(coalesce(p->>'payment', '')),
      coalesce((p->>'dueDays')::integer, 7), new_taxes)
    on conflict (workspace_id) do update set
      legal_name = excluded.legal_name, address = excluded.address, tax_id = excluded.tax_id,
      contact = excluded.contact, payment = excluded.payment, due_days = excluded.due_days, taxes = excluded.taxes,
      -- New tax lines need the accountant again.
      taxes_checked_by = case when s.taxes = excluded.taxes then s.taxes_checked_by else '' end,
      taxes_checked_at = case when s.taxes = excluded.taxes then s.taxes_checked_at end,
      updated_at = now();
  exception when check_violation or invalid_text_representation then
    raise exception 'invalid_invoice_settings';
  end;
  return public.invoice_settings_json(p_workspace_id);
end
$$;

-- The founder records that the accountant checked the tax lines as they stand. p_checked false takes it back.
create function public.confirm_invoice_taxes(p_workspace_id uuid, p_checked boolean, p_by text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  if public.member_role(p_workspace_id) is distinct from 'founder' then raise exception 'founder_only'; end if;
  if p_checked and length(trim(coalesce(p_by, ''))) not between 1 and 120 then raise exception 'invalid_invoice_settings'; end if;
  insert into public.invoice_settings as s (workspace_id) values (p_workspace_id) on conflict (workspace_id) do nothing;
  update public.invoice_settings set
    taxes_checked_by = case when p_checked then trim(p_by) else '' end,
    taxes_checked_at = case when p_checked then now() end,
    updated_at = now()
  where workspace_id = p_workspace_id;
  return public.invoice_settings_json(p_workspace_id);
end
$$;

-- ---------- the team ----------

create function public.get_invoices(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  portal public.client_portals%rowtype;
begin
  perform public.invoice_team_check(p_workspace_id, p_client_id);
  select * into portal from public.client_portals where workspace_id = p_workspace_id and client_id = p_client_id;
  return jsonb_build_object(
    'settings', public.invoice_settings_json(p_workspace_id),
    'plan', portal.plan, 'price', portal.price, 'campaign', coalesce(portal.campaign, ''),
    'depositStatus', portal.deposit_status, 'balanceStatus', portal.balance_status,
    'openCosts', public.invoice_open_costs(p_workspace_id, p_client_id),
    'invoices', coalesce((
      select jsonb_agg(public.invoice_to_json(i, true) order by i.created_at desc)
      from public.invoices i where i.workspace_id = p_workspace_id and i.client_id = p_client_id
    ), '[]'::jsonb)
  );
end
$$;

-- A new draft, filled from the overview. Deposit: half the plan price. Balance: the other half plus every cost
-- Gecko paid that isn't invoiced yet. Month: the monthly fee plus those costs. Extra: empty, for anything else.
create function public.create_invoice(p_workspace_id uuid, p_client_id text, p_kind text, p_lang text)
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

-- Change a draft. Sent invoices are fixed: cancel and make a new one instead.
create function public.save_invoice(p_workspace_id uuid, p_client_id text, p_id uuid, p jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invoices%rowtype;
  new_lines jsonb := coalesce(p->'lines', '[]'::jsonb);
  bill jsonb := coalesce(p->'billTo', '{}'::jsonb);
  v_taxes jsonb := public.invoice_settings_json(p_workspace_id)->'taxes';
  t record;
begin
  perform public.invoice_team_check(p_workspace_id, p_client_id);
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'invalid_invoice'; end if;
  select * into i from public.invoices
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if i.status <> 'draft' then raise exception 'invoice_locked'; end if;
  if not public.invoice_lines_ok(new_lines) then raise exception 'invalid_invoice'; end if;
  -- A cost goes on one invoice only, and only a cost of this client.
  if exists (
    select 1 from jsonb_array_elements(new_lines) x
    where x ? 'optionId' and (
      not exists (select 1 from public.production_options o
                  where o.id = (x->>'optionId')::uuid and o.workspace_id = p_workspace_id and o.client_id = p_client_id)
      or exists (select 1 from public.invoices j, jsonb_array_elements(j.lines) y
                 where j.workspace_id = p_workspace_id and j.client_id = p_client_id and j.status <> 'void'
                   and j.id <> p_id and y->>'optionId' = x->>'optionId'))
  ) then raise exception 'invoice_cost_taken'; end if;
  if jsonb_typeof(bill) <> 'object' or exists (
    select 1 from jsonb_each(bill) e
    where e.key not in ('name', 'address', 'taxId', 'email') or jsonb_typeof(e.value) <> 'string'
      or length(e.value #>> '{}') > 400
  ) then raise exception 'invalid_invoice'; end if;
  select * into t from public.invoice_totals(new_lines, v_taxes);
  if t.total < 0 then raise exception 'invoice_negative'; end if;
  begin
    update public.invoices set
      lang = case when p->>'lang' = 'en' then 'en' else 'fr' end,
      title = trim(coalesce(p->>'title', '')),
      issue_date = coalesce((p->>'issueDate')::date, issue_date),
      due_date = coalesce((p->>'dueDate')::date, due_date),
      bill_to = bill, lines = new_lines, taxes = v_taxes, note = trim(coalesce(p->>'note', '')),
      subtotal = t.subtotal, tax_total = t.tax_total, total = t.total, updated_at = now()
    where id = p_id;
  exception when check_violation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'invalid_invoice';
  end;
end
$$;

-- Send: number it, freeze Gecko's details and the tax lines, show it to the client, and mark its costs invoiced.
create function public.send_invoice(p_workspace_id uuid, p_client_id text, p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invoices%rowtype;
  s jsonb := public.invoice_settings_json(p_workspace_id);
  t record;
  n integer;
  num text;
  stamped jsonb;
begin
  perform public.invoice_team_check(p_workspace_id, p_client_id);
  select * into i from public.invoices
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if i.status <> 'draft' then raise exception 'invoice_locked'; end if;
  if s->>'taxesCheckedAt' is null then raise exception 'taxes_unchecked'; end if;
  if trim(s->>'legalName') = '' or trim(s->>'payment') = '' then raise exception 'invoice_settings_missing'; end if;
  if length(trim(coalesce(i.bill_to->>'name', ''))) = 0 then raise exception 'invoice_needs_client_name'; end if;
  select * into t from public.invoice_totals(i.lines, s->'taxes');
  if jsonb_array_length(i.lines) = 0 or t.total <= 0 then raise exception 'invoice_empty'; end if;
  if i.issue_date > current_date then raise exception 'invalid_invoice'; end if;

  -- Numbers run in order through the year of the invoice date, with no gaps: one is only taken here.
  insert into public.invoice_sequences(workspace_id, year, next_number)
  values (p_workspace_id, extract(year from i.issue_date)::integer, 2)
  on conflict (workspace_id, year) do update set next_number = public.invoice_sequences.next_number + 1
  returning next_number - 1 into n;
  num := 'GK-' || extract(year from i.issue_date)::integer::text || '-' || lpad(n::text, 3, '0');

  -- Each cost line remembers where its cost stood, so cancelling the invoice puts it back.
  select coalesce(jsonb_agg(case when x ? 'optionId' then x || jsonb_build_object('was',
      (select o.status from public.production_options o where o.id = (x->>'optionId')::uuid)) else x end
    order by pos), '[]'::jsonb)
  into stamped from jsonb_array_elements(i.lines) with ordinality as e(x, pos);

  update public.invoices set status = 'sent', number = num, sent_at = now(), lines = stamped, taxes = s->'taxes',
    subtotal = t.subtotal, tax_total = t.tax_total, total = t.total,
    seller = jsonb_build_object('name', s->>'legalName', 'address', s->>'address', 'taxId', s->>'taxId',
      'contact', s->>'contact', 'payment', s->>'payment'),
    updated_at = now()
  where id = p_id;

  update public.production_options o set status = 'invoiced', updated_at = now()
  where o.workspace_id = p_workspace_id and o.client_id = p_client_id
    and o.id in (select (x->>'optionId')::uuid from jsonb_array_elements(i.lines) x where x ? 'optionId');

  if i.kind = 'balance' then
    update public.client_portals set balance_status = 'due'
    where workspace_id = p_workspace_id and client_id = p_client_id and balance_status = 'later';
  end if;
  return num;
end
$$;

-- Record the money coming in, or take it back if it was marked by mistake. The deposit and the balance invoices
-- keep the overview in step; a paid balance unlocks the final files.
create function public.mark_invoice_paid(
  p_workspace_id uuid, p_client_id text, p_id uuid, p_paid boolean, p_on date, p_how text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invoices%rowtype;
begin
  perform public.invoice_team_check(p_workspace_id, p_client_id);
  select * into i from public.invoices
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if p_paid then
    if i.status <> 'sent' then raise exception 'invoice_not_sent'; end if;
    if p_on is null or p_on > current_date or p_on < i.issue_date - 365 then raise exception 'invalid_payment'; end if;
    begin
      update public.invoices set status = 'paid', paid_on = p_on, paid_how = trim(coalesce(p_how, '')), updated_at = now()
      where id = p_id;
    exception when check_violation then
      raise exception 'invalid_payment';
    end;
  else
    if i.status <> 'paid' then raise exception 'invoice_not_paid'; end if;
    update public.invoices set status = 'sent', paid_on = null, paid_how = '', updated_at = now() where id = p_id;
  end if;
  if i.kind = 'deposit' then
    update public.client_portals set deposit_status = case when p_paid then 'paid' else 'due' end
    where workspace_id = p_workspace_id and client_id = p_client_id;
  elsif i.kind = 'balance' then
    update public.client_portals set balance_status = case when p_paid then 'paid' else 'due' end
    where workspace_id = p_workspace_id and client_id = p_client_id;
  end if;
end
$$;

-- Cancel a sent invoice. Its number stays used and it stays on record, marked cancelled; its costs go back to
-- the open list for the next invoice. A paid invoice has to be marked unpaid first.
create function public.void_invoice(p_workspace_id uuid, p_client_id text, p_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.invoices%rowtype;
  x jsonb;
begin
  perform public.invoice_team_check(p_workspace_id, p_client_id);
  select * into i from public.invoices
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id for update;
  if not found then raise exception 'invoice_not_found'; end if;
  if i.status = 'paid' then raise exception 'invoice_paid'; end if;
  if i.status <> 'sent' then raise exception 'invoice_not_sent'; end if;
  if length(trim(coalesce(p_reason, ''))) not between 1 and 300 then raise exception 'invoice_needs_reason'; end if;
  update public.invoices set status = 'void', voided_at = now(), void_reason = trim(p_reason), updated_at = now()
  where id = p_id;
  for x in select * from jsonb_array_elements(i.lines) loop
    if x ? 'optionId' then
      update public.production_options set status = coalesce(x->>'was', 'paid'), updated_at = now()
      where id = (x->>'optionId')::uuid and workspace_id = p_workspace_id and client_id = p_client_id
        and status = 'invoiced';
    end if;
  end loop;
  if i.kind = 'balance' then
    update public.client_portals set balance_status = 'later'
    where workspace_id = p_workspace_id and client_id = p_client_id and balance_status = 'due';
  end if;
end
$$;

-- Only drafts can be deleted: once a number is given, the invoice stays.
create function public.delete_invoice(p_workspace_id uuid, p_client_id text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.invoice_team_check(p_workspace_id, p_client_id);
  delete from public.invoices
  where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id and status = 'draft';
  if not found then
    if exists (select 1 from public.invoices where id = p_id and workspace_id = p_workspace_id and client_id = p_client_id) then
      raise exception 'invoice_locked';
    end if;
    raise exception 'invoice_not_found';
  end if;
end
$$;

-- ---------- the client ----------

-- Owners and finance see every invoice Gecko has sent them. Others get nothing.
create function public.get_my_invoices(p_workspace_id uuid, p_client_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  acc public.client_accounts;
begin
  if (select auth.uid()) is null then raise exception 'authentication_required'; end if;
  acc := public.my_client_account(p_workspace_id, p_client_id);
  if acc.id is null then raise exception 'forbidden'; end if;
  if acc.role not in ('owner', 'finance') then raise exception 'money_only'; end if;
  return coalesce((
    select jsonb_agg(public.invoice_to_json(i, false) order by i.issue_date desc, i.number desc)
    from public.invoices i
    where i.workspace_id = p_workspace_id and i.client_id = p_client_id and i.status <> 'draft'
  ), '[]'::jsonb);
end
$$;

revoke all on function public.invoice_taxes_ok(jsonb), public.invoice_lines_ok(jsonb),
  public.invoice_team_check(uuid, text), public.invoice_totals(jsonb, jsonb),
  public.invoice_to_json(public.invoices, boolean), public.invoice_settings_json(uuid),
  public.invoice_open_costs(uuid, text, uuid), public.get_invoice_settings(uuid),
  public.save_invoice_settings(uuid, jsonb), public.confirm_invoice_taxes(uuid, boolean, text),
  public.get_invoices(uuid, text), public.create_invoice(uuid, text, text, text),
  public.save_invoice(uuid, text, uuid, jsonb), public.send_invoice(uuid, text, uuid),
  public.mark_invoice_paid(uuid, text, uuid, boolean, date, text), public.void_invoice(uuid, text, uuid, text),
  public.delete_invoice(uuid, text, uuid), public.get_my_invoices(uuid, text)
  from public, anon;
revoke all on function public.invoice_team_check(uuid, text), public.invoice_to_json(public.invoices, boolean),
  public.invoice_settings_json(uuid), public.invoice_open_costs(uuid, text, uuid)
  from authenticated;
grant execute on function public.get_invoice_settings(uuid), public.save_invoice_settings(uuid, jsonb),
  public.confirm_invoice_taxes(uuid, boolean, text), public.get_invoices(uuid, text),
  public.create_invoice(uuid, text, text, text), public.save_invoice(uuid, text, uuid, jsonb),
  public.send_invoice(uuid, text, uuid), public.mark_invoice_paid(uuid, text, uuid, boolean, date, text),
  public.void_invoice(uuid, text, uuid, text), public.delete_invoice(uuid, text, uuid),
  public.get_my_invoices(uuid, text)
  to authenticated;
