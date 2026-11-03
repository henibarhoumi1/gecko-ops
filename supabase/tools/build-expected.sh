#!/bin/sh
# Builds the schema the repository describes, on an empty throwaway PostgreSQL server, and lists it with
# catalog.sql. Every migration must apply without error; nothing is ignored.
#
# Usage: sh supabase/tools/build-expected.sh <output file>
# Connects with the usual PGHOST, PGPORT, PGUSER (a superuser) and PGPASSWORD environment variables.
set -eu
OUT=$1
HERE=$(cd "$(dirname "$0")" && pwd)
ROOT=$(cd "$HERE/../.." && pwd)
DB=gecko_expected
export PGOPTIONS='-c client_min_messages=warning'
P="psql -X -q -v ON_ERROR_STOP=1"

$P -d postgres -c "drop database if exists $DB" -c "create database $DB"
$P -d "$DB" -c "alter database $DB set search_path = \"\$user\", public, extensions"
$P -d "$DB" -f "$ROOT/supabase/tests/local/supabase_stub.sql"
$P -d "$DB" -f "$HERE/snapshot_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "applying $(basename "$f")"
  $P -d "$DB" -f "$f"
done
sh "$HERE/snapshot.sh" "dbname=$DB" "$OUT"
