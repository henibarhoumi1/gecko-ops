-- Lists how a database is built: tables, columns, constraints, indexes, functions, triggers, security
-- policies, grants and storage bucket settings. It reads the system catalogs only, never a row of client
-- data, and runs inside a read-only transaction that is rolled back at the end, so it can't change anything.
--
-- Output: one line per object, three tab-separated fields: section, key, value.
--   fact    recorded, not compared (Supabase and a plain PostgreSQL legitimately differ here)
--   source  a full definition, kept only in the encrypted report
--   others  compared between the live database and one built from supabase/migrations
-- Objects that belong to an extension are left out: they come with the extension, not from us.
--
-- Run with: psql -X -q -A -t -F "<tab>" -v ON_ERROR_STOP=1 -f supabase/tools/catalog.sql

\set ON_ERROR_STOP on
set default_transaction_read_only = on;
begin transaction isolation level repeatable read read only;
set local statement_timeout = '60s';
set local lock_timeout = '5s';
set local search_path = pg_catalog, pg_temp; -- names print fully qualified, the same on both sides

-- ---------- facts ----------

select 'fact', 'server_version_major', (current_setting('server_version_num')::int / 10000)::text;

select 'fact', 'extension ' || e.extname, n.nspname
from pg_extension e join pg_namespace n on n.oid = e.extnamespace
where e.extname <> 'plpgsql';

select 'fact', 'default_acl ' || pg_get_userbyid(d.defaclrole) || ' ' || d.defaclobjtype::text,
  array_to_string(array(select x::text from unnest(d.defaclacl) x order by 1), ' ')
from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace
where n.nspname = 'public';

select (to_regclass('supabase_migrations.schema_migrations') is not null)::int as has_history \gset
\if :has_history
select 'fact', 'history ' || m.version, coalesce(to_jsonb(m) ->> 'name', '')
from supabase_migrations.schema_migrations m;
\else
select 'fact', 'history', 'none';
\endif

-- ---------- tables, columns, constraints, indexes ----------

select 'table', 'public.' || c.relname,
  'kind=' || c.relkind::text || ' rls=' || c.relrowsecurity || ' forced=' || c.relforcerowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
  and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e');

select 'column', 'public.' || c.relname || '.' || a.attname,
  'pos=' || row_number() over (partition by c.oid order by a.attnum)
  || ' type=' || format_type(a.atttypid, a.atttypmod)
  || ' notnull=' || a.attnotnull
  || ' default=' || coalesce(pg_get_expr(ad.adbin, ad.adrelid), '')
  || ' identity=' || a.attidentity::text
  || ' generated=' || a.attgenerated::text
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f')
  and a.attnum > 0 and not a.attisdropped
  and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e');

select 'constraint', 'public.' || c.relname || '.' || con.conname,
  con.contype::text || ' ' || pg_get_constraintdef(con.oid)
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public';

select 'index', 'public.' || i.relname, pg_get_indexdef(i.oid)
from pg_index x
join pg_class i on i.oid = x.indexrelid
join pg_class c on c.oid = x.indrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.classid = 'pg_class'::regclass and d.objid = c.oid and d.deptype = 'e');

-- ---------- functions and triggers ----------

select 'function', 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
  'kind=' || p.prokind::text
  || ' returns=' || coalesce(pg_get_function_result(p.oid), '')
  || ' lang=' || l.lanname
  || ' security=' || case when p.prosecdef then 'definer' else 'invoker' end
  || ' volatility=' || p.provolatile::text
  || ' strict=' || p.proisstrict
  || ' config=' || coalesce(array_to_string(p.proconfig, ','), '')
  || ' body=' || md5(regexp_replace(btrim(
       case when coalesce(btrim(p.prosrc), '') <> '' then p.prosrc else pg_get_functiondef(p.oid) end), '\s+', ' ', 'g'))
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language l on l.oid = p.prolang
where n.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e');

select 'source', 'function public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')',
  replace(replace(replace(case when p.prokind = 'a' then '' else pg_get_functiondef(p.oid) end,
    '\', '\\'), E'\t', '\t'), E'\n', '\n')
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e');

-- Triggers on our tables, and our trigger functions on anyone's tables (for example on auth or storage).
select 'trigger', tn.nspname || '.' || c.relname || '.' || t.tgname,
  'enabled=' || t.tgenabled::text || ' ' || pg_get_triggerdef(t.oid)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace tn on tn.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal and (tn.nspname = 'public' or pn.nspname = 'public');

-- ---------- security: row-level security policies and grants ----------

select 'policy', n.nspname || '.' || c.relname || '.' || pol.polname,
  case when pol.polpermissive then 'permissive' else 'restrictive' end
  || ' cmd=' || pol.polcmd::text
  || ' roles=' || array_to_string(array(
       select case when r = 0 then 'public' else pg_get_userbyid(r) end from unnest(pol.polroles) r order by 1), ',')
  || ' using=' || coalesce(pg_get_expr(pol.polqual, pol.polrelid), '')
  || ' check=' || coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '')
from pg_policy pol
join pg_class c on c.oid = pol.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname in ('public', 'storage');

-- Only the roles that matter for access through the API: the public, anon, authenticated, service_role.
select 'grant', 'public.' || c.relname || ' to ' || case when a.grantee = 0 then 'public' else pg_get_userbyid(a.grantee) end,
  string_agg(a.privilege_type, ',' order by a.privilege_type)
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl,
  acldefault(case when c.relkind = 'S' then 's'::"char" else 'r'::"char" end, c.relowner))) a
where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm', 'f', 'S')
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'))
group by c.relname, a.grantee;

select 'column_grant', 'public.' || c.relname || '.' || att.attname || ' to '
    || case when a.grantee = 0 then 'public' else pg_get_userbyid(a.grantee) end,
  string_agg(a.privilege_type, ',' order by a.privilege_type)
from pg_attribute att
join pg_class c on c.oid = att.attrelid
join pg_namespace n on n.oid = c.relnamespace
cross join lateral aclexplode(att.attacl) a
where n.nspname = 'public' and att.attacl is not null and att.attnum > 0 and not att.attisdropped
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'))
group by c.relname, att.attname, a.grantee;

-- A function with no explicit grants can be run by the public: acldefault shows that too.
select 'function_grant', 'public.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ') to '
    || case when a.grantee = 0 then 'public' else pg_get_userbyid(a.grantee) end,
  string_agg(a.privilege_type, ',' order by a.privilege_type)
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
where n.nspname = 'public'
  and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'))
  and not exists (select 1 from pg_depend d where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e')
group by p.oid, p.proname, a.grantee;

-- ---------- other objects that could have been added by hand ----------

select 'type', 'public.' || t.typname,
  'kind=' || t.typtype::text || ' ' || coalesce((select string_agg(e.enumlabel, ',' order by e.enumsortorder)
    from pg_enum e where e.enumtypid = t.oid), '')
from pg_type t join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typtype in ('e', 'd', 'r', 'm')
  and not exists (select 1 from pg_depend d where d.classid = 'pg_type'::regclass and d.objid = t.oid and d.deptype = 'e');

select 'view', 'public.' || c.relname, md5(regexp_replace(btrim(pg_get_viewdef(c.oid)), '\s+', ' ', 'g'))
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('v', 'm');

select 'source', 'view public.' || c.relname,
  replace(replace(replace(pg_get_viewdef(c.oid), '\', '\\'), E'\t', '\t'), E'\n', '\n')
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind in ('v', 'm');

select 'publication', p.pubname || ' ' || pt.schemaname || '.' || pt.tablename, ''
from pg_publication p join pg_publication_tables pt on pt.pubname = p.pubname
where pt.schemaname = 'public';

-- ---------- storage bucket settings (configuration rows, not files) ----------

select (to_regclass('storage.buckets') is not null)::int as has_buckets \gset
\if :has_buckets
select 'bucket', b.id,
  'public=' || b.public
  || ' size_limit=' || coalesce(b.file_size_limit::text, '')
  || ' types=' || coalesce(array_to_string(array(select x from unnest(b.allowed_mime_types) x order by 1), ','), '')
from storage.buckets b;
\endif

rollback;
