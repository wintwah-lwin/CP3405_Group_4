#!/usr/bin/env bash
# Commit evidence/ on top of latest remote — no rebase/merge conflicts.
set -euo pipefail

BRANCH="${1:?branch required}"
COMMIT_MSG="${2:?commit message required}"
PATHS="${3:-evidence/ incoming/}"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"
git config pull.rebase false

for attempt in 1 2 3 4 5; do
  echo "=== Push attempt $attempt ==="
  git fetch origin "$BRANCH"
  git reset --soft "origin/$BRANCH"
  # shellcheck disable=SC2086
  git add $PATHS

  if git diff --staged --quiet; then
    echo "No changes to commit."
    exit 0
  fi

  git commit -m "$COMMIT_MSG"

  if git push origin "HEAD:$BRANCH"; then
    echo "Push succeeded."
    exit 0
  fi

  echo "Push rejected — retrying..."
  sleep 2
done

echo "Failed to push after 5 attempts."
exit 1
