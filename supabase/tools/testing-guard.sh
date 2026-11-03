#!/bin/sh
# Stops the pipeline unless TESTING_DB_URL really is the testing project:
#   1. it names a different Supabase project from PRODUCTION_DB_URL (read only for its project id; never
#      connected to here), and
#   2. the database carries the testing marker (schema gecko_env) that reset-testing.sh --first-run
#      created on the brand-new project.
# Usage: TESTING_DB_URL=... PRODUCTION_DB_URL=... sh supabase/tools/testing-guard.sh
set -eu
: "${TESTING_DB_URL:?TESTING_DB_URL is required}"
: "${PRODUCTION_DB_URL:?PRODUCTION_DB_URL is required (read for its project id only)}"

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
if [ -z "$TEST_REF" ] || [ -z "$PROD_REF" ] || [ "$TEST_REF" = "$PROD_REF" ]; then
  echo "refused: TESTING_DB_URL is not a separate testing project" >&2; exit 1
fi
q() { psql "$TESTING_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$1"; }
MARKED=f
if [ "$(q "select to_regclass('gecko_env.marker') is not null")" = "t" ]; then
  MARKED=$(q "select exists (select 1 from gecko_env.marker where name = 'testing')")
fi
if [ "$MARKED" != "t" ]; then
  echo "refused: the database behind TESTING_DB_URL is not marked as testing" >&2; exit 1
fi
echo "testing project $TEST_REF confirmed (marked as testing, not production)"
