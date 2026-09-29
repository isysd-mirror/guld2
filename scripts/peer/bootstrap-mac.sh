#!/usr/bin/env bash
# First-time macOS bootstrap for a Simba peer (optional miner).
#
# Validate-only:
#   curl -fsSL https://guld.io/scripts/peer/bootstrap-mac.sh | bash
#
# With mining (pick his name):
#   curl -fsSL https://guld.io/scripts/peer/bootstrap-mac.sh | bash -s -- --mine alice
#
# Or from a checkout:
#   ~/guld/scripts/peer/bootstrap-mac.sh --mine alice
set -euo pipefail

GULD_HOME="${GULD_HOME:-$HOME/guld}"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This bootstrap is for macOS. Linux: see https://guld.io/docs/?src=/docs/SIMBA_BETA.md" >&2
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  cat <<'EOF'
Homebrew is required (one-time).

1. Open https://brew.sh
2. Copy their install command into Terminal and run it.
3. When it finishes, run this again (add --mine NAME if he wants to mine):

   curl -fsSL https://guld.io/scripts/peer/bootstrap-mac.sh | bash
   curl -fsSL https://guld.io/scripts/peer/bootstrap-mac.sh | bash -s -- --mine hisname

EOF
  exit 1
fi

if [[ ! -x "$GULD_HOME/scripts/peer/guld-peer" ]]; then
  echo "→ Installing git (if needed) and cloning Guld…"
  brew list git >/dev/null 2>&1 || brew install git
  if [[ -e "$GULD_HOME" && ! -d "$GULD_HOME/.git" ]]; then
    echo "error: $GULD_HOME exists but is not a git repo — move it aside and retry." >&2
    exit 1
  fi
  if [[ ! -d "$GULD_HOME/.git" ]]; then
    git clone --recurse-submodules https://guld.io/repos/guld.git "$GULD_HOME"
  fi
fi

exec "$GULD_HOME/scripts/peer/guld-peer" install "$@"
