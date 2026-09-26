---
gip: 25
title: Diversified ClaimLegacy Attestation
description: Reduce single-signer unlock power for unbound 1.0 accounts.
author: Guld contributors
discussions-to: ./README.md
status: Draft
type: Standards
category: Core
created: 2026-09-26
requires: 14
---

## Abstract

Evolve `LegacyOwnershipProof` so unbound 1.0 accounts are not indefinitely gated on a **single live `isysd` attestation key**. This GIP proposes a height-activated path toward multi-attestor quorum and/or time-boxed escape hatches, without haircutting imported balances.

## Motivation

Spec 15 §5.1 defines three proof profiles: `pgp_cleartext_v1`, `isysd_attestation_v1`, and `dev_unlock_v1`. On Simba’s committed manifest, only ~**60 / 2,210** rows carry a PGP `binding_hint` (~**19%** of supply). The remainder — including the largest holder (~**37.5%** of imported sum) — depends on **`isysd_attestation_v1`**.

External review treated this as systemic trust/centralization risk: continuity of balances is real, but **unlock authority** is concentrated. Bootstrap attestation is reasonable for testnet; it is a poor long-term mainnet posture if most coins stay unbound.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Goals (normative direction)

1. **Document** the unlock-path split per [GIP-24](gip-24.md) before activation design is finalized.
2. **Design** (this Draft — details TBD in Review) one of:
   - **A. Multi-attestor quorum:** `attestation_quorum_v1` — M-of-N keys registered under a keyless or group account (not necessarily the `isysd` username), activated by rule bundle; OR
   - **B. Named attestor roster under `guld` rules:** height-activated list of attestation pubkeys in the rule bundle; OR
   - **C. Timeout + public challenge:** after `T` blocks without claim, allow an alternative proof (e.g. published challenge + user key + fee) — only if legal/product review accepts abandonment semantics.
3. **MUST NOT** silently reassign names or balances.
4. **MUST** remain compatible with `pgp_cleartext_v1` for bound accounts (preferred path unchanged).
5. Activation MUST use [spec 17](../specs/17-protocol-upgrades.md) rule bundles on networks that already shipped `isysd_attestation_v1`.

### Non-goals (this Draft)

- Changing imported amounts or `x`.
- Replacing PGP proofs.
- Defining the exact M/N set (requires maintainer + community input).

### Open parameters (TBD before Accepted)

| Parameter | Notes |
|-----------|--------|
| Quorum size M-of-N | Security vs liveness |
| Who nominates attestors | Miner vote / `guld` leaf / ceremony |
| Whether `isysd_attestation_v1` remains valid forever | Prefer deprecate after activation height |
| Simba vs mainnet | Simba MAY keep single attestor; mainnet SHOULD NOT |

## Rationale

Single-attestor unlock was the fastest path to a claimable testnet (GIP-14). Diversification is the honest follow-through if Guld markets itself as an open identity network rather than a custodial migration desk.

**Alternative — require PGP for all claims.** Rejected for unbound historical accounts that never published keys.

**Alternative — leave forever.** Rejected for mainnet credibility.

## Backwards Compatibility

- Existing locked accounts unchanged until a new proof profile is activated.
- Nodes that do not upgrade will reject new proof kinds — standard rule-bundle split.

## Security Considerations

- Multi-attestor collusion / bribery.
- Attestor key compromise → unauthorized unlock of unbound whales.
- Social engineering against attestors (publish process + rate limits).
- Escape hatches that enable theft if poorly designed (especially timeout paths).

## Reference Implementation

None yet. Track implementation tasks after this GIP reaches **Review** with chosen option A/B/C.

## History

- 2026-09-26: Drafted from external project review (unlock centralization finding).
