# Task: Remove dead `credit_miner` path + stale maturity comments

Status: open
Priority: low
GIP: ../gips/gip-22.md
Spec: ../specs/06-blocks-and-consensus.md §4
Related: ./011-gip-22-miner-rewards.md

## Problem

GIP-22 commit/claim is on the consensus path, but:

- `State::credit_miner` (or equivalent) may still exist as a footgun
- `economy.rs` (or nearby) still comments maturity “enforcement TBD” while apply enforces it
- `apply(ClaimReward)` using `block_height = u64::MAX` bypasses maturity if any non-`apply_at_height` caller appears

External review flagged these as low–medium footguns.

## Goals

1. Delete or `#[cfg(test)]`-gate `credit_miner` if unused by production apply/import/seal.
2. Fix stale TBD comments to point at GIP-22 / maturity constant.
3. Ensure all consensus callers use height-aware apply; add a test that immature claim via wrong API cannot mint (or make the bypass impossible).
4. Update task 011 checklist when cleanup lands.

## Non-goals

- Changing maturity = 100.
- Wallet UX for claims.

## Done when

- [ ] No production path credits miner balances outside ClaimReward
- [ ] Comments match enforcement
- [ ] Footgun API hardened or tested

## Notes

```
2026-09-26: Opened from external review R6 / leftover footguns.
```
