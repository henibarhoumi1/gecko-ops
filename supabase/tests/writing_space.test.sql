begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000f1', 'authenticated', 'authenticated', 'founder@ws.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f2', 'authenticated', 'authenticated', 'owner@ws-brand.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000f3', 'authenticated', 'authenticated', 'viewer@ws-brand.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-0000000000f1', 'Writing studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000f1', 'founder', '00000000-0000-4000-8000-0000000000f1', 'founder@ws.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values
  ('10000000-0000-4000-8000-0000000000f1', 'c-w', 'Writing Brand'),
  ('10000000-0000-4000-8000-0000000000f1', 'c-x', 'Other Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-0000000000f1', 'c-w', 'owner@ws-brand.test', 'Youcef', '00000000-0000-4000-8000-0000000000f2', now(), '00000000-0000-4000-8000-0000000000f1', 'owner'),
  ('10000000-0000-4000-8000-0000000000f1', 'c-w', 'viewer@ws-brand.test', 'Vee', '00000000-0000-4000-8000-0000000000f3', now(), '00000000-0000-4000-8000-0000000000f1', 'viewer');
insert into public.production_options (id, workspace_id, client_id, kind, name, status) values
  ('20000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-0000000000f1', 'c-w', 'talent', 'Firas', 'approved'),
  ('20000000-0000-4000-8000-0000000000f2', '10000000-0000-4000-8000-0000000000f1', 'c-w', 'prop', 'Apron', 'approved');
insert into public.project_sets (id, workspace_id, client_id, name, position, photos) values
  ('30000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-0000000000f1', 'c-w', 'Kitchen', 1,
   array['10000000-0000-4000-8000-0000000000f1/c-w/kitchen.jpg']),
  ('30000000-0000-4000-8000-0000000000f2', '10000000-0000-4000-8000-0000000000f1', 'c-w', 'Bathroom', 2, '{}'),
  ('30000000-0000-4000-8000-0000000000f3', '10000000-0000-4000-8000-0000000000f1', 'c-x', 'Not theirs', 1, '{}');
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, status, version, approved_version, approved_at, approved_by, hook, position) values
  ('40000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-0000000000f1', 'c-w', 'With the client', 'skit',
   '[{"text":"Hook A"}]', 'review', 1, null, null, null, null, 0),
  ('40000000-0000-4000-8000-0000000000f2', '10000000-0000-4000-8000-0000000000f1', 'c-w', 'Approved', 'skit',
   '[{"text":"Hook A"}]', 'approved', 2, 2, now(), 'Youcef', 0, 1);
insert into public.concepts (id, workspace_id, client_id, title, status, from_client, created_by, position) values
  ('50000000-0000-4000-8000-0000000000f1', '10000000-0000-4000-8000-0000000000f1', 'c-w', 'Their idea', 'idea', true,
   '00000000-0000-4000-8000-0000000000f2', 0);

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

-- Set photos stay in the client's own folder.
select extensions.throws_ok(
  $$update public.project_sets set photos = array['10000000-0000-4000-8000-0000000000f1/c-x/a.jpg']
    where id = '30000000-0000-4000-8000-0000000000f2'$$,
  'P0001', 'invalid_photo', 'a set photo from another client''s folder is refused'
);

set local role authenticated;

-- The client reads the campaign's sets, with their photos, on its production page.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000f2', 'owner@ws-brand.test');
select extensions.is(
  jsonb_array_length(public.get_my_production('10000000-0000-4000-8000-0000000000f1', 'c-w')->'sets'),
  2, 'the client reads its own sets, not another client''s'
);
select extensions.is(
  public.get_my_production('10000000-0000-4000-8000-0000000000f1', 'c-w')->'sets'->0->'photos'->>0,
  '10000000-0000-4000-8000-0000000000f1/c-w/kitchen.jpg', 'sets come with their photos'
);

-- The client picks talent, several sets and props for a script that's with them.
select public.client_set_script_shoot('10000000-0000-4000-8000-0000000000f1', 'c-w', '40000000-0000-4000-8000-0000000000f1',
  '{"talent":["20000000-0000-4000-8000-0000000000f1"],"sets":["30000000-0000-4000-8000-0000000000f1","30000000-0000-4000-8000-0000000000f2"],"props":["20000000-0000-4000-8000-0000000000f2"],"extraProps":"A TV"}');
reset role;
select extensions.is(
  (select jsonb_array_length(shoot->'sets') from public.scripts where id = '40000000-0000-4000-8000-0000000000f1'),
  2, 'a script can be shot on several sets'
);
select extensions.is(
  (select shoot->>'set' from public.scripts where id = '40000000-0000-4000-8000-0000000000f1'),
  '30000000-0000-4000-8000-0000000000f1', 'the first set is kept as the single set for older readers'
);
select extensions.is(
  (select status || '/' || version from public.scripts where id = '40000000-0000-4000-8000-0000000000f1'),
  'review/1', 'a shoot plan is logistics: no new version, same status'
);
select extensions.is(
  (select public.script_to_json(s)->'shoot'->'talent'->>0 from public.scripts s where id = '40000000-0000-4000-8000-0000000000f1'),
  '20000000-0000-4000-8000-0000000000f1', 'the client reads the script''s shoot plan'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000f2', 'owner@ws-brand.test');
select extensions.throws_ok(
  $$select public.client_set_script_shoot('10000000-0000-4000-8000-0000000000f1', 'c-w', '40000000-0000-4000-8000-0000000000f1',
    '{"sets":["30000000-0000-4000-8000-0000000000f3"]}')$$,
  'P0001', 'invalid_shoot_plan', 'another client''s set is refused'
);
select extensions.throws_ok(
  $$select public.client_set_script_shoot('10000000-0000-4000-8000-0000000000f1', 'c-w', '40000000-0000-4000-8000-0000000000f2',
    '{"sets":["30000000-0000-4000-8000-0000000000f2"]}')$$,
  'P0001', 'script_locked', 'an approved script''s plan stays with Gecko'
);
select pg_temp.act_as('00000000-0000-4000-8000-0000000000f3', 'viewer@ws-brand.test');
select extensions.throws_ok(
  $$select public.client_set_script_shoot('10000000-0000-4000-8000-0000000000f1', 'c-w', '40000000-0000-4000-8000-0000000000f1', '{}')$$,
  'P0001', 'writer_only', 'a viewer can''t change a shoot plan'
);

-- Ideas: the client plans its own idea; the talent column follows.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000f2', 'owner@ws-brand.test');
select public.client_set_idea_shoot('10000000-0000-4000-8000-0000000000f1', 'c-w', '50000000-0000-4000-8000-0000000000f1',
  '{"talent":["20000000-0000-4000-8000-0000000000f1"],"sets":["30000000-0000-4000-8000-0000000000f2"]}');
reset role;
select extensions.is(
  (select talent[1] from public.concepts where id = '50000000-0000-4000-8000-0000000000f1'),
  '20000000-0000-4000-8000-0000000000f1', 'an idea''s talent follows its shoot plan'
);
-- An older app that writes only the talent column keeps the plan in step.
update public.concepts set talent = '{}' where id = '50000000-0000-4000-8000-0000000000f1';
select extensions.is(
  (select jsonb_array_length(shoot->'talent') || '/' || jsonb_array_length(shoot->'sets') from public.concepts
   where id = '50000000-0000-4000-8000-0000000000f1'),
  '0/1', 'writing the talent column alone updates the plan''s talent and keeps its sets'
);
select extensions.is(
  (select public.concept_to_json(c)->'shoot'->'sets'->>0 from public.concepts c where id = '50000000-0000-4000-8000-0000000000f1'),
  '30000000-0000-4000-8000-0000000000f2', 'the client reads the idea''s shoot plan'
);

select * from extensions.finish();
rollback;
