#!/bin/sh
# Runs the migration and the pgTAP security tests on a throwaway PostgreSQL 16 cluster.
# Needs postgresql-16 and postgresql-16-pgtap. Usage: sh supabase/tests/local/run.sh
set -e
B=/usr/lib/postgresql/16/bin; D=$(mktemp -d); HERE=$(cd "$(dirname "$0")" && pwd)
"$B/initdb" -D "$D/data" -A trust -U postgres >/dev/null
"$B/pg_ctl" -D "$D/data" -o "-k $D -p 5439 -c listen_addresses=" -l "$D/log" -w start >/dev/null
trap '"$B/pg_ctl" -D "$D/data" -m fast stop >/dev/null; rm -rf "$D"' EXIT
P="psql -h $D -p 5439 -U postgres -v ON_ERROR_STOP=1 -q -X"
$P -c "create database t" && $P -d t -c 'alter database t set search_path = "$user", public, extensions'
$P -d t -f "$HERE/supabase_stub.sql"
for f in "$HERE"/../../migrations/*.sql; do $P -d t -f "$f" 2>&1 | grep -v NOTICE || true; done
$P -d t -c "create extension if not exists pgtap with schema extensions"
OUT=$(psql -h "$D" -p 5439 -U postgres -X -d t -f "$HERE/../phase0.test.sql" 2>&1)
echo "$OUT" | grep -E "^\s*(not )?ok [0-9]|^\s*# "
echo "$OUT" | grep -qE "not ok|ERROR" && exit 1 || echo "all database tests passed"
