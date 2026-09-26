# Task: Enforce difficulty schedule on import (GIP-23)

Status: open
Priority: **high** (Simba beta blocker — add to task 007 §C)
GIP: ../gips/gip-23.md
Spec: ../specs/06-blocks-and-consensus.md §2.4–§3
Parent checklist: ./007-simba-beta-public-readiness.md

## Problem

`next_difficulty` is used on the **miner seal** path, but `check_header` / `import_block` only verify PoW against the **claimed** `header.difficulty`. Validators do not require `header.difficulty == next_difficulty(...)`.

External review (2026-09-26) rated this **critical**: retarget is miner policy, not consensus; peers can diverge.

## Goals

1. Extend `check_header` (or `import_block`) to take period-start context and reject `BadDifficulty`.
2. Update spec 06 §3 checklist with an explicit MUST ([GIP-23](../gips/gip-23.md)).
3. Unit tests: accept schedule-correct headers; reject claimed ±1 with still-valid PoW; cover height 2016 boundary.
4. Confirm seal path still produces schedule-compliant headers under Simba and `--dev`.
5. Decide activation: Simba regenesis vs height bundle — document in `deploy/SIMBA.md`.

## Non-goals

- Switching bit-difficulty to Bitcoin `nBits` (separate research / GIP).
- Changing 2016 / 14-day / 4× clamp constants.

## Done when

- [ ] Import rejects off-schedule difficulty
- [ ] Spec 06 updated; GIP-23 → Accepted (or Final when shipped)
- [ ] Tests green; task 007 §C row closed
- [ ] Golden vector stub for bad difficulty linked from [021](./021-consensus-golden-vectors.md) (optional until BARE)

## Notes

```
2026-09-26: Opened from external review finding C1 / GIP-23.
```
