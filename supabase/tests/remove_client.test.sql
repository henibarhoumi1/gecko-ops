begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000d71', 'authenticated', 'authenticated', 'founder@rc.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000d72', 'authenticated', 'authenticated', 'sales@rc.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000d73', 'authenticated', 'authenticated', 'editor@rc.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000d74', 'authenticated', 'authenticated', 'owner@rc.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000d71', 'RC GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000d71', 'founder', '00000000-0000-4000-8000-000000000d71', 'founder@rc.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000d71', 'sales', '00000000-0000-4000-8000-000000000d72', 'sales@rc.test', 'Sam', 'sales'),
  ('10000000-0000-4000-8000-000000000d71', 'editor', '00000000-0000-4000-8000-000000000d73', 'editor@rc.test', 'Eddy', 'editor');
insert into public.clients (workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000d71', 'c-gone', 'Gone Brand'),
  ('10000000-0000-4000-8000-000000000d71', 'c-stay', 'Stay Brand');
insert into public.client_assignments (workspace_id, client_id, member_id) values
  ('10000000-0000-4000-8000-000000000d71', 'c-gone', 'editor');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000d71', 'c-gone', 'owner@rc.test', 'Olfa', '00000000-0000-4000-8000-000000000d74', now(), '00000000-0000-4000-8000-000000000d71', 'owner');
insert into public.concepts (id, workspace_id, client_id, title, status) values
  ('30000000-0000-4000-8000-000000000d71', '10000000-0000-4000-8000-000000000d71', 'c-gone', 'An idea', 'draft');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;
set local role authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-000000000d72');
select extensions.throws_ok(
  $$select public.remove_client('10000000-0000-4000-8000-000000000d71', 'c-gone', 'Gone Brand')$$,
  'forbidden', 'sales can add clients but not delete them');

select pg_temp.act_as('00000000-0000-4000-8000-000000000d71');
select extensions.throws_ok(
  $$select public.remove_client('10000000-0000-4000-8000-000000000d71', 'c-gone', 'Gone')$$,
  'brand_mismatch', 'the brand name has to be typed back');
select extensions.lives_ok(
  $$select public.remove_client('10000000-0000-4000-8000-000000000d71', 'c-gone', '  gone brand ')$$,
  'the founder deletes a client (case and spaces don''t matter)');
select extensions.is(
  (select array_agg(id order by id) from public.clients where workspace_id = '10000000-0000-4000-8000-000000000d71'),
  array['c-stay'], 'it leaves the founder''s client list');
select extensions.is(
  public.has_client_access('10000000-0000-4000-8000-000000000d71', 'c-gone'), false,
  'and nobody can open it, founder included');
select extensions.is(
  (select count(*)::int from public.concepts where client_id = 'c-gone'), 0,
  'its ideas are hidden from the team');
select extensions.is(
  (select jsonb_array_length(public.get_removed_clients('10000000-0000-4000-8000-000000000d71'))), 1,
  'it is listed under deleted clients');
select extensions.is(
  (select public.get_removed_clients('10000000-0000-4000-8000-000000000d71') -> 0 ->> 'removedBy'), 'Heni',
  'with who deleted it');
select extensions.throws_ok(
  $$select public.remove_client('10000000-0000-4000-8000-000000000d71', 'c-gone', 'Gone Brand')$$,
  'client_not_found', 'deleting twice is refused');

select pg_temp.act_as('00000000-0000-4000-8000-000000000d73');
select extensions.is(
  public.has_client_access('10000000-0000-4000-8000-000000000d71', 'c-gone'), false,
  'the assigned editor loses it too');
select extensions.is(
  (select jsonb_array_length(public.get_removed_clients('10000000-0000-4000-8000-000000000d71'))), 0,
  'and only the founder sees deleted clients');

select pg_temp.act_as('00000000-0000-4000-8000-000000000d74');
select extensions.is(
  (select count(*)::int from public.get_my_client_portals()), 0, 'the client''s portal closes');
select extensions.throws_ok(
  $$select public.client_set_idea_details('10000000-0000-4000-8000-000000000d71', 'c-gone',
      '30000000-0000-4000-8000-000000000d71', 'hook', 'reel')$$,
  'forbidden', 'and their account can''t change anything in it');

select pg_temp.act_as('00000000-0000-4000-8000-000000000d72');
select extensions.throws_ok(
  $$select public.restore_client('10000000-0000-4000-8000-000000000d71', 'c-gone')$$,
  'forbidden', 'only the founder restores');

select pg_temp.act_as('00000000-0000-4000-8000-000000000d71');
select public.restore_client('10000000-0000-4000-8000-000000000d71', 'c-gone');
select extensions.is(
  (select count(*)::int from public.concepts where client_id = 'c-gone'), 1,
  'restore brings the client back with everything in it');
select pg_temp.act_as('00000000-0000-4000-8000-000000000d74');
select extensions.is(
  (select count(*)::int from public.get_my_client_portals()), 1, 'and reopens their portal');

select * from extensions.finish();
rollback;
