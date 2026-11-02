begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(27);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000006', 'authenticated', 'authenticated', 'sara@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000007', 'authenticated', 'authenticated', 'sami@client.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000008', 'authenticated', 'authenticated', 'omar@other.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Heni', 'founder');
insert into public.clients(workspace_id, id, brand) values
  ('10000000-0000-4000-8000-000000000001', 'c-dc', 'Synthetic Clean'),
  ('10000000-0000-4000-8000-000000000001', 'c-rr', 'Synthetic Rich');

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
  ('sara', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'sara@client.test', 'owner')),
  ('sami', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-dc', 'sami@client.test', 'viewer')),
  ('omar', public.invite_client_account('10000000-0000-4000-8000-000000000001', 'c-rr', 'omar@other.test', 'owner'));

-- The team adds a post and its 7-day numbers.
insert into pg_temp.ids values ('post', public.save_post('10000000-0000-4000-8000-000000000001', 'c-dc', null, null,
  'Reel 1, the stain', 'instagram', true, 'https://instagram.com/p/abc', current_date - 8, ''));
select extensions.throws_ok(
  $$select public.save_post_numbers('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'post'),
      7, '{"spend": 120, "likes": 4}', '{}', '')$$,
  'invalid_numbers', 'only the template''s metrics are kept'
);
select extensions.throws_ok(
  $$select public.save_post_numbers('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'post'),
      7, '{"spend": -1}', '{}', '')$$,
  'invalid_numbers', 'no negative numbers'
);
select extensions.throws_ok(
  $$select public.save_post_numbers('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'post'),
      7, '{}', array['10000000-0000-4000-8000-000000000001/c-rr/x/a.jpg'], '')$$,
  'invalid_numbers', 'a screenshot must sit in this post''s folder'
);
select public.save_post_numbers('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'post'),
  7, '{"spend": 120.5, "impressions": 40000, "views3s": 12000, "clicks": 300, "purchases": 9, "revenue": 810}', '{}', '');
select extensions.is(
  public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')->'posts'->0->'numbers'->0->>'enteredBy', 'Heni',
  'the numbers say who typed them'
);
insert into pg_temp.ids values ('read', public.save_monthly_read('10000000-0000-4000-8000-000000000001', 'c-dc',
  date_trunc('month', current_date)::date, (select id from pg_temp.ids where who = 'post'), 'Stopped the scroll', null, '',
  array['Hands on the product beat faces', '', 'Price on screen early lifted clicks'], array['Open on the stain, no intro', 'Before and after in 3 s']));

-- The owner sees everything published, money included.
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sara'), 'Sara');
select extensions.is(
  public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')->'posts'->0->'numbers'->0->'metrics'->>'spend', '120.5',
  'the owner sees spend'
);
select extensions.is(
  jsonb_array_length(public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')->'reads'), 0,
  'a draft read stays with Gecko'
);
select extensions.throws_ok(
  $$select public.save_monthly_read('10000000-0000-4000-8000-000000000001', 'c-dc', current_date, null, '', null, '', '{}', '{}')$$,
  'forbidden', 'only Gecko writes the read'
);
-- The owner adds their own post and a screenshot for the 30-day mark.
insert into pg_temp.ids values ('mine', public.save_post('10000000-0000-4000-8000-000000000001', 'c-dc', null, null,
  'Story repost', 'tiktok', false, '', current_date - 2, ''));
select extensions.ok(
  public.results_file_access('10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids where who = 'post') || '/a.jpg', true),
  'the owner can drop a screenshot on any post'
);
select public.save_post_numbers('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'post'), 30, '{}',
  array['10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids where who = 'post') || '/a.jpg'], 'Insights from the 30th');
select extensions.is(
  public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')->'posts'->1->'numbers'->1->>'enteredBy', '',
  'a screenshot alone isn''t numbers'
);
select extensions.throws_ok(
  $$select public.save_post('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'post'), null,
      'Renamed', 'instagram', true, '', current_date - 8, '')$$,
  'post_not_found', 'the client edits only the posts their side added'
);
select extensions.throws_ok(
  $$select public.save_post('10000000-0000-4000-8000-000000000001', 'c-dc', null, null, 'Bad link', 'instagram', false,
      'javascript:alert(1)', current_date, '')$$,
  'invalid_post', 'links are https only'
);

-- The viewer reads, without money, and adds nothing.
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'sami@client.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'sami'), 'Sami');
select extensions.ok(
  not (public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')->'posts'->1->'numbers'->0->'metrics' ? 'spend'),
  'a viewer never sees spend'
);
select extensions.is(
  public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')->'posts'->1->'numbers'->0->'metrics'->>'clicks', '300',
  'but sees the rest'
);
select extensions.throws_ok(
  $$select public.save_post('10000000-0000-4000-8000-000000000001', 'c-dc', null, null, 'Mine', 'instagram', false, '', current_date, '')$$,
  'viewer_read_only', 'a viewer adds no posts'
);
select extensions.ok(
  not public.results_file_access('10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids where who = 'post') || '/b.jpg', true),
  'nor screenshots'
);

-- Someone from another client sees nothing.
select pg_temp.act_as('00000000-0000-4000-8000-000000000008', 'omar@other.test');
select public.accept_client_invite((select code from pg_temp.codes where who = 'omar'), 'Omar');
select extensions.throws_ok(
  $$select public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')$$,
  'forbidden', 'another client''s results are closed'
);
select extensions.ok(
  not public.results_file_access('10000000-0000-4000-8000-000000000001/c-dc/' || (select id from pg_temp.ids where who = 'post') || '/a.jpg', false),
  'and so are their screenshots'
);

-- Publishing: the client sees it and the tests land in Ideas as Gecko drafts.
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.is(
  public.publish_monthly_read('10000000-0000-4000-8000-000000000001', 'c-dc', (select id from pg_temp.ids where who = 'read')), 2,
  'two tests become two ideas'
);
select extensions.is(
  (select count(*)::int from public.concepts c where c.client_id = 'c-dc' and c.status = 'draft' and c.author_name = 'Heni'), 2,
  'as Gecko drafts'
);
select extensions.throws_ok(
  $$select public.save_monthly_read('10000000-0000-4000-8000-000000000001', 'c-dc', current_date, null, '', null, '', '{x}', '{}')$$,
  'read_published', 'a published read is final'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000006', 'sara@client.test');
select extensions.is(
  jsonb_array_length(public.get_my_portal('10000000-0000-4000-8000-000000000001', 'c-dc')->'concepts'), 0,
  'the client doesn''t see those drafts until Gecko sends them'
);
select extensions.is(
  public.get_results('10000000-0000-4000-8000-000000000001', 'c-dc')->'reads'->0->'learned',
  '["Hands on the product beat faces", "Price on screen early lifted clicks"]'::jsonb,
  'the owner reads it, empty lines dropped'
);

-- Library: the team adds clips with Drive links; the client sees them without the link and asks for a cut.
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
insert into pg_temp.ids values ('clip', public.save_library_item('10000000-0000-4000-8000-000000000001', 'c-dc', null, 'clip',
  'Spray on fabric, macro', 'Shoot 12 Nov', current_date, array['Product', 'texture', ' product '], 6.5, null,
  'https://drive.google.com/file/d/abc', null));
select extensions.is(
  public.get_library('10000000-0000-4000-8000-000000000001', 'c-dc')->'items'->0->'tags', '["product", "texture"]'::jsonb,
  'tags are tidied'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000007', 'sami@client.test');
select extensions.is(
  public.get_library('10000000-0000-4000-8000-000000000001', 'c-dc')->'items'->0->>'link', '',
  'the client never gets the Drive link'
);
select extensions.throws_ok(
  $$select public.save_library_item('10000000-0000-4000-8000-000000000001', 'c-dc', null, 'clip', 'Mine', '', null, '{}', null, null, '', null)$$,
  'viewer_read_only', 'the client adds nothing to the library'
);
select public.library_request('10000000-0000-4000-8000-000000000001', 'c-dc', array[(select id from pg_temp.ids where who = 'clip')],
  'A 10 s cutdown for stories');
select extensions.ok(
  (select public.get_my_shared('10000000-0000-4000-8000-000000000001', 'c-dc')::text like '%Spray on fabric, macro (Shoot 12 Nov)%'),
  'the pick lands as a request Gecko answers'
);
select extensions.ok(
  not public.library_file_access('10000000-0000-4000-8000-000000000001/c-dc/t.jpg', true)
    and public.library_file_access('10000000-0000-4000-8000-000000000001/c-dc/t.jpg', false),
  'the client sees thumbnails but never uploads them'
);

select * from extensions.finish();
rollback;
