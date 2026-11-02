begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(17);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'sara@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'sami@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder');
insert into public.clients(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'c-dc', 'Synthetic Clean');

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
  ('sara', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'sara@client.test', 'approver')),
  ('sami', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'sami@client.test', 'viewer'));
insert into pg_temp.ids values ('cut', public.save_cut('10000000-0000-4000-8000-000000000001', 'c-dc', null, 'Reel 1, the stain'));
select extensions.throws_ok(
  $$select public.set_cut_status('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'review')$$,
  'cut_needs_preview', 'nothing goes to the client without a preview'
);
select extensions.throws_ok(
  $$select public.add_cut_version('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids),
      '10000000-0000-4000-8000-000000000001/c-other/x/v1.mp4', 1000, 30, '')$$,
  'invalid_cut', 'a preview must sit in this cut''s folder'
);
select public.add_cut_version('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids),
  '10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids) || '/v1.mp4', 1000, 30.5, '');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sara'), 'Sara');
select extensions.is(
  jsonb_array_length(public.get_my_cuts('10000000-0000-4000-8000-000000000001', 'c-dc')->'cuts'), 0,
  'the client never sees a draft'
);
select extensions.ok(
  not public.cut_file_access('10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids) || '/v1.mp4', false),
  'nor its file'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select public.set_cut_status('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'review');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select extensions.ok(
  public.cut_file_access('10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids) || '/v1.mp4', false),
  'once sent, the client can watch it'
);
select extensions.ok(
  not public.cut_file_access('10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids) || '/v2.mp4', true),
  'but never upload'
);
select public.client_cut_note('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'comment', 1, 12.4, 'Logo too small here');
select public.client_cut_note('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'changes', 1, null, 'See the note at 0:12');
select extensions.is(
  public.get_my_cuts('10000000-0000-4000-8000-000000000001', 'c-dc')->'cuts'->0->'notes'->0->>'at', '12.40',
  'a note keeps its moment'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'sami@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sami'), 'Sami');
select extensions.throws_ok(
  $$select public.client_cut_note('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'approve', 1, null, '')$$,
  'approver_only', 'a viewer comments but does not approve'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.throws_ok(
  $$select public.set_cut_status('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'draft')$$,
  'cut_seen', 'a cut the client has spoken on can''t be pulled back'
);
select public.add_cut_version('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids),
  '10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids) || '/v2.mp4', 1000, 30.5, 'Bigger logo');
select extensions.is(
  public.get_cuts('10000000-0000-4000-8000-000000000001', 'c-dc')->'cuts'->0->>'status', 'review',
  'a new version goes back to the client'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select extensions.throws_ok(
  $$select public.client_cut_note('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'approve', 1, null, '')$$,
  'cut_changed', 'approving an old version is refused'
);
select public.client_cut_note('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'approve', 2, null, '');

select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.throws_ok(
  $$select public.set_cut_final('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids), 'http://drive', '')$$,
  'invalid_link', 'the final link must be https'
);
select public.set_cut_final('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids),
  'https://drive.google.com/file/d/abc', '4K, 9:16');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select extensions.is(
  public.get_my_cuts('10000000-0000-4000-8000-000000000001', 'c-dc')->'cuts'->0->>'finalLink', null,
  'the final stays locked until the balance is paid'
);
select extensions.is(
  (public.get_my_cuts('10000000-0000-4000-8000-000000000001', 'c-dc')->'cuts'->0->>'delivered')::boolean, true,
  'but the client sees it is ready'
);
reset role;
insert into public.client_portals(workspace_id, client_id, balance_status)
  values ('10000000-0000-4000-8000-000000000001', 'c-dc', 'paid')
  on conflict (workspace_id, client_id) do update set balance_status = 'paid';
set local role authenticated;
select extensions.is(
  public.get_my_cuts('10000000-0000-4000-8000-000000000001', 'c-dc')->'cuts'->0->>'finalLink',
  'https://drive.google.com/file/d/abc', 'once paid, the link shows'
);
select extensions.throws_ok(
  $$select public.delete_cut('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids))$$,
  'forbidden', 'only the team deletes a cut'
);
select extensions.is(
  jsonb_array_length(public.get_my_cuts('10000000-0000-4000-8000-000000000001', 'c-dc')->'cuts'->0->'versions'), 2,
  'every version stays on record'
);

select * from extensions.finish();
rollback;
