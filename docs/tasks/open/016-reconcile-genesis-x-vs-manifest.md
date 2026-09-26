# Task: Reconcile genesis `x` vs import-manifest sum

Status: open
Priority: **high** (Simba A7 precision / GIP-24)
GIP: ../gips/gip-24.md, ../gips/gip-14.md
Spec: ../specs/15-ledger-import.md §2.1, ../specs/07-fees-and-tokenomics.md §6
Genesis: ../../data/genesis/simba/

## Problem

Documented **x = 959,947.19527052 GULD** (task 007 A7, GIP-14, `GENESIS_X_QUANTA`) does **not** equal the sum of balances in `data/genesis/simba/import-manifest.json`:

| Quantity | GULD |
|----------|------|
| Sum of manifest rows | **960,275.39527052** |
| Documented `x` | **959,947.19527052** |
| Gap | **+328.20000000** |

Issuance / economy params use `x`; genesis state applies all rows. Specs claim disclosed exact `x` and “no hidden inflation,” but base subsidy and imported balances disagree. External review flagged this as a process/precision bug on a “locked” pin.

## Goals

1. Determine root cause (omitted rows in `x` calc, double-count, rounding, filtered names, etc.).
2. Pick one normative rule: **`x := sum(rows)`** *or* document excluded mass and keep `x` with an explicit delta table.
3. Update GIP-14 / spec 15 / `economy.rs` / genesis README to match.
4. If manifest or `x` changes, roll into [012](./012-simba-genesis-ceremony.md) (new manifest hash).
5. Feed numbers into the GIP-24 distribution brief.

## Non-goals

- Haircutting holder balances for optics.
- Redesigning inflation.

## Done when

- [ ] Written reconciliation (delta = 0 or explained to the quanta)
- [ ] Specs + code constants agree
- [ ] Genesis README documents the rule
- [ ] Linked from GIP-24 brief checklist

## Notes

```
2026-09-26: Opened from external review — measured gap +328.2 GULD on Simba manifest.
```
