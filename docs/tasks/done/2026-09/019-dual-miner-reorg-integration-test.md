# Task: Dual-miner adversarial reorg integration test

Status: done
Priority: **high** (Simba honesty — pairs with 013 / 006 phase 4)
GIP:
Spec: ../specs/06-blocks-and-consensus.md, ../specs/09-p2p.md
Related: ../done/2026-09/013-chain-reorg-implementation.md, ../open/006-chain-lifecycle-tests.md

## Problem

Chain reorg **core** has landed (`guld-node` `chain_reorg.rs`, heavier-tip switch), but:

- Task 006 **phase 4** (dual-miner fork) is still open
- Only same-chain replay unit coverage exists — **no** competing-tip integration test over P2P
- External review: reorg unproven under adversarial two-miner conditions; mempool wipe + full genesis replay remain operational risks

Without this test, “reorg works” is an implementation claim, not a verified mesh property.

## Goals

1. Integration test (or `scripts/chain-lifecycle` phase 4): two miners, shared genesis, diverge, heavier chain wins on both peers without datadir reset.
2. Assert: tip hash/height agree; balances match replay; orphan rewards not claimable (GIP-22).
3. Optional soak: reorg depth > 1; depth near `MAX_REORG_DEPTH` fails cleanly.
4. Close 006 phase 4 + 013 remaining checklist items that depend on this test.
5. Note replay-from-genesis cost in `deploy/SIMBA.md` (ops expectation).

## Non-goals

- Incremental snapshot rewind optimization (follow-up task if needed).
- GHOSTDAG / multi-parent.

## Done when

- [x] Dual-miner reorg test green — `cargo test -p guld-node --test dual_miner_reorg`
- [x] Unit: heavier fork depth > 1, orphan ClaimReward rejected, `MAX_REORG_DEPTH` via `fork_segment`
- [x] 006 phase 4 + 013 test boxes checked
- [x] SIMBA.md fork-recovery section mentions automated test
- [x] P2P headers sync requests unknown hashes at height ≤ tip (unblocks adversarial reconnect)

## Notes

```
2026-09-26: Opened from external review finding C4 / D4; narrows 006 phase 4 into an actionable ticket.
2026-09-26: Closed — dual_miner_reorg.rs (bootnode, offline diverge, heavier tip wins);
           chain_reorg unit tests; IncomingHeaders + orphan drain fix; SIMBA.md section;
           scripts/chain-lifecycle/dual-miner-reorg.sh wrapper.
```
