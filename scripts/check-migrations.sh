#!/usr/bin/env bash
# Migrations run before the new code is live (deploy.yml), so for a few minutes the old code runs on the new schema.
# A migration added in this branch may only add things. Anything that removes, renames or tightens needs a second release
# (stop using it first), or a line `-- allow-destructive: <why>` in the file once you know no running code needs it.
# Usage: scripts/check-migrations.sh <base branch>   (CI passes the pull request's base)
set -euo pipefail
base="${1:-main}"
# Fails closed: a fetch or diff that fails stops the check rather than passing it with nothing to look at.
# --depth=1 only where the clone is already shallow (CI): on a full local clone it would make the whole repo shallow.
depth=$([ "$(git rev-parse --is-shallow-repository)" = true ] && echo --depth=1 || true)
git fetch --no-tags $depth origin "$base" >/dev/null
git rev-parse --verify "origin/$base" >/dev/null
added=$(git diff --name-only --diff-filter=A "origin/$base" HEAD -- 'drizzle/*.sql')
bad=0
# A migration that already ran in production isn't run again, so editing it only makes new databases differ from it
edited=$(git diff --name-only --diff-filter=M "origin/$base" HEAD -- 'drizzle/*.sql')
for file in $edited; do
    echo "::error file=$file::This migration is already applied: leave it as it is and add a new one"
    bad=1
done
for file in $added; do
    grep -qi 'allow-destructive' "$file" && continue
    if grep -inE 'drop (table|column|index|constraint)|rename (to|column|constraint)|set not null|alter column .* type' "$file"; then
        echo "::error file=$file::This migration removes, renames or tightens something. See scripts/check-migrations.sh"
        bad=1
    fi
done
exit $bad
