#!/usr/bin/env bash
# Docs live at docs/ and are fetched by the site as /docs/... — nothing to sync.
# Kept so old habit/CI does not break.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
echo "noop: site reads ${ROOT}/docs/ directly (no mirror)."
test -f "${ROOT}/docs/whitepaper/guld-2.0-draft.md"
test -f "${ROOT}/docs/specs/00-overview.md"
