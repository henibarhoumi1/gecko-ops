begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000701', 'authenticated', 'authenticated', 'founder@shoot.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000701', 'Shoot GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000701', 'founder', '00000000-0000-4000-8000-000000000701', 'founder@shoot.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000701', 'c-sh', 'Shoot Brand');
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, status, version, approved_version, approved_at, approved_by, hook) values
  ('30000000-0000-4000-8000-000000000701', '10000000-0000-4000-8000-000000000701', 'c-sh', 'Approved one', 'skit',
   '[{"text":"Hook A"}]', 'approved', 2, 2, now(), 'Yasmine', 0);

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

select extensions.ok(public.shoot_plan_ok('{"talent":["a"],"set":"b","props":["c"],"extraProps":"Football on TV"}'), 'a full plan is valid');
select extensions.ok(not public.shoot_plan_ok('{"talent":"a"}'), 'talent must be a list');
select extensions.ok(not public.shoot_plan_ok('{"budget":1}'), 'unknown keys are refused');

-- Picking the talent and set of an approved script keeps it approved, at the same version.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000701');
update public.scripts set shoot = '{"talent":["t1"],"set":"s1","props":[],"extraProps":"Remote control"}'
where id = '30000000-0000-4000-8000-000000000701';
reset role;
select extensions.is(
  (select status || ' | v' || version || ' | ' || (shoot->>'extraProps') from public.scripts where id = '30000000-0000-4000-8000-000000000701'),
  'approved | v2 | Remote control', 'the shoot plan does not reopen an approved script');
select extensions.throws_ok(
  $$update public.scripts set shoot = '{"talent":"t1"}' where id = '30000000-0000-4000-8000-000000000701'$$,
  '23514', null, 'a bad plan is refused');

select * from extensions.finish();
rollback;
