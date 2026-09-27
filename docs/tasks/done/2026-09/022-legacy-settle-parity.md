# Task: Legacy settle parity (GIP-27) — epic

Status: done
Priority: **high** (Simba honesty / tokonomy; do before durable mainnet messaging)
GIP: ../../gips/gip-27.md
Spec: ../../specs/15-ledger-import.md, ../../specs/03-transactions.md, ../../specs/07-fees-and-tokenomics.md, ../../specs/02-identity-and-accounts.md
Depends: ./007-simba-beta-public-readiness.md, ./016-reconcile-genesis-x-vs-manifest.md

## Problem

Legacy-locked imports use `expires_at = NEVER_EXPIRES` and `SettleRegistration` rejects / skips them. Unclaimed names (including high-value remaps like **`y`**) and attestation overhang sit indefinitely. [GIP-27](../../gips/gip-27.md) requires full pay-or-release parity while keeping spend behind `ClaimLegacy`.

## Child tasks (implement in order)

| # | Task | Slice |
|---|------|--------|
| 1 | [023](./023-legacy-settle-state.md) | `guld-state`: settle + `names_due_for_settle` + unit/lifecycle tests |
| 2 | [024](./024-legacy-import-expiry.md) | `guld-legacy`: import `expires_at = REGISTRATION_PERIOD` |
| 3 | [025](./025-gip-27-specs-sync.md) | Specs 02/03/07/15 + GIP-14 wording |
| 4 | [026](./026-simba-regenesis-gip-27.md) | Simba artifact regenesis + tip pin + genesis smoke |
| 5 | [027](./027-legacy-parity-comms.md) | Distribution brief, SIMBA_BETA, whitepaper / FAQ heuristics |

Miner enqueue follows `names_due_for_settle` — no separate node task unless 023 reveals a hard-coded skip.

## Done when

- [x] All children **done** and archived
- [x] Pre-commit lifecycle + genesis smoke green on new tip
- [x] This epic moved to `done/2026-09/`

## Notes

```
2026-09-27: Opened as epic; split into 023–027 for implementable slices.
  Example pressure: y-- → y (L=1, F_user=1000 GULD/yr) with ~100 GULD import.
2026-09-27: Implemented 023–027; tip 0xf4cdc017…; expires_at in SMT leaf; wipe prior tip.
```
