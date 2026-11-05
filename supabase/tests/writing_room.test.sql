begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000401', 'authenticated', 'authenticated', 'founder@writing.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000402', 'authenticated', 'authenticated', 'producer@writing.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000403', 'authenticated', 'authenticated', 'owner@writing.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000401', 'Writing GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000401', 'founder', '00000000-0000-4000-8000-000000000401', 'founder@writing.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000401', 'producer', '00000000-0000-4000-8000-000000000402', 'producer@writing.test', 'Sara', 'sales');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000401', 'c-wr', 'Writing Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000401', 'c-wr', 'owner@writing.test', 'Yasmine', '00000000-0000-4000-8000-000000000403', now(), '00000000-0000-4000-8000-000000000401', 'owner');
insert into public.concepts (id, workspace_id, client_id, title, body, hook, status, position) values
  ('20000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000401', 'c-wr', 'Morning rush', 'Body', 'Your mornings, fixed.', 'review', 0);
insert into public.scripts (id, workspace_id, client_id, concept_id, title, style, hooks, beats, cta, status) values
  ('30000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000401', 'c-wr', '20000000-0000-4000-8000-000000000401',
   'Script one', 'before-after', '[{"text":"Hook A"},{"text":"Hook B"}]',
   '[{"part":"lead","hear":"Lead line"},{"part":"body","see":"Body 1"},{"part":"body","see":"Body 2"}]', 'Buy now', 'review');
insert into public.cuts (id, workspace_id, client_id, title, status, version, position) values
  ('40000000-0000-4000-8000-000000000401', '10000000-0000-4000-8000-000000000401', 'c-wr', 'Cut one', 'review', 1, 0);

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

-- Parts and templates are accepted; anything else is not.
select extensions.ok(public.script_lines_ok('[{"part":"lead","hear":"x"},{"part":"body","see":"y"}]', 40), 'lead and body parts are valid');
select extensions.ok(not public.script_lines_ok('[{"part":"middle","see":"y"}]', 40), 'an unknown part is refused');

set local role authenticated;

-- A producer cannot approve for the client.
select pg_temp.act_as('00000000-0000-4000-8000-000000000402');
select extensions.throws_ok(
  $$select public.team_approve_for_client('10000000-0000-4000-8000-000000000401', 'c-wr', 'concept', '20000000-0000-4000-8000-000000000401', 1)$$,
  'founder_only', 'only the founder approves for a client');

-- The founder approves the idea after a call.
select pg_temp.act_as('00000000-0000-4000-8000-000000000401');
select public.team_approve_for_client('10000000-0000-4000-8000-000000000401', 'c-wr', 'concept', '20000000-0000-4000-8000-000000000401', 1);
reset role;
select extensions.is(
  (select status || ' | ' || approved_by from public.concepts where id = '20000000-0000-4000-8000-000000000401'),
  'approved | Heni for Yasmine · on a call', 'the idea is approved, recorded as Heni for Yasmine on a call');
select extensions.ok(
  exists (select 1 from public.concept_notes where concept_id = '20000000-0000-4000-8000-000000000401' and kind = 'approve' and from_client),
  'the approval shows in the history as the client''s decision');
select extensions.is(
  public.concept_to_json((select c from public.concepts c where id = '20000000-0000-4000-8000-000000000401'))->>'hook',
  'Your mornings, fixed.', 'the idea''s hook line reaches the portal');

-- A script with two hooks needs the chosen hook; a stale version is refused.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000401');
select extensions.throws_ok(
  $$select public.team_approve_for_client('10000000-0000-4000-8000-000000000401', 'c-wr', 'script', '30000000-0000-4000-8000-000000000401', 1)$$,
  'hook_required', 'the founder picks the hook the client chose');
select extensions.throws_ok(
  $$select public.team_approve_for_client('10000000-0000-4000-8000-000000000401', 'c-wr', 'script', '30000000-0000-4000-8000-000000000401', 2, 1)$$,
  'script_changed', 'an approval for an older version is refused');
select public.team_approve_for_client('10000000-0000-4000-8000-000000000401', 'c-wr', 'script', '30000000-0000-4000-8000-000000000401', 1, 1);
reset role;
select extensions.is(
  (select status || ' | ' || hook::text from public.scripts where id = '30000000-0000-4000-8000-000000000401'),
  'approved | 1', 'the script is approved with hook B');

-- The client can no longer approve what is already approved.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000403');
select extensions.throws_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000401', 'c-wr', '30000000-0000-4000-8000-000000000401', 'approve', '', 1, null, 0)$$,
  'script_changed', 'whoever approves first counts');

-- The founder approves the video.
select pg_temp.act_as('00000000-0000-4000-8000-000000000401');
select public.team_approve_for_client('10000000-0000-4000-8000-000000000401', 'c-wr', 'cut', '40000000-0000-4000-8000-000000000401', 1);
reset role;
select extensions.is(
  (select status || ' | ' || approved_by from public.cuts where id = '40000000-0000-4000-8000-000000000401'),
  'approved | Heni for Yasmine · on a call', 'the video is approved for the client');

-- Changing the hook line of an approved idea sends it back to the client.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000401');
update public.concepts set hook = 'Mornings, sorted.' where id = '20000000-0000-4000-8000-000000000401';
reset role;
select extensions.is(
  (select status || ' | v' || version from public.concepts where id = '20000000-0000-4000-8000-000000000401'),
  'review | v2', 'a new hook line is a new version, back with the client');

-- Templates.
select extensions.lives_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style) values ('10000000-0000-4000-8000-000000000401', 'c-wr', 'Three reasons', 'reasons')$$,
  'the new templates are valid styles');
select extensions.throws_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style) values ('10000000-0000-4000-8000-000000000401', 'c-wr', 'Bad', 'listicle')$$,
  '23514', null, 'an unknown template is refused');

select * from extensions.finish();
rollback;
