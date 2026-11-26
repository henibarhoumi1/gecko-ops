begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000801', 'authenticated', 'authenticated', 'founder@edit.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000802', 'authenticated', 'authenticated', 'owner@edit.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000803', 'authenticated', 'authenticated', 'viewer@edit.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000801', 'Edit GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000801', 'founder', '00000000-0000-4000-8000-000000000801', 'founder@edit.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000801', 'c-ed', 'Edit Brand');
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000801', 'c-ed', 'owner@edit.test', 'Yasmine', '00000000-0000-4000-8000-000000000802', now(), '00000000-0000-4000-8000-000000000801', 'owner'),
  ('10000000-0000-4000-8000-000000000801', 'c-ed', 'viewer@edit.test', 'Ali', '00000000-0000-4000-8000-000000000803', now(), '00000000-0000-4000-8000-000000000801', 'viewer');
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, beats, cta, status, author_name) values
  ('30000000-0000-4000-8000-000000000801', '10000000-0000-4000-8000-000000000801', 'c-ed', 'From Gecko', 'skit',
   '[{"hear":"Hook A"}]', '[{"part":"lead","see":"Lead"}]', 'Buy', 'review', 'Heni');
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, beats, cta, status, author_name,
  approved_version, approved_at, approved_by, hook) values
  ('30000000-0000-4000-8000-000000000802', '10000000-0000-4000-8000-000000000801', 'c-ed', 'Approved', 'skit',
   '[{"hear":"Hook A"}]', '[]', 'Buy', 'approved', 'Heni', 1, now(), 'Yasmine', 0);

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

-- The owner rewrites the script Gecko sent.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000802');
select public.client_write_script('10000000-0000-4000-8000-000000000801', 'c-ed', '30000000-0000-4000-8000-000000000801',
  'From Gecko', 30, '', '[{"hear":"My better hook"}]', '[{"part":"lead","see":"Lead"}]', 'Buy', '{}', 'skit');
reset role;
select extensions.is(
  (select status || ' | v' || version || ' | ' || written_by || ' | ' || author_name || ' | ' || (hooks->0->>'hear')
   from public.scripts where id = '30000000-0000-4000-8000-000000000801'),
  'review | v2 | gecko | Heni | My better hook', 'the client''s edit is a new version, still with the client, still Gecko''s script');
select extensions.ok(
  exists (select 1 from public.script_notes where script_id = '30000000-0000-4000-8000-000000000801'
          and from_client and author_name = 'Yasmine' and body like 'Edited the script%'),
  'the edit shows in the history for the team');

-- The client can still approve it.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000802');
select extensions.lives_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000801', 'c-ed', '30000000-0000-4000-8000-000000000801', 'approve', '', 2, null, 0)$$,
  'the client approves their edited version');

-- An approved script is locked; a viewer cannot edit.
select extensions.throws_ok(
  $$select public.client_write_script('10000000-0000-4000-8000-000000000801', 'c-ed', '30000000-0000-4000-8000-000000000802',
    'Approved', 30, '', '[]', '[]', 'Changed', '{}')$$,
  'P0001', 'script_locked', 'an approved script cannot be edited');
select pg_temp.act_as('00000000-0000-4000-8000-000000000803');
select extensions.throws_ok(
  $$select public.client_write_script('10000000-0000-4000-8000-000000000801', 'c-ed', '30000000-0000-4000-8000-000000000801',
    'X', 30, '', '[]', '[]', '', '{}')$$,
  'P0001', 'writer_only', 'a viewer cannot edit');

select * from extensions.finish();
rollback;
