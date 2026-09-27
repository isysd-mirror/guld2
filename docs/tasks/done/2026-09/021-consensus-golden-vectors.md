# Task: Consensus golden vectors (GIP-26)

Status: done
Priority: normal (raise to **high** before mainnet; BARE TxId goldens already in [009](./009-bare-wire-implementation.md))
GIP: ../../gips/gip-26.md
Spec: ../../specs/01-cryptography.md, ../../../schemas/README.md
Depends: ./009-bare-wire-implementation.md, ./014-enforce-difficulty-on-import.md

## Problem

Checked-in TxId goldens exist for a few tx types ([009](./009-bare-wire-implementation.md)). Broader fixtures for header hashes, difficulty schedule, apply transitions, and multi-language CI are still missing. External review: single-client credibility needs a fuller vector set.

## Goals

1. Land vector directory per [GIP-26](../../gips/gip-26.md) (interim `testdata/consensus/` OK until BARE).
2. Wire Rust CI to fail on drift.
3. Minimum coverage table in GIP-26 satisfied.
4. Document regen commands and tool pins.
5. Stretch: one JS or Python verifier job.

## Non-goals

- Full second node client.
- Mainnet freeze (separate ceremony).

## Done when

- [x] Vectors + Rust CI green
- [x] GIP-26 → Accepted (Final when non-Rust consumer exists)
- [x] Linked from schemas README and task 007 “before mainnet” notes

## Notes

```
2026-09-26: Opened from external review / GIP-26.
2026-09-27: Landed `schemas/guld/v1/vectors/{tx_id,header_pow,difficulty,timestamp}.jsonl` + README;
  Rust tests `guld-wire::vectors_tx_id` / `guld-consensus::vectors_gip26`; pre-commit Vectors gate;
  GIP-26 Accepted. Stretch JS/Python deferred (Final).
```
