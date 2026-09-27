#!/usr/bin/env bash
# Simba-topology catch-up smoke (lifecycle Phase 5).
# Miner builds a tall tip (signed RewardCommit), freezes, late validating peer
# catches up without banning the bootnode.
# Prefer: cargo test -p guld-node --test simba_catchup_sync -- --nocapture
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Running Simba catch-up sync integration test..."
cargo test -q -p guld-node --test simba_catchup_sync -- --nocapture
echo "OK: validating_peer_catches_up_without_banning_bootstrap"
