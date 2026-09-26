---
gip: 24
title: Legacy Distribution Transparency
description: Publish concentration, unlock-path, and x-reconciliation facts for 1.0 import.
author: Guld contributors
discussions-to: ../tasks/open/016-reconcile-genesis-x-vs-manifest.md
status: Draft
type: Informational
created: 2026-09-26
requires: 14
---

## Abstract

Require a **public distribution brief** for every network that imports Guld 1.0 balances: concentration statistics, ClaimLegacy unlock-path split (PGP vs attestation), omitted buckets (with sizes), reconciliation of documented `x` to the sum of manifest rows, and a short narrative for mass flat grants. This does not change consensus rules; it sets disclosure norms for honest premine communication.

## Motivation

GIP-14 and spec 15 disclose **x ≈ 959,947.19527052 GULD** and a manifest hash. External review (2026-09-26) measured from `data/genesis/simba/import-manifest.json`:

| Fact | Approx. value |
|------|----------------|
| Row sum | **960,275.39527052** GULD (**+328.2** vs documented `x`) |
| Top 1 / top 5 / top 10 | **37.5% / 56.5% / 63.3%** of row sum |
| Exact 100 GULD accounts | **2,016** (~21% of sum) |
| PGP-bound rows | **60 / 2,210**; bound supply ~**18.7%** |
| Unbound supply (attestation path) | ~**81%**, including largest holder |

These facts are discoverable from the committed manifest but are **not** surfaced in the whitepaper economics section or GIP-14 tables. Framing the import as “respect every balance / no hidden inflation” without concentration and unlock-gate disclosure understates trust dependencies (especially `isysd_attestation_v1`).

## Specification

This Informational GIP does not use RFC 2119 consensus language for on-chain validity. For **project documentation and genesis READMEs**, the following SHOULD be published before calling a network’s import “locked” or “fully disclosed”:

### 1. Distribution brief (per network)

A markdown section (genesis README and/or `docs/fragments/` linked from whitepaper §8.6 and GIP-14) that includes:

1. **Holder count** and **sum of row balances** (quanta and GULD).
2. **Documented `x`** used by `EconomyParams` / subsidy base, and **explicit reconciliation** if `sum(rows) ≠ x` (delta, cause, whether subsidy uses `x` or sum).
3. **Concentration table:** top 1 / 5 / 10 / 20 share of imported sum; list top 10 names and balances (or link to a generated report checked into genesis).
4. **Unlock-path split:** count and supply share with `binding_hint` (PGP) vs unbound (`isysd_attestation_v1` or successors).
5. **Mass cohorts:** e.g. count of exact 100 GULD accounts and total mass, with a one-paragraph historical note when known.
6. **Omitted buckets:** name each omitted ledger class (e.g. `guld:Assets:ERC20`) and publish **size in GULD** (or “0 / not present”) — “barely used” alone is insufficient.
7. **Negative balances:** publish the appendix promised in spec 15 (names, sums, treatment = import 0).

### 2. Whitepaper / FAQ pointers

Whitepaper §8.6 SHOULD link the brief and MUST NOT imply peer-fair distribution beyond “1:1 continuity of historical balances.” FAQ MAY add a short “How concentrated is the premine?” answer.

### 3. Regeneration

When the import manifest changes, regenerate the brief in the same ceremony that updates the manifest hash (task 012 / GIP-14).

## Rationale

**Alternative — leave discovery to auditors.** Rejected for public beta: concentration and attestation gates are first-order trust facts for newcomers.

**Alternative — change consensus to haircut / redistribute.** Out of scope; this GIP is disclosure-only. Policy changes would need a separate Standards GIP.

## Backwards Compatibility

None on-chain. Documentation and genesis README updates only.

## Security Considerations

Transparency reduces surprise; it does not remove the `isysd` attestation dependency (see [GIP-25](gip-25.md)). Publishing top-holder names may attract social engineering — names are already public on-chain after import.

## Reference Implementation

- Tasks: [016](../tasks/open/016-reconcile-genesis-x-vs-manifest.md), [018](../tasks/open/018-publish-omitted-buckets-and-negatives.md)
- Data: `data/genesis/simba/import-manifest.json`

## History

- 2026-09-26: Drafted from external project review (economic under-disclosure findings).
