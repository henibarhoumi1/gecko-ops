begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(7);

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
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')->>'logo',
  null, 'no logo until the team adds one'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.lives_ok(
  $$insert into public.client_portals(workspace_id, client_id, logo)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'data:image/png;base64,iVBORw0KGgo=')$$,
  'the founder adds a logo'
);
select extensions.throws_ok(
  $$update public.client_portals set logo = 'data:image/svg+xml;base64,PHN2Zz4=' where client_id = 'c-dany'$$,
  '23514', null, 'an SVG logo is refused'
);
select extensions.throws_ok(
  $$update public.client_portals set logo = 'https://example.com/logo.png' where client_id = 'c-dany'$$,
  '23514', null, 'a link instead of an image is refused'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')->>'logo',
  'data:image/png;base64,iVBORw0KGgo=', 'the client sees their logo'
);
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')->>'overview',
  null, 'a logo alone does not show an empty campaign plan'
);
select extensions.is_empty(
  $$update public.client_portals set logo = null returning client_id$$,
  'the client cannot change it'
);

select * from extensions.finish();
rollback;
