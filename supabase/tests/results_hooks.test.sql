begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(10);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000f01', 'authenticated', 'authenticated', 'founder@rh.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000f02', 'authenticated', 'authenticated', 'owner@rh.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000f01', 'RH GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000f01', 'founder', '00000000-0000-4000-8000-000000000f01', 'founder@rh.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000f01', 'c-h', 'Hook Brand'),
  ('10000000-0000-4000-8000-000000000f01', 'c-x', 'Other Brand');
insert into public.scripts (id, workspace_id, client_id, title, style, hooks, beats, cta, status, author_name) values
  ('20000000-0000-4000-8000-000000000f01', '10000000-0000-4000-8000-000000000f01', 'c-h', 'Shared script', 'problem-fix',
   '[{"hear": "Stop scrubbing"}, {"text": "3 seconds, no stain"}]', '[]', '', 'review', 'Heni'),
  ('20000000-0000-4000-8000-000000000f02', '10000000-0000-4000-8000-000000000f01', 'c-h', 'Team draft', 'demo',
   '[{"hear": "Secret"}]', '[]', '', 'draft', 'Heni'),
  ('20000000-0000-4000-8000-000000000f03', '10000000-0000-4000-8000-000000000f01', 'c-x', 'Other client', 'demo',
   '[{"hear": "Other"}]', '[]', '', 'review', 'Heni');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.ids (who text primary key, id uuid);
grant all on pg_temp.ids to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000f01', 'founder@rh.test');
insert into pg_temp.ids values ('code', null);
create table pg_temp.codes (code text);
grant all on pg_temp.codes to authenticated;
insert into pg_temp.codes values (public.invite_client_account('10000000-0000-4000-8000-000000000f01', 'c-h', 'owner@rh.test', 'owner'));
insert into pg_temp.ids values ('team-post', public.save_post('10000000-0000-4000-8000-000000000f01', 'c-h', null, null,
  'Reel 1', 'instagram', true, '', current_date - 8, ''));

select extensions.lives_ok(
  $$select public.set_post_script('10000000-0000-4000-8000-000000000f01', 'c-h', (select id from pg_temp.ids where who = 'team-post'),
      '20000000-0000-4000-8000-000000000f01', 1)$$,
  'the team says which script and hook a post opened with');
select extensions.is(
  (select row(p->>'scriptId', p->>'hookIndex')::text from jsonb_array_elements(
     public.get_results('10000000-0000-4000-8000-000000000f01', 'c-h')->'posts') p),
  '(20000000-0000-4000-8000-000000000f01,1)', 'the post carries it');
select extensions.is(
  (select s->'hooks' from jsonb_array_elements(public.get_results('10000000-0000-4000-8000-000000000f01', 'c-h')->'scripts') s
   where s->>'title' = 'Shared script'),
  '["Stop scrubbing", "3 seconds, no stain"]'::jsonb, 'each script comes with its hooks as words');
select extensions.throws_ok(
  $$select public.set_post_script('10000000-0000-4000-8000-000000000f01', 'c-h', (select id from pg_temp.ids where who = 'team-post'),
      '20000000-0000-4000-8000-000000000f01', 2)$$,
  'invalid_post', 'the hook has to exist');
select extensions.throws_ok(
  $$select public.set_post_script('10000000-0000-4000-8000-000000000f01', 'c-h', (select id from pg_temp.ids where who = 'team-post'),
      '20000000-0000-4000-8000-000000000f03', null)$$,
  'script_not_found', 'only this client''s scripts');

-- The client.
select pg_temp.act_as('00000000-0000-4000-8000-000000000f02', 'owner@rh.test');
select public.accept_client_invite((select code from pg_temp.codes), 'Olfa');
select extensions.is(
  (select string_agg(s->>'title', ',') from jsonb_array_elements(public.get_results('10000000-0000-4000-8000-000000000f01', 'c-h')->'scripts') s),
  'Shared script', 'the client never sees the team''s drafts');
insert into pg_temp.ids values ('client-post', public.save_post('10000000-0000-4000-8000-000000000f01', 'c-h', null, null,
  'My post', 'tiktok', false, '', current_date - 2, ''));
select extensions.throws_ok(
  $$select public.set_post_script('10000000-0000-4000-8000-000000000f01', 'c-h', (select id from pg_temp.ids where who = 'team-post'), null, null)$$,
  'post_not_found', 'the client changes only the posts they added');
select extensions.throws_ok(
  $$select public.set_post_script('10000000-0000-4000-8000-000000000f01', 'c-h', (select id from pg_temp.ids where who = 'client-post'),
      '20000000-0000-4000-8000-000000000f02', 0)$$,
  'script_not_found', 'nor links a team draft');
select extensions.lives_ok(
  $$select public.set_post_script('10000000-0000-4000-8000-000000000f01', 'c-h', (select id from pg_temp.ids where who = 'client-post'),
      '20000000-0000-4000-8000-000000000f01', 0)$$,
  'the client links their own post');
select extensions.lives_ok(
  $$select public.set_post_script('10000000-0000-4000-8000-000000000f01', 'c-h', (select id from pg_temp.ids where who = 'client-post'), null, 0)$$,
  'and can clear it (the hook goes with it)');

select * from extensions.finish();
rollback;
