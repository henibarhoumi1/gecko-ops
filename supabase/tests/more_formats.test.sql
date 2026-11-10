begin;
create extension if not exists pgtap with schema extensions;
select extensions.plan(3);

insert into public.workspaces (id, name) values ('10000000-0000-4000-8000-000000000701', 'More formats');
insert into public.clients (workspace_id, id, brand) values ('10000000-0000-4000-8000-000000000701', 'c-mf', 'Formats Brand');

select extensions.lives_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style)
    select '10000000-0000-4000-8000-000000000701', 'c-mf', s, s
    from unnest(array['street-interview', 'tutorial', 'trend', 'myth-fact', 'day-in-life',
                      'product-only', 'reaction', 'brand-film', 'teaser', 'portrait']) as s$$,
  'the ten new formats are valid');
select extensions.lives_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style) values
    ('10000000-0000-4000-8000-000000000701', 'c-mf', 'Old', 'problem-fix'), ('10000000-0000-4000-8000-000000000701', 'c-mf', 'Old 2', 'ugc')$$,
  'the formats already in use stay valid');
select extensions.throws_ok(
  $$insert into public.scripts (workspace_id, client_id, title, style) values ('10000000-0000-4000-8000-000000000701', 'c-mf', 'Bad', 'listicle')$$,
  '23514', null, 'an unknown format is still refused');

select * from extensions.finish();
rollback;
