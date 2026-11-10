begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000e01', 'authenticated', 'authenticated', 'founder@tk.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000e02', 'authenticated', 'authenticated', 'owner@tk.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000e03', 'authenticated', 'authenticated', 'viewer@tk.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000e04', 'authenticated', 'authenticated', 'other@tk.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000e01', 'TK GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000e01', 'founder', '00000000-0000-4000-8000-000000000e01', 'founder@tk.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000e01', 'c-t', 'Task Brand'),
  ('10000000-0000-4000-8000-000000000e01', 'c-o', 'Other Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000e01', 'c-t', 'owner@tk.test', 'Olfa', '00000000-0000-4000-8000-000000000e02', now(), '00000000-0000-4000-8000-000000000e01', 'owner'),
  ('10000000-0000-4000-8000-000000000e01', 'c-t', 'viewer@tk.test', 'Vee', '00000000-0000-4000-8000-000000000e03', now(), '00000000-0000-4000-8000-000000000e01', 'viewer'),
  ('10000000-0000-4000-8000-000000000e01', 'c-o', 'other@tk.test', 'Omar', '00000000-0000-4000-8000-000000000e04', now(), '00000000-0000-4000-8000-000000000e01', 'owner');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;
create table pg_temp.vals (k text primary key, v text);
grant all on pg_temp.vals to authenticated, anon;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000e01');

insert into pg_temp.vals values
  ('shared', public.save_task('10000000-0000-4000-8000-000000000e01', 'c-t',
    format('{"title":"Send the logo files","side":"client","assignee":"Olfa","due":"%s","link":"/shared"}', current_date + 2)::jsonb)::text),
  ('private', public.save_task('10000000-0000-4000-8000-000000000e01', 'c-t',
    '{"title":"Chase the deposit gently","private":true}')::text),
  ('team', public.save_task('10000000-0000-4000-8000-000000000e01', null, '{"title":"Buy a new mic"}')::text);

select extensions.is(jsonb_array_length(public.get_tasks('10000000-0000-4000-8000-000000000e01', 'c-t')), 2,
  'the team sees both tasks of the client, the private one too');
select extensions.is(
  (select count(*)::int from jsonb_array_elements(public.get_team_tasks('10000000-0000-4000-8000-000000000e01')) t
   where t->>'brand' = 'Task Brand' or t->>'clientId' is null), 3,
  'Today lists every open task, with its brand, and the team''s own');
select extensions.throws_ok(
  $$select public.save_task('10000000-0000-4000-8000-000000000e01', 'c-t', '{"title":"  "}')$$,
  'invalid_task', 'a task needs a title');
select extensions.throws_ok(
  $$select public.save_task('10000000-0000-4000-8000-000000000e01', 'c-t', '{"title":"x","link":"https://evil.test"}')$$,
  'invalid_task', 'a link stays inside the app');

-- The client.
select pg_temp.act_as('00000000-0000-4000-8000-000000000e02');
select extensions.is(
  (select string_agg(t->>'title', ',') from jsonb_array_elements(public.get_tasks('10000000-0000-4000-8000-000000000e01', 'c-t')) t),
  'Send the logo files', 'the client never sees a private task');
select extensions.throws_ok(
  $$select public.get_team_tasks('10000000-0000-4000-8000-000000000e01')$$, 'forbidden',
  'the client has no team list');
insert into pg_temp.vals values ('mine', public.save_task('10000000-0000-4000-8000-000000000e01', 'c-t',
  '{"title":"Approve the casting","private":true,"side":"gecko"}')::text);
reset role;
select extensions.is(
  (select row(t.from_client, t.private, t.side, t.author_name)::text from public.tasks t
   where t.id = (select v::uuid from pg_temp.vals where k = 'mine')),
  '(t,f,gecko,Olfa)', 'a client''s task is marked as theirs and can''t be made private');
set local role authenticated;
select extensions.lives_ok(
  $$select public.set_task_done('10000000-0000-4000-8000-000000000e01', 'c-t', (select v::uuid from pg_temp.vals where k = 'shared'), true)$$,
  'the client ticks a task Gecko gave them');
select extensions.throws_ok(
  $$select public.set_task_done('10000000-0000-4000-8000-000000000e01', 'c-t', (select v::uuid from pg_temp.vals where k = 'private'), true)$$,
  'task_not_found', 'the client can''t touch a private task');
select extensions.throws_ok(
  $$select public.save_task('10000000-0000-4000-8000-000000000e01', 'c-t', format('{"id":"%s","title":"Mine now"}', (select v from pg_temp.vals where k = 'shared'))::jsonb)$$,
  'task_not_found', 'the client edits only what they added');
select extensions.throws_ok(
  $$select public.get_tasks('10000000-0000-4000-8000-000000000e01', 'c-o')$$, 'forbidden',
  'nobody reads another client''s tasks');

select pg_temp.act_as('00000000-0000-4000-8000-000000000e03');
select extensions.throws_ok(
  $$select public.save_task('10000000-0000-4000-8000-000000000e01', 'c-t', '{"title":"Viewer task"}')$$,
  'task_not_allowed', 'a viewer reads but doesn''t write');

-- Removing.
select pg_temp.act_as('00000000-0000-4000-8000-000000000e02');
select extensions.lives_ok(
  $$select public.remove_task('10000000-0000-4000-8000-000000000e01', 'c-t', (select v::uuid from pg_temp.vals where k = 'mine'))$$,
  'the client removes a task they added');
select extensions.throws_ok(
  $$select public.remove_task('10000000-0000-4000-8000-000000000e01', 'c-t', (select v::uuid from pg_temp.vals where k = 'shared'))$$,
  'task_not_found', 'but not one Gecko added');
reset role;
select extensions.is(
  (select count(*)::int from public.trash where tbl = 'tasks' and label = 'Approve the casting'), 1,
  'a removed task waits in the trash');
set local role authenticated;

-- Presence.
select pg_temp.act_as('00000000-0000-4000-8000-000000000e01');
select extensions.is(public.ping_presence('10000000-0000-4000-8000-000000000e01', 'c-t', '/scripts'), '[]'::jsonb,
  'alone on the page');
select pg_temp.act_as('00000000-0000-4000-8000-000000000e02');
select extensions.is(public.ping_presence('10000000-0000-4000-8000-000000000e01', 'c-t', '/scripts'),
  '[{"name": "Heni", "team": true}]'::jsonb, 'the client sees Gecko on the same page');
select extensions.is(public.ping_presence('10000000-0000-4000-8000-000000000e01', 'c-t', '/scripts'),
  '[{"name": "Heni", "team": true}]'::jsonb, 'pinging again keeps one row per person');
select pg_temp.act_as('00000000-0000-4000-8000-000000000e04');
select extensions.throws_ok(
  $$select public.ping_presence('10000000-0000-4000-8000-000000000e01', 'c-t', '/scripts')$$, 'forbidden',
  'another client can''t look in');

-- View as client.
select pg_temp.act_as('00000000-0000-4000-8000-000000000e01');
select extensions.is(
  (select string_agg(t->>'title', ',') from jsonb_array_elements(
    public.team_preview('10000000-0000-4000-8000-000000000e01', 'c-t', 'viewer', 'tasks')) t),
  'Send the logo files', 'View as client shows the tasks the client sees');

select * from extensions.finish();
rollback;
