begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000007e1', 'authenticated', 'authenticated', 'founder@ae.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000007e2', 'authenticated', 'authenticated', 'owner@ae-brand.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000007e3', 'authenticated', 'authenticated', 'viewer@ae-brand.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-0000000007e1', 'Always studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000007e1', 'founder', '00000000-0000-4000-8000-0000000007e1', 'founder@ae.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-0000000007e1', 'c-ae', 'Always Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-0000000007e1', 'c-ae', 'owner@ae-brand.test', 'Sara', '00000000-0000-4000-8000-0000000007e2', now(), '00000000-0000-4000-8000-0000000007e1', 'owner'),
  ('10000000-0000-4000-8000-0000000007e1', 'c-ae', 'viewer@ae-brand.test', 'Vee', '00000000-0000-4000-8000-0000000007e3', now(), '00000000-0000-4000-8000-0000000007e1', 'viewer');
insert into public.concepts (id, workspace_id, client_id, title, status, from_client, created_by, position, version, approved_version, approved_at, approved_by) values
  ('50000000-0000-4000-8000-0000000007e1', '10000000-0000-4000-8000-0000000007e1', 'c-ae', 'Gecko approved idea', 'approved', false,
   '00000000-0000-4000-8000-0000000007e1', 0, 1, 1, now(), 'Sara'),
  ('50000000-0000-4000-8000-0000000007e2', '10000000-0000-4000-8000-0000000007e1', 'c-ae', 'Their approved idea', 'approved', true,
   '00000000-0000-4000-8000-0000000007e2', 1, 1, 1, now(), 'Heni');
insert into public.concepts (id, workspace_id, client_id, title, status, from_client, created_by, position) values
  ('50000000-0000-4000-8000-0000000007e3', '10000000-0000-4000-8000-0000000007e1', 'c-ae', 'Gecko draft', 'draft', false,
   '00000000-0000-4000-8000-0000000007e1', 2);

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000007e2');
select extensions.lives_ok(
  $$select public.client_save_idea('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e1',
    'Gecko approved idea, sharper', 'New body', '')$$,
  'the client edits an idea Gecko wrote, even approved');
select extensions.lives_ok(
  $$select public.client_set_idea_details('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e2', 'New hook', 'reel')$$,
  'and the hook of their own approved idea');
select extensions.throws_ok(
  $$select public.client_save_idea('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e3', 'Peek', '', '')$$,
  'invalid_idea', 'a draft Gecko hasn''t shared stays Gecko''s');
select pg_temp.act_as('00000000-0000-4000-8000-0000000007e3');
select extensions.throws_ok(
  $$select public.client_save_idea('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e1', 'Viewer', '', '')$$,
  'invalid_idea', 'a viewer reads only');

reset role;
select extensions.is(
  (select status || ' v' || version || ' ' || coalesce(approved_version::text, 'none') from public.concepts where id = '50000000-0000-4000-8000-0000000007e1'),
  'review v2 none', 'an approved idea that changes goes back for one approval');
select extensions.is(
  (select body from public.concept_notes where concept_id = '50000000-0000-4000-8000-0000000007e1' order by created_at desc limit 1),
  'Edited the approved idea (version 2). It needs one more approval.', 'with a note the team sees');
select extensions.is(
  (select status || ' ' || hook from public.concepts where id = '50000000-0000-4000-8000-0000000007e2'),
  'review New hook', 'a new hook on an approved idea goes back for one approval too');

select * from extensions.finish();
rollback;
