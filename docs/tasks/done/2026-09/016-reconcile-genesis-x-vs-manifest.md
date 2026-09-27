# Task: Reconcile genesis `x` vs import-manifest sum

Status: done
Priority: **high** (Simba A7 precision / GIP-24)
GIP: ../gips/gip-24.md, ../gips/gip-14.md
Spec: ../specs/15-ledger-import.md §2.1, ../specs/07-fees-and-tokenomics.md §6
Genesis: ../../data/genesis/simba/
Related: [018](./018-publish-omitted-buckets-and-negatives.md) (negatives appendix)

## Problem

Documented **x = 959,947.19527052 GULD** (task 007 A7, GIP-14, `GENESIS_X_QUANTA`) does **not** equal the sum of balances in `data/genesis/simba/import-manifest.json`:

| Quantity | GULD |
|----------|------|
| Sum of manifest rows | **960,275.39527052** |
| Documented `x` | **959,947.19527052** |
| Gap | **+328.20000000** |

Issuance / economy params use `x`; genesis state applies all rows. Specs claim disclosed exact `x` and “no hidden inflation,” but base subsidy and imported balances disagree. External review flagged this as a process/precision bug on a “locked” pin.

## Root cause (2026-09-26)

Reproduced with system `ledger` 3.2.1 on `archives/guld-ledger-all.dat` (`bal --flat Assets`):

| Quantity | GULD | Notes |
|----------|------|-------|
| Positive `*:Assets` roots | **960,975.39527052** | 2,217 names |
| Negative `*:Assets` roots | **−1,028.20000000** | 15 names — see [018](./018-publish-omitted-buckets-and-negatives.md) |
| Net (= documented **x**) | **959,947.19527052** | `x` was pinned as **net**, not importable mass |
| Dropped by `Name::parse` after lowercase | **−700.00000000** | **bug** — see below |
| Manifest row sum | **960,275.39527052** | = positives − 700 |

Identity: `manifest − x = (pos − 700) − (pos + neg) = −700 − (−1028.2) = **328.2**`.

### Bug: discarded 1.0 names

**Normative rule:** every Guld 1.0 name that holds a balance **MUST** be a valid Guld 2.0 `Name`. Silently dropping rows in `build_manifest` (`filter_map` + `Name::parse`) is a **bug**, not an allowed omission.

Current preprocess drops **7** pre-founding 100 GULD grants (illegal trailing `-` / `--`):

| 1.0 name | Balance |
|----------|---------|
| `luk-` | 100 |
| `matt-` | 100 |
| `page-` | 100 |
| `qix-` | 100 |
| `shade-` | 100 |
| `xavi-` | 100 |
| `y--` | 100 |
| **Total discarded** | **700** |

Source: `archives/ledger-guld/guld/1496275200.dat` (2016-06-01 pre-founding contributions).

**Fix direction (ceremony [012](./012-simba-genesis-ceremony.md)):** remap or canonicalize these strings to legal 2.0 names (explicit mapping table in genesis artifacts), re-emit manifest, re-pin hash + `x`. Do **not** leave them out of circulating import.

Related oddity (not discarded): `gap.json` (100 GULD) survives because one-dot form parses as a subaccount; decide whether that is intentional or also needs remap. `W1ll1am` (1000) correctly lowercases to `w1ll1am` and merges.

## Goals

1. ~~Determine root cause~~ — done (net `x` vs positives-minus-invalid-names).
2. Pick one normative rule: **`x := sum(rows)`** after **all** 1.0 holders are representable as 2.0 names (preferred), *or* keep net `x` only with an explicit delta table that still **imports** remapped holders.
3. Update GIP-14 / spec 15 / `economy.rs` / genesis README to match; **forbid silent `Name::parse` drops** in import tooling (fail preprocess, or require remap table).
4. Remap the seven hyphen names; roll new manifest into [012](./012-simba-genesis-ceremony.md).
5. ~~Feed numbers into the GIP-24 distribution brief~~ — [`docs/fragments/legacy-distribution.md`](../../fragments/legacy-distribution.md); refresh after remap ceremony.

## Non-goals

- Haircutting holder balances for optics.
- Redesigning inflation.
- Changing negative treatment without a Standards GIP (remain import 0 unless separately decided).

## Done when

- [x] Written reconciliation (delta explained to the quanta — see Root cause)
- [x] Discarded-name bug fixed (remap + no silent drops) or preprocess fails closed
- [x] Specs + code constants agree (`x` = sum of imported rows)
- [x] Genesis README documents the rule + remap table
- [x] Linked from GIP-24 brief checklist (`docs/fragments/legacy-distribution.md`)

## Notes

```
2026-09-26: Opened from external review — measured gap +328.2 GULD on Simba manifest.
2026-09-26: Root-caused. x = net Assets; manifest = positives − 700 illegal names.
           Maintainer rule: all 1.0 names must be valid 2.0 names — discard is a bug.
2026-09-26: Shipped — LEGACY_NAME_REMAP + fail-closed; x = sum(rows) = 960,975.39527052;
           manifest 0x59a39af…; tip 0xadbff540…; GENESIS_X_QUANTA + specs + ceremony pins.
```
