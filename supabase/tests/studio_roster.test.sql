begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000d1', 'authenticated', 'authenticated', 'founder@roster.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d2', 'authenticated', 'authenticated', 'editor@roster.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000d3', 'authenticated', 'authenticated', 'stranger@roster.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values
  ('10000000-0000-4000-8000-0000000000d1', 'Roster studio'),
  ('10000000-0000-4000-8000-0000000000d2', 'Another studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000d1', 'founder', '00000000-0000-4000-8000-0000000000d1', 'founder@roster.test', 'Founder', 'founder'),
  ('10000000-0000-4000-8000-0000000000d1', 'editor', '00000000-0000-4000-8000-0000000000d2', 'editor@roster.test', 'Editor', 'editor'),
  ('10000000-0000-4000-8000-0000000000d2', 'other', '00000000-0000-4000-8000-0000000000d3', 'stranger@roster.test', 'Other', 'founder');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

set local role authenticated;

-- An editor adds a talent and a location; everyone on the team reads them.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000d2', 'editor@roster.test');
insert into public.studio_roster (workspace_id, kind, name, role, city, rate)
values ('10000000-0000-4000-8000-0000000000d1', 'talent', 'Yasmine', 'actor', 'Tunis', 250),
       ('10000000-0000-4000-8000-0000000000d1', 'location', 'Bright kitchen', 'home', 'La Marsa', 400);
select extensions.is((select count(*)::int from public.studio_roster), 2, 'an editor adds talent and locations and reads them back');

-- Bad links are refused.
select extensions.throws_ok(
  $$insert into public.studio_roster (workspace_id, kind, name, link) values ('10000000-0000-4000-8000-0000000000d1', 'talent', 'Bad', 'javascript:alert(1)')$$,
  '23514', null, 'a link must be http(s)'
);

-- Hiding is an update anyone on the team can make.
update public.studio_roster set hidden = true where name = 'Yasmine';
select extensions.is((select hidden from public.studio_roster where name = 'Yasmine'), true, 'an entry can be hidden');

-- An editor can't delete.
delete from public.studio_roster where name = 'Bright kitchen';
select extensions.is((select count(*)::int from public.studio_roster), 2, 'an editor cannot delete');

-- Another workspace sees nothing and can't write here.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000d3', 'stranger@roster.test');
select extensions.is((select count(*)::int from public.studio_roster), 0, 'another workspace reads nothing');
select extensions.throws_ok(
  $$insert into public.studio_roster (workspace_id, kind, name) values ('10000000-0000-4000-8000-0000000000d1', 'talent', 'Intruder')$$,
  '42501', null, 'another workspace cannot add'
);

-- The founder deletes: it goes to the trash, and comes back.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000d1', 'founder@roster.test');
delete from public.studio_roster where name = 'Bright kitchen';
select extensions.is((select count(*)::int from public.studio_roster), 1, 'the founder deletes');
select public.restore_trash('10000000-0000-4000-8000-0000000000d1',
  (select (t->>'batch')::bigint from jsonb_array_elements(public.get_trash('10000000-0000-4000-8000-0000000000d1')) t
   where t->>'kind' = 'studio_roster' limit 1));
select extensions.is((select count(*)::int from public.studio_roster), 2, 'a deleted entry comes back from the trash');

reset role;
select * from extensions.finish();
rollback;
