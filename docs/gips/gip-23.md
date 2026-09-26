---
gip: 23
title: Consensus-Enforced Difficulty Schedule
description: Validators MUST reject headers whose difficulty does not match next_difficulty.
author: Guld contributors
discussions-to: ../tasks/open/014-enforce-difficulty-on-import.md
status: Draft
type: Standards
category: Core
created: 2026-09-26
requires: 4
---

## Abstract

Make the Bitcoin-analogue retarget schedule **consensus-mandatory**: on every non-genesis header import, peers MUST verify `header.difficulty == next_difficulty(height, parent, period_start)` (spec 06 §2.4), not only that PoW meets the difficulty the miner *claimed*.

## Motivation

Spec 06 §2.4 describes how difficulty is computed; the miner seal path already calls `next_difficulty`. Block import (`check_header` / `import_block`) today verifies:

- parent link and height continuity
- PoW against **claimed** `header.difficulty`
- rules hash and timestamp bounds

It does **not** require the claimed difficulty to equal the schedule. Under-claiming is partly self-penalizing for fork choice (`work = 2^difficulty`), but:

1. Retarget becomes **miner policy**, not a shared consensus rule — peers can diverge on what “correct” difficulty means.
2. Timestamp MTP’s economic role in retarget is weakened if validators never check the schedule.
3. External review (2026-09-26) rated this a **critical** gap before durable Simba / mainnet lock.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Consensus rule

1. For every imported header with `height ≥ 1`, a full node MUST compute  
   `expected = next_difficulty(header.height, parent, period_start_header_or_none)`  
   per [spec 06](../specs/06-blocks-and-consensus.md) §2.4 (2016-block window, 14-day timespan, 4× clamp, bit-difficulty).
2. If `header.difficulty != expected`, the node MUST reject the block with a distinct error (e.g. `BadDifficulty`).
3. Height 0 (genesis) MUST continue to require `difficulty == 0` (existing PoW rule).
4. `period_start` MUST be the header at the start of the current adjustment interval when `height` is a multiple of `DIFFICULTY_ADJUSTMENT_INTERVAL`; otherwise the call MAY pass `None` as today when the formula ignores it.

### Spec text

Update [spec 06](../specs/06-blocks-and-consensus.md) §3 (header validation checklist) to include an explicit MUST for scheduled difficulty. Remove any wording that implies retarget is advisory for validators.

### Tests

Reference implementation MUST include unit tests that:

- Accept a header sealed at the schedule difficulty.
- Reject a header with valid PoW but `difficulty = expected ± 1` (when PoW still passes the claimed bit count).
- Cover a retarget boundary height (e.g. 2016).

## Rationale

**Alternative — leave schedule as miner soft policy.** Rejected: peers would not share a deterministic validity predicate; public-mesh honesty requires one rule.

**Alternative — only enforce at retarget boundaries.** Rejected: every height has a well-defined `expected`; checking always is simpler and closes under/over-claim between boundaries.

Bit-difficulty coarseness (each step doubles work) is unchanged; this GIP does not switch to `nBits` (see research `pow-nbits-vs-leading-bits.md`).

## Backwards Compatibility

- **Simba / any public tip that already mined off-schedule headers:** may require a **reset** or a height-activated rule bundle ([spec 17](../specs/17-protocol-upgrades.md)) if historical tips violate the schedule. Prefer: activate at genesis / next Simba ceremony ([task 012](../tasks/open/012-simba-genesis-ceremony.md)) so no soft-fork window is needed on testnet.
- Dev nets with `--difficulty` soft-caps MUST still produce schedule-compliant headers, or use a dedicated `chain_id` with documented genesis-only exceptions (none recommended for Simba).

## Security Considerations

- Closes peer divergence on difficulty.
- Does not by itself create Bitcoin-class security budget (hashrate).
- Rejecting wrong difficulty is cheap (arithmetic + header lookback); no new DoS surface beyond existing header sync.

## Reference Implementation

- Task: [014-enforce-difficulty-on-import.md](../tasks/open/014-enforce-difficulty-on-import.md)
- Likely touch: `guld-consensus::check_header` / `import_block`, `guld-node` seal path (already uses `next_difficulty`), unit tests in `guld-consensus`.

## History

- 2026-09-26: Drafted from external project review (`.guld-data/reviews/external-project-review-2026-09-26.md`, finding C1).
