# Task: Chain lifecycle integration tests

Status: open
Priority: **high** (Simba beta blocker — task 007 §C: reorg)
GIP:
Spec: ../specs/06-blocks-and-consensus.md, ../specs/16-sponsored-registration.md

## Status (2026-09)

| Phase | Scope | Status |
|-------|--------|--------|
| **1** | State matrix — all tx types in-process | **Done** — `guld-state/tests/lifecycle_matrix.rs` |
| **2** | Single-node dev smoke (RPC + subprocess) | **Done** — mine, register, transfer |
| **3** | Two-node forward sync (P2P) | **Done** — Rust test + shell script (mDNS on `--dev`) |
| **4** | Fork / reorg | **Done** — `dual_miner_reorg` + `chain_reorg` unit tests (task 019) |
| **CI** | Pre-commit Phase 1–2 on `guld-state` / `guld-node` | **Done** — `scripts/githooks/pre-commit` + `scripts/install-dev-hooks.sh` |

Node RPC smoke covers a **subset** of the matrix today (register + transfer). Rotate, group/sub over RPC, and full parity with the state matrix are follow-ups under this task while it stays open.

## Problem

Guld has strong **unit** coverage in `guld-state/tests/apply_tx.rs` and `guld-consensus/tests/mine_block.rs`, but no end-to-end harness that:

1. Spins a **disposable chain** (fast PoW / on-demand mining),
2. Exercises **every transaction type** in realistic order (register → operate → rotate → repeat),
3. Runs **multiple nodes** with distinct datadirs and checks P2P forward sync,
4. Intentionally creates **forks** and verifies **reorgs** match spec 06.

Today `guld-node` implements rewind + heavier-tip switch (`chain_reorg.rs`). Phase 4 dual-miner coverage: [`dual_miner_reorg.rs`](../../../src/guld-node/tests/dual_miner_reorg.rs) ([019](../done/2026-09/019-dual-miner-reorg-integration-test.md)).

## Transaction matrix

| Phase | Tx types | State tests | Node RPC | Multi-node | Reorg |
|-------|----------|-------------|----------|------------|-------|
| A — baseline | Transfer, UpdateMaster | existing + lifecycle | dev smoke | — | — |
| B — names | RegisterUsername, RegisterGroup, RegisterSubaccount | lifecycle | extend smoke | — | — |
| C — maintenance | RotateKeys (1-of-1, group expand/shrink), SettleRegistration | existing + lifecycle | extend smoke | — | — |
| D — legacy | ClaimLegacy (`dev_unlock_v1`, attestation) | existing | `--dev` only | — | — |
| E — sync | mine + mempool gossip | — | — | two-node script/test | — |
| F — forks | competing tips | `choose_tip` + `chain_reorg` | — | — | **done** (019) |

## Phased delivery

### Phase 1 — State lifecycle matrix (in tree)

- `src/guld-state/tests/lifecycle_matrix.rs`: one ordered scenario covering all tx kinds on a synthetic genesis (register user/group/sub → transfer → update master → rotate → transfer again → settle → claim legacy).
- Add missing `RegisterGroup` unit assertion (kind + fee).

Run: `cargo test -p guld-state lifecycle`

### Phase 2 — Single-node dev smoke (in tree)

- `src/guld-node/tests/dev_smoke.rs`: subprocess `--dev --miner alice --difficulty 1`, JSON-RPC mine + sponsored register + transfer.
- Shared helpers in `src/guld-node/tests/common/mod.rs`.

Run: `cargo test -p guld-node --test dev_smoke`

### Phase 3 — Two-node forward sync (done)

- `src/guld-node/tests/two_node_sync.rs`: miner + follower, temp datadirs, `--dev` mDNS discovery on localhost.
- `scripts/chain-lifecycle/two-node-sync.sh`: same check via release binary + curl.
- Index: [`scripts/chain-lifecycle/README.md`](../../../scripts/chain-lifecycle/README.md).

### Phase 4 — Fork / reorg (done)

- `src/guld-node/tests/dual_miner_reorg.rs`: two miners, shared genesis, offline diverge, P2P reconnect; heavier tip wins; orphan `ClaimReward` rejected.
- Unit: `chain_reorg` heavier fork depth > 1, `MAX_REORG_DEPTH`, orphan claim.
- Wrapper: [`scripts/chain-lifecycle/dual-miner-reorg.sh`](../../../scripts/chain-lifecycle/dual-miner-reorg.sh).
- Closed under [019](../done/2026-09/019-dual-miner-reorg-integration-test.md).

## Done when

- [x] Task doc (this file) with matrix and phases
- [x] Phase 1: `lifecycle_matrix` + `RegisterGroup` coverage
- [x] Phase 2: `dev_smoke` RPC harness
- [x] Phase 3: `two_node_sync.rs` + `two-node-sync.sh` + `scripts/chain-lifecycle/README.md`
- [x] Phase 4: reorg tests ([019](../done/2026-09/019-dual-miner-reorg-integration-test.md))
- [x] Pre-commit runs Phase 1–2 on `guld-state` / `guld-node` (and umbrella when those gitlinks change) — `./scripts/install-dev-hooks.sh`

## Running locally

```bash
# One-time: install pre-commit hooks (umbrella + guld-state + guld-node)
./scripts/install-dev-hooks.sh

# State matrix (fast, no subprocess)
cargo test -p guld-state --test lifecycle_matrix

# Single dev node over JSON-RPC
cargo test -p guld-node --test dev_smoke

# Two-node sync (builds release binary; ~30s PoW on difficulty 1)
./scripts/chain-lifecycle/two-node-sync.sh

# Dual-miner reorg
cargo test -p guld-node --test dual_miner_reorg
```

Pre-commit runs Phase 1 on every `guld-state` commit, and Phase 1+2 on every `guld-node` commit (and on umbrella commits that touch those gitlinks). Humans may set `GULD_SKIP_LIFECYCLE=1` only in emergencies; agents must not.