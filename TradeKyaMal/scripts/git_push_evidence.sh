#!/usr/bin/env bash
# Commit evidence/ changes and push, preferring this pipeline run on conflicts.
set -euo pipefail

BRANCH="${1:?branch required}"
COMMIT_MSG="${2:?commit message required}"
PATHS="${3:-evidence/ incoming/}"

git config user.name "github-actions[bot]"
git config user.email "github-actions[bot]@users.noreply.github.com"

resolve_evidence_conflicts() {
  while IFS= read -r file; do
    [ -z "$file" ] && continue
    case "$file" in
      evidence/*|incoming/*)
        git checkout --ours -- "$file" 2>/dev/null || true
        git add -- "$file" 2>/dev/null || true
        ;;
    esac
  done < <(git diff --name-only --diff-filter=U 2>/dev/null || true)

  git add evidence/ incoming/ 2>/dev/null || true
}

# shellcheck disable=SC2086
git add $PATHS

if git diff --staged --quiet; then
  echo "No changes to commit."
  exit 0
fi

git commit -m "$COMMIT_MSG"

for attempt in 1 2 3; do
  echo "Push attempt $attempt..."

  if git push origin "HEAD:$BRANCH"; then
    echo "Push succeeded."
    exit 0
  fi

  echo "Push rejected — fetching and merging origin/$BRANCH (keeping pipeline evidence)."
  git fetch origin "$BRANCH"

  if git merge "origin/$BRANCH" -X ours --no-edit; then
    continue
  fi

  echo "Merge conflict — resolving evidence/ and incoming/ with this run's files."
  resolve_evidence_conflicts

  if git diff --cached --quiet; then
    git merge --abort 2>/dev/null || true
    echo "Could not resolve merge on attempt $attempt."
    exit 1
  fi

  git commit --no-edit || GIT_EDITOR=true git merge --continue
done

echo "Failed to push after 3 attempts."
exit 1
