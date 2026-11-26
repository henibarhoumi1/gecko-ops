begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

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

insert into public.scripts (id, workspace_id, client_id, title, style, hooks, beats, cta, status, author_name,
  approved_version, approved_at, approved_by, hook, position) values
  ('40000000-0000-4000-8000-0000000007e1', '10000000-0000-4000-8000-0000000007e1', 'c-ae', 'Approved script', 'skit',
   '[{"hear":"Hook A"}]', '[]', 'Buy', 'approved', 'Heni', 1, now(), 'Sara', 0, 0);
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, beats, cta, status, author_name, position) values
  ('40000000-0000-4000-8000-0000000007e2', '10000000-0000-4000-8000-0000000007e1', 'c-ae', 'Gecko draft script', 'skit',
   '[{"hear":"Hook A"}]', '[]', 'Buy', 'draft', 'Heni', 1);
insert into public.project_sets (id, workspace_id, client_id, name, position) values
  ('30000000-0000-4000-8000-0000000007e1', '10000000-0000-4000-8000-0000000007e1', 'c-ae', 'Kitchen', 1);

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000007e2');
select extensions.lives_ok(
  $$select public.client_edit_idea('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e1',
    'Gecko approved idea, sharper', 'New body', '')$$,
  'the client edits an idea Gecko wrote, even approved');
select extensions.lives_ok(
  $$select public.client_edit_idea_details('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e2', 'New hook', 'reel')$$,
  'and the hook of their own approved idea');
select extensions.throws_ok(
  $$select public.client_edit_idea('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e3', 'Peek', '', '')$$,
  'invalid_idea', 'a draft Gecko hasn''t shared stays Gecko''s');
-- Scripts: words, sets and the idea link, approved ones included; unshared drafts stay Gecko's.
select extensions.lives_ok(
  $$select public.client_edit_script_shoot('10000000-0000-4000-8000-0000000007e1', 'c-ae', '40000000-0000-4000-8000-0000000007e1',
    '{"sets":["30000000-0000-4000-8000-0000000007e1"]}')$$,
  'the client changes the sets of an approved script');
select extensions.lives_ok(
  $$select public.client_edit_script_idea('10000000-0000-4000-8000-0000000007e1', 'c-ae', '40000000-0000-4000-8000-0000000007e1', null)$$,
  'and which idea it comes from');
select extensions.lives_ok(
  $$select public.client_edit_script('10000000-0000-4000-8000-0000000007e1', 'c-ae', '40000000-0000-4000-8000-0000000007e1',
    'Approved script', 30, '', '[{"hear":"Hook A"}]', '[]', 'Buy now', '{}')$$,
  'and its words');
select extensions.throws_ok(
  $$select public.client_edit_script('10000000-0000-4000-8000-0000000007e1', 'c-ae', '40000000-0000-4000-8000-0000000007e2',
    'Peek', 30, '', '[]', '[]', '', '{}')$$,
  'script_locked', 'a script Gecko hasn''t shared stays Gecko''s');
select extensions.lives_ok(
  $$select public.client_edit_idea_shoot('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e1',
    '{"sets":["30000000-0000-4000-8000-0000000007e1"]}')$$,
  'the client changes the sets of an idea too');

select pg_temp.act_as('00000000-0000-4000-8000-0000000007e3');
select extensions.throws_ok(
  $$select public.client_edit_idea('10000000-0000-4000-8000-0000000007e1', 'c-ae', '50000000-0000-4000-8000-0000000007e1', 'Viewer', '', '')$$,
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

select extensions.is(
  (select status || ' v' || version || ' ' || coalesce(approved_version::text, 'none') || ' ' || jsonb_array_length(shoot->'sets')
   from public.scripts where id = '40000000-0000-4000-8000-0000000007e1'),
  'review v2 none 1', 'an edited approved script goes back for one approval and keeps its sets');
select extensions.is(
  (select body from public.script_notes where script_id = '40000000-0000-4000-8000-0000000007e1' order by created_at desc limit 1),
  'Edited the approved script (version 2). It needs one more approval.', 'with a note the team sees');

select * from extensions.finish();
rollback;
