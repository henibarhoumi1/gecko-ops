begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(5);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'dany@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder');
insert into public.clients(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Dany Clean');
insert into public.client_accounts(workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'dany@client.test', 'Dany', '00000000-0000-4000-8000-000000000006', now(), '00000000-0000-4000-8000-000000000001');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.lives_ok(
  $$insert into public.client_portals(workspace_id, client_id, campaign, plan, reels)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Test campaign', 'test', 3)$$,
  'the founder sets a plan and its reels'
);
select extensions.throws_ok(
  $$update public.client_portals set plan = 'gold' where client_id = 'c-dany'$$,
  '23514', null, 'an unknown plan is refused'
);
select extensions.throws_ok(
  $$update public.client_portals set reels = 500 where client_id = 'c-dany'$$,
  '23514', null, 'a reel count over 200 is refused'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')->'overview'->>'plan',
  'test', 'the client sees their plan'
);
select extensions.is(
  (public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')->'overview'->>'reels')::int,
  3, 'and how many reels it holds'
);

select * from extensions.finish();
rollback;
