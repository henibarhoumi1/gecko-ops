#!/bin/sh
# Rebuilds web/e2e/fixtures/*.json: what the portal's read functions return for a fake client, taken from a
# throwaway PostgreSQL 16 built from the migrations (same as supabase/tests/local/run.sh). Run it after a
# migration changes what a portal read returns. Needs postgresql-16.
# Usage: sh web/e2e/make-fixtures.sh [file.sql] [out dir]   (defaults: web/e2e/fixtures.sql, web/e2e/fixtures)
set -e
B=/usr/lib/postgresql/16/bin; D=$(mktemp -d); HERE=$(cd "$(dirname "$0")" && pwd); ROOT="$HERE/../.."
"$B/initdb" -D "$D/data" -A trust -U postgres >/dev/null
"$B/pg_ctl" -D "$D/data" -o "-k $D -p 5440 -c listen_addresses=" -l "$D/log" -w start >/dev/null
trap '"$B/pg_ctl" -D "$D/data" -m fast stop >/dev/null; rm -rf "$D"' EXIT
export PGOPTIONS='-c client_min_messages=warning'
P="psql -h $D -p 5440 -U postgres -v ON_ERROR_STOP=1 -q -X"
$P -c "create database t" && $P -d t -c 'alter database t set search_path = "$user", public, extensions'
$P -d t -f "$ROOT/supabase/tests/local/supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do $P -d t -f "$f"; done
rm -f /tmp/fixtures.tsv
SQL=${1:-$HERE/fixtures.sql}; OUT=${2:-$HERE/fixtures}
$P -d t -f "$SQL" >/dev/null
mkdir -p "$OUT"
python3 - "$OUT" <<'PY'
import json, sys
out = sys.argv[1]
for line in open("/tmp/fixtures.tsv", encoding="utf-8"):
    name, _, body = line.rstrip("\n").partition("\t")
    if not name:
        continue
    data = json.loads(body) if body else None
    with open(f"{out}/{name}.json", "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    print(name)
PY
