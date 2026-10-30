begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(16);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sales@local.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'other@local.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO'),
  ('10000000-0000-4000-8000-000000000002', 'Isolated workspace');
insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Founder', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Editor', 'editor'),
  ('10000000-0000-4000-8000-000000000001', 'sales', '00000000-0000-4000-8000-000000000004', 'sales@local.test', 'Sales', 'sales'),
  ('10000000-0000-4000-8000-000000000002', 'other', '00000000-0000-4000-8000-000000000005', 'other@local.test', 'Other', 'founder');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;

-- The current app's calls keep working, now backed by the leads table.
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'leads', 'l1',
  '{"id":"l1","brand":"Glucelia","stage":"contacted","channel":"ig_organic","owner":"sales","next":"Send deck","nextDate":"2026-11-02","q":[true,false],"history":[{"at":"2026-10-25","stage":"prospect"}],"log":[],"lostReason":"","value":1200,"custom":"kept"}');
select extensions.is(
  (select row(brand, stage, owner_member_id, next_step, next_date, value, qualification)::text from public.leads where id = 'l1'),
  row('Glucelia', 'contacted', 'sales', 'Send deck', '2026-11-02'::date, 1200::numeric(12,3), '{t,f}'::boolean[])::text,
  'a lead saved by the current app lands in real columns'
);
select extensions.is(
  (select r - 'value' from public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'leads') r),
  '{"id":"l1","brand":"Glucelia","stage":"contacted","channel":"ig_organic","contact":"","handle":"","phone":"","whatsapp":"","url":"","sector":"","pack":"","owner":"sales","next":"Send deck","nextDate":"2026-11-02","lostReason":"","q":[true,false],"history":[{"at":"2026-10-25","stage":"prospect"}],"log":[],"custom":"kept"}'::jsonb,
  'the current app reads the same lead back, unknown fields included'
);
select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'leads', 'l2', '{"brand":"Ghost owner","stage":"prospect","owner":"nobody"}');
select extensions.is((select owner_member_id from public.leads where id = 'l2'), null, 'an owner who is not a member is dropped');
select extensions.throws_ok(
  $$select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'leads', 'l3', '{"brand":"Bad","stage":"maybe"}')$$,
  'P0001', 'invalid_lead', 'an unknown stage is refused'
);
select extensions.ok(
  public.delete_workspace_record('10000000-0000-4000-8000-000000000001', 'leads', 'l2'),
  'the current app can delete a lead'
);
select extensions.lives_ok(
  $$select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'tasks', 't1', '{"title":"Still a record"}')$$,
  'other collections still go to workspace_records'
);

select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.throws_ok(
  $$select public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'leads')$$,
  'P0001', 'forbidden', 'an editor cannot read leads through the old call'
);

-- The new app's direct table access, as the authenticated role with row level security on.
set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001', 'founder@local.test');
select extensions.is((select count(*) from public.leads), 1::bigint, 'the founder sees the one remaining lead');
select pg_temp.act_as('00000000-0000-4000-8000-000000000004', 'sales@local.test');
select extensions.is((select count(*) from public.leads), 1::bigint, 'sales sees the workspace leads');
select extensions.lives_ok(
  $$insert into public.leads(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'l4', 'From sales')$$,
  'sales can add a lead'
);
select extensions.lives_ok(
  $$update public.leads set stage = 'meeting_booked' where id = 'l4'$$,
  'sales can move a lead'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000002', 'editor@local.test');
select extensions.is((select count(*) from public.leads), 0::bigint, 'an editor sees no leads');
select extensions.throws_ok(
  $$insert into public.leads(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'l5', 'From editor')$$,
  '42501', null, 'an editor cannot add a lead'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000005', 'other@local.test');
select extensions.is((select count(*) from public.leads), 0::bigint, 'another workspace sees none of these leads');
select extensions.throws_ok(
  $$insert into public.leads(workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000001', 'l6', 'Intruder')$$,
  '42501', null, 'another workspace cannot add leads here'
);
reset role;
select extensions.ok(not has_table_privilege('anon', 'public.leads', 'select'), 'signed-out visitors cannot read the leads table');

select * from extensions.finish();
rollback;
