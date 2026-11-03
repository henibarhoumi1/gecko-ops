begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(13);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000301', 'authenticated', 'authenticated', 'founder@site.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000302', 'authenticated', 'authenticated', 'editor@site.test', '', now(), '{}', '{}', now(), now());
-- The website belongs to the first workspace created; make this one the oldest.
insert into public.workspaces (id, name, created_at) values ('10000000-0000-4000-8000-000000000301', 'Site GECKO', '2000-01-01');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000301', 'founder', '00000000-0000-4000-8000-000000000301', 'founder@site.test', 'Heni', 'founder'),
  ('10000000-0000-4000-8000-000000000301', 'editor', '00000000-0000-4000-8000-000000000302', 'editor@site.test', 'Editor', 'editor');

create function pg_temp.act_as(p_user text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', p_user), true);
$$;

set local role anon;
select extensions.ok(
  public.submit_website_lead('{"kind":"brief","name":"Sara","brand":"Fresh Co","phone":"+216 20 123 456","answers":{"who":"A brand that sells online"},"lang":"fr","plan":"regular"}') like 'web-%',
  'an anonymous visitor can send a brief'
);
select extensions.is(
  public.submit_website_lead('{"kind":"brief","name":"Sara","brand":"Fresh Co","phone":"+216 20 123 456"}'),
  'duplicate', 'the same phone again within 10 minutes is not saved twice'
);
select extensions.is(
  public.submit_website_lead('{"kind":"contact","name":"Bot","email":"bot@x.test","website":"http://spam"}'),
  null, 'a bot that fills the hidden field is ignored'
);
select extensions.throws_ok(
  $$select public.submit_website_lead('{"kind":"contact","name":"","email":""}')$$,
  'P0001', 'invalid_lead', 'a lead needs a name and a way to reply'
);
select extensions.ok(
  public.submit_website_lead('{"kind":"contact","name":"Omar","email":"omar@brand.test","message":"Hello"}') like 'web-%',
  'a contact message with an email is saved'
);
select extensions.throws_ok($$select count(*) from public.leads$$, '42501', null, 'visitors cannot read leads');
select extensions.throws_ok($$select count(*) from public.site_events$$, '42501', null, 'visitors cannot read the counts');
select public.count_site_event('view', 'fr');
select public.count_site_event('view', 'fr');
select public.count_site_event('brief_start', 'en');
select extensions.lives_ok($$select public.count_site_event('nonsense', 'xx')$$, 'an unknown event is ignored quietly');
select extensions.throws_ok(
  $$select public.get_site_stats('10000000-0000-4000-8000-000000000301', 7)$$,
  '42501', null, 'visitors cannot read the website stats'
);

reset role;
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000302');
select extensions.throws_ok(
  $$select public.get_site_stats('10000000-0000-4000-8000-000000000301', 7)$$,
  'P0001', 'forbidden', 'an editor cannot read the website stats'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000301');
select extensions.is(
  (public.get_site_stats('10000000-0000-4000-8000-000000000301', 7)->'totals'->>'view')::int, 2,
  'the founder sees today''s visits'
);
select extensions.is(
  jsonb_array_length(public.get_site_stats('10000000-0000-4000-8000-000000000301', 7)->'leads'), 2,
  'the founder sees the two website leads'
);
select extensions.is(
  (select l.channel || ' ' || l.stage || ' ' || l.whatsapp || ' ' || (l.extra->>'person')
   from public.leads l where l.brand = 'Fresh Co'),
  'Website prospect +216 20 123 456 Sara', 'the brief lands in the Pipeline as a website prospect'
);

select * from extensions.finish();
rollback;
