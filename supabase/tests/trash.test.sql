begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(15);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) values
  ('00000000-0000-4000-8000-000000000c01', 'authenticated', 'authenticated', 'founder@trash.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000c02', 'authenticated', 'authenticated', 'owner@trash.test', '', now(), '{}', '{}', now(), now()),
  ('00000000-0000-4000-8000-000000000c03', 'authenticated', 'authenticated', 'viewer@trash.test', '', now(), '{}', '{}', now(), now());
insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000c01', 'Trash GECKO');
insert into public.workspace_members (workspace_id, member_id, user_id, email, display_name, role) values
  ('10000000-0000-4000-8000-000000000c01', 'founder', '00000000-0000-4000-8000-000000000c01', 'founder@trash.test', 'Heni', 'founder');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000c01', 'c-t', 'Trash Brand');
insert into public.concepts (id, workspace_id, client_id, title, status) values
  ('40000000-0000-4000-8000-000000000c01', '10000000-0000-4000-8000-000000000c01', 'c-t', 'The mother-in-law', 'review');
insert into public.concept_notes (workspace_id, client_id, concept_id, kind, body, version) values
  ('10000000-0000-4000-8000-000000000c01', 'c-t', '40000000-0000-4000-8000-000000000c01', 'comment', 'Love it', 1);
insert into public.scripts (id, workspace_id, client_id, title, concept_id, status) values
  ('30000000-0000-4000-8000-000000000c01', '10000000-0000-4000-8000-000000000c01', 'c-t', 'From the idea',
   '40000000-0000-4000-8000-000000000c01', 'review');

create function pg_temp.act_as(p_user text, p_email text) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user, true),
         set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated","email":"%s"}', p_user, p_email), true);
$$;
create table pg_temp.vals (k text primary key, v text);
grant all on pg_temp.vals to authenticated;

select extensions.ok(
  not has_function_privilege('authenticated', 'public.to_trash()', 'execute')
  and not has_table_privilege('authenticated', 'public.trash', 'select'),
  'nobody reads the trash table or calls the copier directly'
);

set local role authenticated;
select pg_temp.act_as('00000000-0000-4000-8000-000000000c01', 'founder@trash.test');
insert into pg_temp.vals values
  ('owner', public.invite_client_account('10000000-0000-4000-8000-000000000c01', 'c-t', 'owner@trash.test', 'owner')),
  ('viewer', public.invite_client_account('10000000-0000-4000-8000-000000000c01', 'c-t', 'viewer@trash.test', 'viewer'));

-- The founder deletes the idea: its note goes with it, the script loses its link.
delete from public.concepts where id = '40000000-0000-4000-8000-000000000c01';
select extensions.is(
  (select concept_id::text from public.scripts where id = '30000000-0000-4000-8000-000000000c01'), null,
  'the delete went through and unlinked the script'
);
select extensions.is(
  (select (t->>'label') || '|' || (t->>'kind') || '|' || (t->>'withIt') || '|' || (t->>'deletedBy')
   from jsonb_array_elements(public.get_trash('10000000-0000-4000-8000-000000000c01')) t),
  'The mother-in-law|concepts|1|Heni',
  'the trash shows the idea, with its note gone with it, and who deleted it'
);
select extensions.is(
  public.get_my_last_delete('10000000-0000-4000-8000-000000000c01')->>'label', 'The mother-in-law',
  'the person who deleted it can undo it'
);
insert into pg_temp.vals select 'batch', public.get_my_last_delete('10000000-0000-4000-8000-000000000c01')->>'batch';

-- A client viewer can't restore someone else's delete.
select pg_temp.act_as('00000000-0000-4000-8000-000000000c03', 'viewer@trash.test');
select public.accept_client_invite((select v from pg_temp.vals where k = 'viewer'), 'Lina');
select extensions.throws_ok(
  $$select public.restore_trash('10000000-0000-4000-8000-000000000c01', (select v::bigint from pg_temp.vals where k = 'batch'))$$,
  'forbidden', 'a client can''t restore what someone else deleted'
);
select extensions.throws_ok(
  $$select public.get_trash('10000000-0000-4000-8000-000000000c01')$$,
  'forbidden', 'a client doesn''t see the workspace trash'
);

-- The founder restores it: the idea, its note and the link come back.
select pg_temp.act_as('00000000-0000-4000-8000-000000000c01', 'founder@trash.test');
select extensions.is(
  public.restore_trash('10000000-0000-4000-8000-000000000c01', (select v::bigint from pg_temp.vals where k = 'batch')),
  '{"restored": 2, "skipped": 0}'::jsonb, 'the founder restores the idea and its note'
);
select extensions.is(
  (select concept_id::text from public.scripts where id = '30000000-0000-4000-8000-000000000c01'),
  '40000000-0000-4000-8000-000000000c01', 'the script is linked to its idea again'
);
select extensions.throws_ok(
  $$select public.restore_trash('10000000-0000-4000-8000-000000000c01', (select v::bigint from pg_temp.vals where k = 'batch'))$$,
  'trash_not_found', 'a batch is restored once'
);

-- The client's owner deletes their own idea, then undoes it.
select pg_temp.act_as('00000000-0000-4000-8000-000000000c02', 'owner@trash.test');
select public.accept_client_invite((select v from pg_temp.vals where k = 'owner'), 'Sara');
insert into pg_temp.vals values ('mine', public.client_save_idea('10000000-0000-4000-8000-000000000c01', 'c-t', null, 'My idea', 'A thought', '')->>'id');
select public.client_delete_idea('10000000-0000-4000-8000-000000000c01', 'c-t', (select v::uuid from pg_temp.vals where k = 'mine'));
select extensions.is(
  (public.restore_trash('10000000-0000-4000-8000-000000000c01',
    (public.get_my_last_delete('10000000-0000-4000-8000-000000000c01')->>'batch')::bigint))->>'restored', '1',
  'the client undoes their own delete'
);
select extensions.is(
  (select count(*)::int from jsonb_array_elements(
    public.get_my_portal('10000000-0000-4000-8000-000000000c01', 'c-t')->'concepts') c where c->>'title' = 'My idea'),
  1, 'and their idea is back in the portal'
);

-- Emptying: items older than 7 days go when the trash is opened; the founder empties the rest.
select pg_temp.act_as('00000000-0000-4000-8000-000000000c01', 'founder@trash.test');
reset role;
update public.trash set deleted_at = now() - interval '8 days' where label = 'My idea';
set local role authenticated;
select extensions.is(
  (select count(*)::int from jsonb_array_elements(public.get_trash('10000000-0000-4000-8000-000000000c01')) t
   where t->>'label' = 'My idea'), 0,
  'opening the trash empties what was deleted more than 7 days ago'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000c02', 'owner@trash.test');
select extensions.throws_ok(
  $$select public.empty_trash('10000000-0000-4000-8000-000000000c01')$$,
  'forbidden', 'only the founder empties the trash'
);
select pg_temp.act_as('00000000-0000-4000-8000-000000000c01', 'founder@trash.test');
select extensions.is(
  jsonb_array_length((select public.get_trash('10000000-0000-4000-8000-000000000c01')
                      from (select public.empty_trash('10000000-0000-4000-8000-000000000c01')) e)), 0,
  'the founder empties the trash'
);

select * from extensions.finish();
rollback;
