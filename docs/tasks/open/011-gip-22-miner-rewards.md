# Task: GIP-22 miner rewards (RewardCommit + ClaimReward)

Status: done (core path landed — finish checklist / footguns)
Priority: **normal** (was Simba P0; raise again only if regressions found)
GIP: ../gips/gip-22.md
Spec: ../specs/03-transactions.md §3.0–§3.1, ../specs/06-blocks-and-consensus.md §4, ../specs/07-fees-and-tokenomics.md §2
Related: ./008-mempool-persistence.md (pending claims across restarts), ./020-remove-credit-miner-footguns.md

## Problem

Specs and [GIP-22](../gips/gip-22.md) are **Accepted**. Reference code now seals/imports with **`RewardCommit`** at `txs[0]` and mints via mature **`ClaimReward`** (see `guld-consensus` mine_block tests). Remaining work is **hygiene and checklist closure**, not a greenfield implementation:

1. Confirm production paths never call **`credit_miner()`** ([020](./020-remove-credit-miner-footguns.md)).
2. Mempool persistence for pending claims ([008](./008-mempool-persistence.md)).
3. Explorer/RPC surfacing of committed vs claimed rewards (minimal).
4. Document Simba activation / regenesis choice in `deploy/SIMBA.md`.
5. Close task 007 “GIP-22” landed row once footguns + docs match.

*(Original problem statement assumed `credit_miner`-only apply — that is stale as of 2026-09-26 external review.)*

## Goals

1. Audit apply/import/seal for any remaining immediate mint.
2. Drop or gate `credit_miner` ([020](./020-remove-credit-miner-footguns.md)).
3. Mempool: immature claims retained; mature claims mine ([008](./008-mempool-persistence.md)).
4. Explorer / RPC: show committed reward + pending claim status (minimal).
5. Activation note in `deploy/SIMBA.md`.

## Non-goals

- Changing **`COINBASE_MATURITY_BLOCKS = 100`** (locked).
- Full wallet UX for reward subaccounts (miner can use 1-of-1 root name initially).

## Done when

- [ ] No production `credit_miner` mint path ([020](./020-remove-credit-miner-footguns.md))
- [ ] Immature claims in mempool; mature claims mine successfully (covered by existing tests + 008)
- [ ] Task 007 landed-row acknowledged; docs synced via [015](./015-reconcile-docs-with-code.md)
- [ ] [008](./008-mempool-persistence.md) updated to mention claim pool (or done together)

## Notes

```
2026-09-26: Opened from spec review — Simba blocker; pairs with reorg ([013](./013-chain-reorg-implementation.md)).
2026-09-26: External review — core RewardCommit/ClaimReward path present; demote from P0; track footguns in 020.
```
