begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sales@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'dany@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'farah@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'stranger@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'gone@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Editor', 'editor'),
  ('10000000-0000-4000-8000-000000000001', 'sales', '00000000-0000-4000-8000-000000000004', 'sales@local.test', 'Sales', 'sales');
insert into public.clients(workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Dany Clean'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'RareRich');
insert into public.client_accounts(workspace_id, client_id, email, display_name, user_id, accepted_at, revoked_at, invited_by) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'dany@client.test', 'Dany', '00000000-0000-4000-8000-000000000006', now(), null, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'farah@client.test', 'Farah', '00000000-0000-4000-8000-000000000007', now(), null, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'gone@client.test', 'Gone', '00000000-0000-4000-8000-000000000009', now(), now(), '00000000-0000-4000-8000-000000000001');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

-- ---------- the team, through the tables ----------
set local role authenticated;

set local role authenticated;
-- ---------- the client ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  (public.client_save_brand_notes('10000000-0000-4000-8000-000000000001', 'c-dany', 'Never say "chemical".')->'brandNotes'->>'updatedBy'),
  'Dany', 'the client writes the brand notes'
);
select extensions.lives_ok(
  $$select public.client_add_shared('10000000-0000-4000-8000-000000000001', 'c-dany', 'reference', 'This light', '', 'https://www.instagram.com/reel/abc')$$,
  'the client adds a reference'
);
select extensions.throws_ok(
  $$select public.client_add_shared('10000000-0000-4000-8000-000000000001', 'c-dany', 'reference', 'Bad', '', 'javascript:alert(1)')$$,
  'P0001', 'invalid_item', 'a link that is not http or https is refused'
);
select extensions.is(
  (public.client_add_shared('10000000-0000-4000-8000-000000000001', 'c-dany', 'request', 'New product', 'We launch a lemon scent on the 20th.', '')->>'status'),
  'open', 'a client request opens'
);
select extensions.throws_ok(
  $$insert into public.shared_items(workspace_id, client_id, kind, body) values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'reference', 'x')$$,
  '42501', null, 'a client cannot write the table directly'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'farah@client.test');
select extensions.throws_ok(
  $$select public.get_my_shared('10000000-0000-4000-8000-000000000001', 'c-dany')$$,
  'P0001', 'forbidden', 'another client cannot open Dany Clean''s shared space'
);

-- ---------- the team ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.throws_ok(
  $$insert into public.shared_items(workspace_id, client_id, kind, body, status) values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'request', 'fake', 'open')$$,
  'P0001', 'client_only', 'the team cannot file a request on the client''s behalf'
);
select extensions.lives_ok(
  $$insert into public.shared_items(workspace_id, client_id, kind, title, url) values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'reference', 'Pacing', 'https://example.com/ref')$$,
  'the founder adds a reference'
);
update public.shared_items set answer = 'Noted, we add it to the shoot.', body = 'rewritten' where kind = 'request';
select extensions.is(
  (select status || '/' || answered_by || '/' || body from public.shared_items where kind = 'request'),
  'answered/Heni/We launch a lemon scent on the 20th.', 'answering stamps who answered and keeps the client''s words'
);
update public.client_brand_notes set body = body || E'\nNo before/after on skin.';
select extensions.is(
  (select updated_by_name from public.client_brand_notes), 'Heni', 'the team edits the brand notes too'
);
delete from public.shared_items where from_client;
select extensions.is((select count(*) from public.shared_items where from_client), 2::bigint, 'the team cannot delete what the client added');
select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.is((select count(*) from public.shared_items), 0::bigint, 'an editor not on the client sees nothing');

-- ---------- the client again ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  public.client_remove_shared('10000000-0000-4000-8000-000000000001', 'c-dany',
    (select (x->>'id')::uuid from jsonb_array_elements(public.get_my_shared('10000000-0000-4000-8000-000000000001', 'c-dany')->'items') x where x->>'kind' = 'request')),
  false, 'an answered request cannot be withdrawn'
);
select extensions.is(
  jsonb_array_length(public.get_my_shared('10000000-0000-4000-8000-000000000001', 'c-dany')->'items'), 3,
  'the client sees both sides'' items'
);

-- ---------- the invite page ----------
reset role;
insert into public.client_accounts(workspace_id, client_id, email, token_hash, expires_at, invited_by) values
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'new@client.test',
   extensions.digest(convert_to(repeat('ab', 32), 'UTF8'), 'sha256'), now() + interval '7 days', '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'old@client.test',
   extensions.digest(convert_to(repeat('cd', 32), 'UTF8'), 'sha256'), now() - interval '1 day', '00000000-0000-4000-8000-000000000001');
set local role anon;
select extensions.is(public.peek_client_invite(repeat('ab', 32))->>'brand', 'RareRich', 'a live invite link shows its brand to a signed-out visitor');
select extensions.is(public.peek_client_invite(repeat('cd', 32)), null, 'an expired invite shows nothing');
select extensions.is(public.peek_client_invite('nope'), null, 'a malformed code shows nothing');
reset role;

select * from extensions.finish();
rollback;
