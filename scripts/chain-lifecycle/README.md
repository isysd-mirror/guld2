# Chain lifecycle tests

Disposable dev chains for integration testing. See [`docs/tasks/open/006-chain-lifecycle-tests.md`](../../docs/tasks/open/006-chain-lifecycle-tests.md).

| Layer | Command |
|-------|---------|
| State matrix (all tx types) | `cargo test -p guld-state --test lifecycle_matrix` |
| Single-node RPC smoke | `cargo test -p guld-node --test dev_smoke` |
| Two-node P2P sync (Rust) | `cargo test -p guld-node --test two_node_sync` |
| Dual-miner reorg (Rust) | `cargo test -p guld-node --test dual_miner_reorg` |
| Simba catch-up (Rust) | `cargo test -p guld-node --test simba_catchup_sync` |
| Two-node shell smoke | `./scripts/chain-lifecycle/two-node-sync.sh` |
| Dual-miner shell wrapper | `./scripts/chain-lifecycle/dual-miner-reorg.sh` |
| Simba catch-up shell wrapper | `./scripts/chain-lifecycle/simba-catchup-sync.sh` |
| **Pre-commit (Phase 1–2 + 5)** | `./scripts/install-dev-hooks.sh` once; then commits in `guld-state` / `guld-node` / `guld-p2p` gate on the tests above |

Unit coverage for rewind/replay / `MAX_REORG_DEPTH` / orphan `ClaimReward`: `cargo test -p guld-node chain_reorg`.

Test miners use `--mine-cpu-percent 1` (shared-host Simba policy).
