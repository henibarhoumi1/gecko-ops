begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000b01', 'authenticated', 'authenticated', 'founder@proj.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000b02', 'authenticated', 'authenticated', 'owner@proj.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000b03', 'authenticated', 'authenticated', 'editor@proj.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000b01', 'Proj GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000b01', 'founder', '00000000-0000-4000-8000-000000000b01', 'founder@proj.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000b01', 'ed', '00000000-0000-4000-8000-000000000b03', 'editor@proj.test', 'Sami', 'editor');
insert into public.clients (workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000b01', 'c-p', 'Proj Brand'),
  ('10000000-0000-4000-8000-000000000b01', 'c-q', 'Other Brand');
insert into public.client_assignments (workspace_id, client_id, member_id) values
  ('10000000-0000-4000-8000-000000000b01', 'c-p', 'ed');
-- What the migration does for every client: one active project.
insert into public.projects (workspace_id, id, client_id, data, name, status, position) values
  ('10000000-0000-4000-8000-000000000b01', 'p_c-p', 'c-p', '{}', 'Launch Pack', 'active', 1),
  ('10000000-0000-4000-8000-000000000b01', 'p_c-q', 'c-q', '{}', 'Other', 'active', 1),
  ('10000000-0000-4000-8000-000000000b01', 'old', 'c-p', '{"costs": 9}', 'Old app', 'archived', 0);

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.vals (k text primary key, v text);
grant all on pg_temp.vals to authenticated;

select extensions.ok(
  not has_function_privilege('authenticated', 'public.fill_project_id()', 'execute'),
  'nobody calls the project filler directly'
);

-- A row with no project lands in the client's current project.
insert into public.concepts (workspace_id, client_id, title) values ('10000000-0000-4000-8000-000000000b01', 'c-p', 'First idea');
select extensions.is(
  (select project_id from public.concepts where title = 'First idea'), 'p_c-p',
  'a new idea goes to the client''s current project'
);
select extensions.throws_ok(
  $$insert into public.concepts (workspace_id, client_id, title, project_id) values ('10000000-0000-4000-8000-000000000b01', 'c-p', 'Wrong', 'p_c-q')$$,
  'project_not_found', 'a row can''t be put in another client''s project'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000b01', 'founder@proj.test');
insert into pg_temp.vals values ('owner', public.invite_client_account('10000000-0000-4000-8000-000000000b01', 'c-p', 'owner@proj.test', 'owner'));
insert into pg_temp.vals values ('p2', public.save_project('10000000-0000-4000-8000-000000000b01', 'c-p', '{"name":"Ramadan campaign","kind":"cinematic"}'));
select extensions.is(
  (select string_agg((p->>'name') || ':' || (p->>'status'), ',')
   from jsonb_array_elements(public.get_projects('10000000-0000-4000-8000-000000000b01', 'c-p')->'projects') p),
  'Ramadan campaign:active,Launch Pack:active,Old app:archived',
  'the team sees the newest project first, and the archived ones last'
);
select extensions.is(
  (public.get_projects('10000000-0000-4000-8000-000000000b01', 'c-p')->'projects'->1->>'ideas')::int, 1,
  'each project counts its own ideas'
);
select extensions.throws_ok(
  $$select public.save_project('10000000-0000-4000-8000-000000000b01', 'c-p', '{"name":"  "}')$$,
  'invalid_project', 'a project needs a name'
);
select extensions.lives_ok(
  $$select public.save_project('10000000-0000-4000-8000-000000000b01', 'c-p', '{"id":"p_c-p","name":"Launch Pack","status":"done"}')$$,
  'the founder closes a project'
);
reset role;
insert into public.scripts (workspace_id, client_id, title) values ('10000000-0000-4000-8000-000000000b01', 'c-p', 'New script');
select extensions.is(
  (select project_id from public.scripts where title = 'New script'),
  (select v from pg_temp.vals where k = 'p2'),
  'once a new project exists, new work goes to it'
);
set local role authenticated;

-- The client sees their projects, not the archived ones, and can't manage them.
select pg_temp.act_as('00000000-0000-4000-8000-000000000b02', 'owner@proj.test');
select public.accept_client_invite((select v from pg_temp.vals where k = 'owner'), 'Sara');
select extensions.is(
  (select (g->>'canManage') || '|' || jsonb_array_length(g->'projects')
   from public.get_projects('10000000-0000-4000-8000-000000000b01', 'c-p') g),
  'false|2', 'the client sees their two projects and no archived ones'
);
select extensions.throws_ok(
  $$select public.save_project('10000000-0000-4000-8000-000000000b01', 'c-p', '{"name":"Mine"}')$$,
  'forbidden', 'the client doesn''t start projects'
);

-- An editor reads the projects of a client they're on.
select pg_temp.act_as('00000000-0000-4000-8000-000000000b03', 'editor@proj.test');
select extensions.is(
  (public.get_projects('10000000-0000-4000-8000-000000000b01', 'c-p')->>'canManage')::boolean, false,
  'an editor reads projects without managing them'
);

select * from extensions.finish();
rollback;
