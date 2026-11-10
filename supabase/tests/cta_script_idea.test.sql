begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(6);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000c71', 'authenticated', 'authenticated', 'founder@ci.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000c72', 'authenticated', 'authenticated', 'owner@ci.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000c73', 'authenticated', 'authenticated', 'viewer@ci.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000c71', 'CI GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000c71', 'founder', '00000000-0000-4000-8000-000000000c71', 'founder@ci.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000c71', 'c-i', 'Idea Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000c71', 'c-i', 'owner@ci.test', 'Olfa', '00000000-0000-4000-8000-000000000c72', now(), '00000000-0000-4000-8000-000000000c71', 'owner'),
  ('10000000-0000-4000-8000-000000000c71', 'c-i', 'viewer@ci.test', 'Vee', '00000000-0000-4000-8000-000000000c73', now(), '00000000-0000-4000-8000-000000000c71', 'viewer');
insert into public.concepts (id, workspace_id, client_id, title, status, approved_version, approved_at, approved_by) values
  ('30000000-0000-4000-8000-000000000c71', '10000000-0000-4000-8000-000000000c71', 'c-i', 'Approved idea', 'approved', 1, now(), 'Olfa'),
  ('30000000-0000-4000-8000-000000000c72', '10000000-0000-4000-8000-000000000c71', 'c-i', 'Team draft', 'draft', null, null, null);
insert into public.scripts (id, workspace_id, client_id, title, style, status, written_by, approved_version, approved_at, approved_by) values
  ('20000000-0000-4000-8000-000000000c71', '10000000-0000-4000-8000-000000000c71', 'c-i', 'Client script', 'other', 'review', 'client', null, null, null),
  ('20000000-0000-4000-8000-000000000c72', '10000000-0000-4000-8000-000000000c71', 'c-i', 'Approved one', 'demo', 'approved', 'gecko', 1, now(), 'Olfa');

select extensions.lives_ok(
  $$update public.scripts set cta = repeat('a', 1400) where id = '20000000-0000-4000-8000-000000000c71'$$,
  'a call to action with what we see and what is on screen has room');
select extensions.throws_ok(
  $$update public.scripts set cta = repeat('a', 1600) where id = '20000000-0000-4000-8000-000000000c71'$$,
  '23514', null, 'but not unlimited');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000c72');
select extensions.lives_ok(
  $$select public.client_set_script_idea('10000000-0000-4000-8000-000000000c71', 'c-i',
      '20000000-0000-4000-8000-000000000c71', '30000000-0000-4000-8000-000000000c71')$$,
  'the client starts their script from an approved idea');
select extensions.throws_ok(
  $$select public.client_set_script_idea('10000000-0000-4000-8000-000000000c71', 'c-i',
      '20000000-0000-4000-8000-000000000c71', '30000000-0000-4000-8000-000000000c72')$$,
  'concept_not_found', 'not from a team draft');
select extensions.throws_ok(
  $$select public.client_set_script_idea('10000000-0000-4000-8000-000000000c71', 'c-i',
      '20000000-0000-4000-8000-000000000c72', null)$$,
  'script_locked', 'and not on an approved script');
select pg_temp.act_as('00000000-0000-4000-8000-000000000c73');
select extensions.throws_ok(
  $$select public.client_set_script_idea('10000000-0000-4000-8000-000000000c71', 'c-i',
      '20000000-0000-4000-8000-000000000c71', null)$$,
  'writer_only', 'a viewer can''t');

select * from extensions.finish();
rollback;
