# Task: BARE wire codec implementation (A4)

Status: done
Priority: high
GIP:
Spec: ../specs/01-cryptography.md §4, ../specs/03-transactions.md, ../specs/05-state.md, ../specs/09-p2p.md
Research: ../research/wire-codec-comparison.md
Schemas: ../../schemas/README.md
Parent checklist: ../open/007-simba-beta-public-readiness.md **A2** / **A4**

## Problem

**A2 is decided: BARE** for consensus wire. **A4** needed Rust `TxId`, P2P BARE paths, and schemas so JSON field-order cannot drift consensus identities.

## Goals

1. Publish **`.bare` schema files** under `schemas/guld/v1/`.
2. **`TxId`** = `tagged_hash("guld/tx_id/v1", bare_encode(Tx))` in Rust.
3. **P2P** dual-wire JSON v1 + BARE v2.
4. Block disk BARE — **deferred** (W7).
5. **Golden vectors** in Rust; TS parity deferred (W9).
6. HTTP / JSON-RPC stays JSON at the boundary.

## Done when

- [x] `.bare` files under `schemas/guld/v1/` (`tx.bare` complete; `block.bare` interim; `account.bare` draft deferred)
- [x] `TxId` uses BARE bytes in `guld-consensus` via `guld-wire`
- [x] P2P dual-wire BARE txs/blocks
- [x] Golden vectors: transfer, RewardCommit, ClaimReward, SettleRegistration
- [x] Task 007 **A4** row: spec [x], code [x]
- [x] Dual-wire + Simba reset-once policy recorded

## Deferred (follow-ups, not blocking A4)

| Item | Notes |
|------|--------|
| **W7** datadir BARE blocks | Disk stays JSON; wire converts. Optional post-beta migration. |
| **W9** TS `@bare-ts` smoke | HTTP stays JSON. |
| **account.bare** freeze | SMT leaf still `account_value_hash`; needs height-activated cutover. |
| Full `header.bare` | Interim block v2 still embeds header JSON. |
| `tx_root` BARE leaves | Still JSON merkle interim — changing would force regenesis. |

## Notes

```
2026-09-26: Task opened — A2 locked (BARE); implementation tracked here for A4.
2026-09-26: Dual-wire P2P landed (guld-p2p v2 + node broadcasts BARE txs).
2026-09-26: Closed — complete tx.bare tags 0–9; Amount LE fixed in spec 01;
           goldens for transfer/reward/claim/settle; block.bare interim;
           account.bare draft deferred; W7/W9 explicitly out of A4 Done-when.
```
