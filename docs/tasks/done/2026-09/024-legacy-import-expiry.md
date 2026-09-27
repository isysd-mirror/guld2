# Task: Legacy import expiry at genesis (GIP-27)

Status: done
Priority: **high**
GIP: ../../gips/gip-27.md
Spec: ../../specs/15-ledger-import.md §4
Epic: [022](./022-legacy-settle-parity.md)
Depends: [023](./023-legacy-settle-state.md) (settle must accept locked overdue names)

## Problem

`guld-legacy` genesis import sets `expires_at_height = NEVER_EXPIRES` for every legacy-locked row, so even after settle parity the clock never starts.

## Goals

1. On import, set `expires_at_height = import_height + REGISTRATION_PERIOD` (artifact genesis: height 0 → `REGISTRATION_PERIOD_BLOCKS`).
2. MUST NOT assign `NEVER_EXPIRES` to legacy-locked Individual/Group imports.
3. Keep `legacy.status = locked`, empty keys, `threshold = 0`.
4. Unit/integration coverage that imported rows are due after `REGISTRATION_PERIOD` blocks.
5. Confirm `isysd` genesis-claim path still ends Claimed with a finite expiry (no regression).

## Non-goals

- Rewriting committed Simba `0.json` / tip (→ [026](./026-simba-regenesis-gip-27.md)).
- Spec edits (→ [025](./025-gip-27-specs-sync.md)).

## Done when

- [x] `cargo test -p guld-legacy` (+ any state tests that construct imports) green
- [x] New imports have finite `expires_at`
- [x] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Split from 022. Touch: src/guld-legacy/src/manifest.rs (and genesis helpers).
```
