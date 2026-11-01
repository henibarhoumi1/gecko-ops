begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'dany@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'farah@client.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Editor', 'editor');
insert into public.clients(workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'Dany Clean'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'RareRich');
insert into public.client_accounts(workspace_id, client_id, email, display_name, user_id, accepted_at, invited_by) values
  ('10000000-0000-4000-8000-000000000001', 'c-dany', 'dany@client.test', 'Dany', '00000000-0000-4000-8000-000000000006', now(), '00000000-0000-4000-8000-000000000001'),
  ('10000000-0000-4000-8000-000000000001', 'c-rare', 'farah@client.test', 'Farah', '00000000-0000-4000-8000-000000000007', now(), '00000000-0000-4000-8000-000000000001');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

create temp table ids (name text primary key, id uuid);
grant all on ids to authenticated;

set local role authenticated;
-- ---------- the team ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
insert into ids select 'root', (public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', null)->'board'->>'id')::uuid;
select extensions.is(
  public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', null)->'board'->>'title',
  'Dany Clean', 'the first open makes the client''s board, named after the brand'
);
select extensions.ok(
  public.save_board_items('10000000-0000-4000-8000-000000000001', 'c-dany', (select id from ids where name = 'root'), '[
    {"id":"20000000-0000-4000-8000-000000000001","kind":"note","x":10,"y":20,"data":{"text":"Bright, never clinical"}},
    {"id":"20000000-0000-4000-8000-000000000002","kind":"column","x":400,"y":20,"data":{"title":"Moodboard"}},
    {"id":"20000000-0000-4000-8000-000000000003","kind":"video","columnId":"20000000-0000-4000-8000-000000000002","data":{"url":"https://www.instagram.com/reel/abc/"}},
    {"id":"20000000-0000-4000-8000-000000000004","kind":"board","x":800,"data":{"title":"Shot list"}},
    {"id":"20000000-0000-4000-8000-000000000005","kind":"arrow","data":{"from":"20000000-0000-4000-8000-000000000001","to":"20000000-0000-4000-8000-000000000004"}}
  ]') > 1, 'the founder adds a note, a column with a video in it, a board and an arrow'
);
select extensions.is(
  (select count(*)::int from jsonb_array_elements(public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', null)->'items')),
  5, 'all five cards are on the board'
);
insert into ids select 'child', (i->'data'->>'boardId')::uuid
from jsonb_array_elements(public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', null)->'items') i
where i->>'kind' = 'board';
select extensions.is(
  public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', (select id from ids where name = 'child'))->'path'->0->>'title',
  'Dany Clean', 'a board inside the board knows its way back'
);
select extensions.throws_ok(
  $$select public.save_board_items('10000000-0000-4000-8000-000000000001', 'c-dany', null, '[{"id":"20000000-0000-4000-8000-000000000009","kind":"bomb"}]')$$,
  '23514', null, 'an unknown kind of card is refused'
);
select extensions.throws_ok(
  $$select public.save_board_items('10000000-0000-4000-8000-000000000001', 'c-dany', null, '[{"id":"not-a-uuid","kind":"note"}]')$$,
  'invalid_card', 'a card needs a proper id'
);

-- ---------- the client ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'dany@client.test');
select extensions.ok(
  public.save_board_items('10000000-0000-4000-8000-000000000001', 'c-dany', null,
    '[{"id":"20000000-0000-4000-8000-000000000001","kind":"note","x":50,"data":{"text":"Bright and warm"}}]') > 0,
  'the client edits the note'
);
select extensions.is(
  (select i->>'author' from jsonb_array_elements(public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', null)->'items') i
   where i->>'id' = '20000000-0000-4000-8000-000000000001'),
  'Heni', 'the card keeps who made it'
);
select extensions.is(
  public.rename_board('10000000-0000-4000-8000-000000000001', 'c-dany', (select id from ids where name = 'child'), 'Shot list, day 1') > 0,
  true, 'the client renames the inner board'
);
select extensions.is(
  (select i->'data'->>'title' from jsonb_array_elements(public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', null)->'items') i
   where i->>'kind' = 'board'),
  'Shot list, day 1', 'and its card follows'
);
select extensions.throws_ok(
  $$select public.get_board('10000000-0000-4000-8000-000000000001', 'c-rare', null)$$,
  'forbidden', 'the client cannot open another client''s board'
);
select extensions.throws_ok(
  $$select public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', '00000000-0000-4000-8000-0000000000ff')$$,
  'board_not_found', 'nor a board that is not theirs'
);
select extensions.throws_ok(
  $$select * from public.board_items$$,
  '42501', null, 'nobody reads the tables directly'
);

-- ---------- someone else ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'farah@client.test');
select extensions.throws_ok(
  format($$select public.save_board_items('10000000-0000-4000-8000-000000000001', 'c-rare', %L,
    '[{"id":"20000000-0000-4000-8000-000000000001","kind":"note"}]')$$, (select id from ids where name = 'root')),
  'board_not_found', 'another client cannot write to Dany Clean''s board through their own'
);

-- ---------- deleting ----------
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select public.delete_board_items('10000000-0000-4000-8000-000000000001', 'c-dany', null,
  array['20000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000004']::uuid[]);
select extensions.is(
  (select array_agg(i->>'kind' order by i->>'kind') from jsonb_array_elements(public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', null)->'items') i),
  array['note', 'video'], 'deleting a column keeps its cards; deleting a board takes its arrow'
);
select extensions.throws_ok(
  format($$select public.get_board('10000000-0000-4000-8000-000000000001', 'c-dany', %L)$$, (select id from ids where name = 'child')),
  'board_not_found', 'and the inner board is gone'
);

select * from extensions.finish();
rollback;
