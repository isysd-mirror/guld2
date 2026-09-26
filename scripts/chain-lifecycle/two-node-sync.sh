#!/usr/bin/env bash
# Two-node forward sync smoke (Phase 3 chain lifecycle tests).
# Builds guld-node, runs miner + follower with temp datadirs, mines one block, checks sync.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "Building guld-node (release)..."
cargo build -q -p guld-node --release
BIN="$ROOT/target/release/guld-node"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

A_DIR="$TMP/miner"
B_DIR="$TMP/follower"
P2P_A=127.0.0.1:4021
P2P_B=127.0.0.1:4022
RPC_A=127.0.0.1:8541
RPC_B=127.0.0.1:8542

rpc() {
  local url=$1 method=$2
  curl -sf "$url" -H 'Content-Type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$method\",\"params\":[]}"
}

start_node() {
  local dir=$1 rpc=$2 p2p=$3 extra=${4:-}
  mkdir -p "$dir"
  # shellcheck disable=SC2086
  RUST_LOG=guld_node=info "$BIN" \
    --auto-mine true \
    --dev --miner alice --difficulty 1 --chain-id 909002 \
    --datadir "$dir" --rpc "$rpc" --p2p "$p2p" \
    --no-default-bootnodes $extra \
    >"$dir/stdout.log" 2>"$dir/stderr.log" &
  echo $! >"$dir/pid"
}

wait_ready() {
  local url=$1
  for _ in $(seq 1 60); do
    if rpc "$url" guld_ready | grep -q '"result":true'; then
      return 0
    fi
    sleep 0.5
  done
  echo "node not ready: $url" >&2
  return 1
}

start_node "$A_DIR" "$RPC_A" "$P2P_A"
wait_ready "http://$RPC_A"

# `--dev` enables mDNS on localhost; follower discovers miner without an explicit bootnode.
start_node "$B_DIR" "$RPC_B" "$P2P_B"
wait_ready "http://$RPC_B"
sleep 1

rpc "http://$RPC_A" guld_mineBlock >/dev/null

for _ in $(seq 1 120); do
  HB=$(rpc "http://$RPC_B" guld_blockNumber | grep -oE '"result":"[0-9]+"' | grep -oE '[0-9]+' || echo 0)
  if [[ "$HB" -ge 1 ]]; then
    echo "OK: follower height=$HB"
    kill "$(cat "$A_DIR/pid")" "$(cat "$B_DIR/pid")" 2>/dev/null || true
    exit 0
  fi
  sleep 0.5
done

echo "FAIL: follower stuck at height $HB" >&2
exit 1
