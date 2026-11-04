begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated', 'founder@today.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000302', 'authenticated', 'authenticated', 'editor@today.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000303', 'authenticated', 'authenticated', 'owner@today.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000304', 'authenticated', 'authenticated', 'viewer@today.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000301', 'Today GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000301', 'founder', '00000000-0000-4000-8000-000000000301', 'founder@today.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000301', 'editor', '00000000-0000-4000-8000-000000000302', 'editor@today.test', 'Editor', 'editor');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000301', 'c-td', 'Today Brand');
insert into public.client_portals (workspace_id, client_id, campaign, shoot_date, milestones) values
  ('10000000-0000-4000-8000-000000000301', 'c-td', 'Spring', current_date + 3,
   jsonb_build_array(jsonb_build_object('label', 'Scripts approved', 'date', (current_date + 1)::text, 'done', false),
                     jsonb_build_object('label', 'Old and done', 'date', (current_date + 2)::text, 'done', true)));
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000301', 'c-td', 'owner@today.test', 'Olfa', '00000000-0000-4000-8000-000000000303', now() - interval '2 days', '00000000-0000-4000-8000-000000000301', 'owner'),
  ('10000000-0000-4000-8000-000000000301', 'c-td', 'viewer@today.test', 'Sami', '00000000-0000-4000-8000-000000000304', now() - interval '2 days', '00000000-0000-4000-8000-000000000301', 'viewer');

-- What the team and the client did: one idea sent back with changes, one with an unanswered comment,
-- one script waiting for the client.
insert into public.concepts (id, workspace_id, client_id, title, body, status, position) values
  ('20000000-0000-4000-8000-000000000301', '10000000-0000-4000-8000-000000000301', 'c-td', 'Morning rush', 'Hook', 'review', 0),
  ('20000000-0000-4000-8000-000000000302', '10000000-0000-4000-8000-000000000301', 'c-td', 'Night shift', 'Hook', 'review', 1);
insert into public.scripts (workspace_id, client_id, title, status) values
  ('10000000-0000-4000-8000-000000000301', 'c-td', 'Script one', 'review');
insert into public.leads (workspace_id, id, brand, stage, channel, next_step, next_date, extra) values
  ('10000000-0000-4000-8000-000000000301', 'web-1', 'Lead Brand', 'prospect', 'Website', 'Reply to the website brief',
   current_date, '{"source":"website","form":"brief","person":"Amine"}');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

set local role authenticated;

-- The client asks for changes on one idea and comments on the other.
select pg_temp.act_as('00000000-0000-4000-8000-000000000303');
select public.client_concept_note('10000000-0000-4000-8000-000000000301', 'c-td',
  '20000000-0000-4000-8000-000000000301', 'changes', 'Shorter please', 1);
select public.client_concept_note('10000000-0000-4000-8000-000000000301', 'c-td',
  '20000000-0000-4000-8000-000000000302', 'comment', 'Can we use our shop?', 1);

-- ---------- Today ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000301');
select set_config('t.today', public.get_today('10000000-0000-4000-8000-000000000301')::text, true);

select extensions.ok(
  current_setting('t.today')::jsonb->'us' @> '[{"why":"changes","title":"Morning rush","body":"Shorter please"}]',
  'a change request is waiting on the team, with what the client said'
);
select extensions.ok(
  current_setting('t.today')::jsonb->'us' @> '[{"why":"comment","title":"Night shift"}]',
  'an unanswered client comment is waiting on the team'
);
select extensions.ok(
  current_setting('t.today')::jsonb->'client' @> '[{"part":"script","title":"Script one"}]'
  and current_setting('t.today')::jsonb->'client' @> '[{"part":"concept","title":"Night shift"}]',
  'what was sent for approval is waiting on the client'
);
select extensions.ok(
  current_setting('t.today')::jsonb->'dates' @> jsonb_build_array(
    jsonb_build_object('kind', 'shoot', 'date', (current_date + 3)::text),
    jsonb_build_object('kind', 'drafts', 'date', (current_date + 10)::text)),
  'the shoot and the first drafts 7 days later are coming up'
);
select extensions.ok(
  current_setting('t.today')::jsonb->'dates' @> '[{"kind":"milestone","label":"Scripts approved"}]'
  and not (current_setting('t.today')::jsonb->'dates' @> '[{"label":"Old and done"}]'),
  'unfinished milestones show, finished ones do not'
);
select extensions.ok(
  current_setting('t.today')::jsonb->'dates' @> '[{"kind":"lead","brand":"Lead Brand"}]'
  and current_setting('t.today')::jsonb->'leads' @> '[{"brand":"Lead Brand","person":"Amine"}]',
  'website leads and their follow-ups show'
);

-- A team reply clears the comment.
reset role;
insert into public.concept_notes (workspace_id, client_id, concept_id, kind, from_client, author_name, body, created_at) values
  ('10000000-0000-4000-8000-000000000301', 'c-td', '20000000-0000-4000-8000-000000000302', 'comment', false, 'Heni', 'Yes',
   now() + interval '1 second');
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000301');
select extensions.ok(
  not (public.get_today('10000000-0000-4000-8000-000000000301')->'us' @> '[{"why":"comment"}]'),
  'once the team answers, the comment leaves the list'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000302');
select extensions.throws_ok($$select public.get_today('10000000-0000-4000-8000-000000000301')$$,
  'forbidden', 'an editor cannot read Today');
select pg_temp.act_as('00000000-0000-4000-8000-000000000303');
select extensions.throws_ok($$select public.get_today('10000000-0000-4000-8000-000000000301')$$,
  'forbidden', 'a client cannot read Today');

-- ---------- New since your last visit ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000303');
select set_config('t.visit', public.client_portal_visit('10000000-0000-4000-8000-000000000301', 'c-td')::text, true);
select extensions.ok(
  (current_setting('t.visit')::jsonb->>'since')::timestamptz < now() - interval '1 day',
  'on the first visit, "since" is when the client joined'
);
select extensions.is((current_setting('t.visit')::jsonb->>'ideas')::int, 1, 'one new idea to look at');
select extensions.is((current_setting('t.visit')::jsonb->>'scripts')::int, 1, 'one new script to look at');
select extensions.is((current_setting('t.visit')::jsonb->>'replies')::int, 1, 'one reply from the team');
select extensions.is(
  public.client_portal_visit('10000000-0000-4000-8000-000000000301', 'c-td')->>'since',
  current_setting('t.visit')::jsonb->>'since',
  'refreshing straight away keeps the same "since"'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000304');
select extensions.is(
  (public.client_portal_visit('10000000-0000-4000-8000-000000000301', 'c-td')->>'invoices')::int, 0,
  'a viewer is never told about invoices'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000301');
select extensions.throws_ok($$select public.client_portal_visit('10000000-0000-4000-8000-000000000301', 'c-td')$$,
  'forbidden', 'the team (or a preview) never records a client visit');

select * from extensions.finish();
rollback;
