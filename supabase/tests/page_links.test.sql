begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(8);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-0000000000c1', 'authenticated', 'authenticated', 'founder@pl.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-0000000000c2', 'authenticated', 'authenticated', 'other@pl.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values
  ('10000000-0000-4000-8000-0000000000c1', 'Links studio'), ('10000000-0000-4000-8000-0000000000c2', 'Other');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-0000000000c1', 'founder', '00000000-0000-4000-8000-0000000000c1', 'founder@pl.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-0000000000c2', 'other', '00000000-0000-4000-8000-0000000000c2', 'other@pl.test', 'O', 'founder');
insert into public.studio_pages (id, workspace_id, title, kind, template, blocks) values
  ('20000000-0000-4000-8000-0000000000c1', '10000000-0000-4000-8000-0000000000c1', 'Quote for Dany', 'doc', 'quote',
   '[{"id":"a","type":"text","text":"Hello"}]');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create temp table tok (t text);
grant all on tok to authenticated, anon;

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000c1', 'founder@pl.test');
insert into tok select public.create_page_link('20000000-0000-4000-8000-0000000000c1', true);
select extensions.is((select length(t) from tok), 64, 'the team gets a link token');

select pg_temp.act_as('00000000-0000-4000-8000-0000000000c2', 'other@pl.test');
select extensions.throws_ok(
  $$select public.create_page_link('20000000-0000-4000-8000-0000000000c1', false)$$,
  'P0001', 'page_not_found', 'another studio cannot share our page'
);

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select extensions.is((select public.get_page_by_link((select t from tok))->>'title'), 'Quote for Dany',
  'anyone with the link reads the page');
select extensions.throws_ok($$select public.get_page_by_link('nope')$$, 'P0001', 'link_expired', 'a wrong token reads nothing');
select extensions.is((select public.accept_page_by_link((select t from tok), 'Olfa')->>'acceptedName'), 'Olfa',
  'the reader accepts with their name');
select extensions.throws_ok($$select public.accept_page_by_link((select t from tok), 'Olfa')$$, 'P0001', 'already_accepted',
  'it can be accepted only once');

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-0000000000c1', 'founder@pl.test');
select extensions.is((select (public.get_page_links('20000000-0000-4000-8000-0000000000c1')->0->>'views')::int), 1,
  'the team sees the view count');
select public.revoke_page_link((select (public.get_page_links('20000000-0000-4000-8000-0000000000c1')->0->>'id')::uuid));
set local role anon;
select extensions.throws_ok($$select public.get_page_by_link((select t from tok))$$, 'P0001', 'link_expired',
  'a revoked link stops working');

reset role;
select * from extensions.finish();
rollback;
