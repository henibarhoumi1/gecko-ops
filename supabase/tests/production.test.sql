begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(22);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'sara@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'amir@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'lina@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder');
insert into public.clients(workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000001', 'c-dc', 'Synthetic Clean'),
  ('10000000-0000-4000-8000-000000000001', 'c-other', 'Synthetic Other');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.codes (who text primary key, code text);
create table pg_temp.ids (who text primary key, id uuid);
grant all on pg_temp.codes, pg_temp.ids to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
insert into pg_temp.codes values
  ('sara', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'sara@client.test', 'owner')),
  ('amir', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'amir@client.test', 'approver')),
  ('lina', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'lina@client.test', 'viewer'));
select public.set_production_budget('10000000-0000-4000-8000-000000000001', 'c-dc', 1300, 'Talent and the Airbnb');
insert into pg_temp.ids values
  ('model', public.save_production_option('10000000-0000-4000-8000-000000000001', 'c-dc',
    '{"kind":"talent","name":"Yasmine","role":"main","cost":400,"privateNotes":"phone 00 000 000"}')),
  ('flat', public.save_production_option('10000000-0000-4000-8000-000000000001', 'c-dc',
    '{"kind":"location","name":"Sunny flat, La Marsa","cost":700}')),
  ('extra', public.save_production_option('10000000-0000-4000-8000-000000000001', 'c-dc',
    '{"kind":"talent","name":"Karim","role":"extra","cost":300}')),
  ('mop', public.save_production_option('10000000-0000-4000-8000-000000000001', 'c-dc',
    '{"kind":"prop","name":"Their own mop","cost":900,"boughtBy":"client"}'));

select extensions.throws_ok(
  $$select public.save_production_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      '{"kind":"talent","name":"Bad","photos":["10000000-0000-4000-8000-000000000001/c-other/x.jpg"]}')$$,
  'invalid_option', 'a photo from another client''s folder is refused'
);
select extensions.throws_ok(
  $$select public.set_production_status('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'model'), 'booked')$$,
  'not_approved_yet', 'Gecko cannot book what the client has not approved'
);
select extensions.is(
  (public.get_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'options'->0->>'privateNotes') is not null,
  true, 'the team sees its private notes'
);

-- Sara, the owner
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sara'), 'Sara');
select extensions.is(
  (select count(*)::int from jsonb_array_elements(public.get_my_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'options') o
   where o ? 'privateNotes' and o->>'privateNotes' is not null),
  0, 'the client never sees Gecko''s private notes'
);
select extensions.is(
  (public.get_my_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'budget'->>'cap')::numeric,
  1300::numeric, 'the owner sees the budget'
);
select extensions.lives_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'model'), 'approve', 'Love her')$$,
  'the owner approves talent inside the budget'
);
select extensions.is(
  (public.get_my_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'budget'->>'committed')::numeric,
  400::numeric, 'the approved fee counts against the budget'
);
select extensions.throws_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'model'), 'approve', '')$$,
  'not_waiting', 'approving twice is refused'
);
select extensions.lives_ok(
  $$select public.client_comment_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'flat'), 'Is there parking?')$$,
  'the client asks a question on a location'
);
select extensions.throws_ok(
  $$select public.client_suggest_option('10000000-0000-4000-8000-000000000001', 'c-dc', 'talent', 'Someone', '', '',
      array['10000000-0000-4000-8000-000000000001/c-other/x.jpg'])$$,
  'invalid_option', 'a suggestion cannot point at another client''s photos'
);
select extensions.lives_ok(
  $$select public.client_suggest_option('10000000-0000-4000-8000-000000000001', 'c-dc', 'talent', 'My cousin Ines', 'She acts', '', null)$$,
  'the client suggests someone'
);

-- Amir, an approver: inside the budget yes, over it no
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'amir@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'amir'), 'Amir');
select extensions.lives_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'flat'), 'approve', '')$$,
  'an approver approves a location inside the budget (400 + 700 of 1300)'
);
select extensions.throws_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'extra'), 'approve', '')$$,
  'over_budget', 'going over asks for an explicit over-budget approval'
);
select extensions.throws_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'extra'), 'approve', '', true)$$,
  'over_budget_owner', 'an approver cannot approve over the budget'
);
select extensions.lives_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'mop'), 'approve', '')$$,
  'a prop the client brings stays off the budget, so it is never over'
);

-- Lina, a viewer
select pg_temp.act_as('00000000-0000-4000-8000-000000000008', 'lina@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'lina'), 'Lina');
select extensions.is(
  public.get_my_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'budget',
  'null'::jsonb, 'a viewer does not see the budget'
);
select extensions.is(
  public.get_my_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'options'->0->'cost',
  'null'::jsonb, 'or what anything costs'
);
select extensions.throws_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'extra'), 'pass', '')$$,
  'spend_approver_only', 'a viewer cannot decide'
);

-- Sara goes over the budget on purpose
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select extensions.lives_ok(
  $$select public.client_decide_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'extra'), 'approve', 'Worth it', true)$$,
  'the owner approves over the budget'
);

-- Gecko changes a cost after the yes: it goes back to the client
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select public.save_production_option('10000000-0000-4000-8000-000000000001', 'c-dc',
  jsonb_build_object('id', (select id from pg_temp.ids where who = 'model'), 'kind', 'talent', 'name', 'Yasmine', 'role', 'main', 'cost', 450));
select extensions.is(
  (select o->>'status' from jsonb_array_elements(public.get_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'options') o
   where o->>'name' = 'Yasmine'),
  'proposed', 'a new cost needs a new yes'
);
select extensions.throws_ok(
  $$select public.delete_production_option('10000000-0000-4000-8000-000000000001', 'c-dc',
      (select id from pg_temp.ids where who = 'flat'))$$,
  'option_committed', 'an approved cost cannot be deleted'
);
select extensions.is(
  (select count(*)::int from jsonb_array_elements(public.get_production('10000000-0000-4000-8000-000000000001', 'c-dc')->'options') o,
     jsonb_array_elements(o->'notes') n where n->>'kind' = 'approve'),
  4, 'every yes is on record, with who and how much'
);

select * from extensions.finish();
rollback;
