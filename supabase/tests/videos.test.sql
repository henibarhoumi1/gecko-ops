begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(26);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'dany@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'farah@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'stranger@local.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Editor', 'editor');
insert into public.clients(workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Dany Clean'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'RareRich');
insert into public.client_accounts(workspace_id, client_id, email, display_name, user_id, accepted_at, revoked_at, invited_by) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'dany@client.test', 'Dany', '00000000-0000-4000-8000-000000000006', now(), null, '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'farah@client.test', 'Farah', '00000000-0000-4000-8000-000000000007', now(), null, '00000000-0000-4000-8000-000000000001');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

-- V1 is shared with Dany Clean, V2 stays a draft.
-- ---------- the team ----------
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.lives_ok(
  $$insert into public.videos(id, workspace_id, client_id, title, position) values
      ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'c-dany', 'Reel 1: the spill', 0),
      ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'c-dany', 'Reel 2: still editing', 1)$$,
  'the founder adds two videos'
);
select extensions.throws_ok(
  $$insert into public.videos(workspace_id, client_id, title, status)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Nothing to watch', 'review')$$,
  '23514', null, 'a video without a preview cannot be shared'
);
select extensions.lives_ok(
  $$update public.videos set preview_uid = repeat('a', 32), status = 'review'
    where id = '20000000-0000-4000-8000-000000000001'$$,
  'the founder uploads a preview and shares it'
);
select extensions.is(
  (select version from public.videos where id = '20000000-0000-4000-8000-000000000001'),
  1, 'the first preview is version 1'
);
select extensions.throws_ok(
  $$update public.videos set status = 'approved' where id = '20000000-0000-4000-8000-000000000001'$$,
  'P0001', 'client_only', 'the team cannot approve on the client''s behalf'
);
select extensions.lives_ok(
  $$insert into public.concepts(id, workspace_id, client_id, title, status)
    values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'c-rare', 'RareRich idea', 'review')$$,
  'a concept for another client'
);
select extensions.throws_ok(
  $$update public.videos set concept_id = '30000000-0000-4000-8000-000000000001'
    where id = '20000000-0000-4000-8000-000000000001'$$,
  'P0001', 'invalid_video', 'a video cannot point at another client''s concept'
);
select extensions.throws_ok(
  $$update public.videos set final_key = '10000000-0000-4000-8000-000000000001/c-rare/x.mp4', final_name = 'x.mp4'
    where id = '20000000-0000-4000-8000-000000000001'$$,
  '23514', null, 'a final file must sit under its own client'
);
select extensions.lives_ok(
  $$update public.videos set final_key = '10000000-0000-4000-8000-000000000001/c-dany/20000000-0000-4000-8000-000000000001/final.mp4',
      final_name = 'Reel 1.mp4', final_size = 1048576
    where id = '20000000-0000-4000-8000-000000000001'$$,
  'the founder attaches the final file'
);
select extensions.throws_ok(
  $$insert into public.video_notes(workspace_id, client_id, video_id, kind, from_client, body)
    values ('10000000-0000-4000-8000-000000000001', 'c-dany', '20000000-0000-4000-8000-000000000001', 'approve', true, '')$$,
  'P0001', 'client_only', 'the team cannot write an approval note'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.is((select count(*) from public.videos), 0::bigint, 'an editor sees no videos of clients they are not on');
select extensions.throws_ok(
  $$select public.video_media_access('20000000-0000-4000-8000-000000000001')$$,
  'P0001', 'forbidden', 'an editor not on the client gets no links'
);

-- ---------- the client ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is((select count(*) from public.videos), 0::bigint, 'a client cannot read the videos table directly');
select extensions.is(
  jsonb_array_length(public.get_my_videos('10000000-0000-4000-8000-000000000001', 'c-dany')->'videos'),
  1, 'the client sees the shared video and not the draft'
);
select extensions.is(
  public.video_media_access('20000000-0000-4000-8000-000000000001')->>'canDownload',
  'false', 'the final stays locked while the balance is unpaid'
);
select extensions.ok(
  public.video_media_access('20000000-0000-4000-8000-000000000001')->'finalKey' = 'null'::jsonb,
  'a locked final does not even give away its file name'
);
select extensions.throws_ok(
  $$select public.video_media_access('20000000-0000-4000-8000-000000000002')$$,
  'P0001', 'forbidden', 'the client cannot open a draft'
);
select extensions.throws_ok(
  $$select public.client_video_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      '20000000-0000-4000-8000-000000000001', 'approve', '', 2)$$,
  'P0001', 'video_changed', 'approving a version the client did not watch is refused'
);
select extensions.is(
  public.client_video_note('10000000-0000-4000-8000-000000000001', 'c-dany',
    '20000000-0000-4000-8000-000000000001', 'approve', 'Perfect', 1)->>'status',
  'approved', 'the client approves version 1'
);

-- ---------- a new cut, then the balance ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
update public.videos set preview_uid = repeat('b', 32) where id = '20000000-0000-4000-8000-000000000001';
select extensions.is(
  (select status || '/' || version::text || '/' || coalesce(approved_version::text, 'none')
   from public.videos where id = '20000000-0000-4000-8000-000000000001'),
  'review/2/none', 'a new cut is version 2 and goes back to the client'
);
insert into public.client_portals(workspace_id, client_id, balance_status)
  values ('10000000-0000-4000-8000-000000000001', 'c-dany', 'paid');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.is(
  public.video_media_access('20000000-0000-4000-8000-000000000001')->>'finalName',
  'Reel 1.mp4', 'once the balance is paid, the client can download the final'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'farah@client.test');
select extensions.throws_ok(
  $$select public.get_my_videos('10000000-0000-4000-8000-000000000001', 'c-dany')$$,
  'P0001', 'forbidden', 'another client cannot list Dany Clean''s videos'
);
select extensions.throws_ok(
  $$select public.video_media_access('20000000-0000-4000-8000-000000000001')$$,
  'P0001', 'forbidden', 'another client gets no links to Dany Clean''s videos'
);
select extensions.throws_ok(
  $$select public.client_video_note('10000000-0000-4000-8000-000000000001', 'c-dany',
      '20000000-0000-4000-8000-000000000001', 'comment', 'hi', 2)$$,
  'P0001', 'forbidden', 'another client cannot comment on it'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000008', 'stranger@local.test');
select extensions.throws_ok(
  $$select public.video_media_access('20000000-0000-4000-8000-000000000001')$$,
  'P0001', 'forbidden', 'a stranger gets no links'
);

reset role;
set local role anon;
select extensions.throws_ok(
  $$select public.video_media_access('20000000-0000-4000-8000-000000000001')$$,
  '42501', null, 'signed-out visitors cannot ask for links at all'
);
reset role;

select * from extensions.finish();
rollback;
