begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(4);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000b1', 'authenticated', 'authenticated', 'founder@gc.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000b2', 'authenticated', 'authenticated', 'editor@gc.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-0000000000b1', 'Content studio');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000b1', 'founder', '00000000-0000-4000-8000-0000000000b1', 'founder@gc.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-0000000000b1', 'editor', '00000000-0000-4000-8000-0000000000b2', 'editor@gc.test', 'Ed', 'editor');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
set local role authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b1', 'founder@gc.test');
insert into public.gecko_posts (workspace_id, title) values ('10000000-0000-4000-8000-0000000000b1', 'Behind the scenes: Dany shoot');
insert into public.gecko_ads (workspace_id, name, spend, leads) values ('10000000-0000-4000-8000-0000000000b1', 'Studio leads', 300, 12);
select extensions.is((select count(*)::int from public.gecko_ads), 1, 'the founder runs Gecko''s ads');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000b2', 'editor@gc.test');
select extensions.is((select count(*)::int from public.gecko_posts), 1, 'an editor sees the content plan');
select extensions.is((select count(*)::int from public.gecko_ads), 0, 'an editor does not see ad money');
select extensions.throws_ok(
  $$insert into public.gecko_posts (workspace_id, title) values ('10000000-0000-4000-8000-0000000000b1', 'x')$$,
  '42501', null, 'an editor cannot add to the plan'
);

reset role;
select * from extensions.finish();
rollback;
