---
gip: 17
title: UI full coverage
description: Reference UI covers all L0 capabilities: groups, cosign workstation, API×UI matrix.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Interface
created: 2026-09-25
---

## Abstract

Reference UI covers all L0 capabilities: groups, cosign workstation, API×UI matrix.

## Goal

Expand the reference UI SoT so it covers **all** whitepaper / L0 user capabilities and how the PWA (and extension) expose them — not only the individual register/send path already shipped.

Primary gaps called out in the refreshed [`14-reference-ui.md`](../specs/14-reference-ui.md):

1. **`RegisterGroup` wizard** — name, n keys, threshold, `F_group(L,n)` estimate, sponsor paths — **done** (`/register/?kind=group`)  
2. **Cosign workstation** — collect `threshold_cosign_v1` via copy/paste — **done** (`guld1cosignreq` / `guld1cosignres` v1)  
3. **Living coverage matrix** — tx type × API × UI status — **done** (maintain in spec 14)

## Why a spec (not only tasks)

Groups and n-of-m signing touch registration fees, dual-sig sponsor flows, multiple message tags, stale-nonce races, and explorer display. One normative doc prevents ad-hoc 1-of-1 assumptions from hardening further in `wallet-page.js`.

## Implementation slices

Tracked as Phase 3b in [`GIP-5`](gip-5.md). Cosign JSON frozen in spec 14 §9.2.1.

Still open: group `Transfer` (consensus 1-of-1), extension cosign parity, QR for large cosign blobs.

## Non-goals

- Changing consensus tx vocabulary  
- On-chain social graphs  
- Replacing miner-driven `SettleRegistration` with a mandatory Renew button

## History

Supersedes: `docs/intents/ui-full-coverage.md`
