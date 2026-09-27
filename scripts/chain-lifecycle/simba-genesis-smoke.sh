#!/usr/bin/env bash
# Simba artifact genesis smoke (task 012) — empty datadir, no mining, pin check.
# Prefer: cargo test -p guld-node --test simba_genesis_smoke -- --nocapture
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Running Simba genesis pin smoke..."
cargo test -q -p guld-node --test simba_genesis_smoke -- --nocapture
echo "OK: simba_empty_datadir_loads_pinned_genesis"
