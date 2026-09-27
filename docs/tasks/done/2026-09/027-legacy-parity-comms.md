# Task: Legacy parity comms (GIP-27)

Status: done
Priority: normal (ship with or right after [026](./026-simba-regenesis-gip-27.md))
GIP: ../../gips/gip-27.md
Epic: [022](./022-legacy-settle-parity.md)
Depends: [025](./025-gip-27-specs-sync.md), [026](./026-simba-regenesis-gip-27.md)

## Problem

Public docs still teach “claims open indefinitely / locked forever / satoshi effectively out of circulation,” which mis-states tokonomy after GIP-27.

## Goals

1. Update [`docs/fragments/legacy-distribution.md`](../../fragments/legacy-distribution.md): remove or rewrite the forever-claim / out-of-circulation heuristic; state pay-or-release on imports.
2. Update [`docs/SIMBA_BETA.md`](../../SIMBA_BETA.md) (+ FAQ snippets if any): first-year clock, outreach intent, tip reset pointer from 026.
3. Whitepaper / FAQ residual lines (lease-clock + §12 gap table refreshed 2026-09-27 — verify consistency after regenesis tip is known).
4. Call out short remaps (`y`, etc.): L-based `F_user` applies; underfunded names reclaim like any other.

## Non-goals

- Contacting holders (operator ops, not a code task).
- GIP-25 attestation diversification.
- Re-deriving the whitepaper §12 gap table.

## Done when

- [x] Distribution brief + beta page + FAQ residual consistent with GIP-27
- [x] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Split from 022. Comms after regenesis tip is known.
2026-09-27: Whitepaper §3.3 / §8.6 / §11 / §12 updated in docs pass; this task still owns fragments + SIMBA_BETA.
```
