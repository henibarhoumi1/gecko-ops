begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000201', 'authenticated', 'authenticated', 'founder@alerts.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000202', 'authenticated', 'authenticated', 'editor@alerts.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000203', 'authenticated', 'authenticated', 'owner@alerts.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000204', 'authenticated', 'authenticated', 'stranger@alerts.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000201', 'Alerts GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000201', 'founder', '00000000-0000-4000-8000-000000000201', 'founder@alerts.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000201', 'editor', '00000000-0000-4000-8000-000000000202', 'editor@alerts.test', 'Editor', 'editor');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000201', 'c-al', 'Alert Brand');
insert into public.client_portals (workspace_id, client_id, campaign) values ('10000000-0000-4000-8000-000000000201', 'c-al', 'Spring');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000201', 'c-al', 'owner@alerts.test', 'Olfa', '00000000-0000-4000-8000-000000000203', now(), '00000000-0000-4000-8000-000000000201', 'owner');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

select pg_temp.act_as('00000000-0000-4000-8000-000000000201');
insert into public.concepts (workspace_id, client_id, title, body, status, position)
values ('10000000-0000-4000-8000-000000000201', 'c-al', 'Morning rush', 'Hook', 'review', 0);
select set_config('alerts.concept', id::text, true) || set_config('alerts.version', version::text, true)
from public.concepts where title = 'Morning rush';

set local role authenticated;

-- The client approves an idea and hits two errors.
select pg_temp.act_as('00000000-0000-4000-8000-000000000203');
select public.client_concept_note('10000000-0000-4000-8000-000000000201', 'c-al',
  current_setting('alerts.concept')::uuid, 'approve', '', current_setting('alerts.version')::integer);
select extensions.lives_ok(
  $$select public.report_client_error('10000000-0000-4000-8000-000000000201', 'c-al', 'crash', 'boom on Scripts', '/scripts')$$,
  'a client can report an error'
);
select public.report_client_error(null, null, 'request', 'failed to load', '/');
select extensions.lives_ok(
  $$select public.report_client_error('10000000-0000-4000-8000-000000000201', 'c-al', 'nonsense', repeat('x', 900), repeat('/p', 400))$$,
  'odd input is accepted without failing'
);
select extensions.throws_ok(
  $$select count(*) from public.client_errors$$,
  '42501', null, 'nobody reads the table directly'
);
select extensions.throws_ok(
  $$select public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)$$,
  'P0001', 'forbidden', 'a client cannot read the alerts'
);

-- Someone outside the brand can't file errors under it.
select pg_temp.act_as('00000000-0000-4000-8000-000000000204');
select public.report_client_error('10000000-0000-4000-8000-000000000201', 'c-al', 'crash', 'not mine', '/');

select pg_temp.act_as('00000000-0000-4000-8000-000000000202');
select extensions.throws_ok(
  $$select public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)$$,
  'P0001', 'forbidden', 'an editor cannot read the alerts'
);
select extensions.throws_ok(
  $$select public.mark_client_errors_seen('10000000-0000-4000-8000-000000000201')$$,
  'P0001', 'forbidden', 'an editor cannot clear the alerts'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000201');
select extensions.is(
  jsonb_array_length(public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)->'errors'),
  3, 'the founder sees the client''s three errors, and not the stranger''s'
);
select extensions.is(
  (select count(*)::int from jsonb_array_elements(public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)->'errors') e
   where (e->>'from_client')::boolean and e->>'brand' = 'Alert Brand'),
  3, 'all three are marked as from the client, under the brand (even the one sent without a brand)'
);
select extensions.is(
  (select max(length(e->>'message')) from jsonb_array_elements(public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)->'errors') e),
  500, 'long messages are cut to 500 characters'
);
select extensions.is(
  (select e->>'area' from jsonb_array_elements(public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)->'errors') e
   where length(e->>'message') = 500),
  'unexpected', 'an unknown kind of error is filed as unexpected'
);
select extensions.is(
  (select a->>'kind' || ' ' || (a->>'part') || ' ' || (a->>'title')
   from jsonb_array_elements(public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)->'activity') a),
  'approve concept Morning rush', 'the founder sees what the client approved'
);
select public.mark_client_errors_seen('10000000-0000-4000-8000-000000000201');
select extensions.is(
  (select bool_and((e->>'seen')::boolean) from jsonb_array_elements(public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)->'errors') e),
  true, 'the founder can mark the errors as seen'
);

-- A crash loop can't fill the table: 30 reports per person per hour.
select pg_temp.act_as('00000000-0000-4000-8000-000000000203');
select public.report_client_error('10000000-0000-4000-8000-000000000201', 'c-al', 'crash', 'loop ' || g, '/')
from generate_series(1, 40) g;
select pg_temp.act_as('00000000-0000-4000-8000-000000000201');
select extensions.is(
  jsonb_array_length(public.get_client_alerts('10000000-0000-4000-8000-000000000201', 7)->'errors'),
  30, 'at most 30 reports per person per hour are kept'
);

-- Signed out, nothing is recorded and nothing fails.
select set_config('request.jwt.claim.sub', '', true), set_config('request.jwt.claims', '', true);
select extensions.lives_ok(
  $$select public.report_client_error(null, null, 'crash', 'anon', '/')$$,
  'a report without a sign-in is ignored quietly'
);

select * from extensions.finish();
rollback;
