-- The fake portal used for the product film (web/e2e/film): an English version of fixtures.sql with an invented
-- brand, before and after the client approves a script and leaves a note on a preview. Never a real client.
-- Build: sh web/e2e/make-fixtures.sh web/e2e/film/fixtures.sql web/e2e/film/fixtures
\set ON_ERROR_STOP on
\pset format unaligned
\pset tuples_only on
\pset fieldsep '\t'
begin;

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000009a1', 'authenticated', 'authenticated', 'founder@phone.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000009a2', 'authenticated', 'authenticated', 'owner@phone.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-0000000009a1', 'Gecko');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000009a1', 'founder', '00000000-0000-4000-8000-0000000009a1', 'founder@phone.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Lumière Skincare');
insert into public.client_portals (workspace_id, client_id, campaign, summary, included, shoot_date, shoot_place, next_step, milestones, price, plan, reels) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Spring hydration launch',
   'Ten reels for the new hydration range: morning routines, before and after, testimonials and product demos, shot in one day in La Marsa.',
   array['10 vertical reels', '1 shoot day', 'FR and AR subtitles', 'One round of changes per reel'],
   current_date + 15, 'Daylight studio, La Marsa', 'Approve the last scripts before Friday.',
   jsonb_build_array(
     jsonb_build_object('label', 'Ideas approved', 'date', (current_date - 6)::text, 'done', true),
     jsonb_build_object('label', 'Scripts approved', 'date', (current_date + 4)::text, 'done', false),
     jsonb_build_object('label', 'Shoot day', 'date', (current_date + 15)::text, 'done', false),
     jsonb_build_object('label', 'First drafts', 'date', (current_date + 22)::text, 'done', false)),
   2900, 'regular', 10);
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'owner@phone.test', 'Yasmine Ben Abdallah', '00000000-0000-4000-8000-0000000009a2', now() - interval '5 days', '00000000-0000-4000-8000-0000000009a1', 'owner');

-- The brand questions are sent, so the client lands on Home (with New since your last visit).
insert into public.client_onboarding (workspace_id, client_id, data, sent_at) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', '{"brand":"Lumière"}', now() - interval '4 days');

insert into public.concepts (workspace_id, client_id, title, body, refs, status, position) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'The 7 a.m. routine', 'A busy mum, three products, thirty seconds. Texture in extreme close-up, the result in daylight.', 'https://www.instagram.com/reel/example', 'review', 0),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Before and after: winter skin', 'Split screen, same light, same frame. Day 1 and day 14.', '', 'review', 1),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'The tissue test', 'Product demo: proof the cream leaves no greasy film.', '', 'draft', 2);
insert into public.concepts (workspace_id, client_id, title, body, status, position, approved_version, approved_at, approved_by) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Founder interview: why Lumière', 'The founder tells the brand story to camera.', 'approved', 3, 1, now() - interval '3 days', 'Yasmine');

insert into public.scripts (workspace_id, client_id, title, style, seconds, goal, hooks, beats, cta, status, position) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Morning routine, 30 seconds', 'ugc', 30, 'Introduce the range and make people want the starter kit.',
   '[{"text":"My skin felt tight every morning. Until this."},{"text":"Three products. Thirty seconds. No excuses."},{"text":"My winter skin secret fits in my hand."}]',
   '[{"see":"Close-up of the bottle by the sink, morning light.","hear":"My skin felt tight every morning.","text":"Tight skin?"},{"see":"She applies the serum, texture in macro.","hear":"Serum first. It sinks in in ten seconds."},{"see":"The result by the window, she smiles.","hear":"Done. Ready.","text":"Starter kit -20%"}]',
   'Order the starter kit online', 'review', 0),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Before and after in 14 days', 'problem-fix', 20, 'Prove the result.', '[{"text":"Day 1. Day 14."}]',
   '[{"see":"Split screen.","hear":"Same light, same frame."}]', 'Discover the range', 'review', 1);

insert into public.cuts (workspace_id, client_id, title, status, version, position) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Morning routine, cut 1', 'review', 1, 0);
insert into public.cut_versions (cut_id, workspace_id, client_id, version, path, size, seconds, what_changed, uploaded_by)
select id, workspace_id, client_id, 1, workspace_id::text || '/maison/' || id::text || '/v1.mp4', 12000000, 31.5, 'First cut', 'Heni'
from public.cuts where title = 'Morning routine, cut 1';

-- A second reel already approved and delivered, so Delivery has a final file.
insert into public.cuts (workspace_id, client_id, title, status, version, position, approved_version, approved_at, approved_by, final_link, final_note, delivered_at) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Before and after, cut 2', 'approved', 2, 1, 2, now() - interval '1 day', 'Yasmine Ben Abdallah',
   'https://example.com/lumiere/before-and-after-final', '9:16 and 4:5, with and without subtitles', now() - interval '20 hours');
insert into public.cut_versions (cut_id, workspace_id, client_id, version, path, size, seconds, what_changed, uploaded_by)
select id, workspace_id, client_id, v, workspace_id::text || '/maison/' || id::text || '/v' || v || '.mp4', 11000000, 22.0,
       case v when 1 then 'First cut' else 'Price shown in the first second' end, 'Heni'
from public.cuts, generate_series(1, 2) v where title = 'Before and after, cut 2';

-- The deposit, sent and paid.
insert into public.invoices (workspace_id, client_id, kind, status, number, lang, title, issue_date, due_date, lines, subtotal, total, sent_at, paid_on, paid_how) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'deposit', 'paid', 'GK-2026-001', 'en', 'Deposit, 50%', current_date - 12, current_date - 5,
   '[{"label":"Regular plan, first month","detail":"10 reels","qty":1,"unit":1450}]', 1450, 1450, now() - interval '12 days', current_date - 10, 'Bank transfer'),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'balance', 'paid', 'GK-2026-002', 'en', 'Balance, 50%', current_date - 1, current_date + 6,
   '[{"label":"Regular plan, first month","detail":"10 reels","qty":1,"unit":1450}]', 1450, 1450, now() - interval '1 day', current_date, 'Bank transfer');

insert into public.production_options (workspace_id, client_id, kind, name, role, details, cost, when_note, status) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'talent', 'Salma, 29, UGC creator', 'main', 'Natural on camera, has worked with skincare before.', 450, 'Free on the shoot day', 'proposed'),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'location', 'Bright flat, white bathroom', 'La Marsa', 'Big window, morning light until 11 a.m.', 300, '', 'proposed'),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'prop', 'Linen towels and a marble tray', '', '', 80, '', 'approved');

insert into public.shared_items (workspace_id, client_id, kind, title, body, url, from_client, author_name) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'reference', 'The tone we like', 'Bright, simple, not too ad-like.', 'https://www.instagram.com/reel/example2', true, 'Yasmine');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

select set_config('fx.script', (select id::text from public.scripts where title like 'Morning routine%' limit 1), true);
select set_config('fx.cut', (select id::text from public.cuts where title = 'Morning routine, cut 1'), true);
select set_config('fx.concept', (select id::text from public.concepts where title like 'Before and after: winter%' limit 1), true);
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a2');
select public.client_concept_note('10000000-0000-4000-8000-0000000009a1', 'maison',
  current_setting('fx.concept')::uuid, 'comment',
  'Could we use a tissue with our logo?', 1);

\o /tmp/fixtures.tsv
select 'get_my_workspaces', coalesce((select json_agg(w) from public.get_my_workspaces() w), '[]')::text;
select 'get_my_client_portals', coalesce((select json_agg(p) from public.get_my_client_portals() p), '[]')::text;
select 'get_my_portal', public.get_my_portal('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_my_production', public.get_my_production('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_my_team', public.get_my_team('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_my_cuts', public.get_my_cuts('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_my_invoices', public.get_my_invoices('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_my_shared', public.get_my_shared('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_my_videos', public.get_my_videos('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_client_onboarding', public.get_client_onboarding('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_results', public.get_results('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'get_library', public.get_library('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'client_portal_visit', public.client_portal_visit('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
-- The same portal after the client approves a script (picking the first hook) and leaves a note on the cut: the
-- product film shows both states.
do $$ begin
  perform public.client_script_note('10000000-0000-4000-8000-0000000009a1', 'maison', current_setting('fx.script')::uuid,
    'approve', '', 1, null, 0);
  perform public.client_cut_note('10000000-0000-4000-8000-0000000009a1', 'maison', current_setting('fx.cut')::uuid,
    'comment', 1, 4.2, 'Can the price show up sooner?');
end $$;
select 'after_get_my_portal', public.get_my_portal('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select 'after_get_my_cuts', public.get_my_cuts('10000000-0000-4000-8000-0000000009a1', 'maison')::text;
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a1');
select 'team_get_my_workspaces', coalesce((select json_agg(w) from public.get_my_workspaces() w), '[]')::text;
select 'get_today', public.get_today('10000000-0000-4000-8000-0000000009a1')::text;
\o
rollback;
