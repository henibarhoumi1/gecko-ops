begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(31);

-- A founder, an assigned editor, an editor without access, and the client's owner and viewer.
insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000a01', 'authenticated', 'authenticated', 'founder@day.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000a02', 'authenticated', 'authenticated', 'editor@day.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000a03', 'authenticated', 'authenticated', 'other@day.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000a04', 'authenticated', 'authenticated', 'owner@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000a05', 'authenticated', 'authenticated', 'viewer@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000a01', 'Day GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000a01', 'founder', '00000000-0000-4000-8000-000000000a01', 'founder@day.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000a01', 'ed', '00000000-0000-4000-8000-000000000a02', 'editor@day.test', 'Sami', 'editor'),
  ('10000000-0000-4000-8000-000000000a01', 'ed2', '00000000-0000-4000-8000-000000000a03', 'other@day.test', 'Nour', 'editor');
insert into public.clients (workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000a01', 'c-day', 'Day Brand'),
  ('10000000-0000-4000-8000-000000000a01', 'c-else', 'Else Brand');
insert into public.client_assignments (workspace_id, client_id, member_id) values
  ('10000000-0000-4000-8000-000000000a01', 'c-day', 'ed');
-- One script the client approved, one draft the client hasn't seen, one of another client.
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, beats, cta, status, version, approved_version, approved_at, approved_by, hook) values
  ('30000000-0000-4000-8000-000000000a01', '10000000-0000-4000-8000-000000000a01', 'c-day', 'Mother-in-law', 'skit',
   '[{"hear":"She is coming in ten minutes."}]', '[{"hear":"One pack, the whole house.","part":"body"}]', 'Order today', 'approved', 1, 1, now(), 'Owner', 0);
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, status) values
  ('30000000-0000-4000-8000-000000000a02', '10000000-0000-4000-8000-000000000a01', 'c-day', 'Secret draft', 'demo',
   '[{"hear":"Not for the client yet"}]', 'draft'),
  ('30000000-0000-4000-8000-000000000a03', '10000000-0000-4000-8000-000000000a01', 'c-else', 'Other client', 'demo', '[]', 'draft');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.codes (who text primary key, code text);
create table pg_temp.ids (who text primary key, id uuid);
grant all on pg_temp.codes, pg_temp.ids to authenticated;

select extensions.ok(
  not has_function_privilege('authenticated', 'public.shoot_day_to_json(public.shoot_days, boolean)', 'execute')
  and not has_function_privilege('authenticated', 'public.shoot_actor(uuid, text, text)', 'execute'),
  'the read helpers can only be used from inside the checked functions'
);

set local role authenticated;
select extensions.throws_ok(
  $$select public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')$$,
  'authentication_required', 'nobody signed out reads a shoot day'
);

-- The founder plans the day.
select pg_temp.act_as('00000000-0000-4000-8000-000000000a01', 'founder@day.test');
insert into pg_temp.codes values
  ('owner', public.invite_client_account('10000000-0000-4000-8000-000000000a01', 'c-day', 'owner@client.test', 'owner')),
  ('viewer', public.invite_client_account('10000000-0000-4000-8000-000000000a01', 'c-day', 'viewer@client.test', 'viewer'));
insert into pg_temp.ids values ('day', public.save_shoot_day('10000000-0000-4000-8000-000000000a01', 'c-day',
  '{"day":"2026-11-25","title":"Day 1","callTime":"08:30","wrapTime":"18:00","place":"Studio","mapLink":"https://maps.example/x","notes":"Bring the blue mop","privateNotes":"DOP rate 300"}'));
insert into pg_temp.ids values ('dop', public.save_shoot_person('10000000-0000-4000-8000-000000000a01', 'c-day',
  (select id from pg_temp.ids where who = 'day'), '{"name":"Ali","role":"DOP","side":"crew","callTime":"07:45","phone":"+216 00 000 000"}'));
select extensions.lives_ok(
  $$select public.set_shoot_reels('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'),
      array['30000000-0000-4000-8000-000000000a01', '30000000-0000-4000-8000-000000000a02']::uuid[])$$,
  'the founder puts two scripts on the day'
);
insert into pg_temp.ids select 'reel', r.id from public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day') g,
  jsonb_to_recordset(g->'days'->0->'reels') as r(id uuid, "scriptId" uuid)
  where r."scriptId" = '30000000-0000-4000-8000-000000000a01';
select extensions.is(
  public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'days'->0->>'callTime', '08:30',
  'the call time reads as HH:MM'
);
select extensions.throws_ok(
  $$select public.save_shoot_day('10000000-0000-4000-8000-000000000a01', 'c-day', '{"day":"2026-11-25","callTime":"25:99"}')$$,
  'invalid_shoot_day', 'an impossible time is refused'
);
select extensions.throws_ok(
  $$select public.save_shoot_day('10000000-0000-4000-8000-000000000a01', 'c-day', '{"title":"No date"}')$$,
  'invalid_shoot_day', 'a day needs a date'
);
select extensions.throws_ok(
  $$select public.set_shoot_reels('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'),
      array['30000000-0000-4000-8000-000000000a03']::uuid[])$$,
  'script_not_found', 'another client''s script can''t go on this day'
);
select extensions.is(
  jsonb_array_length(public.get_team_shoots('10000000-0000-4000-8000-000000000a01')), 1,
  'the founder''s shoots list shows the day'
);

-- An editor with access ticks reels but doesn't plan.
select pg_temp.act_as('00000000-0000-4000-8000-000000000a02', 'editor@day.test');
select extensions.is(
  (public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->>'canPlan')::boolean, false,
  'an editor does not plan the day'
);
select extensions.lives_ok(
  $$select public.update_shoot_reel('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'reel'),
      '{"status":"shooting","note":"Take 3 is the one"}')$$,
  'an editor marks a reel as being shot'
);
select extensions.throws_ok(
  $$select public.save_shoot_day('10000000-0000-4000-8000-000000000a01', 'c-day', '{"day":"2026-11-26"}')$$,
  'forbidden', 'an editor cannot add a day'
);

-- An editor without access sees nothing.
select pg_temp.act_as('00000000-0000-4000-8000-000000000a03', 'other@day.test');
select extensions.throws_ok(
  $$select public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')$$,
  'forbidden', 'an editor without the client cannot read its shoot days'
);
select extensions.is(
  jsonb_array_length(public.get_team_shoots('10000000-0000-4000-8000-000000000a01')), 0,
  'nor does the day appear in their shoots list'
);

-- The client's owner.
select pg_temp.act_as('00000000-0000-4000-8000-000000000a04', 'owner@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'owner'), 'Sara');
select extensions.is(
  public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'days'->0->'privateNotes', 'null'::jsonb,
  'the client never sees Gecko''s private notes'
);
select extensions.is(
  public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'days'->0->'people'->0->'phone', 'null'::jsonb,
  'the client never sees crew phone numbers'
);
select extensions.is(
  (select string_agg(r->>'title' || ':' || (r->>'shared') || ':' || jsonb_array_length(r->'hooks'), ',' order by r->>'title')
   from jsonb_array_elements(public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'days'->0->'reels') r),
  'Mother-in-law:true:1,Secret draft:false:0',
  'the client reads the lines of a sent script, and only the title of a draft'
);
select extensions.is(
  public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'scripts', '[]'::jsonb,
  'the client does not get the planning list of scripts'
);
select extensions.lives_ok(
  $$select public.update_shoot_reel('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'reel'),
      '{"status":"done","linesDone":["hook-0","beat-0","hook-0"],"lineChanges":{"cta":"Order it today"}}')$$,
  'the owner ticks a reel done on set'
);
reset role;
select extensions.is(
  (select array_to_string(lines_done, ',') || '|' || (line_changes->>'cta') || '|' || updated_by_name
   from public.shoot_day_reels where id = (select id from pg_temp.ids where who = 'reel')),
  'beat-0,hook-0|Order it today|Sara',
  'lines read are kept once each, with the words said on set and who ticked'
);
set local role authenticated;
select extensions.throws_ok(
  $$select public.update_shoot_reel('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'reel'),
      '{"linesDone":["line-7"]}')$$,
  'invalid_reel', 'an unknown line key is refused'
);
select extensions.throws_ok(
  $$select public.update_shoot_reel('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'reel'),
      '{"status":"wrapped"}')$$,
  'invalid_reel', 'an unknown status is refused'
);
select extensions.throws_ok(
  $$select public.set_shoot_reels('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'), '{}')$$,
  'forbidden', 'the client does not plan the day'
);
select extensions.lives_ok(
  $$select public.add_shoot_log('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'), 'Arrived, parking at the back')$$,
  'the owner writes in the day''s log'
);

-- The client's viewer reads and writes in the log, and doesn't tick.
select pg_temp.act_as('00000000-0000-4000-8000-000000000a05', 'viewer@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'viewer'), 'Lina');
select extensions.throws_ok(
  $$select public.update_shoot_reel('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'reel'), '{"status":"todo"}')$$,
  'shoot_tick_not_allowed', 'a viewer cannot tick reels'
);
select extensions.lives_ok(
  $$select public.add_shoot_log('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'), 'Looks great')$$,
  'a viewer writes in the log'
);

-- Back to the founder: a shot reel stays on the day; removing a day keeps it.
select pg_temp.act_as('00000000-0000-4000-8000-000000000a01', 'founder@day.test');
select extensions.throws_ok(
  $$select public.set_shoot_reels('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'),
      array['30000000-0000-4000-8000-000000000a02']::uuid[])$$,
  'reel_shot', 'a reel already shot cannot be taken off the day'
);
select extensions.is(
  (select string_agg(l->>'body' || ':' || (l->>'fromClient'), ',' order by l->>'body')
   from jsonb_array_elements(public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'days'->0->'log') l),
  'Arrived, parking at the back:true,Looks great:true',
  'the team reads the client''s log notes'
);
select public.remove_shoot_day('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'));
select extensions.is(
  jsonb_array_length(public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'days'), 0,
  'a removed day leaves the page'
);
select public.restore_shoot_day('10000000-0000-4000-8000-000000000a01', 'c-day', (select id from pg_temp.ids where who = 'day'));
select extensions.is(
  jsonb_array_length(public.get_shoot_days('10000000-0000-4000-8000-000000000a01', 'c-day')->'days'->0->'reels'), 2,
  'a restored day comes back with its reels'
);

-- View as client, as a viewer: the client's rules, read-only.
select extensions.is(
  (select (g->>'canTick') || '|' || (g->'days'->0->'privateNotes')::text
   from public.team_preview('10000000-0000-4000-8000-000000000a01', 'c-day', 'viewer', 'shoot') g),
  'false|null',
  'View as client shows shoot days with the client''s rules'
);

select * from extensions.finish();
rollback;
