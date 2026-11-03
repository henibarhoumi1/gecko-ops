#!/bin/sh
# Runs the migrations and the pgTAP security tests on a throwaway PostgreSQL 16 cluster.
# Needs postgresql-16 and postgresql-16-pgtap. Usage: sh supabase/tests/local/run.sh [tests directory]
# The optional directory runs another set of tests against this schema (CI uses it to run the previous
# release's tests against the new migrations). Any migration error fails the run.
set -e
B=/usr/lib/postgresql/16/bin; D=$(mktemp -d); HERE=$(cd "$(dirname "$0")" && pwd)
TESTS=$(cd "${1:-$HERE/..}" && pwd)
"$B/initdb" -D "$D/data" -A trust -U postgres >/dev/null
"$B/pg_ctl" -D "$D/data" -o "-k $D -p 5439 -c listen_addresses=" -l "$D/log" -w start >/dev/null
trap '"$B/pg_ctl" -D "$D/data" -m fast stop >/dev/null; rm -rf "$D"' EXIT
export PGOPTIONS='-c client_min_messages=warning'
P="psql -h $D -p 5439 -U postgres -v ON_ERROR_STOP=1 -q -X"
$P -c "create database t" && $P -d t -c 'alter database t set search_path = "$user", public, extensions'
$P -d t -f "$HERE/supabase_stub.sql"
for f in "$HERE"/../../migrations/*.sql; do $P -d t -f "$f"; done
$P -d t -c "create extension if not exists pgtap with schema extensions"
OUT=$(for t in "$TESTS"/*.test.sql; do psql -h "$D" -p 5439 -U postgres -X -d t -f "$t" 2>&1; done)
echo "$OUT" | grep -E "^\s*(not )?ok [0-9]|^\s*# "
echo "$OUT" | grep -qE "not ok|ERROR" && { echo "$OUT" | grep -E "not ok|ERROR" >&2; exit 1; } || echo "all database tests passed"
