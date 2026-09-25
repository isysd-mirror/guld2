#!/usr/bin/env bash
# Install shared post-receive hook into every repos/*.git bare.
# Safe to re-run. Keeps existing post-update (update-server-info) as a belt-and-suspenders.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_SRC="${ROOT}/scripts/bare-post-receive.sh"
REPOS="${ROOT}/repos"

if [[ ! -x "$HOOK_SRC" ]]; then
  chmod +x "$HOOK_SRC"
fi

if [[ ! -d "$REPOS" ]]; then
  echo "No ${REPOS} — nothing to install." >&2
  exit 1
fi

n=0
for bare in "$REPOS"/*.git; do
  [[ -d "$bare" ]] || continue
  hooks="${bare}/hooks"
  mkdir -p "$hooks"
  dest="${hooks}/post-receive"
  ln -sfn "$HOOK_SRC" "$dest"
  # Ensure dumb-HTTP post-update exists (idempotent).
  if [[ ! -e "${hooks}/post-update" ]]; then
    printf '%s\n' '#!/bin/sh' 'exec git update-server-info' >"${hooks}/post-update"
    chmod +x "${hooks}/post-update"
  fi
  echo "installed ${dest} -> ${HOOK_SRC}"
  n=$((n + 1))
done

echo "Done: ${n} bare(s)."
echo "Push to refs/heads/guld on a bare to sync the matching worktree and restart guld-node."
