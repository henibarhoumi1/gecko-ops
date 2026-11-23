begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'founder@talent.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'editor@talent.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e3', 'authenticated', 'authenticated', 'owner@brand.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e4', 'authenticated', 'authenticated', 'approver@brand.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e5', 'authenticated', 'authenticated', 'stranger@other.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values
  ('10000000-0000-4000-8000-0000000000e1', 'Talent studio'),
  ('10000000-0000-4000-8000-0000000000e2', 'Another studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000e1', 'founder', '00000000-0000-4000-8000-0000000000e1', 'founder@talent.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-0000000000e1', 'editor', '00000000-0000-4000-8000-0000000000e2', 'editor@talent.test', 'Editor', 'editor'),
  ('10000000-0000-4000-8000-0000000000e2', 'other', '00000000-0000-4000-8000-0000000000e5', 'stranger@other.test', 'Other', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-0000000000e1', 'c-t', 'Talent Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-0000000000e1', 'c-t', 'owner@brand.test', 'Olfa', '00000000-0000-4000-8000-0000000000e3', now(), '00000000-0000-4000-8000-0000000000e1', 'owner'),
  ('10000000-0000-4000-8000-0000000000e1', 'c-t', 'approver@brand.test', 'Sami', '00000000-0000-4000-8000-0000000000e4', now(), '00000000-0000-4000-8000-0000000000e1', 'approver');
insert into public.client_assignments (workspace_id, client_id, member_id) values ('10000000-0000-4000-8000-0000000000e1', 'c-t', 'editor');
insert into public.production_options (id, workspace_id, client_id, kind, name, status) values
  ('20000000-0000-4000-8000-0000000000e1', '10000000-0000-4000-8000-0000000000e1', 'c-t', 'talent', 'Yasmine', 'proposed'),
  ('20000000-0000-4000-8000-0000000000e2', '10000000-0000-4000-8000-0000000000e1', 'c-t', 'prop', 'Blender', 'proposed'),
  ('20000000-0000-4000-8000-0000000000e3', '10000000-0000-4000-8000-0000000000e1', 'c-t', 'talent', 'Karim', 'proposed');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

set local role authenticated;

-- Gecko's side: only the founder approves talent.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e2', 'editor@talent.test');
select extensions.throws_ok(
  $$select public.set_talent_studio_approval('10000000-0000-4000-8000-0000000000e1', 'c-t', '20000000-0000-4000-8000-0000000000e1', true)$$,
  'P0001', 'founder_only', 'an editor cannot approve talent for Gecko'
);
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e1', 'founder@talent.test');
select public.set_studio_approval('10000000-0000-4000-8000-0000000000e1', 'c-t', '20000000-0000-4000-8000-0000000000e1', true);
select extensions.is(
  (select a->>'studioBy' from jsonb_array_elements(public.get_option_approvals('10000000-0000-4000-8000-0000000000e1', 'c-t')) a
   where a->>'id' = '20000000-0000-4000-8000-0000000000e1'),
  'Heni', 'the founder approves talent for Gecko'
);
-- Gecko's yes is final: approved at once, the client is told, not asked.
reset role;
select extensions.is(
  (select status from public.production_options where id = '20000000-0000-4000-8000-0000000000e1'),
  'approved', 'Gecko''s approval doesn''t wait for the client'
);
set local role authenticated;
select public.set_studio_approval('10000000-0000-4000-8000-0000000000e1', 'c-t', '20000000-0000-4000-8000-0000000000e2', true);
reset role;
select extensions.is(
  (select status from public.production_options where id = '20000000-0000-4000-8000-0000000000e2'),
  'approved', 'Gecko approves props and locations too'
);
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e3', 'owner@brand.test');
select extensions.throws_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-0000000000e1', 'c-t', '20000000-0000-4000-8000-0000000000e1', 'pass', '')$$,
  'P0001', 'gecko_decided', 'the client can''t undo what Gecko approved'
);
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e1', 'founder@talent.test');
select public.set_studio_approval('10000000-0000-4000-8000-0000000000e1', 'c-t', '20000000-0000-4000-8000-0000000000e2', false);
reset role;
select extensions.is(
  (select status from public.production_options where id = '20000000-0000-4000-8000-0000000000e2'),
  'proposed', 'taking Gecko''s yes back returns the option to the client'
);
set local role authenticated;

-- The brand's side: an approver can't say yes to talent, the owner can.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e4', 'approver@brand.test');
select extensions.throws_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-0000000000e1', 'c-t', '20000000-0000-4000-8000-0000000000e3', 'approve', '')$$,
  'P0001', 'talent_owner_only', 'only the brand owner approves talent'
);
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e3', 'owner@brand.test');
select public.client_decide_option('10000000-0000-4000-8000-0000000000e1', 'c-t', '20000000-0000-4000-8000-0000000000e3', 'approve', '');
select extensions.is(
  (select a->>'brandBy' from jsonb_array_elements(public.get_option_approvals('10000000-0000-4000-8000-0000000000e1', 'c-t')) a
   where a->>'id' = '20000000-0000-4000-8000-0000000000e3'),
  'Olfa', 'the brand owner approves talent, and sees who said yes'
);

-- Another studio reads nothing.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e5', 'stranger@other.test');
select extensions.throws_ok(
  $$select public.get_option_approvals('10000000-0000-4000-8000-0000000000e1', 'c-t')$$,
  'P0001', 'forbidden', 'another studio cannot read the approvals'
);

-- The set list of a campaign: an editor keeps it, a script picks a set and a shoot day shows its name.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e2', 'editor@talent.test');
insert into public.project_sets (id, workspace_id, client_id, project_id, name, position) values
  ('30000000-0000-4000-8000-0000000000e1', '10000000-0000-4000-8000-0000000000e1', 'c-t', 'p_c-t', 'Kitchen counter', 1),
  ('30000000-0000-4000-8000-0000000000e2', '10000000-0000-4000-8000-0000000000e1', 'c-t', 'p_c-t', 'Bathroom mirror', 2);
select extensions.is((select count(*)::int from public.project_sets), 2, 'an editor adds sets to a campaign');
insert into public.scripts (id, workspace_id, client_id, title, shoot) values
  ('40000000-0000-4000-8000-0000000000e1', '10000000-0000-4000-8000-0000000000e1', 'c-t', 'Morning routine',
   '{"talent": ["20000000-0000-4000-8000-0000000000e1"], "set": "30000000-0000-4000-8000-0000000000e1"}');
-- (shoot_reel_to_json is internal: the shoot day functions call it as its owner.)
reset role;
select extensions.is(
  (select public.shoot_reel_to_json(null::public.shoot_day_reels, s, true)->>'set' from public.scripts s
   where s.id = '40000000-0000-4000-8000-0000000000e1'),
  'Kitchen counter', 'a shoot day shows the set''s name'
);
select extensions.is(
  (select public.shoot_reel_to_json(null::public.shoot_day_reels, s, true)->'talent'->>0 from public.scripts s
   where s.id = '40000000-0000-4000-8000-0000000000e1'),
  'Yasmine', 'a shoot day shows the talent''s name'
);

set local role authenticated;
-- Ideas name their talent.
insert into public.concepts (workspace_id, client_id, title, talent) values
  ('10000000-0000-4000-8000-0000000000e1', 'c-t', 'Before and after', '{20000000-0000-4000-8000-0000000000e1}');
select extensions.is((select cardinality(talent) from public.concepts where title = 'Before and after'), 1, 'an idea names its talent');

-- Another studio sees no sets.
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e5', 'stranger@other.test');
select extensions.is((select count(*)::int from public.project_sets), 0, 'another studio reads no sets');

reset role;
select * from extensions.finish();
rollback;
