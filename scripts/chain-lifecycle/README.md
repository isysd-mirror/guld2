# Chain lifecycle tests

Disposable dev chains for integration testing. See [`docs/tasks/open/006-chain-lifecycle-tests.md`](../../docs/tasks/open/006-chain-lifecycle-tests.md).

| Layer | Command |
|-------|---------|
| State matrix (all tx types) | `cargo test -p guld-state lifecycle` |
| Single-node RPC smoke | `cargo test -p guld-node --test dev_smoke` |
| Two-node P2P sync (Rust) | `cargo test -p guld-node --test two_node_sync` |
| Two-node shell smoke | `./scripts/chain-lifecycle/two-node-sync.sh` |

Fork/reorg scenarios are **not** runnable until `guld-node` implements chain rewind and `choose_tip` on live forks.
