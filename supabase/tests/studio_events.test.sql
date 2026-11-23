begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000a1', 'authenticated', 'authenticated', 'founder@ev.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000a2', 'authenticated', 'authenticated', 'editor@ev.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000a3', 'authenticated', 'authenticated', 'other@ev.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values
  ('10000000-0000-4000-8000-0000000000a1', 'Events studio'), ('10000000-0000-4000-8000-0000000000a2', 'Other');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000a1', 'founder', '00000000-0000-4000-8000-0000000000a1', 'founder@ev.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-0000000000a1', 'editor', '00000000-0000-4000-8000-0000000000a2', 'editor@ev.test', 'Ed', 'editor'),
  ('10000000-0000-4000-8000-0000000000a2', 'other', '00000000-0000-4000-8000-0000000000a3', 'other@ev.test', 'O', 'founder');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
set local role authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a2', 'editor@ev.test');
insert into public.studio_events (workspace_id, day, at_time, kind, title)
values ('10000000-0000-4000-8000-0000000000a1', '2026-11-25', '10:00', 'meeting', 'Brief with Dany');
select extensions.is((select count(*)::int from public.studio_events), 1, 'an editor adds a meeting to the calendar');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a1', 'founder@ev.test');
update public.studio_events set title = 'Brief with Dany Clean';
select extensions.is((select title from public.studio_events), 'Brief with Dany Clean', 'the founder can change it');

select extensions.throws_ok(
  $$insert into public.studio_events (workspace_id, day, at_time, title) values ('10000000-0000-4000-8000-0000000000a1', '2026-11-25', '25:00', 'x')$$,
  '23514', null, 'a bad time is refused'
);

select pg_temp.act_as('00000000-0000-4000-8000-0000000000a3', 'other@ev.test');
select extensions.is((select count(*)::int from public.studio_events), 0, 'another studio sees nothing');

reset role;
select * from extensions.finish();
rollback;
