begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000e1', 'authenticated', 'authenticated', 'team@media.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000e2', 'authenticated', 'authenticated', 'stranger@media.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values
  ('10000000-0000-4000-8000-0000000000e1', 'Media studio'),
  ('10000000-0000-4000-8000-0000000000e2', 'Another studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000e1', 'team', '00000000-0000-4000-8000-0000000000e1', 'team@media.test', 'Team', 'editor'),
  ('10000000-0000-4000-8000-0000000000e2', 'other', '00000000-0000-4000-8000-0000000000e2', 'stranger@media.test', 'Other', 'founder');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000e1', 'team@media.test');
select extensions.ok(public.media_upload_ok('10000000-0000-4000-8000-0000000000e1/abc123xyz9.jpg'), 'the team adds an image to its own folder');
select extensions.ok(not public.media_upload_ok('10000000-0000-4000-8000-0000000000e2/abc123xyz9.jpg'), 'not to another studio''s folder');
select extensions.ok(not public.media_upload_ok('10000000-0000-4000-8000-0000000000e1/../x/abc123xyz9.jpg'), 'no sub-folders or tricks in the name');
select extensions.ok(not public.media_upload_ok('10000000-0000-4000-8000-0000000000e1/abc123xyz9.html'), 'images only');

reset role;
set local role anon;
select extensions.throws_ok($$select public.media_upload_ok('10000000-0000-4000-8000-0000000000e1/abc123xyz9.jpg')$$, '42501', null, 'signed-out visitors cannot use it');

select * from extensions.finish();
rollback;
