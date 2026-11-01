begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'farah@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'sami@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder');
insert into public.clients(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'c-rr', 'Synthetic Atelier');
insert into public.concepts(workspace_id, client_id, title, status, created_by)
  values ('10000000-0000-4000-8000-000000000001', 'c-rr', 'Night walk', 'review', '00000000-0000-4000-8000-000000000001');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.codes (who text primary key, code text);
create table pg_temp.ids (who text primary key, id uuid);
insert into pg_temp.ids select 'concept', id from public.concepts where title = 'Night walk';
grant all on pg_temp.codes, pg_temp.ids to authenticated;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
insert into pg_temp.codes select 'farah', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-rr', 'farah@client.test');
reset role;
insert into pg_temp.ids select 'farah', id from public.client_accounts where email = 'farah@client.test';
set local role authenticated;
select extensions.is(
  (select r->>'role' from public.list_client_accounts('10000000-0000-4000-8000-000000000001', 'c-rr') r),
  'owner', 'the first person Gecko invites is the owner'
);
select extensions.lives_ok(
  $$update public.client_portals set template = 'cinematic' where client_id = 'c-rr';
    insert into public.client_portals(workspace_id, client_id, template) values ('10000000-0000-4000-8000-000000000001', 'c-rr', 'cinematic')
    on conflict (workspace_id, client_id) do update set template = excluded.template$$,
  'the founder sets the Cinematic template'
);
select extensions.throws_ok(
  $$update public.client_portals set template = 'retail' where client_id = 'c-rr'$$,
  '23514', null, 'an unknown template is refused'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'farah@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'farah'), 'Farah');
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-rr')->>'template',
  'cinematic', 'the client reads their template'
);
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-rr')->>'role',
  'owner', 'and their role'
);
insert into pg_temp.codes select 'sami', public.client_invite_teammate('10000000-0000-4000-8000-000000000001', 'c-rr', 'sami@client.test', 'viewer');
reset role;
insert into pg_temp.ids select 'sami', id from public.client_accounts where email = 'sami@client.test';
set local role authenticated;
select extensions.is(
  jsonb_array_length(public.get_my_team('10000000-0000-4000-8000-000000000001', 'c-rr')),
  2, 'the owner invites a teammate'
);
select extensions.throws_ok(
  $$select public.client_invite_teammate('10000000-0000-4000-8000-000000000001', 'c-rr', 'x@client.test', 'admin')$$,
  'invalid_invite', 'an unknown role is refused'
);
select extensions.throws_ok(
  $$select public.client_set_teammate_role('10000000-0000-4000-8000-000000000001', 'c-rr',
      (select id from pg_temp.ids where who = 'farah'), 'viewer')$$,
  'last_owner', 'the last owner cannot step down'
);
select extensions.throws_ok(
  $$select public.client_remove_teammate('10000000-0000-4000-8000-000000000001', 'c-rr',
      (select id from pg_temp.ids where who = 'farah'))$$,
  'cannot_remove_self', 'an owner cannot remove themselves'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'sami@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sami'), 'Sami');
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-rr')->>'role',
  'viewer', 'the teammate joins as a viewer'
);
select extensions.is(
  (select t->>'email' from jsonb_array_elements(public.get_my_team('10000000-0000-4000-8000-000000000001', 'c-rr')) t
   where t->>'name' = 'Farah'),
  null, 'a viewer does not see the others'' emails'
);
select extensions.throws_ok(
  $$select public.client_invite_teammate('10000000-0000-4000-8000-000000000001', 'c-rr', 'y@client.test', 'owner')$$,
  'owner_only', 'a viewer cannot invite'
);
select extensions.throws_ok(
  $$select public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-rr',
      (select id from pg_temp.ids where who = 'concept'), 'approve', '', 1)$$,
  'approver_only', 'a viewer cannot approve'
);
select extensions.lives_ok(
  $$select public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-rr',
      (select id from pg_temp.ids where who = 'concept'), 'comment', 'Love the light', 1)$$,
  'a viewer can comment'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'farah@client.test');
select public.client_set_teammate_role('10000000-0000-4000-8000-000000000001', 'c-rr',
  (select id from pg_temp.ids where who = 'sami'), 'approver');
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'sami@client.test');
select extensions.lives_ok(
  $$select public.client_concept_note('10000000-0000-4000-8000-000000000001', 'c-rr',
      (select id from pg_temp.ids where who = 'concept'), 'approve', '', 1)$$,
  'once made an approver, they can approve'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'farah@client.test');
select public.client_invite_teammate('10000000-0000-4000-8000-000000000001', 'c-rr', e, 'viewer')
  from unnest(array['a@client.test', 'b@client.test', 'c@client.test']) e;
reset role;
insert into pg_temp.ids select 'a', id from public.client_accounts where email = 'a@client.test';
set local role authenticated;
select extensions.throws_ok(
  $$select public.client_invite_teammate('10000000-0000-4000-8000-000000000001', 'c-rr', 'd@client.test', 'viewer')$$,
  'team_full', 'a portal holds 5 people'
);
select public.client_remove_teammate('10000000-0000-4000-8000-000000000001', 'c-rr',
  (select id from pg_temp.ids where who = 'sami'));
select extensions.is(
  public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-rr')->>'role', 'owner', 'the owner keeps access'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'sami@client.test');
select extensions.throws_ok(
  $$select public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-rr')$$,
  'forbidden', 'a removed teammate loses access'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select public.set_client_account_role('10000000-0000-4000-8000-000000000001',
  (select id from pg_temp.ids where who = 'a'), 'finance');
select extensions.is(
  (select r->>'role' from public.list_client_accounts('10000000-0000-4000-8000-000000000001', 'c-rr') r
   where r->>'email' = 'a@client.test'),
  'finance', 'Gecko can change a role'
);
update public.client_portals set price = 999 where client_id = 'c-rr';
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'farah@client.test');
select extensions.is(
  (public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-rr')->'overview'->>'price')::numeric,
  999::numeric, 'the owner sees the price'
);

select * from extensions.finish();
rollback;
