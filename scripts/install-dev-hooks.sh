#!/usr/bin/env bash
# Install local pre-commit hooks (lifecycle Phase 1–2 + Simba catch-up) into the
# umbrella and guld-state / guld-node / guld-p2p working trees. Safe to re-run.
#
# This is our CI: commits fail if lifecycle / smoke / catch-up regressions land.
# See docs/tasks/open/006-chain-lifecycle-tests.md and CONTRIBUTING.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HOOK_SRC="${ROOT}/scripts/githooks/pre-commit"

if [[ ! -f "$HOOK_SRC" ]]; then
  echo "missing ${HOOK_SRC}" >&2
  exit 1
fi
chmod +x "$HOOK_SRC"

install_one() {
  local worktree="$1"
  local git_dir hooks dest
  if [[ ! -d "$worktree" ]]; then
    echo "skip (missing): ${worktree}" >&2
    return
  fi
  git_dir="$(git -C "$worktree" rev-parse --git-dir)"
  # Submodules often use .git as a file; rev-parse --git-dir is absolute or relative.
  if [[ "$git_dir" != /* ]]; then
    git_dir="${worktree}/${git_dir}"
  fi
  hooks="${git_dir}/hooks"
  mkdir -p "$hooks"
  dest="${hooks}/pre-commit"
  ln -sfn "$HOOK_SRC" "$dest"
  echo "installed ${dest} -> ${HOOK_SRC}"
}

install_one "$ROOT"
install_one "${ROOT}/src/guld-state"
install_one "${ROOT}/src/guld-node"
install_one "${ROOT}/src/guld-p2p"

echo "Done. Commits in guld / guld-state / guld-node / guld-p2p run lifecycle gates when relevant."
echo "Escape hatch (humans only): GULD_SKIP_LIFECYCLE=1  or  GULD_SKIP_CATCHUP=1"
