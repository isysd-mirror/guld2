# Task: Consensus golden vectors (GIP-26)

Status: open
Priority: normal (raise to **high** before mainnet; BARE TxId goldens already in [009](../done/2026-09/009-bare-wire-implementation.md))
GIP: ../gips/gip-26.md
Spec: ../specs/01-cryptography.md, ../schemas/README.md
Depends: ../done/2026-09/009-bare-wire-implementation.md, ../done/2026-09/014-enforce-difficulty-on-import.md

## Problem

Checked-in TxId goldens exist for a few tx types ([009](../done/2026-09/009-bare-wire-implementation.md)). Broader fixtures for header hashes, difficulty schedule, apply transitions, and multi-language CI are still missing. External review: single-client credibility needs a fuller vector set.

## Goals

1. Land vector directory per [GIP-26](../gips/gip-26.md) (interim `testdata/consensus/` OK until BARE).
2. Wire Rust CI to fail on drift.
3. Minimum coverage table in GIP-26 satisfied.
4. Document regen commands and tool pins.
5. Stretch: one JS or Python verifier job.

## Non-goals

- Full second node client.
- Mainnet freeze (separate ceremony).

## Done when

- [ ] Vectors + Rust CI green
- [ ] GIP-26 → Accepted (Final when non-Rust consumer exists)
- [ ] Linked from schemas README and task 007 “before mainnet” notes

## Notes

```
2026-09-26: Opened from external review / GIP-26.
```
