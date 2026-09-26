# Task: Header timestamp validation (A10)

Status: done
Priority: **high** (Simba beta blocker — task 007)
GIP:
Spec: ../../specs/06-blocks-and-consensus.md §3
Parent checklist: ../../open/007-simba-beta-public-readiness.md **A10**

## Problem

Spec 06 §3 **locks** block timestamp rules (maintainer confirmed 2026-09-26):

1. **Median-time-past (MTP):** `header.timestamp` MUST be **strictly greater** than the median of the prior up-to-**11** block timestamps.
2. **Max future drift:** `header.timestamp` MUST NOT be more than **2 hours** ahead of the validator’s wall clock at validation time.

`guld-consensus` does **not** enforce these today. Miners and tests use arbitrary timestamps (`prev.timestamp + 100`, etc.). That skews difficulty retarget and allows invalid headers on a public mesh.

**Not an acceptable known gap for Simba** — peers MUST reject bad timestamps before durable beta.

## Goals

1. Implement `validate_header_timestamp(header, ancestors, now)` in `guld-consensus`.
2. Call from block import, mining (template builder), and P2P accept paths in `guld-node`.
3. Unit tests: MTP edge cases (genesis → height 1, short chains, 11-block window).
4. Integration: mining loop sets timestamp to `max(now, mtp + 1)` (or Bitcoin-equivalent policy).
5. Task 007 **A10** row: code [x].

## Non-goals

- Network time protocol / NTP — use local wall clock like Bitcoin.
- Changing the **2 h** or **11-block** constants (locked unless new GIP).

## Done when

- [x] Invalid future (>2 h) and MTP-violating headers rejected at import
- [x] Miner produces valid timestamps by default
- [x] Tests in `guld-consensus` (+ one node smoke if cheap)
- [x] Task 007 A10 `Code matches` ticked

## Notes

```
2026-09-26: Opened — maintainer confirmed MTP + 2 h bound; Simba requirement (not deferrable).
```
