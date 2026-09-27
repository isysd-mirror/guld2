# Task: Chain lifecycle integration tests

Status: done
Priority: **high** (Simba beta — reorg / sync coverage)
GIP:
Spec: ../../specs/06-blocks-and-consensus.md, ../../specs/16-sponsored-registration.md

## Status (2026-09)

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | State matrix — all tx types in-process | **Done** — `guld-state/tests/lifecycle_matrix.rs` |
| **2** | Single-node dev smoke (RPC + subprocess) | **Done** — mine, register, transfer |
| **3** | Two-node forward sync (P2P) | **Done** — bootnode dial (not mDNS) |
| **4** | Fork / reorg | **Done** — `dual_miner_reorg` + `chain_reorg` |
| **5** | Simba tall-tip catch-up (no ban) | **Done** — `simba_catchup_sync` |
| **CI** | Pre-commit Phase 1–5 + genesis | **Done** — `scripts/githooks/pre-commit` |

Node RPC smoke originally covered a **subset** of the state matrix (register + transfer). **Group thr>1 lifecycle + peer accept** shipped as [035](./035-group-multisig-lifecycle-e2e.md) (`group_multisig_lifecycle` + `group_multisig_e2e`).

## Done when

- [x] Task doc with matrix and phases
- [x] Phase 1–5 harnesses + shell wrappers under `scripts/chain-lifecycle/`
- [x] Pre-commit runs Phase 1–5 on `guld-node` / `guld-p2p` (and umbrella when those gitlinks change)
- [x] `./scripts/install-dev-hooks.sh` documents escape hatches

## Running locally

```bash
./scripts/install-dev-hooks.sh
cargo test -p guld-state --test lifecycle_matrix
cargo test -p guld-node --test dev_smoke
cargo test -p guld-node --test two_node_sync
cargo test -p guld-node --test dual_miner_reorg
cargo test -p guld-node --test simba_catchup_sync -- --nocapture
```

Index: [`scripts/chain-lifecycle/README.md`](../../../scripts/chain-lifecycle/README.md).
