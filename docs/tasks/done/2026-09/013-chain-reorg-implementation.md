# Task: Chain reorg (rewind + replay)

Status: done
Priority: **high** (Simba beta — test/ops, not greenfield)
GIP:
Spec: ../specs/06-blocks-and-consensus.md §2–§3, ../specs/10-node.md
Tests: ./006-chain-lifecycle-tests.md phase 4, ./019-dual-miner-reorg-integration-test.md

## Problem

`guld-consensus` has **`choose_tip`**. **`guld-node`** now implements rewind + replay (`chain_reorg.rs`, max depth 2016) and switches on heavier remote tips. Remaining gap (closed via 019):

1. ~~No dual-miner / P2P adversarial integration test~~ — **done** ([019](../done/2026-09/019-dual-miner-reorg-integration-test.md)).
2. Spec 06 / whitepaper §12 reorg wording — fixed via [015](../done/2026-09/015-reconcile-docs-with-code.md).
3. Ops: full genesis replay cost + mempool wipe on reorg — `deploy/SIMBA.md` fork-recovery section.

*(Original problem statement assumed forward-only import — stale as of 2026-09-26.)*

## Goals

1. ~~Persist headers/blocks; rewind; replay~~ — **landed**
2. ~~P2P heavier-fork switch~~ — **landed** (verified under 019)
3. ~~Tests: dual-miner fork script green~~
4. ~~Docs: `deploy/SIMBA.md` fork recovery~~

## Non-goals

- Deep reorg beyond practical depth (cap e.g. 2016 blocks — documented).
- GHOSTDAG / multi-parent ([LATER.md](../LATER.md)).
- Incremental snapshot rewind (follow-up if replay cost bites).

## Done when

- [x] Node follows heavier valid fork without manual datadir reset (core)
- [x] Phase 4 / [019](../done/2026-09/019-dual-miner-reorg-integration-test.md) reorg tests pass
- [x] Task 007 §C reorg-test row closed
- [x] `deploy/SIMBA.md` fork recovery section updated

## Notes

```
2026-09-26: Opened — Simba requirement; 006 phase 4 blocked on this implementation.
2026-09-26: External review — core landed; split remaining test work to 019; docs sync 015.
2026-09-26: Closed with 019 — dual-miner P2P test + SIMBA.md fork-recovery section.
```
