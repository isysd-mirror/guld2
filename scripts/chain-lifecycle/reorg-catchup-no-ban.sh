#!/usr/bin/env bash
# Sync hygiene after reorg (task 029 / lifecycle).
# Dual-miner diverge → live reorg without ban → late peer catches up via
# the reorged tip (canonical P2P height-map reseed).
# Prefer: cargo test -p guld-node --test reorg_catchup_no_ban -- --nocapture
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Running reorg catch-up / no-ban integration test..."
cargo test -q -p guld-node --test reorg_catchup_no_ban -- --nocapture
echo "OK: reorg_then_late_peer_catchup_without_ban"
