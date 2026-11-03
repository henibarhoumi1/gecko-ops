#!/bin/sh
# Writes supabase/setup.sql: every migration in order, each under a "-- ==== file ====" header. It is a
# reference copy for reading the whole schema in one place. Production changes go through the migration
# pipeline, never by pasting this file. CI fails if the committed file is out of date.
#
# Usage: sh supabase/tools/gen-setup.sh            (rewrites supabase/setup.sql)
#        sh supabase/tools/gen-setup.sh --check    (fails if it would change)
set -eu
ROOT=$(cd "$(dirname "$0")/../.." && pwd)
OUT="$ROOT/supabase/setup.sql"
TMP=$(mktemp)
trap 'rm -f "$TMP"' EXIT
{
  echo "-- Gecko Ops database schema, generated from supabase/migrations by supabase/tools/gen-setup.sh."
  echo "-- Do not edit by hand and do not paste into the live database: changes go through the migration pipeline."
  for f in "$ROOT"/supabase/migrations/*.sql; do
    echo
    echo "-- ==== $(basename "$f") ===="
    sed -e '$a\' "$f"
  done
} > "$TMP"
if [ "${1:-}" = "--check" ]; then
  if ! cmp -s "$TMP" "$OUT"; then
    echo "supabase/setup.sql is out of date: run sh supabase/tools/gen-setup.sh and commit the result" >&2
    exit 1
  fi
  echo "supabase/setup.sql is up to date"
else
  cp "$TMP" "$OUT"
  echo "wrote supabase/setup.sql"
fi
