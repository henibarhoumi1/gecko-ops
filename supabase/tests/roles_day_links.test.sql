begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(18);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000d01', 'authenticated', 'authenticated', 'founder@dl.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000d02', 'authenticated', 'authenticated', 'editor@dl.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000d03', 'authenticated', 'authenticated', 'new@dl.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000d01', 'DL GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000d01', 'founder', '00000000-0000-4000-8000-000000000d01', 'founder@dl.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000d01', 'ed', '00000000-0000-4000-8000-000000000d02', 'editor@dl.test', 'Sami', 'editor');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000d01', 'c-d', 'Day Brand');
insert into public.scripts (id, workspace_id, client_id, title, hooks, status) values
  ('30000000-0000-4000-8000-000000000d01', '10000000-0000-4000-8000-000000000d01', 'c-d', 'Draft on set',
   '[{"hear":"Line for the talent"}]', 'draft');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.vals (k text primary key, v text);
grant all on pg_temp.vals to authenticated, anon;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000d01', 'founder@dl.test');

-- Titles.
insert into pg_temp.vals values ('invite', public.invite_workspace_member('10000000-0000-4000-8000-000000000d01', 'new@dl.test', 'editor', 'Second editor'));
select extensions.lives_ok(
  $$select public.set_member_role('10000000-0000-4000-8000-000000000d01', 'ed', 'editor', 'Main editor')$$,
  'the founder gives an editor a title'
);
select extensions.throws_ok(
  $$select public.set_member_role('10000000-0000-4000-8000-000000000d01', 'founder', 'sales', 'x')$$,
  'member_not_found', 'the founder''s own row doesn''t change'
);
select extensions.throws_ok(
  $$select public.set_member_role('10000000-0000-4000-8000-000000000d01', 'ed', 'founder', 'x')$$,
  'invalid_role', 'nobody is made founder'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000d03', 'new@dl.test');
select public.accept_workspace_invite((select v from pg_temp.vals where k = 'invite'), 'Nour');
select extensions.is(
  (select string_agg((m->>'name') || ':' || (m->>'title'), ',' order by m->>'name')
   from jsonb_array_elements(public.get_members('10000000-0000-4000-8000-000000000d01')) m),
  'Heni:,Nour:Second editor,Sami:Main editor',
  'a new member takes the invite''s title, and everyone reads the titles'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000d02', 'editor@dl.test');
select extensions.throws_ok(
  $$select public.set_member_role('10000000-0000-4000-8000-000000000d01', 'ed', 'sales', 'Producer')$$,
  'forbidden', 'only the founder changes roles'
);

-- Day links.
select pg_temp.act_as('00000000-0000-4000-8000-000000000d01', 'founder@dl.test');
insert into pg_temp.vals values ('day', public.save_shoot_day('10000000-0000-4000-8000-000000000d01', 'c-d',
  format('{"day":"%s","privateNotes":"DOP rate 300"}', current_date)::jsonb)::text);
select public.set_shoot_reels('10000000-0000-4000-8000-000000000d01', 'c-d', (select v::uuid from pg_temp.vals where k = 'day'),
  array['30000000-0000-4000-8000-000000000d01']::uuid[]);
insert into pg_temp.vals values ('token', public.create_shoot_link('10000000-0000-4000-8000-000000000d01', 'c-d',
  (select v::uuid from pg_temp.vals where k = 'day'), 'Ali, DOP'));
insert into pg_temp.vals select 'reel', public.get_shoot_days('10000000-0000-4000-8000-000000000d01', 'c-d')->'days'->0->'reels'->0->>'id';
select extensions.is(
  jsonb_array_length(public.get_shoot_links('10000000-0000-4000-8000-000000000d01', 'c-d', (select v::uuid from pg_temp.vals where k = 'day'))),
  1, 'the founder sees the link'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000d02', 'editor@dl.test');
select extensions.throws_ok(
  $$select public.create_shoot_link('10000000-0000-4000-8000-000000000d01', 'c-d', (select v::uuid from pg_temp.vals where k = 'day'), 'x')$$,
  'forbidden', 'an editor without the client can''t make links'
);

-- Someone with the link and no account.
reset role;
select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '', true);
set local role anon;
select extensions.is(
  (select (g->>'who') || '|' || (g->>'brand') || '|' || coalesce(g->'day'->>'privateNotes', 'hidden') || '|' ||
          (g->'day'->'reels'->0->'hooks'->0->>'hear') || '|' || coalesce(g->'day'->'reels'->0->>'extraProps', 'none')
   from public.get_shoot_day_by_link((select v from pg_temp.vals where k = 'token')) g),
  'Ali, DOP|Day Brand|hidden|Line for the talent|none',
  'the link opens the day with every line to read, and no private notes'
);
select extensions.lives_ok(
  $$select public.update_shoot_reel_by_link((select v from pg_temp.vals where k = 'token'), (select v::uuid from pg_temp.vals where k = 'reel'), '{"status":"done","linesDone":["hook-0"]}')$$,
  'the crew ticks a reel through the link'
);
select extensions.throws_ok(
  $$select public.get_shoot_day_by_link(repeat('a', 64))$$, 'link_expired', 'a wrong token opens nothing'
);
select extensions.throws_ok(
  $$select public.update_shoot_reel_by_link((select v from pg_temp.vals where k = 'token'), gen_random_uuid(), '{"status":"done"}')$$,
  'reel_not_found', 'a link only reaches the reels of its own day'
);
select extensions.throws_ok(
  $$select public.get_shoot_days('10000000-0000-4000-8000-000000000d01', 'c-d')$$,
  '42501', NULL, 'without an account nothing else opens'
);
reset role;
select extensions.is(
  (select status || '|' || updated_by_name from public.shoot_day_reels where id = (select v::uuid from pg_temp.vals where k = 'reel')),
  'done|Ali, DOP', 'the tick shows who made it'
);
select extensions.ok(
  (select expires_at > now() + interval '2 days' and expires_at < now() + interval '4 days'
   from public.shoot_day_links where label = 'Ali, DOP'),
  'a link for a shoot today ends two days after it'
);

-- Revoked: closed.
insert into pg_temp.vals select 'link', id::text from public.shoot_day_links where label = 'Ali, DOP';
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000d01', 'founder@dl.test');
select public.revoke_shoot_link('10000000-0000-4000-8000-000000000d01', 'c-d', (select v::uuid from pg_temp.vals where k = 'link'));
reset role;
set local role anon;
select extensions.throws_ok(
  $$select public.get_shoot_day_by_link((select v from pg_temp.vals where k = 'token'))$$,
  'link_expired', 'a revoked link opens nothing'
);
reset role;
select extensions.ok(
  not has_function_privilege('anon', 'public.shoot_link_for(text)', 'execute')
  and not has_table_privilege('anon', 'public.shoot_day_links', 'select'),
  'the link table and its lookup stay closed'
);

select * from extensions.finish();
rollback;
