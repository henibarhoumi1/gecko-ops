begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(31);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'sara@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'fadi@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Eddy', 'editor');
insert into public.clients(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'c-dc', 'Synthetic Clean');
insert into public.client_portals(workspace_id, client_id, price, plan, campaign)
  values ('10000000-0000-4000-8000-000000000001', 'c-dc', 1500, 'custom', 'Test campaign');
insert into public.client_onboarding(workspace_id, client_id, data)
  values ('10000000-0000-4000-8000-000000000001', 'c-dc', '{"company": "Synthetic Clean SARL", "email": "sara@client.test"}');
insert into public.production_options(id, workspace_id, client_id, kind, name, cost, status, bought_by) values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'c-dc', 'talent', 'Amira', 400, 'shot', 'gecko'),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'c-dc', 'location', 'Airbnb La Marsa', 900, 'paid', 'gecko'),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000001', 'c-dc', 'prop', 'Mop', 20, 'proposed', 'gecko'),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000001', 'c-dc', 'prop', 'Their bottles', 0, 'approved', 'client');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.codes (who text primary key, code text);
create table pg_temp.ids (who text primary key, id uuid);
grant all on pg_temp.codes, pg_temp.ids to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
insert into pg_temp.codes values
  ('sara', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'sara@client.test', 'approver')),
  ('fadi', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'fadi@client.test', 'finance'));

-- The deposit draft comes from the overview.
insert into pg_temp.ids values ('dep', public.create_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', 'deposit', 'fr'));
select extensions.is(
  (public.get_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->'invoices'->0->>'total')::numeric, 750::numeric,
  'the deposit is half the price'
);
select extensions.is(
  public.get_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->'invoices'->0->'billTo'->>'name',
  'Synthetic Clean SARL', 'it bills the company named in onboarding'
);
select extensions.throws_ok(
  $$select public.create_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', 'deposit', 'fr')$$,
  'invoice_exists', 'one deposit per client'
);

-- Nothing leaves before the accountant has checked the tax lines.
select extensions.throws_ok(
  $$select public.send_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep'))$$,
  'taxes_unchecked', 'no invoice is sent before the accountant checks the tax lines'
);
select public.save_invoice_settings('10000000-0000-4000-8000-000000000001',
  '{"legalName": "Gecko Studio", "address": "Tunis", "taxId": "", "payment": "Bank transfer, RIB 00 000", "dueDays": 7,
    "taxes": [{"label": "TVA", "kind": "rate", "value": 19}, {"label": "Timbre fiscal", "kind": "fixed", "value": 1}]}');
select public.confirm_invoice_taxes('10000000-0000-4000-8000-000000000001', true, 'Heni, after the accountant');
select public.save_invoice_settings('10000000-0000-4000-8000-000000000001',
  '{"legalName": "Gecko Studio", "address": "Tunis", "payment": "Bank transfer, RIB 00 000", "dueDays": 7,
    "taxes": [{"label": "TVA", "kind": "rate", "value": 7}, {"label": "Timbre fiscal", "kind": "fixed", "value": 1}]}');
select extensions.ok(
  public.get_invoice_settings('10000000-0000-4000-8000-000000000001')->>'taxesCheckedAt' is null,
  'changing the tax lines asks for the accountant again'
);
select public.save_invoice_settings('10000000-0000-4000-8000-000000000001',
  '{"legalName": "Gecko Studio", "address": "Tunis", "payment": "Bank transfer, RIB 00 000", "dueDays": 7,
    "taxes": [{"label": "TVA", "kind": "rate", "value": 19}, {"label": "Timbre fiscal", "kind": "fixed", "value": 1}]}');
select public.confirm_invoice_taxes('10000000-0000-4000-8000-000000000001', true, 'Heni');
select extensions.throws_ok(
  $$select public.save_invoice_settings('10000000-0000-4000-8000-000000000001', '{"taxes": [{"label": "TVA", "kind": "rate", "value": 190}]}')$$,
  'invalid_invoice_settings', 'a rate over 100% is refused'
);

-- Saving recomputes the totals on the server.
select public.save_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep'),
  '{"lang": "fr", "title": "Acompte", "billTo": {"name": "Synthetic Clean SARL", "address": "Sfax"},
    "lines": [{"label": "Test campaign, acompte (50 %)", "qty": 1, "unit": 750, "taxed": true, "total": 1}]}');
select extensions.is(
  (public.get_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->'invoices'->0->>'total')::numeric, 893.5::numeric,
  '750 + 19% + 1 DT stamp = 893.500'
);
select extensions.throws_ok(
  $$select public.save_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep'),
    '{"lines": [{"label": "Discount", "qty": 1, "unit": -5000}]}')$$,
  'invoice_negative', 'an invoice never totals below zero'
);

-- The client sees nothing until it is sent.
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'fadi@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'fadi'), 'Fadi');
select extensions.is(jsonb_array_length(public.get_my_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')), 0,
  'the client never sees a draft');

select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.is(
  public.send_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep')),
  'GK-' || extract(year from current_date)::integer::text || '-001', 'the first invoice of the year is 001'
);
select extensions.throws_ok(
  $$select public.save_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep'), '{"lines": []}')$$,
  'invoice_locked', 'a sent invoice is fixed'
);
select extensions.throws_ok(
  $$select public.delete_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep'))$$,
  'invoice_locked', 'and it cannot be deleted'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'fadi@client.test');
select extensions.is(
  public.get_my_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->0->'seller'->>'name', 'Gecko Studio',
  'finance sees the sent invoice with Gecko''s details'
);
select extensions.is(
  public.get_my_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->0->>'authorName', '',
  'but not who on the team wrote it'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sara'), 'Sara');
select extensions.throws_ok(
  $$select public.get_my_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')$$,
  'money_only', 'an approver doesn''t see invoices'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.throws_ok(
  $$select public.get_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')$$,
  'forbidden', 'editors don''t handle money'
);

-- Paying the deposit updates the overview.
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.throws_ok(
  $$select public.mark_invoice_paid('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep'), true, current_date + 3, 'Cash')$$,
  'invalid_payment', 'no payment dated in the future'
);
select public.mark_invoice_paid('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'dep'), true, current_date, 'Bank transfer');
reset role;
select extensions.is(
  (select deposit_status from public.client_portals where client_id = 'c-dc'), 'paid', 'a paid deposit shows on the overview'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');

-- The balance takes the other half and every cost Gecko paid, once.
insert into pg_temp.ids values ('bal', public.create_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', 'balance', 'en'));
select extensions.is(
  jsonb_array_length(public.get_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->'invoices'->0->'lines'), 3,
  'balance = half the price + talent + location (not the proposed prop, not what the client brings)'
);
select extensions.is(
  (public.get_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->'invoices'->0->>'total')::numeric,
  (750 * 1.19 + 400 + 900 + 1)::numeric, 'costs paid on the client''s behalf carry no VAT by default'
);
select extensions.is(
  jsonb_array_length(public.get_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')->'openCosts'), 0,
  'costs on a draft are no longer open'
);
insert into pg_temp.ids values ('ext', public.create_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', 'extra', 'en'));
select extensions.throws_ok(
  $$select public.save_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'ext'),
    '{"billTo": {"name": "X"}, "lines": [{"label": "Again", "qty": 1, "unit": 400, "optionId": "20000000-0000-4000-8000-000000000001"}]}')$$,
  'invoice_cost_taken', 'a cost goes on one invoice only'
);
select public.delete_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'ext'));
select extensions.is(
  public.send_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'bal')),
  'GK-' || extract(year from current_date)::integer::text || '-002', 'numbers run in order'
);
reset role;
select extensions.is(
  (select array_agg(status order by name) from public.production_options where client_id = 'c-dc' and kind <> 'prop'),
  array['invoiced', 'invoiced'], 'sending marks the costs invoiced'
);
select extensions.is(
  (select balance_status from public.client_portals where client_id = 'c-dc'), 'due', 'and the balance due'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');

-- Cancelling keeps the number and puts the costs back.
select extensions.throws_ok(
  $$select public.void_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'bal'), '')$$,
  'invoice_needs_reason', 'a cancellation says why'
);
select public.void_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'bal'), 'Wrong location cost');
reset role;
select extensions.is(
  (select array_agg(status order by name) from public.production_options where client_id = 'c-dc' and kind <> 'prop'),
  array['paid', 'shot'], 'cancelling puts each cost back where it was'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
insert into pg_temp.ids values ('bal2', public.create_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', 'balance', 'en'));
select extensions.is(
  public.send_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'bal2')),
  'GK-' || extract(year from current_date)::integer::text || '-003', 'a cancelled number is never reused'
);
select public.mark_invoice_paid('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'bal2'), true, current_date, 'Cash');
select extensions.throws_ok(
  $$select public.void_invoice('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'bal2'), 'x')$$,
  'invoice_paid', 'a paid invoice is not cancelled'
);
reset role;
select extensions.is(
  (select balance_status from public.client_portals where client_id = 'c-dc'), 'paid', 'a paid balance unlocks the finals'
);
set local role authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'fadi@client.test');
select extensions.is(
  (select jsonb_agg(x->>'status' order by x->>'number') from jsonb_array_elements(
    public.get_my_invoices('10000000-0000-4000-8000-000000000001', 'c-dc')) x),
  '["paid", "void", "paid"]'::jsonb, 'the client sees the cancelled one marked as such'
);

select * from extensions.finish();
rollback;
