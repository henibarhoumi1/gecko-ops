begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000501', 'authenticated', 'authenticated', 'founder@tpl.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000502', 'authenticated', 'authenticated', 'owner@tpl.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000501', 'Template GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000501', 'founder', '00000000-0000-4000-8000-000000000501', 'founder@tpl.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000501', 'c-tpl', 'Template Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000501', 'c-tpl', 'owner@tpl.test', 'Yasmine', '00000000-0000-4000-8000-000000000502', now(), '00000000-0000-4000-8000-000000000501', 'owner');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;
create table pg_temp.ids (who text primary key, id uuid);
grant all on pg_temp.ids to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000502');

-- The client writes from a template, with a lead and body parts.
insert into pg_temp.ids select 'mine', (public.client_write_script('10000000-0000-4000-8000-000000000501', 'c-tpl', null,
  'Three reasons', 30, '', '[{"hear":"Hook A"},{"hear":"Hook B"}]',
  '[{"part":"lead","hear":"Who it is for"},{"part":"body","see":"Reason 1"},{"part":"body","see":"Reason 2"}]',
  'Order today', '{}', 'reasons')->>'id')::uuid;
reset role;
select extensions.is(
  (select style || ' | ' || jsonb_array_length(beats) || ' | ' || (beats->0->>'part') from public.scripts
   where id = (select id from pg_temp.ids where who = 'mine')),
  'reasons | 3 | lead', 'the client''s template and parts are saved');

-- Without a template, it works as before.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000502');
insert into pg_temp.ids select 'old', (public.client_write_script('10000000-0000-4000-8000-000000000501', 'c-tpl', null,
  'Old way', 30, '', '[]', '[]', '', '{}')->>'id')::uuid;
reset role;
select extensions.is(
  (select style from public.scripts where id = (select id from pg_temp.ids where who = 'old')),
  'other', 'leaving the template out still works');

-- Changing the template on an edit is a new version.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000502');
select public.client_write_script('10000000-0000-4000-8000-000000000501', 'c-tpl', (select id from pg_temp.ids where who = 'mine'),
  'Three reasons', 30, '', '[{"hear":"Hook A"},{"hear":"Hook B"}]',
  '[{"part":"lead","hear":"Who it is for"},{"part":"body","see":"Reason 1"},{"part":"body","see":"Reason 2"}]',
  'Order today', '{}', 'problem-fix');
reset role;
select extensions.is(
  (select style || ' | v' || version from public.scripts where id = (select id from pg_temp.ids where who = 'mine')),
  'problem-fix | v2', 'a new template is a new version');

-- An unknown template is refused.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000502');
select extensions.throws_ok(
  $$select public.client_write_script('10000000-0000-4000-8000-000000000501', 'c-tpl', null, 'Bad', 30, '', '[]', '[]', '', '{}', 'listicle')$$,
  'P0001', 'invalid_script', 'an unknown template is refused');

select * from extensions.finish();
rollback;
