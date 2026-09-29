---
gip: 25
title: Diversified ClaimLegacy Attestation
description: Reduce single-signer unlock power for unbound 1.0 accounts via multi-attestor cosign.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Core
created: 2026-09-26
requires: 14
---

## Abstract

Evolve `LegacyOwnershipProof` so unbound 1.0 accounts are not indefinitely gated on a **single live `isysd` attestation key**. **Accepted path:** multi-attestor **cosign** (`attestation_quorum_v1`), height-activated via [spec 17](../specs/17-protocol-upgrades.md). **Cosigner set for mainnet is TBD** via community process ([045](../tasks/open/045-gip-25-attestation-cosigners.md)) — this GIP locks the mechanism, not the roster.

## Motivation

Spec 15 §5.1 defines `pgp_cleartext_v1`, `isysd_attestation_v1`, and `dev_unlock_v1`. On the 1.0 import manifest, only a minority of rows carry a PGP `binding_hint`; the remainder — including the largest holders — depend on **`isysd_attestation_v1`**. Continuity of balances is real; unlock authority must not stay permanently single-keyed for mainnet credibility.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Normative profile: `attestation_quorum_v1`

1. **Document** the unlock-path split per [GIP-24](gip-24.md) (done).
2. **Proof kind** `attestation_quorum_v1`: unbound `ClaimLegacy` MUST verify an **M-of-N** cosignature set over the claim message, under attestor keys published in the active **rule bundle** (roster under `guld` rules) **or** under a designated attestation group account — exact roster encoding MUST land in [spec 15](../specs/15-ledger-import.md) before height activation.
3. **MUST NOT** silently reassign names or balances.
4. **MUST** remain compatible with `pgp_cleartext_v1` for bound accounts.
5. Activation MUST use [spec 17](../specs/17-protocol-upgrades.md) rule bundles on networks that already shipped `isysd_attestation_v1`.
6. After activation height `H`:
   - Unbound claims MUST accept `attestation_quorum_v1` when the roster is non-empty.
   - `isysd_attestation_v1` MAY remain valid during a documented dual window, then MUST be demoted or rejected per the activating bundle (mainnet SHOULD NOT ship sole-`isysd` forever).
7. **`dev_unlock_v1`** remains test/dev only — MUST NOT be enabled on mainnet.

### Open parameters (Accepted — community / ceremony fill)

| Parameter | Notes |
|-----------|--------|
| Quorum size M-of-N | Prefer small M (e.g. 2-of-3) for liveness; lock in activating bundle |
| **Cosigner identities** | **TBD for mainnet** — community process ([045](../tasks/open/045-gip-25-attestation-cosigners.md)) |
| Nomination / rotation | Publishable social + rule-bundle roster update |
| Dual-window length for `isysd_attestation_v1` | Bundle policy |

### Non-goals

- Changing imported amounts or `x`.
- Replacing PGP proofs.
- Naming specific cosigners in this GIP file.
- Timeout / public-challenge escape hatches (optional later GIP).

## Rationale

Single-attestor unlock bootstrapped Simba. Diversification via **cosign** is the honest mainnet follow-through. Roster selection is deliberately **not** rushed into the GIP text.

## Backwards Compatibility

- Existing locked accounts unchanged until activation height.
- Nodes that do not upgrade reject the new proof kind — standard rule-bundle split.
- Simba MAY activate in the **same** rule bundle as other Accepted Core GIPs ([055](../tasks/open/055-simba-single-rule-bundle.md)) once e2e ([042](../tasks/open/042-rule-bundle-upgrade-e2e.md)) is green; roster MAY stay empty on Simba until community fills it (then `isysd` dual-window continues until roster non-empty).

## Security Considerations

- Multi-attestor collusion / bribery.
- Attestor key compromise → unauthorized unlock of unbound whales.
- Social engineering against attestors (publish process + rate limits).

## Reference Implementation

Wire + apply after roster encoding in spec 15; activate via rule bundle. Community: [045](../tasks/open/045-gip-25-attestation-cosigners.md). Bundle plan: [055](../tasks/open/055-simba-single-rule-bundle.md).

## History

- 2026-09-26: Drafted from external review (unlock centralization).
- 2026-09-29: Direction locked — cosigners; community selects roster; mainnet ≥ some.
- 2026-09-29: **Accepted** — mechanism `attestation_quorum_v1`; cosigner identities remain TBD for mainnet.
