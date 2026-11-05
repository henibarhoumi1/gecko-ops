begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000601', 'More templates');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000601', 'c-mt', 'More Brand');

select extensions.lives_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style) values
    ('10000000-0000-4000-8000-000000000601', 'c-mt', 'A', 'us-vs-them'), ('10000000-0000-4000-8000-000000000601', 'c-mt', 'B', 'offer'),
    ('10000000-0000-4000-8000-000000000601', 'c-mt', 'C', 'comment-reply'), ('10000000-0000-4000-8000-000000000601', 'c-mt', 'D', 'bts'),
    ('10000000-0000-4000-8000-000000000601', 'c-mt', 'E', 'pov'), ('10000000-0000-4000-8000-000000000601', 'c-mt', 'F', 'storytime'),
    ('10000000-0000-4000-8000-000000000601', 'c-mt', 'G', 'unboxing')$$,
  'the new templates are valid');
select extensions.lives_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style) values
    ('10000000-0000-4000-8000-000000000601', 'c-mt', 'Old', 'talking-head'), ('10000000-0000-4000-8000-000000000601', 'c-mt', 'Old 2', 'voiceover')$$,
  'older styles stay valid for scripts already written');
select extensions.throws_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style) values ('10000000-0000-4000-8000-000000000601', 'c-mt', 'Bad', 'listicle')$$,
  '23514', null, 'an unknown template is still refused');

select * from extensions.finish();
rollback;
