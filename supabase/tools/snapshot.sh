#!/bin/sh
# Runs catalog.sql against one database and writes its listing. catalog.sql makes the session read-only
# before its first query and runs inside a read-only transaction that it rolls back. (No PGOPTIONS here:
# Supabase's connection pooler may refuse startup options, so the read-only settings are SQL statements.)
#
# Usage: sh supabase/tools/snapshot.sh <connection string> <output file>
# Fields are separated by the ASCII unit separator and records end with a zero byte (which PostgreSQL text
# can never contain), so definitions with tabs or line breaks can't break the listing.
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
PGAPPNAME=gecko-schema-snapshot psql "$1" -X -q -A -t -v ON_ERROR_STOP=1 \
  -F "$(printf '\037')" -0 \
  -f "$HERE/catalog.sql" > "$2"
echo "listed $(tr -cd '\000' < "$2" | wc -c | tr -d ' ') objects into $2"
