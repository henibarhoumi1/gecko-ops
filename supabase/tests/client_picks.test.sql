begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(11);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000009a1', 'authenticated', 'authenticated', 'founder@picks.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000009a2', 'authenticated', 'authenticated', 'owner@picks.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000009a3', 'authenticated', 'authenticated', 'viewer@picks.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-0000000009a1', 'Picks studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000009a1', 'heni', '00000000-0000-4000-8000-0000000009a1', 'founder@picks.test', 'Heni', 'founder');
insert into public.clients(workspace_id, id, brand) values
  ('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'Synthetic Picks'),
  ('10000000-0000-4000-8000-0000000009a1', 'c-xx', 'Synthetic Other');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.ids (who text primary key, id uuid);
create table pg_temp.codes (who text primary key, code text);
grant all on pg_temp.ids, pg_temp.codes to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a1', 'founder@picks.test');
insert into pg_temp.codes values
  ('owner', public.invite_client_account('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'owner@picks.test', 'owner')),
  ('viewer', public.invite_client_account('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'viewer@picks.test', 'viewer'));
insert into pg_temp.ids values
  ('yasmine', public.save_production_option('10000000-0000-4000-8000-0000000009a1', 'c-pk', '{"kind":"talent","name":"Yasmine","role":"main","cost":0}')),
  ('mop', public.save_production_option('10000000-0000-4000-8000-0000000009a1', 'c-pk', '{"kind":"prop","name":"Mop","cost":0,"boughtBy":"client"}')),
  ('other', public.save_production_option('10000000-0000-4000-8000-0000000009a1', 'c-xx', '{"kind":"talent","name":"Not theirs","cost":0}'));
insert into public.project_sets (workspace_id, client_id, name) values ('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'Bathroom, white tiles');
insert into public.project_sets (workspace_id, client_id, name) values ('10000000-0000-4000-8000-0000000009a1', 'c-xx', 'Their kitchen');
insert into public.concepts (workspace_id, client_id, title, body, status, position)
  values ('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'Morning rush', '', 'review', 0);
insert into pg_temp.ids select 'idea', id from public.concepts where title = 'Morning rush';
insert into public.scripts (workspace_id, client_id, title, style, hooks, beats, cta, status)
  values ('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'Bathroom reel', 'skit', '[{"hear":"Hook A"}]', '[]', 'Buy', 'review');
insert into pg_temp.ids select 'script', id from public.scripts where title = 'Bathroom reel';
insert into pg_temp.ids select 'set', id from public.project_sets where name = 'Bathroom, white tiles';
insert into pg_temp.ids select 'xset', id from public.project_sets where name = 'Their kitchen';

select pg_temp.act_as('00000000-0000-4000-8000-0000000009a3', 'viewer@picks.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'viewer'), 'Vi');
select extensions.throws_ok(
  $$select public.client_set_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'concept', (select id from pg_temp.ids where who = 'idea'),
    array[(select id from pg_temp.ids where who = 'yasmine')], null, null, null, '')$$,
  'viewer_read_only', 'a viewer cannot pick');

select pg_temp.act_as('00000000-0000-4000-8000-0000000009a2', 'owner@picks.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'owner'), 'Sara');
select extensions.is(
  jsonb_array_length(public.get_my_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk') -> 'sets'), 1,
  'the client reads their own sets only');
select extensions.throws_ok(
  $$select public.client_set_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'concept', (select id from pg_temp.ids where who = 'idea'),
    array[(select id from pg_temp.ids where who = 'other')], null, null, null, '')$$,
  'invalid_picks', 'another client''s talent is refused');
select extensions.throws_ok(
  $$select public.client_set_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'concept', (select id from pg_temp.ids where who = 'idea'),
    null, (select id from pg_temp.ids where who = 'xset'), null, null, '')$$,
  'invalid_picks', 'another client''s set is refused');
select extensions.throws_ok(
  $$select public.client_set_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'concept', (select id from pg_temp.ids where who = 'idea'),
    array[(select id from pg_temp.ids where who = 'mop')], null, null, null, '')$$,
  'invalid_picks', 'a prop is not talent');
select extensions.throws_ok(
  $$select public.client_set_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'script', (select id from pg_temp.ids where who = 'idea'),
    null, null, null, null, '')$$,
  'picks_target_not_found', 'the id must be a script of theirs');
select extensions.lives_ok(
  $$select public.client_set_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'concept', (select id from pg_temp.ids where who = 'idea'),
    array[(select id from pg_temp.ids where who = 'yasmine')], (select id from pg_temp.ids where who = 'set'), null,
    array[(select id from pg_temp.ids where who = 'mop')], ' Morning light please ')$$,
  'the owner picks talent, a set and a prop');
select extensions.lives_ok(
  $$select public.client_set_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk', 'script', (select id from pg_temp.ids where who = 'script'),
    array[(select id from pg_temp.ids where who = 'yasmine')], null, null, null, 'Close-ups')$$,
  'and picks on a script too');
select extensions.is(
  public.get_my_picks('10000000-0000-4000-8000-0000000009a1', 'c-pk') #>> array['concepts', (select id::text from pg_temp.ids where who = 'idea'), 'note'],
  'Morning light please', 'and reads the picks back');

select pg_temp.act_as('00000000-0000-4000-8000-0000000009a1', 'founder@picks.test');
select extensions.is(
  (select client_picks ->> 'by' from public.concepts where title = 'Morning rush'), 'Sara',
  'the team sees who picked');
select extensions.is(
  (select talent from public.concepts where title = 'Morning rush'), '{}'::text[],
  'and the team''s own talent is untouched');

select * from extensions.finish();
rollback;
