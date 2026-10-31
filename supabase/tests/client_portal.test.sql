begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(31);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sales@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'dany@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'farah@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'stranger@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'gone@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Editor', 'editor'),
  ('10000000-0000-4000-8000-000000000001', 'sales', '00000000-0000-4000-8000-000000000004', 'sales@local.test', 'Sales', 'sales');
insert into public.clients(workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Dany Clean'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'RareRich');
insert into public.client_accounts(workspace_id, client_id, email, display_name, user_id, accepted_at, revoked_at, invited_by) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'dany@client.test', 'Dany', '00000000-0000-4000-8000-000000000006', now(), null, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'farah@client.test', 'Farah', '00000000-0000-4000-8000-000000000007', now(), null, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'gone@client.test', 'Gone', '00000000-0000-4000-8000-000000000009', now(), now(), '00000000-0000-4000-8000-000000000001');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

-- ---------- the team, through the tables ----------
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.lives_ok(
  $$insert into public.client_portals(workspace_id, client_id, campaign, included, shoot_date, milestones, price)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Test campaign', '{"15 edited reels","1 carousel"}',
      '2026-11-12', '[{"label":"Shoot","date":"2026-11-12","done":false}]', 1500)$$,
  'the founder sets up a client overview'
);
select extensions.throws_ok(
  $$insert into public.client_portals(workspace_id, client_id, milestones)
    values ('10000000-0000-4000-8000-000000000001', 'c-rare', '[{"label":"","date":"soon"}]')$$,
  '23514', null, 'a malformed milestone is refused'
);
select extensions.lives_ok(
  $$insert into public.concepts(workspace_id, client_id, title, body, status, position)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Draft only', 'not ready', 'draft', 0),
           ('10000000-0000-4000-8000-000000000001', 'c-dany', 'The spill test', 'Hook: a coffee spill', 'review', 1)$$,
  'the founder writes a draft and a concept for review'
);
select extensions.is(
  (select author_name || '/' || version::text || '/' || from_client::text from public.concepts where title = 'The spill test'),
  'Heni/1/false', 'the database records who wrote the concept'
);
select extensions.throws_ok(
  $$insert into public.concepts(workspace_id, client_id, title, status)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Pre-approved', 'approved')$$,
  'P0001', 'client_only', 'the team cannot create an approved concept'
);
select extensions.throws_ok(
  $$update public.concepts set status = 'approved' where title = 'The spill test'$$,
  'P0001', 'client_only', 'the team cannot approve on the client''s behalf'
);
select extensions.lives_ok(
  $$insert into public.concept_notes(workspace_id, client_id, concept_id, body)
    select workspace_id, client_id, id, 'Shot list attached' from public.concepts where title = 'The spill test'$$,
  'the team comments on a concept'
);
select extensions.throws_ok(
  $$insert into public.concept_notes(workspace_id, client_id, concept_id, kind, from_client, body)
    select workspace_id, client_id, id, 'approve', true, '' from public.concepts where title = 'The spill test'$$,
  'P0001', 'client_only', 'the team cannot write an approval note'
);
select extensions.throws_ok(
  $$insert into public.concept_notes(workspace_id, client_id, concept_id, body)
    select workspace_id, 'c-rare', id, 'Wrong client' from public.concepts where title = 'The spill test'$$,
  'P0001', 'invalid_note', 'a note cannot be filed under another client'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.is((select count(*) from public.client_portals), 0::bigint, 'an editor cannot see the overview and its price');
select extensions.is((select count(*) from public.concepts), 0::bigint, 'an editor sees no concepts of clients they are not on');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is((select count(*) from public.concepts), 0::bigint, 'a client cannot read the concepts table directly');
select extensions.is((select count(*) from public.client_portals), 0::bigint, 'a client cannot read the overview table directly');
select extensions.throws_ok(
  $$insert into public.concepts(workspace_id, client_id, title) values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Sneaky')$$,
  '42501', null, 'a client cannot write the concepts table directly'
);
reset role;

-- ---------- the client, through the portal functions ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  (select jsonb_build_object('brand', p->'brand', 'me', p->'me', 'price', p->'overview'->'price',
     'titles', (select jsonb_agg(c->'title') from jsonb_array_elements(p->'concepts') c))
   from public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany') p),
  '{"brand":"Dany Clean","me":"Dany","price":1500.000,"titles":["The spill test"]}'::jsonb,
  'the client sees their overview and shared concepts, never drafts'
);
select extensions.is(
  (select jsonb_array_length(c->'notes') from public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany') p,
     jsonb_array_elements(p->'concepts') c),
  1, 'the client sees the team''s comments'
);
select extensions.throws_ok(
  $$select public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-rare')$$,
  'P0001', 'forbidden', 'a client cannot open another client''s portal'
);
select extensions.throws_ok(
  $$select public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      (select id from public.concepts where title = 'The spill test'), 'approve', '', 7)$$,
  'P0001', 'concept_changed', 'approving a version the client did not see is refused'
);
select extensions.throws_ok(
  $$select public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      (select id from public.concepts where title = 'Draft only'), 'comment', 'hi', 1)$$,
  'P0001', 'invalid_note', 'a client cannot reach a draft'
);
select extensions.throws_ok(
  $$select public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      (select id from public.concepts where title = 'The spill test'), 'changes', '   ', 1)$$,
  'P0001', 'invalid_note', 'asking for changes needs a note'
);
select extensions.is(
  (select r->>'status' || '/' || (r->>'approvedVersion') || '/' || (r->>'approvedBy')
   from public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      (select id from public.concepts where title = 'The spill test'), 'approve', 'Love it', 1) r),
  'approved/1/Dany', 'the client approves the version they read, on record'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
update public.concepts set body = 'Hook: a juice spill' where title = 'The spill test';
select extensions.is(
  (select status || '/' || version::text || '/' || coalesce(approved_by, 'none') from public.concepts where title = 'The spill test'),
  'review/2/none', 'editing an approved concept sends the new version back for approval'
);
select extensions.lives_ok($$delete from public.concept_notes where kind = 'approve'$$, 'deleting an approval note quietly does nothing');
select extensions.is((select count(*) from public.concept_notes where kind = 'approve'), 1::bigint, 'the client''s approval stays on record');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  (select r->>'status' from public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      (select id from public.concepts where title = 'The spill test'), 'changes', 'Use our blue bottle', 2) r),
  'changes', 'the client asks for changes on the new version'
);
select extensions.is(
  (select r->>'status' || '/' || (r->>'fromClient') from public.client_save_idea('10000000-0000-4000-8000-000000000001', 'c-dany',
      null, 'Mom vs stain', 'A mother and a tomato stain', '') r),
  'idea/true', 'the client adds an idea of their own'
);
select extensions.lives_ok(
  $$select public.client_save_idea('10000000-0000-4000-8000-000000000001', 'c-dany',
      (select id from public.concepts where title = 'Mom vs stain'), 'Mom vs the stain', 'Sharper', '')$$,
  'the client edits their own idea'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'farah@client.test');
select extensions.throws_ok(
  $$select public.client_save_idea('10000000-0000-4000-8000-000000000001', 'c-dany', null, 'Not mine', '', '')$$,
  'P0001', 'forbidden', 'another client cannot add ideas to Dany Clean'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000009', 'gone@client.test');
select extensions.throws_ok(
  $$select public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')$$,
  'P0001', 'forbidden', 'a revoked client account loses the portal'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000008', 'stranger@local.test');
select extensions.throws_ok(
  $$select public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      (select id from public.concepts where title = 'The spill test'), 'comment', 'hello', 1)$$,
  'P0001', 'forbidden', 'a stranger cannot comment'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.ok(
  public.client_delete_idea('10000000-0000-4000-8000-000000000001', 'c-dany',
    (select id from public.concepts where title = 'Mom vs the stain')),
  'the client removes their own idea'
);

select * from extensions.finish();
rollback;
