# Task: Chain reorg (rewind + replay)

Status: open (core landed; dual-miner test still pending — [019](./019-dual-miner-reorg-integration-test.md))
Priority: **high** (Simba beta — test/ops, not greenfield)
GIP:
Spec: ../specs/06-blocks-and-consensus.md §2–§3, ../specs/10-node.md
Tests: ./006-chain-lifecycle-tests.md phase 4, ./019-dual-miner-reorg-integration-test.md

## Problem

`guld-consensus` has **`choose_tip`**. **`guld-node`** now implements rewind + replay (`chain_reorg.rs`, max depth 2016) and switches on heavier remote tips. Remaining gap:

1. **No dual-miner / P2P adversarial integration test** ([019](./019-dual-miner-reorg-integration-test.md), 006 phase 4).
2. Spec 06 / whitepaper §12 still say “forward sync only” — fix via [015](./015-reconcile-docs-with-code.md).
3. Ops: full genesis replay cost + mempool wipe on reorg need runbook notes.

*(Original problem statement assumed forward-only import — stale as of 2026-09-26.)*

## Goals

1. ~~Persist headers/blocks; rewind; replay~~ — **landed**
2. ~~P2P heavier-fork switch~~ — **landed** (verify under [019](./019-dual-miner-reorg-integration-test.md))
3. **Tests:** dual-miner fork script green
4. **Docs:** `deploy/SIMBA.md` fork recovery + spec 06 wording ([015](./015-reconcile-docs-with-code.md))

## Non-goals

- Deep reorg beyond practical depth (cap e.g. 2016 blocks — document).
- GHOSTDAG / multi-parent ([LATER.md](../LATER.md)).
- Incremental snapshot rewind (follow-up if replay cost bites).

## Done when

- [x] Node follows heavier valid fork without manual datadir reset (core)
- [ ] Phase 4 / [019](./019-dual-miner-reorg-integration-test.md) reorg tests pass
- [ ] Task 007 §C reorg-test row closed
- [ ] `deploy/SIMBA.md` fork recovery section updated

## Notes

```
2026-09-26: Opened — Simba requirement; 006 phase 4 blocked on this implementation.
2026-09-26: External review — core landed; split remaining test work to 019; docs sync 015.
```
