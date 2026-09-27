# Task: GIP-27 specs sync

Status: done
Priority: **high**
GIP: ../../gips/gip-27.md
Spec: ../../specs/02-identity-and-accounts.md, ../../specs/03-transactions.md, ../../specs/07-fees-and-tokenomics.md, ../../specs/15-ledger-import.md
Epic: [022](./022-legacy-settle-parity.md)
Depends: [023](./023-legacy-settle-state.md), [024](./024-legacy-import-expiry.md) (docs must match shipped behavior)

## Problem

Normative prose still says settle skips legacy-locked, claims stay open with forever leases, and §5.3 forever-bans import-manifest names. That contradicts [GIP-27](../../gips/gip-27.md) / [GIP-11](../../gips/gip-11.md) (already amended).

## Goals

1. **spec 15:** §4–5 settle/claim clock; retire §5.3 forever-manifest ban; §9 drop “locked forever is accepted”; document import `expires_at` and ClaimLegacy expiry formula.
2. **spec 03** §3.4a: remove legacy-locked settle forbid.
3. **spec 02** §3.0: align pay-or-release / legacy wording.
4. **spec 07:** locked imports **are** settled on the same `F_*` schedule (after import clock starts).
5. **GIP-14:** Accepted history note pointing at GIP-27 (no silent contradiction).
6. **specs/README.md** matrix row for GIP-27 / this work.

## Non-goals

- Marketing / distribution brief (→ [027](./027-legacy-parity-comms.md)).
- Code (023/024).

## Done when

- [x] Specs + GIP-14 consistent with GIP-27
- [x] No remaining “settle skips legacy-locked” normative lines
- [x] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Split from 022. Docs-only after code lands (or same PR as 023/024).
```
