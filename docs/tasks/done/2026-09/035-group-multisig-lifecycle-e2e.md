# Task: Group multi-sig lifecycle e2e

Status: done  
Priority: **high** (confidence for threshold Transfer / RotateKeys after [028](./028-threshold-transfer-cosign.md))  
Spec: [`../../specs/03-transactions.md`](../../specs/03-transactions.md) §3.5–3.6, [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §9, [`../../specs/16-sponsored-registration.md`](../../specs/16-sponsored-registration.md)  
Depends: [028](./028-threshold-transfer-cosign.md) **done**; builds on [006](./006-chain-lifecycle-tests.md)  
Related: [`../../scripts/chain-lifecycle/README.md`](../../../scripts/chain-lifecycle/README.md)

## Problem

Existing coverage did **not** exercise a real multi-sig group lifecycle:

- `lifecycle_matrix` registers group `team` with **2 keys but `threshold: 1`**; UpdateMaster / RotateKeys / post-rotate Transfer are on **individual** `carol` (1-of-1).
- `transfer_threshold_cosign_2_of_2` is a premine 2-of-2 unit test — not register → fund → spend as a group.
- Node / P2P suites never submitted threshold Transfer / UpdateMaster / RotateKeys; peers never proved they accept gossiped multi-sig spends.

## Shipped

### A — State matrix

`guld-state/tests/group_multisig_lifecycle.rs`: RegisterGroup thr=2 → fund → UpdateMaster cosign → Transfer cosign → under-threshold reject → RotateKeys → spend under new keys (old keys fail).

### B — Node / peer e2e

`guld-node/tests/group_multisig_e2e.rs`:

- `group_2of2_rpc_lifecycle` — offline JSON-RPC full lifecycle
- `peer_applies_cosign_transfer` — miner seals RegisterGroup + cosign Transfer; follower imports over P2P

Also fixed consensus: `import_block` now schedules/claims registration-fee vesting **before** applying txs (same order as `seal_block`). Previously peers rejected any block with non-zero registration fees (`roots mismatch`) — empty/Transfer-only blocks still synced. Covered by `import_block_replays_register_group` in `guld-consensus/tests/mine_block.rs`.

### C — Docs

- `scripts/chain-lifecycle/README.md` lists the new suites
- Task 006 follow-up note points here

## Done when

- [x] State matrix covers register(group, thr>1) → tip + spend cosign → rotate → spend under new keys (+ under-threshold reject)
- [x] Node (and two-peer) path green for Transfer cosign after register
- [x] Documented in `scripts/chain-lifecycle/README.md`
- [x] Task → `done/2026-09/`

## Notes

```
2026-09-27: Opened after gap review — no true group multi-sig e2e; rotate→spend only for 1-of-1 individuals today.
2026-09-27: Closed — state + RPC + peer green; import_block vesting order fixed (RegisterGroup roots mismatch).
```
