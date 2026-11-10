begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000d01', 'authenticated', 'authenticated', 'founder@ph.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000d02', 'authenticated', 'authenticated', 'editor@ph.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000d03', 'authenticated', 'authenticated', 'owner@ph.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000d01', 'PH GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000d01', 'founder', '00000000-0000-4000-8000-000000000d01', 'founder@ph.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000d01', 'editor', '00000000-0000-4000-8000-000000000d02', 'editor@ph.test', 'Eya', 'editor');
insert into public.leads (workspace_id, id, brand, stage) values ('10000000-0000-4000-8000-000000000d01', 'lead-1', 'Juice Co', 'qualified');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000d01', 'c-p', 'History Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000d01', 'c-p', 'owner@ph.test', 'Olfa', '00000000-0000-4000-8000-000000000d03', now(), '00000000-0000-4000-8000-000000000d01', 'owner');
insert into public.concepts (workspace_id, client_id, title, status, author_name) values
  ('10000000-0000-4000-8000-000000000d01', 'c-p', 'Shared idea', 'review', 'Heni'),
  ('10000000-0000-4000-8000-000000000d01', 'c-p', 'Team draft idea', 'draft', 'Heni');
insert into public.tasks (workspace_id, client_id, title, private, done_at, done_by_name) values
  ('10000000-0000-4000-8000-000000000d01', 'c-p', 'Shared task', false, now(), 'Olfa'),
  ('10000000-0000-4000-8000-000000000d01', 'c-p', 'Private task', true, now(), 'Heni');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;
create table pg_temp.vals (k text primary key, v text);
grant all on pg_temp.vals to authenticated, anon;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000d01');
insert into pg_temp.vals values ('p', public.save_proposal('10000000-0000-4000-8000-000000000d01', 'lead-1', null,
  '{"plan": "test", "price": 999, "intro": "Three reels to test"}')::text);
select extensions.is(
  (select p->>'author' from jsonb_array_elements(public.get_lead_proposals('10000000-0000-4000-8000-000000000d01', 'lead-1')) p),
  'Heni', 'the founder writes a proposal for a lead');
select extensions.throws_ok(
  $$select public.save_proposal('10000000-0000-4000-8000-000000000d01', 'nope', null, '{}')$$, 'lead_not_found',
  'only for a lead that exists');
select extensions.throws_ok(
  $$select public.save_proposal('10000000-0000-4000-8000-000000000d01', 'lead-1', null, '[]')$$, 'invalid_proposal',
  'the content is an object');
insert into pg_temp.vals values ('token', public.create_proposal_link('10000000-0000-4000-8000-000000000d01',
  (select v::uuid from pg_temp.vals where k = 'p')));
select extensions.is(length((select v from pg_temp.vals where k = 'token')), 64, 'the link token is long and random');
reset role;
select extensions.is((select stage from public.leads where id = 'lead-1'), 'proposal_sent', 'sending moves the lead on');
select extensions.is((select count(*)::int from public.proposals where token_hash is not null), 1, 'only the hash is kept');
set local role authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-000000000d02');
select extensions.throws_ok(
  $$select public.get_lead_proposals('10000000-0000-4000-8000-000000000d01', 'lead-1')$$, 'forbidden',
  'an editor doesn''t see proposals');

-- The brand, without an account.
reset role;
set local role anon;
select set_config('request.jwt.claims', '', true);
select set_config('request.jwt.claim.sub', '', true);
select extensions.is(
  (public.get_proposal_by_link((select v from pg_temp.vals where k = 'token')))->>'brand', 'Juice Co',
  'the link opens the proposal');
select extensions.throws_ok($$select public.get_proposal_by_link(repeat('a', 64))$$, 'link_expired',
  'a wrong token opens nothing');
select extensions.throws_ok(
  $$select public.accept_proposal_by_link((select v from pg_temp.vals where k = 'token'), ' ')$$, 'name_required',
  'accepting needs a name');
select extensions.lives_ok(
  $$select public.accept_proposal_by_link((select v from pg_temp.vals where k = 'token'), 'Sami Ben Ali')$$,
  'the brand accepts');
reset role;
select extensions.is((select stage from public.leads where id = 'lead-1'), 'accepted', 'the lead is accepted');
select extensions.is(
  (select row(views, accepted_name)::text from public.proposals), '(1,"Sami Ben Ali")', 'the visit and the name are kept');
select extensions.ok(
  (select log @> '[{"text": "Accepted the proposal", "who": "Sami Ben Ali"}]' from public.leads where id = 'lead-1'),
  'the lead''s log says who accepted');
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000d01');
select extensions.throws_ok(
  $$select public.save_proposal('10000000-0000-4000-8000-000000000d01', 'lead-1', (select v::uuid from pg_temp.vals where k = 'p'), '{}')$$,
  'proposal_not_found', 'an accepted proposal no longer changes');

select extensions.lives_ok(
  $$select public.remove_proposal('10000000-0000-4000-8000-000000000d01', (select v::uuid from pg_temp.vals where k = 'p'))$$,
  'a proposal can be removed (into the trash)');

-- History.
select extensions.is(
  (select count(*)::int from jsonb_array_elements(public.get_client_history('10000000-0000-4000-8000-000000000d01', 'c-p'))),
  4, 'the team sees every event');
select pg_temp.act_as('00000000-0000-4000-8000-000000000d03');
select extensions.is(
  (select string_agg(h->>'title', ',' order by h->>'title') from jsonb_array_elements(public.get_client_history('10000000-0000-4000-8000-000000000d01', 'c-p')) h),
  'Shared idea,Shared task', 'the client sees no team drafts and no private tasks');
select pg_temp.act_as('00000000-0000-4000-8000-000000000d02');
select extensions.throws_ok(
  $$select public.get_client_history('10000000-0000-4000-8000-000000000d01', 'c-p')$$, 'forbidden',
  'someone without access to the client sees nothing');
select pg_temp.act_as('00000000-0000-4000-8000-000000000d01');
select extensions.is(
  jsonb_array_length(public.team_preview('10000000-0000-4000-8000-000000000d01', 'c-p', 'owner', 'history')), 2,
  'View as client shows the client''s history');

select * from extensions.finish();
rollback;
