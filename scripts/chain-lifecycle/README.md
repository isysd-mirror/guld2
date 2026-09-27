# Chain lifecycle tests

Disposable dev chains for integration testing. See [`docs/tasks/done/2026-09/006-chain-lifecycle-tests.md`](../../docs/tasks/done/2026-09/006-chain-lifecycle-tests.md).

**CI = pre-commit hooks** (`./scripts/install-dev-hooks.sh`). No hosted pipeline.

| Layer | Command | Pre-commit |
|-------|---------|------------|
| State matrix (all tx types) | `cargo test -p guld-state --test lifecycle_matrix` | Phase 1 |
| Single-node RPC smoke | `cargo test -p guld-node --test dev_smoke` | Phase 2 |
| Two-node P2P sync (Rust) | `cargo test -p guld-node --test two_node_sync` | Phase 3 |
| Dual-miner reorg (Rust) | `cargo test -p guld-node --test dual_miner_reorg` | Phase 4 |
| Simba catch-up (Rust) | `cargo test -p guld-node --test simba_catchup_sync` | Phase 5 |
| Simba genesis pins (Rust) | `cargo test -p guld-node --test simba_genesis_smoke` | Genesis (012) |
| GIP-26 TxId goldens | `cargo test -p guld-wire --test vectors_tx_id` | Vectors (021) |
| GIP-26 header/diff/time | `cargo test -p guld-consensus --test vectors_gip26` | Vectors (021) |
| Two-node shell smoke | `./scripts/chain-lifecycle/two-node-sync.sh` | — |
| Dual-miner shell wrapper | `./scripts/chain-lifecycle/dual-miner-reorg.sh` | — |
| Simba catch-up shell wrapper | `./scripts/chain-lifecycle/simba-catchup-sync.sh` | — |
| Simba genesis shell wrapper | `./scripts/chain-lifecycle/simba-genesis-smoke.sh` | — |

Unit coverage for rewind/replay / `MAX_REORG_DEPTH` / orphan `ClaimReward`: `cargo test -p guld-node chain_reorg`.

Test miners use `--mine-cpu-percent 1` (shared-host Simba policy).

Escape hatches (humans only): `GULD_SKIP_LIFECYCLE=1`, `GULD_SKIP_CATCHUP=1`, `GULD_SKIP_GENESIS=1`.
