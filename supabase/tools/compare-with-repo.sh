#!/bin/sh
# Checks a database is built exactly as supabase/migrations says: lists it read-only with snapshot.sh,
# builds the expected schema on a throwaway PostgreSQL of the same major version (Docker), and compares.
# Writes the comparison to the GitHub job summary (names and short hashes only) and fails on any difference.
# Usage: sh supabase/tools/compare-with-repo.sh <connection string> <label>
set -eu
HERE=$(cd "$(dirname "$0")" && pwd)
URL=$1
LABEL=$2
WORK=$(mktemp -d)
sh "$HERE/snapshot.sh" "$URL" "$WORK/target.raw"
python3 "$HERE/normalise.py" listing "$WORK/target.raw" "$WORK/target.tsv"
MAJOR=$(awk -F'\t' '$1 == "fact" && $2 == "server_version_major" { print $3 }' "$WORK/target.tsv")
case "$MAJOR" in ''|*[!0-9]*) echo "could not read the PostgreSQL version of $LABEL" >&2; exit 1 ;; esac
docker rm -f expected-db >/dev/null 2>&1 || true
docker run -d --name expected-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 "postgres:$MAJOR" > /dev/null
export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGPASSWORD=postgres
for i in $(seq 1 30); do pg_isready -q && break; sleep 2; done
pg_isready
sh "$HERE/build-expected.sh" "$WORK/expected.raw" > /dev/null
python3 "$HERE/normalise.py" listing "$WORK/expected.raw" "$WORK/expected.tsv"
if python3 "$HERE/normalise.py" diff "$WORK/expected.tsv" "$WORK/target.tsv" --summary "$WORK/summary.md" --expect-identical; then
  echo "$LABEL is built exactly as the repository says (PostgreSQL $MAJOR)." >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
else
  cat "$WORK/summary.md" >> "${GITHUB_STEP_SUMMARY:-/dev/stdout}"
  exit 1
fi
