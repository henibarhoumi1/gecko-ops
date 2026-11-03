-- Fake data for the TESTING project only. It is never run against production: reset-testing.sh refuses a
-- database that isn't marked as testing, and checks it isn't the production project.
--
-- Everything goes through the same rules as the app: rows are written while acting as the right person
-- (the team for team work, a client login for client decisions), so every guard and trigger runs.
--
-- Logins: each fake person gets an address made from the psql variable login_base, so all sign-in links
-- reach one inbox. With login_base = name@example.com, the founder is name+gk-founder@example.com.
-- Nobody has a password; sign in with the email link. Run with:
--   psql -v ON_ERROR_STOP=1 -v login_base=name@example.com -f supabase/seed.sql

\set ON_ERROR_STOP on
begin;
select set_config('gecko.login_base', :'login_base', true);

create function pg_temp.login(p_role text) returns text language sql stable as $$
  select split_part(current_setting('gecko.login_base'), '@', 1) || '+gk-' || p_role || '@'
      || split_part(current_setting('gecko.login_base'), '@', 2)
$$;

create function pg_temp.act_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, true),
         set_config('request.jwt.claims', jsonb_build_object(
           'sub', p_user, 'role', 'authenticated',
           'email', (select email from auth.users where id = p_user))::text, true);
$$;

-- Adds a confirmed login with no password. Writes only the columns this database's auth.users has, so it
-- works on Supabase and on the plain test database alike.
create function pg_temp.add_login(p_id uuid, p_email text, p_name text) returns void language plpgsql as $$
declare
  wanted jsonb := jsonb_build_object(
    'id', p_id, 'instance_id', '00000000-0000-0000-0000-000000000000', 'aud', 'authenticated',
    'role', 'authenticated', 'email', p_email, 'encrypted_password', '', 'email_confirmed_at', now(),
    'raw_app_meta_data', '{"provider":"email","providers":["email"]}'::jsonb,
    'raw_user_meta_data', jsonb_build_object('name', p_name),
    'created_at', now(), 'updated_at', now(),
    'confirmation_token', '', 'recovery_token', '', 'email_change_token_new', '', 'email_change', '');
  cols text;
  vals text;
begin
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position),
         string_agg(format('(%L::jsonb ->> %L)::%s', wanted, c.column_name, c.udt_schema || '.' || c.udt_name),
                    ', ' order by c.ordinal_position)
    into cols, vals
  from information_schema.columns c
  where c.table_schema = 'auth' and c.table_name = 'users' and wanted ? c.column_name;
  execute format('insert into auth.users (%s) values (%s)', cols, vals);

  if to_regclass('auth.identities') is not null then
    insert into auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (p_id::text, p_id, jsonb_build_object('sub', p_id::text, 'email', p_email, 'email_verified', true),
            'email', now(), now(), now());
  end if;
end
$$;

-- ---------- people ----------
select pg_temp.add_login('a0000000-0000-4000-8000-000000000001', pg_temp.login('founder'), 'Heni (test)');
select pg_temp.add_login('a0000000-0000-4000-8000-000000000002', pg_temp.login('producer'), 'Sami Producer');
select pg_temp.add_login('a0000000-0000-4000-8000-000000000003', pg_temp.login('editor'), 'Lina Editor');
select pg_temp.add_login('a0000000-0000-4000-8000-000000000011', pg_temp.login('owner'), 'Olfa Owner');
select pg_temp.add_login('a0000000-0000-4000-8000-000000000012', pg_temp.login('approver'), 'Amine Approver');
select pg_temp.add_login('a0000000-0000-4000-8000-000000000013', pg_temp.login('finance'), 'Fatma Finance');
select pg_temp.add_login('a0000000-0000-4000-8000-000000000014', pg_temp.login('viewer'), 'Victor Viewer');
select pg_temp.add_login('a0000000-0000-4000-8000-000000000021', pg_temp.login('cinema'), 'Cyrine Cinema');

insert into public.workspaces (id, name) values ('b0000000-0000-4000-8000-000000000001', 'Gecko (testing)');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('b0000000-0000-4000-8000-000000000001', 'founder', 'a0000000-0000-4000-8000-000000000001', pg_temp.login('founder'), 'Heni (test)', 'founder'),
  ('b0000000-0000-4000-8000-000000000001', 'producer', 'a0000000-0000-4000-8000-000000000002', pg_temp.login('producer'), 'Sami Producer', 'sales'),
  ('b0000000-0000-4000-8000-000000000001', 'editor', 'a0000000-0000-4000-8000-000000000003', pg_temp.login('editor'), 'Lina Editor', 'editor');

-- ---------- clients: one Performance brand with all four client roles, one Cinematic brand ----------
insert into public.clients (workspace_id, id, brand) values
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'Fresh Test Co'),
  ('b0000000-0000-4000-8000-000000000001', 'test-cinema', 'Cinema Test Studio');

insert into public.client_assignments (workspace_id, client_id, member_id)
select 'b0000000-0000-4000-8000-000000000001', 'test-fresh', 'editor'
where to_regclass('public.client_assignments') is not null;

insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', pg_temp.login('owner'), 'Olfa Owner', 'a0000000-0000-4000-8000-000000000011', now(), 'a0000000-0000-4000-8000-000000000001', 'owner'),
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', pg_temp.login('approver'), 'Amine Approver', 'a0000000-0000-4000-8000-000000000012', now(), 'a0000000-0000-4000-8000-000000000001', 'approver'),
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', pg_temp.login('finance'), 'Fatma Finance', 'a0000000-0000-4000-8000-000000000013', now(), 'a0000000-0000-4000-8000-000000000001', 'finance'),
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', pg_temp.login('viewer'), 'Victor Viewer', 'a0000000-0000-4000-8000-000000000014', now(), 'a0000000-0000-4000-8000-000000000001', 'viewer'),
  ('b0000000-0000-4000-8000-000000000001', 'test-cinema', pg_temp.login('cinema'), 'Cyrine Cinema', 'a0000000-0000-4000-8000-000000000021', now(), 'a0000000-0000-4000-8000-000000000001', 'owner');

-- ---------- the team sets up both portals ----------
select pg_temp.act_as('a0000000-0000-4000-8000-000000000001');

insert into public.client_portals (workspace_id, client_id, campaign, summary, included, shoot_date, shoot_place,
  next_step, milestones, price, plan, reels, template) values
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'Spring launch (test)', 'Fake campaign for testing only.',
   '{"8 edited reels","1 carousel"}', current_date + 14, 'Studio, Tunis', 'Approve the first scripts',
   jsonb_build_array(jsonb_build_object('label', 'Shoot', 'date', (current_date + 14)::text, 'done', false)),
   1200, 'regular', 8, 'performance'),
  ('b0000000-0000-4000-8000-000000000001', 'test-cinema', 'Brand film (test)', 'Fake cinematic project for testing only.',
   '{"1 brand film","3 cutdowns"}', current_date + 30, 'Sidi Bou Said', 'Read the treatment',
   '[]', 3000, 'custom', 4, 'cinematic');

insert into public.concepts (workspace_id, client_id, title, body, status, position) values
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'The morning rush', 'Hook: three alarms, one product.', 'review', 0),
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'Before and after', 'Split screen, same kitchen.', 'review', 1),
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'Still a draft', 'Not shown to the client yet.', 'draft', 2);

insert into public.scripts (workspace_id, client_id, title, seconds, goal, hooks, beats, cta, status, position) values
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'Reel 1: The morning rush', 30, 'Show speed',
   '[{"hear":"Three alarms. One product."},{"hear":"Late again?"},{"text":"This saves 10 minutes."}]',
   '[{"see":"Alarm rings, a hand slams it","hear":"Not today."},{"see":"Product on the counter"},{"see":"Done in one wipe","text":"10 min saved"}]',
   'Link in bio', 'review', 0),
  ('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'Reel 2: Before and after', 20, 'Show the result',
   '[{"hear":"Same kitchen, ten minutes apart."}]', '[{"see":"Before"},{"see":"After"}]', 'Shop now', 'review', 1);

select public.save_production_option('b0000000-0000-4000-8000-000000000001', 'test-fresh',
  '{"kind":"talent","name":"Test talent A","role":"Lead","cost":250,"status":"proposed"}');
select public.save_production_option('b0000000-0000-4000-8000-000000000001', 'test-fresh',
  '{"kind":"location","name":"Test kitchen","cost":150,"status":"proposed"}');

select public.save_cut('b0000000-0000-4000-8000-000000000001', 'test-fresh', null, 'Reel 1 edit');

select public.create_invoice('b0000000-0000-4000-8000-000000000001', 'test-fresh', 'deposit', 'fr');

-- ---------- the client owner decides on some of it ----------
select pg_temp.act_as('a0000000-0000-4000-8000-000000000011');

select public.client_concept_note('b0000000-0000-4000-8000-000000000001', 'test-fresh', c.id, 'approve', '', c.version)
from public.concepts c where c.client_id = 'test-fresh' and c.title = 'The morning rush';

select public.client_script_note('b0000000-0000-4000-8000-000000000001', 'test-fresh', s.id, 'approve', '', s.version, null, 0)
from public.scripts s where s.client_id = 'test-fresh' and s.title = 'Reel 1: The morning rush';

select public.client_script_note('b0000000-0000-4000-8000-000000000001', 'test-fresh', s.id, 'changes',
  'Can the hook be shorter?', s.version, 'hook-0', null)
from public.scripts s where s.client_id = 'test-fresh' and s.title = 'Reel 2: Before and after';

select public.client_decide_option('b0000000-0000-4000-8000-000000000001', 'test-fresh', o.id, 'approve', '')
from public.production_options o where o.client_id = 'test-fresh' and o.name = 'Test talent A';

select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true);
commit;
