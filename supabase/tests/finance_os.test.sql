begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'founder@fin.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'editor@fin.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-0000000000f1', 'Fin studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000f1', 'heni', '00000000-0000-4000-8000-0000000000f1', 'founder@fin.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-0000000000f1', 'ed', '00000000-0000-4000-8000-0000000000f2', 'editor@fin.test', 'Ed', 'editor');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000f1', 'founder@fin.test');
select extensions.is(public.finance_role('10000000-0000-4000-8000-0000000000f1'), 'owner', 'the founder owns finance');
insert into public.finance_entries (workspace_id, kind, status, title, category, amount, vat_rate, done_on)
  values ('10000000-0000-4000-8000-0000000000f1', 'out', 'done', 'Studio rent', 'rent', 1190, 19, '2026-11-01');
select extensions.is((select count(*)::int from public.finance_entries), 1, 'the founder adds an entry');
select extensions.throws_ok($$insert into public.finance_entries (workspace_id, kind, status, title, amount) values ('10000000-0000-4000-8000-0000000000f1', 'in', 'done', 'No date', 10)$$, '23514', null, 'a done entry needs its date');
select public.set_finance_opening('10000000-0000-4000-8000-0000000000f1', 5000, '2026-11-01');
select extensions.ok(public.receipt_ok('10000000-0000-4000-8000-0000000000f1/abcdefgh12.jpg', true), 'the founder can add a facture');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000f2', 'editor@fin.test');
select extensions.is(public.finance_role('10000000-0000-4000-8000-0000000000f1'), null, 'an editor has no finance');
select extensions.is((select count(*)::int from public.finance_entries), 0, 'and sees no entries');
select extensions.throws_ok($$select public.set_finance_viewer('10000000-0000-4000-8000-0000000000f1', 'ed', true)$$, '42501', null, 'and cannot let themselves in');
select extensions.ok(not public.receipt_ok('10000000-0000-4000-8000-0000000000f1/abcdefgh12.jpg', false), 'nor see factures');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000f1', 'founder@fin.test');
select public.set_finance_viewer('10000000-0000-4000-8000-0000000000f1', 'ed', true);
select extensions.ok((select can_view from public.get_finance_people('10000000-0000-4000-8000-0000000000f1') where member_id = 'ed'), 'the founder sees who can look');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000f2', 'editor@fin.test');
select extensions.is(public.finance_role('10000000-0000-4000-8000-0000000000f1'), 'viewer', 'once let in, the editor can look');
select extensions.is((select count(*)::int from public.finance_entries), 1, 'and reads the entries');
update public.finance_entries set amount = 1 where workspace_id = '10000000-0000-4000-8000-0000000000f1';
select extensions.is((select amount from public.finance_entries limit 1), 1190.000::numeric, 'but cannot change them');

reset role;
set local role anon;
select extensions.throws_ok($$select public.finance_role('10000000-0000-4000-8000-0000000000f1')$$, '42501', null, 'signed-out visitors get nothing');

select * from extensions.finish();
rollback;
