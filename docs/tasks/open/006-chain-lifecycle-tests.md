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
| **4** | Fork / reorg | **Required for Simba** — no chain rewind in `guld-node` yet |
| **CI** | Run phases 1–2 in pipeline | **Not started** (optional follow-up) |

Node RPC smoke covers a **subset** of the matrix today (register + transfer). Rotate, group/sub over RPC, and full parity with the state matrix are follow-ups under this task while it stays open.

## Problem

Guld has strong **unit** coverage in `guld-state/tests/apply_tx.rs` and `guld-consensus/tests/mine_block.rs`, but no end-to-end harness that:

1. Spins a **disposable chain** (fast PoW / on-demand mining),
2. Exercises **every transaction type** in realistic order (register → operate → rotate → repeat),
3. Runs **multiple nodes** with distinct datadirs and checks P2P forward sync,
4. Intentionally creates **forks** and verifies **reorgs** match spec 06.

Today `guld-node` only accepts blocks at `tip+1` with matching `prev_hash` (`apply_remote_block`); `choose_tip` exists in `guld-consensus` but is not wired for live reorg. Fork/reorg scenarios must stay **blocked** until rewind + fork choice land.

## Transaction matrix

| Phase | Tx types | State tests | Node RPC | Multi-node | Reorg |
|-------|----------|-------------|----------|------------|-------|
| A — baseline | Transfer, UpdateMaster | existing + lifecycle | dev smoke | — | — |
| B — names | RegisterUsername, RegisterGroup, RegisterSubaccount | lifecycle | extend smoke | — | — |
| C — maintenance | RotateKeys (1-of-1, group expand/shrink), SettleRegistration | existing + lifecycle | extend smoke | — | — |
| D — legacy | ClaimLegacy (`dev_unlock_v1`, attestation) | existing | `--dev` only | — | — |
| E — sync | mine + mempool gossip | — | — | two-node script/test | — |
| F — forks | competing tips | `choose_tip` unit | — | — | **blocked** (no reorg) |

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

### Phase 4 — Fork / reorg (blocked)

Prerequisites (separate work):

- State rewind to common ancestor + replay heavier chain.
- P2P: store competing tips, call `choose_tip`, emit reorg events.
- Only then: dual-miner fork script, assert account balances after reorg.

Track under GIP / spec 06 gap; do not fake-pass reorg tests against current node.

## Done when

- [x] Task doc (this file) with matrix and phases
- [x] Phase 1: `lifecycle_matrix` + `RegisterGroup` coverage
- [x] Phase 2: `dev_smoke` RPC harness
- [x] Phase 3: `two_node_sync.rs` + `two-node-sync.sh` + `scripts/chain-lifecycle/README.md`
- [ ] Phase 4: reorg tests (blocked on implementation)
- [ ] CI job runs Phase 1–2 on every `guld-state` / `guld-node` change (optional follow-up)

## Running locally

```bash
# State matrix (fast, no subprocess)
cargo test -p guld-state lifecycle

# Single dev node over JSON-RPC
cargo test -p guld-node --test dev_smoke

# Two-node sync (builds release binary; ~30s PoW on difficulty 1)
./scripts/chain-lifecycle/two-node-sync.sh
```
