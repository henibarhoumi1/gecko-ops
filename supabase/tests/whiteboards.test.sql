begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'sara@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000009', 'authenticated', 'authenticated', 'stranger@client.test', '', now(), '{}', '{}', now(), now());
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
  ('sara', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'sara@client.test', 'viewer'));
insert into pg_temp.ids values ('wb', public.create_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', 'Moodboard'));
select public.save_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids),
  '[{"id":"a","type":"rectangle","version":3,"index":"a0"},{"id":"b","type":"text","version":1,"index":"a1"}]', '{}');

select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sara'), 'Sara');
select extensions.is(
  jsonb_array_length(public.list_whiteboards('10000000-0000-4000-8000-000000000001', 'c-dc')), 1,
  'the client sees the board'
);
select extensions.lives_ok(
  $$select public.save_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids),
      '[{"id":"a","type":"rectangle","version":2,"index":"a0","stale":true},{"id":"b","type":"text","version":2,"index":"a1","mine":true},{"id":"c","type":"embeddable","version":1,"index":"a2"}]',
      '{"f1":{"path":"10000000-0000-4000-8000-000000000001/c-dc/x.jpg","mimeType":"image/jpeg"}}')$$,
  'even a viewer draws on the board'
);
select extensions.is(
  (select jsonb_agg(e->>'id' order by e->>'index') from jsonb_array_elements(
     public.get_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids))->'elements') e),
  '["a","b","c"]'::jsonb, 'new elements are added in order'
);
select extensions.is(
  (select (e->>'stale') from jsonb_array_elements(
     public.get_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids))->'elements') e where e->>'id' = 'a'),
  null, 'an older version never overwrites a newer one'
);
select extensions.is(
  (select (e->>'mine') from jsonb_array_elements(
     public.get_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids))->'elements') e where e->>'id' = 'b'),
  'true', 'a newer version wins'
);
select extensions.throws_ok(
  $$select public.save_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids),
      '[]', '{"f2":{"path":"10000000-0000-4000-8000-000000000001/c-other/x.jpg"}}')$$,
  'invalid_board', 'an image from another client''s folder is refused'
);
select extensions.throws_ok(
  $$select public.delete_whiteboard('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids))$$,
  'forbidden', 'only the team deletes a board'
);
select extensions.is(
  public.whiteboard_rev('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids)),
  3::bigint, 'each save moves the revision on'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000009', 'stranger@client.test');
select extensions.throws_ok(
  $$select public.list_whiteboards('10000000-0000-4000-8000-000000000001', 'c-dc')$$,
  'forbidden', 'someone with no access sees nothing'
);

select * from extensions.finish();
rollback;
