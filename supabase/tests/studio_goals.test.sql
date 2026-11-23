begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'founder@goals.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'sales@goals.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'editor@goals.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-0000000000f1', 'Goals studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000f1', 'founder', '00000000-0000-4000-8000-0000000000f1', 'founder@goals.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-0000000000f1', 'sales', '00000000-0000-4000-8000-0000000000f2', 'sales@goals.test', 'Mo', 'sales'),
  ('10000000-0000-4000-8000-0000000000f1', 'editor', '00000000-0000-4000-8000-0000000000f3', 'editor@goals.test', 'Ed', 'editor');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

set local role authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-0000000000f1', 'founder@goals.test');
insert into public.studio_goals (workspace_id, month, revenue, deals, reels)
values ('10000000-0000-4000-8000-0000000000f1', '2026-11-01', 12000, 3, 20);
select extensions.is((select revenue::int from public.studio_goals), 12000, 'the founder sets the month''s goal');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000f2', 'sales@goals.test');
select extensions.is((select count(*)::int from public.studio_goals), 1, 'a producer reads the goals');
update public.studio_goals set revenue = 1;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000f1', 'founder@goals.test');
select extensions.is((select revenue::int from public.studio_goals), 12000, 'a producer cannot change them');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000f3', 'editor@goals.test');
select extensions.is((select count(*)::int from public.studio_goals), 0, 'an editor does not see the money goals');

reset role;
select * from extensions.finish();
rollback;
