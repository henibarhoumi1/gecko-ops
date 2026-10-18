begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(28);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'founder@local.test', '', now(), '{}', '{"name":"Founder"}', now(), now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'editor@local.test', '', now(), '{}', '{"name":"Editor"}', now(), now()),
  ('00000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'assistant@local.test', '', now(), '{}', '{"name":"Assistant"}', now(), now()),
  ('00000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'sales@local.test', '', now(), '{}', '{"name":"Sales"}', now(), now()),
  ('00000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'other@local.test', '', now(), '{}', '{"name":"Other"}', now(), now());

insert into public.workspaces (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Synthetic GECKO'),
  ('10000000-0000-4000-8000-000000000002', 'Isolated workspace');

insert into public.workspace_members(workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000001', 'founder', '00000000-0000-4000-8000-000000000001', 'founder@local.test', 'Founder', 'founder'),
  ('10000000-0000-4000-8000-000000000001', 'editor', '00000000-0000-4000-8000-000000000002', 'editor@local.test', 'Editor', 'editor'),
  ('10000000-0000-4000-8000-000000000001', 'assistant', '00000000-0000-4000-8000-000000000003', 'assistant@local.test', 'Assistant', 'assistant'),
  ('10000000-0000-4000-8000-000000000001', 'sales', '00000000-0000-4000-8000-000000000004', 'sales@local.test', 'Sales', 'sales'),
  ('10000000-0000-4000-8000-000000000002', 'other', '00000000-0000-4000-8000-000000000005', 'other@local.test', 'Other', 'founder');

insert into public.clients(workspace_id, id, brand, data) values
  ('10000000-0000-4000-8000-000000000001', 'c1', 'Synthetic One', '{"id":"c1","brand":"Synthetic One"}'),
  ('10000000-0000-4000-8000-000000000001', 'c2', 'Synthetic Two', '{"id":"c2","brand":"Synthetic Two"}'),
  ('10000000-0000-4000-8000-000000000002', 'c3', 'Other Workspace', '{"id":"c3","brand":"Other Workspace"}');

insert into public.projects(workspace_id, id, client_id, data) values
  ('10000000-0000-4000-8000-000000000001', 'p1', 'c1', '{"id":"p1","clientId":"c1","name":"Assigned"}'),
  ('10000000-0000-4000-8000-000000000001', 'p2', 'c2', '{"id":"p2","clientId":"c2","name":"Unassigned"}'),
  ('10000000-0000-4000-8000-000000000002', 'p3', 'c3', '{"id":"p3","clientId":"c3","name":"Foreign"}');

insert into public.client_assignments(workspace_id, client_id, member_id) values
  ('10000000-0000-4000-8000-000000000001', 'c1', 'editor');
insert into public.project_assignments(workspace_id, project_id, member_id) values
  ('10000000-0000-4000-8000-000000000001', 'p1', 'editor'),
  ('10000000-0000-4000-8000-000000000001', 'p1', 'assistant');

insert into public.workspace_records(workspace_id, collection, id, client_id, project_id, assigned_member_id, data) values
  ('10000000-0000-4000-8000-000000000001', 'tasks', 't1', 'c1', 'p1', 'editor', '{"id":"t1","clientId":"c1","projectId":"p1","who":"editor","title":"Assigned task"}'),
  ('10000000-0000-4000-8000-000000000001', 'tasks', 't2', 'c2', 'p2', 'sales', '{"id":"t2","clientId":"c2","projectId":"p2","who":"sales","title":"Private task"}');

insert into public.workspace_settings(workspace_id, data) values
  ('10000000-0000-4000-8000-000000000001', '{"private":"founder-only","teamPrivate":{"editor":{"pay":{"type":"day","amount":200}}},"rolePay":{"editor":{"type":"project"}},"cash":{"accounts":[]}}'),
  ('10000000-0000-4000-8000-000000000002', '{}');

insert into public.client_shares(
  id, workspace_id, client_id, token_hash, snapshot, feedback_targets,
  published_by, created_by
) values
  (
    '20000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    'c1',
    extensions.digest(convert_to(repeat('a', 64), 'UTF8'), 'sha256'),
    public.sanitize_public_snapshot('{"brand":{"name":"Synthetic One"},"sections":{"plan":true},"projects":[{"id":"p1","name":"Synthetic Project"}],"internalSecret":"must-not-leak"}'::jsonb),
    '{"plan":["approve","changes"],"other":["comment"]}'::jsonb,
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    'c2',
    extensions.digest(convert_to(repeat('b', 64), 'UTF8'), 'sha256'),
    public.sanitize_public_snapshot('{"brand":{"name":"Synthetic Two"},"sections":{"plan":true},"projects":[]}'::jsonb),
    '{"plan":["approve"]}'::jsonb,
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'c1',
    extensions.digest(convert_to(repeat('c', 64), 'UTF8'), 'sha256'),
    public.sanitize_public_snapshot('{"brand":{"name":"Expired"},"sections":{"plan":true},"projects":[]}'::jsonb),
    '{"plan":["approve"]}'::jsonb,
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  ),
  (
    '20000000-0000-4000-8000-000000000004',
    '10000000-0000-4000-8000-000000000001',
    'c2',
    extensions.digest(convert_to(repeat('d', 64), 'UTF8'), 'sha256'),
    public.sanitize_public_snapshot('{"brand":{"name":"Synthetic Two"},"sections":{"plan":true},"projects":[]}'::jsonb),
    '{"plan":["approve"]}'::jsonb,
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001'
  );
update public.client_shares set expires_at = now() - interval '1 minute'
where id = '20000000-0000-4000-8000-000000000003';
update public.client_shares set revoked_at = now()
where id = '20000000-0000-4000-8000-000000000002';

select extensions.ok(not has_table_privilege('anon', 'public.clients', 'select'), 'anonymous role cannot select private clients');
select extensions.ok(not has_table_privilege('authenticated', 'public.clients', 'select'), 'authenticated browser role cannot bypass private RPCs');
select extensions.ok(not has_function_privilege('anon', 'public.get_workspace_records(uuid,text)', 'execute'), 'anonymous role cannot invoke private workspace reads');

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select extensions.throws_ok(
  $$select * from public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'clients')$$,
  'P0001', 'forbidden', 'anonymous cannot read workspace records'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated","email":"editor@local.test"}', true);
select extensions.is(public.get_workspace_config('10000000-0000-4000-8000-000000000001')->'teamPrivate', null::jsonb, 'non-founders never receive team pay or credentials');
select extensions.ok(public.get_workspace_config('10000000-0000-4000-8000-000000000001') ?| array['rolePay', 'cash'] = false, 'non-founders never receive role pay defaults or the cash book');
select extensions.is((select count(*) from public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'clients')), 1::bigint, 'editor sees only the assigned client');
select extensions.is((select count(*) from public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'projects')), 1::bigint, 'editor sees only the assigned project');
select extensions.is((select count(*) from public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'tasks')), 1::bigint, 'editor sees only the assigned task');
select extensions.throws_ok(
  $$select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'invoices', 'i1', '{"id":"i1"}'::jsonb)$$,
  'P0001', 'forbidden', 'editor cannot write invoices through a direct RPC'
);
select extensions.throws_ok(
  $$select * from public.get_workspace_records('10000000-0000-4000-8000-000000000002', 'clients')$$,
  'P0001', 'forbidden', 'workspace membership does not cross tenant boundaries'
);
select extensions.throws_ok(
  $$select public.set_workspace_config('10000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  'P0001', 'forbidden', 'editor cannot change workspace settings'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000003', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000003","role":"authenticated","email":"assistant@local.test"}', true);
select extensions.is((select count(*) from public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'projects')), 1::bigint, 'assistant sees only the explicitly assigned project');
select extensions.throws_ok(
  $$select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'projects', 'p2', '{"id":"p2","clientId":"c2"}'::jsonb)$$,
  'P0001', 'forbidden', 'assistant cannot mutate a project'
);
select extensions.throws_ok(
  $$select * from public.get_workspace_assignments('10000000-0000-4000-8000-000000000001')$$,
  'P0001', 'forbidden', 'assistant cannot enumerate assignments'
);
select extensions.lives_ok(
  $$select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'ideas', 's1', '{"id":"s1","clientId":"c1","projectId":"p1","takes":{"0":"good"}}'::jsonb)$$,
  'production can save takes on a script of its assigned project'
);
select extensions.throws_ok(
  $$select public.put_workspace_record('10000000-0000-4000-8000-000000000001', 'ideas', 's2', '{"id":"s2","clientId":"c2","projectId":"p2"}'::jsonb)$$,
  'P0001', NULL, 'production cannot write a script of a project it is not on'
);
select extensions.throws_ok(
  $$select * from public.get_workspace_records('10000000-0000-4000-8000-000000000001', 'invoices')$$,
  'P0001', 'forbidden', 'production still cannot read invoices'
);

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000004', true);
select set_config('request.jwt.claims', '{"sub":"00000000-0000-4000-8000-000000000004","role":"authenticated","email":"sales@local.test"}', true);
select extensions.throws_ok(
  $$select public.set_workspace_config('10000000-0000-4000-8000-000000000001', '{}'::jsonb)$$,
  'P0001', 'forbidden', 'sales cannot change founder-only settings'
);

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select extensions.is(
  public.get_public_client_share(repeat('a', 64))->'snapshot'->'internalSecret',
  null::jsonb,
  'public share RPC omits fields outside its snapshot allow-list'
);
select extensions.is(
  public.get_public_client_share(repeat('a', 64))->'snapshot'->'brand'->>'name',
  'Synthetic One',
  'share token returns only its own published client snapshot'
);
select extensions.is(
  public.get_public_client_share(repeat('d', 64))->'snapshot'->'brand'->>'name',
  'Synthetic Two',
  'the second client token returns only the second client snapshot'
);
select extensions.is(public.get_public_client_share(repeat('z', 64)), null::jsonb, 'unknown token returns no snapshot');
select extensions.is(public.get_public_client_share(repeat('b', 64)), null::jsonb, 'revoked token returns no snapshot');
select extensions.is(public.get_public_client_share(repeat('c', 64)), null::jsonb, 'expired token returns no snapshot');
-- separate statement: rows a function inserts are not visible to the same statement's snapshot
select set_config('gecko.test_feedback_id', public.submit_client_feedback(repeat('a', 64), 'approve', 'plan', '', 'Client', 'p1')::text, true);
select extensions.is(
  (select f.project_id from public.client_feedback f where f.id::text = current_setting('gecko.test_feedback_id')),
  'p1'::text,
  'valid share feedback is saved to its published project'
);
select extensions.throws_ok(
  $$select public.submit_client_feedback(repeat('a', 64), 'approve', 'idea:forged', 'not allowed')$$,
  'P0001', 'invalid_share_or_target', 'share feedback rejects a forged target'
);
select extensions.throws_ok(
  $$select public.submit_client_feedback(repeat('a', 64), 'approve', 'plan', '', 'Client', 'p2')$$,
  'P0001', 'invalid_feedback_project', 'share feedback rejects a project outside the published snapshot'
);

select * from extensions.finish();
rollback;
