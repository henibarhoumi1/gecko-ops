begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(12);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated', 'founder@preview.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated', 'editor@preview.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated', 'sales@preview.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated', 'owner@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000101', 'Preview GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000101', 'founder', '00000000-0000-4000-8000-000000000101', 'founder@preview.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000101', 'editor', '00000000-0000-4000-8000-000000000102', 'editor@preview.test', 'Editor', 'editor'),
  ('10000000-0000-4000-8000-000000000101', 'sales', '00000000-0000-4000-8000-000000000103', 'sales@preview.test', 'Producer', 'sales');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000101', 'c-pre', 'Preview Brand');
insert into public.client_portals (workspace_id, client_id, campaign, price) values
  ('10000000-0000-4000-8000-000000000101', 'c-pre', 'Spring', 900);
insert into public.client_accounts (workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by, role) values
  ('10000000-0000-4000-8000-000000000101', 'c-pre', 'owner@client.test', 'Olfa', '00000000-0000-4000-8000-000000000104', now(), '00000000-0000-4000-8000-000000000101', 'owner');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

set local role authenticated;

select pg_temp.act_as('00000000-0000-4000-8000-000000000101');
select extensions.is(
  (select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'viewer', 'portal')->>'role'),
  'viewer', 'the Gecko owner sees the portal as a viewer'
);
select extensions.is(
  (select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'viewer', 'portal')->'overview'->>'price'),
  null, 'as a viewer, the price stays hidden, as for a real viewer'
);
select extensions.is(
  (select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'owner', 'portal')->'overview'->>'price'),
  '900.000', 'as an owner, the price shows'
);
select extensions.ok(
  (select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'finance', 'invoices') is not null),
  'invoices open in a preview'
);
select extensions.throws_ok(
  $$select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'admin', 'portal')$$,
  'P0001', 'invalid_role', 'only client roles can be previewed'
);
select extensions.throws_ok(
  $$select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'owner', 'whatever')$$,
  'P0001', 'invalid_read', 'only the portal reads can be called'
);
select extensions.throws_ok(
  $$select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'owner', 'portal');
    update public.clients set brand = 'changed' where id = 'c-pre'$$,
  '25006', null, 'nothing can be written after a preview in the same transaction'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000103');
select extensions.is(
  (select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'approver', 'portal')->>'role'),
  'approver', 'a producer can preview too'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000102');
select extensions.throws_ok(
  $$select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'owner', 'portal')$$,
  'P0001', 'forbidden', 'an editor cannot preview'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000104');
select extensions.throws_ok(
  $$select public.team_preview('10000000-0000-4000-8000-000000000101', 'c-pre', 'owner', 'portal')$$,
  'P0001', 'forbidden', 'a client cannot use the preview'
);
select extensions.is(
  (select public.get_my_portal('10000000-0000-4000-8000-000000000101', 'c-pre')->>'role'),
  'owner', 'the real client still reads their portal as before'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000101');
select extensions.throws_ok(
  $$select public.get_my_portal('10000000-0000-4000-8000-000000000101', 'c-pre')$$,
  'P0001', 'forbidden', 'outside a preview, the team is not a client'
);

select * from extensions.finish();
rollback;
