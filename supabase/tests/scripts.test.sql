begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(20);

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

-- ---------- the team writes ----------
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.lives_ok(
  $$insert into public.scripts(id, workspace_id, client_id, title, seconds, hooks, beats, cta, status) values
    ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'c-dany', 'Coffee spill', 20,
     '[{"see":"Coffee hits a white sofa","hear":"This used to mean a new sofa."},{"see":"Close on the stain","hear":"Watch this."}]',
     '[{"see":"Spray, wipe","hear":"One spray, ten seconds.","text":"10 seconds"},{"see":"Clean sofa","hear":"Gone."}]',
     'Order on the site', 'draft')$$,
  'the founder writes a draft script'
);
select extensions.is(
  (select author_name || '/' || version::text from public.scripts where title = 'Coffee spill'),
  'Heni/1', 'the database records who wrote the script'
);
select extensions.throws_ok(
  $$insert into public.scripts(workspace_id, client_id, title, hooks)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Bad', '[{"voice":"x"}]')$$,
  '23514', null, 'a malformed hook is refused'
);
select extensions.throws_ok(
  $$insert into public.scripts(workspace_id, client_id, title, status)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Pre-approved', 'approved')$$,
  'P0001', 'client_only', 'the team cannot create an approved script'
);
select extensions.is((select count(*) from public.script_versions), 0::bigint, 'a draft keeps no version');
update public.scripts set status = 'review' where title = 'Coffee spill';
select extensions.is((select count(*) from public.script_versions), 1::bigint, 'sharing a script freezes version 1');
select extensions.throws_ok(
  $$insert into public.script_versions(script_id, workspace_id, client_id, version, content)
    values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'c-dany', 9, '{}')$$,
  '42501', null, 'nobody writes the version history directly'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.is((select count(*) from public.scripts), 0::bigint, 'an editor sees no scripts of clients they are not on');

-- ---------- the client ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  jsonb_array_length(public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')->'scripts'),
  1, 'the client sees the shared script'
);
select extensions.throws_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000001', 'c-dany',
    '20000000-0000-4000-8000-000000000001', 'approve', '', 1, null, null)$$,
  'P0001', 'hook_required', 'approving a script with two hooks needs a hook picked'
);
select extensions.throws_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000001', 'c-dany',
    '20000000-0000-4000-8000-000000000001', 'approve', '', 7, null, 1)$$,
  'P0001', 'script_changed', 'approving an older version is refused'
);
select extensions.lives_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000001', 'c-dany',
    '20000000-0000-4000-8000-000000000001', 'comment', 'Say "ten seconds" slower', 1, 'beat-0', null)$$,
  'the client comments on one line'
);
select extensions.is(
  (select public.client_script_note('10000000-0000-4000-8000-000000000001', 'c-dany',
    '20000000-0000-4000-8000-000000000001', 'approve', '', 1, null, 1)->>'status'),
  'approved', 'the client approves with the second hook'
);
select extensions.throws_ok(
  $$insert into public.scripts(workspace_id, client_id, title)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Sneaky')$$,
  '42501', null, 'a client cannot write the scripts table directly'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'farah@client.test');
select extensions.throws_ok(
  $$select public.client_script_note('10000000-0000-4000-8000-000000000001', 'c-dany',
    '20000000-0000-4000-8000-000000000001', 'comment', 'hi', 1, null, null)$$,
  'P0001', 'forbidden', 'another client cannot comment on Dany Clean scripts'
);

-- ---------- an approved script is locked ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.is(
  (select hook::text || '/' || approved_by from public.scripts where title = 'Coffee spill'),
  '1/Dany', 'the approval records the hook and who approved'
);
update public.scripts set hook = 0 where title = 'Coffee spill';
select extensions.is(
  (select hook from public.scripts where title = 'Coffee spill'), 1, 'the team cannot change the picked hook'
);
update public.scripts set cta = 'Order today, delivery in Tunis' where title = 'Coffee spill';
select extensions.is(
  (select status || '/' || version::text || '/' || coalesce(hook::text, 'none') from public.scripts where title = 'Coffee spill'),
  'review/2/none', 'editing an approved script makes version 2 and sends it back to the client'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  (select public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dany')->'scripts'->0->'previous'->>'cta'),
  'Order on the site', 'the client can see what the script said before'
);
reset role;
select extensions.is(
  (select count(*) from public.script_notes where from_client and kind = 'approve' and hook = 1),
  1::bigint, 'the approval stays on record after the edit'
);

select * from extensions.finish();
rollback;
