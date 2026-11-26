begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'nour@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'sami@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder');
insert into public.clients(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'c-at', 'Synthetic Atelier');

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
  ('nour', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-at', 'nour@client.test', 'owner')),
  ('sami', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-at', 'sami@client.test', 'viewer'));

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'nour@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'nour'), 'Nour');
insert into pg_temp.ids select 'mine', (public.client_write_script('10000000-0000-4000-8000-000000000001', 'c-at', null,
  'Night walk', 45, 'Quiet confidence',
  '[{"see":"Her coat in the wind, Sidi Bou Said at dusk"}]', '[{"see":"Close on the fabric"},{"see":"She turns"}]',
  'The logo on white', '{"mood":"Blue hour, slow","music":"Oud and a low synth"}')->>'id')::uuid;
select extensions.is(
  (select s->>'writtenBy' from jsonb_array_elements(public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-at')->'scripts') s),
  'client', 'the owner writes a treatment, and it is marked as theirs'
);
select extensions.is(
  (select s->'treatment'->>'mood' from jsonb_array_elements(public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-at')->'scripts') s),
  'Blue hour, slow', 'with its treatment sections'
);
select extensions.throws_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000001', 'c-at', (select id from pg_temp.ids where who = 'mine'),
      'approve', '', 1, null, null)$$,
  'gecko_approves', 'the client cannot approve their own writing'
);
select extensions.throws_ok(
  $$select public.client_write_script('10000000-0000-4000-8000-000000000001', 'c-at', null, 'X', 30, '', '[]', '[]', '',
      '{"budget":"lots"}')$$,
  'invalid_script', 'unknown treatment sections are refused'
);
select extensions.is(
  (public.client_write_script('10000000-0000-4000-8000-000000000001', 'c-at', (select id from pg_temp.ids where who = 'mine'),
    'Night walk', 45, 'Quiet confidence, nothing loud',
    '[{"see":"Her coat in the wind, Sidi Bou Said at dusk"}]', '[{"see":"Close on the fabric"},{"see":"She turns"}]',
    'The logo on white', '{"mood":"Blue hour, slow","music":"Oud and a low synth"}')->>'version')::int,
  2, 'editing their own makes a new version'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'sami@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sami'), 'Sami');
select extensions.throws_ok(
  $$select public.client_write_script('10000000-0000-4000-8000-000000000001', 'c-at', null, 'Mine too', 30, '', '[]', '[]', '', '{}')$$,
  'writer_only', 'a viewer cannot write'
);

-- Gecko decides on the client's version
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.lives_ok(
  $$update public.scripts set status = 'approved' where id = (select id from pg_temp.ids where who = 'mine')$$,
  'Gecko approves the client''s treatment'
);
select extensions.is(
  (select approved_by || ' v' || approved_version from public.scripts where id = (select id from pg_temp.ids where who = 'mine')),
  'Heni v2', 'the approval names who at Gecko and which version'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'nour@client.test');
select extensions.throws_ok(
  $$select public.client_write_script('10000000-0000-4000-8000-000000000001', 'c-at', (select id from pg_temp.ids where who = 'mine'),
      'Night walk!', 45, '', '[]', '[]', '', '{}')$$,
  'script_locked', 'an approved version is locked'
);

-- Gecko rewrites a client version: it becomes Gecko's and goes back to the client
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
update public.scripts set status = 'review', goal = 'Quiet confidence, and the coat is the hero'
  where id = (select id from pg_temp.ids where who = 'mine');
select extensions.is(
  (select written_by || ' ' || status || ' v' || version from public.scripts where id = (select id from pg_temp.ids where who = 'mine')),
  'gecko review v3', 'Gecko''s rewrite is Gecko''s version, waiting for the client'
);
select extensions.throws_ok(
  $$update public.scripts set status = 'approved' where id = (select id from pg_temp.ids where who = 'mine')$$,
  'client_only', 'Gecko cannot approve its own version'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'nour@client.test');
select extensions.lives_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000001', 'c-at', (select id from pg_temp.ids where who = 'mine'),
      'approve', '', 3, null, null)$$,
  'and the client approves Gecko''s rewrite'
);
reset role;
select extensions.is(
  (select count(*)::int from public.script_versions where script_id = (select id from pg_temp.ids where who = 'mine')),
  3, 'every version the other side saw is kept'
);

select * from extensions.finish();
rollback;
