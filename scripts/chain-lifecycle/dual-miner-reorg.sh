#!/usr/bin/env bash
# Dual-miner adversarial reorg smoke (Phase 4 / task 019).
# Prefer the Rust harness: cargo test -p guld-node --test dual_miner_reorg
# This shell script documents the same scenario for operators.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Building guld-node (release)..."
cargo build -q -p guld-node --release
BIN="$ROOT/target/release/guld-node"

echo "Running Rust dual-miner reorg integration test..."
cargo test -q -p guld-node --test dual_miner_reorg -- --nocapture
echo "OK: dual_miners_heavier_fork_wins"
