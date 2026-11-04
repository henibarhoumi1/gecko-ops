-- Builds a realistic fake portal and prints what each read function returns for the client owner, as JSON
-- lines "name<TAB>json". web/e2e/make-fixtures.sh runs it on a throwaway database built from the migrations;
-- the phone check serves these answers instead of a real database. Fake data only, long words on purpose.
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
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Maison Lumière Cosmétiques');
insert into public.client_portals (workspace_id, client_id, campaign, summary, included, shoot_date, shoot_place, next_step, milestones, price, plan, reels) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Lancement de la gamme hydratante printemps',
   'Dix reels pour présenter la nouvelle gamme hydratante : routines du matin, avant/après, témoignages et démonstrations produit, tournés en une journée à La Marsa.',
   array['10 reels verticaux', '1 journée de tournage', 'Sous-titres FR et AR', 'Une série de changements par reel'],
   current_date + 15, 'Studio lumière naturelle, La Marsa', 'Validez les trois scripts restants avant vendredi.',
   jsonb_build_array(
     jsonb_build_object('label', 'Idées validées', 'date', (current_date - 6)::text, 'done', true),
     jsonb_build_object('label', 'Scripts validés', 'date', (current_date + 4)::text, 'done', false),
     jsonb_build_object('label', 'Shoot day', 'date', (current_date + 15)::text, 'done', false),
     jsonb_build_object('label', 'Premiers montages', 'date', (current_date + 22)::text, 'done', false)),
   2900, 'regular', 10);
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'owner@phone.test', 'Yasmine Ben Abdallah', '00000000-0000-4000-8000-0000000009a2', now() - interval '5 days', '00000000-0000-4000-8000-0000000009a1', 'owner');

insert into public.concepts (workspace_id, client_id, title, body, refs, status, position) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'La routine de 7 heures du matin', 'Une maman pressée, trois produits, trente secondes. On montre la texture en très gros plan et le résultat à la lumière du jour.', 'https://www.instagram.com/reel/example', 'review', 0),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Avant/après : peau déshydratée après l''hiver', 'Split screen, même lumière, même cadre. Le jour 1 et le jour 14.', '', 'review', 1),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Le test du mouchoir', 'Démonstration produit : on prouve que la crème ne laisse pas de film gras.', '', 'draft', 2);
insert into public.concepts (workspace_id, client_id, title, body, status, position, approved_version, approved_at, approved_by) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Interview fondatrice : pourquoi Maison Lumière', 'La fondatrice raconte l''origine de la marque face caméra.', 'approved', 3, 1, now() - interval '3 days', 'Yasmine');

insert into public.scripts (workspace_id, client_id, title, style, seconds, goal, hooks, beats, cta, status, position) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Routine du matin, version 30 secondes', 'ugc', 30, 'Faire découvrir la gamme et donner envie d''essayer le coffret découverte.',
   '[{"text":"Ma peau tiraillait tous les matins. Jusqu''à ça."},{"text":"Trois produits, trente secondes, zéro excuse."},{"text":"Le secret de ma peau en hiver ? Il tient dans ma main."}]',
   '[{"see":"Gros plan sur le flacon posé sur le lavabo, lumière du matin.","hear":"Ma peau tiraillait tous les matins.","text":"Peau qui tiraille ?"},{"see":"Elle applique le sérum, texture en macro.","hear":"Le sérum d''abord, il pénètre en dix secondes."},{"see":"Résultat à la fenêtre, elle sourit.","hear":"Et voilà, prête.","text":"Coffret découverte -20 %"}]',
   'Commandez le coffret découverte sur maisonlumiere.tn', 'review', 0),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Avant/après en 14 jours', 'problem-fix', 20, 'Prouver le résultat.', '[{"text":"Jour 1. Jour 14."}]',
   '[{"see":"Split screen.","hear":"Même lumière, même cadre."}]', 'Découvrez la gamme', 'review', 1);

insert into public.cuts (workspace_id, client_id, title, status, version, position) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'Routine du matin, montage 1', 'review', 1, 0);
insert into public.cut_versions (cut_id, workspace_id, client_id, version, path, size, seconds, what_changed, uploaded_by)
select id, workspace_id, client_id, 1, workspace_id::text || '/maison/' || id::text || '/v1.mp4', 12000000, 31.5, 'Premier montage', 'Heni'
from public.cuts where title = 'Routine du matin, montage 1';

insert into public.production_options (workspace_id, client_id, kind, name, role, details, cost, when_note, status) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'talent', 'Salma, 29 ans, créatrice UGC', 'main', 'Naturelle face caméra, déjà travaillé en cosmétique, peau mixte.', 450, 'Disponible le jour du tournage', 'proposed'),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'location', 'Appartement lumineux, salle de bain blanche', 'La Marsa', 'Grande fenêtre, lumière du matin jusqu''à 11 h.', 300, '', 'proposed'),
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'prop', 'Serviettes en lin et plateau en marbre', '', '', 80, '', 'approved');

insert into public.shared_items (workspace_id, client_id, kind, title, body, url, from_client, author_name) values
  ('10000000-0000-4000-8000-0000000009a1', 'maison', 'reference', 'Le ton qu''on aime', 'Lumineux, simple, pas trop « pub ».', 'https://www.instagram.com/reel/example2', true, 'Yasmine');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

select set_config('fx.concept', (select id::text from public.concepts where title like 'Avant%' limit 1), true);
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a2');
select public.client_concept_note('10000000-0000-4000-8000-0000000009a1', 'maison',
  current_setting('fx.concept')::uuid, 'comment',
  'On pourrait le faire avec un vrai mouchoir de la marque ?', 1);

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
select pg_temp.act_as('00000000-0000-4000-8000-0000000009a1');
select 'team_get_my_workspaces', coalesce((select json_agg(w) from public.get_my_workspaces() w), '[]')::text;
select 'get_today', public.get_today('10000000-0000-4000-8000-0000000009a1')::text;
\o
rollback;
