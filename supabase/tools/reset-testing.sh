#!/bin/sh
# Rebuilds the TESTING database from scratch: removes the fake logins and everything in the public schema,
# applies every migration in order, then loads supabase/seed.sql. All of it runs in one transaction, so a
# failure leaves the testing database as it was.
#
# It refuses to touch a database unless all of these hold:
#   1. TESTING_DB_URL and PRODUCTION_DB_URL point at different Supabase projects (production is only read
#      here to learn its project id; this script never connects to it).
#   2. The database carries the testing marker (schema gecko_env), which is created only on a first run,
#      and only when the public schema is completely empty, as in a brand-new project.
# Production has no marker and is never empty, so it can't pass either check.
#
# Usage: TESTING_DB_URL=... PRODUCTION_DB_URL=... LOGIN_BASE=name@example.com sh supabase/tools/reset-testing.sh [--first-run]
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
FIRST_RUN=${1:-}

: "${TESTING_DB_URL:?TESTING_DB_URL is required}"
: "${PRODUCTION_DB_URL:?PRODUCTION_DB_URL is required (read for its project id only)}"
: "${LOGIN_BASE:?LOGIN_BASE is required}"

# A Supabase connection string names its project either in the user (postgres.<ref>, pooler) or in the
# host (db.<ref>.supabase.co, direct).
project_ref() {
  python3 - "$1" <<'EOF'
import re, sys
from urllib.parse import urlsplit
u = urlsplit(sys.argv[1])
user, host = u.username or "", u.hostname or ""
m = re.fullmatch(r"postgres\.([a-z0-9]{10,40})", user) or re.fullmatch(r"db\.([a-z0-9]{10,40})\.supabase\.co", host)
print(m.group(1) if m else "")
EOF
}
TEST_REF=$(project_ref "$TESTING_DB_URL")
PROD_REF=$(project_ref "$PRODUCTION_DB_URL")
if [ -z "$TEST_REF" ] || [ -z "$PROD_REF" ]; then
  echo "refused: could not read the Supabase project id from both connection strings" >&2; exit 1
fi
if [ "$TEST_REF" = "$PROD_REF" ]; then
  echo "refused: TESTING_DB_URL points at the production project" >&2; exit 1
fi
echo "testing project: $TEST_REF (production is a different project)"

run_psql() { PGAPPNAME=gecko-reset-testing psql "$TESTING_DB_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
SCRIPT=$(mktemp)
trap 'rm -f "$SCRIPT"' EXIT

if [ "$FIRST_RUN" = "--first-run" ]; then
  run_psql <<'EOF'
do $$
begin
  if to_regclass('gecko_env.marker') is not null then
    raise notice 'already marked as testing';
  elsif exists (select 1 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid = c.relnamespace
                where n.nspname = 'public')
     or exists (select 1 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
                where n.nspname = 'public') then
    raise exception 'refused: the public schema is not empty, so this is not a brand-new testing project';
  else
    create schema gecko_env;
    create table gecko_env.marker (name text primary key check (name = 'testing'), marked_at timestamptz not null default now());
    insert into gecko_env.marker (name) values ('testing');
    revoke all on schema gecko_env from public, anon, authenticated;
  end if;
end
$$;
EOF
fi

# One transaction: the marker check, the wipe, every migration, the seed.
{
  cat <<'EOF'
\set ON_ERROR_STOP on
begin;
do $$
begin
  if to_regclass('gecko_env.marker') is null then
    raise exception 'refused: this database is not marked as testing (run once with --first-run on a new project)';
  end if;
  if not exists (select 1 from gecko_env.marker where name = 'testing') then
    raise exception 'refused: the testing marker is empty';
  end if;
end
$$;
do $$
declare p record;
begin
  for p in select policyname from pg_catalog.pg_policies where schemaname = 'storage' and tablename = 'objects' loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end
$$;
drop schema public cascade;
delete from auth.users where email like '%+gk-%';
create schema public;
grant usage on schema public to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
EOF
  for f in "$ROOT"/supabase/migrations/*.sql; do
    printf '\\echo applying %s\n\\ir %s\n' "$(basename "$f")" "$f"
  done
  printf '\\set login_base %s\n' "$LOGIN_BASE"
  sed '/^\\set ON_ERROR_STOP on$/d; /^begin;$/d; /^commit;$/d' "$ROOT/supabase/seed.sql"
  echo "commit;"
} > "$SCRIPT"

run_psql -f "$SCRIPT"
echo "testing database rebuilt from $(ls "$ROOT"/supabase/migrations/*.sql | wc -l | tr -d ' ') migrations plus the seed"
