# Task: Legacy settle in guld-state (GIP-27)

Status: done
Priority: **high**
GIP: ../../gips/gip-27.md
Spec: ../../specs/03-transactions.md §3.4a, ../../specs/15-ledger-import.md
Epic: [022](./022-legacy-settle-parity.md)
Depends: —

## Problem

`apply_settle_registration` returns `LegacyLocked` and `names_due_for_settle` skips locked accounts, so miners never recycle unclaimed imports.

## Goals

1. Remove the `is_legacy_locked()` reject in settle (Individual / Group / Subaccount only; Network still reserved).
2. Stop skipping locked names in `names_due_for_settle`.
3. Funded settle while locked: debit `F_*`, extend `expires_at`, **remain** `legacy.status = locked`.
4. Unfunded settle while locked: delete account + dust → vesting (same cascade rules); name free for `RegisterUsername`.
5. Tests: invert / replace `legacy_locked_settle_rejected`; add funded renew + unfunded release + register-after-release; extend lifecycle matrix if needed.
6. Document ClaimLegacy `expires_at` formula used in code (v1: keep `height + REGISTRATION_PERIOD` unless a clear bug).

## Non-goals

- Changing import `expires_at` (→ [024](./024-legacy-import-expiry.md)).
- Spec prose (→ [025](./025-gip-27-specs-sync.md)).
- Simba regenesis (→ [026](./026-simba-regenesis-gip-27.md)).

## Done when

- [x] `cargo test -p guld-state` green (incl. lifecycle_matrix)
- [x] Locked accounts settle like unlocked peers
- [x] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Split from 022. Crate: src/guld-state (apply.rs, lib.rs, tests).
```
