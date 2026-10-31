begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'stranger@local.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Editor', 'editor');
insert into public.clients(workspace_id, id, brand, data) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Dany Clean', '{"note":"private"}'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'RareRich', '{}');
insert into public.client_assignments(workspace_id, client_id, member_id) values
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'editor');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

select extensions.ok(not has_column_privilege('anon', 'public.clients', 'brand', 'select'), 'anonymous visitors cannot read client names');
select extensions.ok(not has_column_privilege('authenticated', 'public.clients', 'data', 'select'), 'the data column stays behind the RPCs');

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.results_eq(
  $$select brand from public.clients where workspace_id = '10000000-0000-4000-8000-000000000001' order by brand$$,
  $$values ('Dany Clean'::text), ('RareRich'::text)$$,
  'the founder reads every client, as the Clients screen does'
);
select extensions.throws_ok($$select data from public.clients$$, '42501', null, 'nobody reads the data column directly');

select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.results_eq($$select brand from public.clients$$, $$values ('RareRich'::text)$$, 'an editor reads only the clients they are on');

select pg_temp.act_as('00000000-0000-4000-8000-000000000008', 'stranger@local.test');
select extensions.is((select count(*) from public.clients), 0::bigint, 'someone outside the workspace reads no clients');
select extensions.throws_ok(
  $$insert into public.clients(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'c-x', 'Sneaky')$$,
  '42501', null, 'nobody writes the clients table directly'
);

select * from extensions.finish();
rollback;
