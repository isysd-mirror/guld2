#!/usr/bin/env bash
# Install local pre-commit hooks (lifecycle + genesis + GIP-26 vectors) into the
# umbrella and guld-state / guld-node / guld-p2p / guld-wire / guld-consensus
# working trees. Safe to re-run.
#
# This is our CI: commits fail if lifecycle / smoke / catch-up / vector regressions land.
# See docs/tasks/done/2026-09/006-chain-lifecycle-tests.md,
# docs/tasks/done/2026-09/021-consensus-golden-vectors.md, and CONTRIBUTING.md.
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
install_one "${ROOT}/src/guld-legacy"
install_one "${ROOT}/src/guld-wire"
install_one "${ROOT}/src/guld-consensus"

echo "Done. Commits in guld / guld-state / guld-node / guld-p2p / guld-legacy / guld-wire / guld-consensus run lifecycle+genesis+vector gates when relevant."
echo "Escape hatch (humans only): GULD_SKIP_LIFECYCLE=1 | GULD_SKIP_CATCHUP=1 | GULD_SKIP_GENESIS=1 | GULD_SKIP_VECTORS=1"
