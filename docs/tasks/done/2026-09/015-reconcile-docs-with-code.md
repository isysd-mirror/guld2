# Task: Reconcile docs/tasks with consensus code

Status: done
Priority: **high** (ops / readiness signal)
GIP:
Spec: ../specs/06-blocks-and-consensus.md, ../specs/README.md
Related: ./007-simba-beta-public-readiness.md, ./011-gip-22-miner-rewards.md, ./013-chain-reorg-implementation.md

## Problem

Specs, whitepaper §12, and open tasks **understate** what reference code already does:

| Doc claim (stale) | Code reality (2026-09-26 review) |
|-------------------|----------------------------------|
| Spec 06: “forward sync only” / reorg TBD | `guld-node` `chain_reorg.rs` + heavier-tip path |
| Task 007 §C: timestamps not enforced | Task 010 **done** — MTP + 2 h in `check_header` |
| Task 007 §C / 011: still `credit_miner()` only | GIP-22 commit/claim path present; `credit_miner` unused on consensus path |
| Whitepaper §12.1: “no chain reorg yet” | Reorg module exists; dual-miner test still missing |
| Specs README matrix: timestamps/GIP-22/reorg = no/partial | Needs refresh |

External operators following docs alone **mis-assess** Simba risk. That is itself a process red flag.

## Goals

1. Update spec 06 §2.3 / open lists for reorg + timestamps + GIP-22 status.
2. Rewrite task 007 §C to match reality; move closed blockers out; add [014](./014-enforce-difficulty-on-import.md) (done).
3. Refresh whitepaper §12.1–12.2 shipped/gaps tables (reorg: “core landed, adversarial tests open”).
4. Update [011](./011-gip-22-miner-rewards.md) / [013](./013-chain-reorg-implementation.md) problem statements and checklists.
5. Refresh `docs/specs/README.md` implementation matrix + `docs/tasks/README.md` priority table.
6. Fix `docs/UPGRADE_FROM_1.md` “gas-metered rules VM” line to match no-L0-VM product (pointer to whitepaper).

## Non-goals

- Implementing missing features (BARE, difficulty enforce, genesis ceremony).
- Full whitepaper rewrite.

## Done when

- [x] Spec 06, whitepaper §12, task 007 §C, specs README matrix, tasks README agree with code
- [x] 010 archived under `done/` (already Status: done)
- [x] 011 / 013 notes reflect landed vs remaining work
- [x] UPGRADE_FROM_1 stale VM goal corrected or clearly marked historical

## Notes

```
2026-09-26: Opened from external review finding C6 / D5 (doc drift).
2026-09-26: Spec 06 / whitepaper §12 / UPGRADE_FROM_1 / matrices refreshed; 014 → done.
```
