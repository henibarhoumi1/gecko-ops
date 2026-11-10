begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000c81', 'authenticated', 'authenticated', 'founder@cd.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000c82', 'authenticated', 'authenticated', 'owner@cd.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000c81', 'CD GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000c81', 'founder', '00000000-0000-4000-8000-000000000c81', 'founder@cd.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000c81', 'c-d', 'Details Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000c81', 'c-d', 'owner@cd.test', 'Olfa', '00000000-0000-4000-8000-000000000c82', now(), '00000000-0000-4000-8000-000000000c81', 'owner');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;
create table pg_temp.ids (id uuid);
grant all on pg_temp.ids to authenticated;
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000c82');
insert into pg_temp.ids select ((public.client_save_idea('10000000-0000-4000-8000-000000000c81', 'c-d', null, 'My idea', '', ''))->>'id')::uuid;

select extensions.lives_ok(
  $$select public.client_set_idea_details('10000000-0000-4000-8000-000000000c81', 'c-d', (select id from pg_temp.ids), 'Stop scrolling', 'carousel')$$,
  'the client gives their idea a hook and a format');
reset role;
select extensions.is((select row(hook, format)::text from public.concepts where title = 'My idea'), '("Stop scrolling",carousel)', 'saved');
set local role authenticated;
select extensions.throws_ok(
  $$select public.client_set_idea_details('10000000-0000-4000-8000-000000000c81', 'c-d', (select id from pg_temp.ids), 'x', 'video')$$,
  'invalid_idea', 'only the known formats');
select pg_temp.act_as('00000000-0000-4000-8000-000000000c81');
select extensions.throws_ok(
  $$select public.client_set_idea_details('10000000-0000-4000-8000-000000000c81', 'c-d', (select id from pg_temp.ids), 'x', 'reel')$$,
  'forbidden', 'it''s the client''s own function');

select * from extensions.finish();
rollback;
