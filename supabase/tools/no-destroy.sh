#!/bin/sh
# Blocks dangerous migration changes in a pull request (technical specification, cross-cutting rules):
#   1. A migration file that already exists on the base branch is never edited, renamed or deleted:
#      production may already have run it, so changes go into a new file.
#   2. New migration files may not destroy data (drop table/schema/column, truncate, delete from, or
#      drop ... cascade) unless the pull request carries the "contract-step" label, which Heni adds only
#      for an approved contract step.
#
# Usage: sh supabase/tools/no-destroy.sh <base commit> [labels]
set -eu
BASE=$1
LABELS=${2:-}
FAIL=0

CHANGED=$(git diff --name-status "$BASE"...HEAD -- supabase/migrations/ | awk '$1 !~ /^A/ { print }')
if [ -n "$CHANGED" ]; then
  echo "::error::Existing migration files were changed. Put every change in a new migration file instead:"
  echo "$CHANGED"
  FAIL=1
fi

case ",$LABELS," in
  *,contract-step,*) echo "contract-step label present: destructive statements allowed in new files" ;;
  *)
    for f in $(git diff --name-only --diff-filter=A "$BASE"...HEAD -- 'supabase/migrations/*.sql'); do
      HITS=$(sed -e 's/--.*$//' "$f" | grep -inE \
        '\bdrop[[:space:]]+(table|schema|column)\b|\btruncate\b|\bdelete[[:space:]]+from\b|\bdrop\b[^;]*\bcascade\b' || true)
      if [ -n "$HITS" ]; then
        echo "::error file=$f::Destructive statement in a new migration. Allowed only in an approved contract step (label contract-step):"
        echo "$HITS"
        FAIL=1
      fi
    done
    ;;
esac

[ "$FAIL" = 0 ] && echo "no destructive migration changes"
exit "$FAIL"
