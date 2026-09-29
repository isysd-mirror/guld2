# Task: GIP-25 attestation cosigners (community → mainnet)

Status: open  
Priority: normal (mainnet commitment; not a Simba tip-wipe blocker)  
GIP: ../gips/gip-25.md  
Spec: ../specs/15-ledger-import.md, ../specs/17-protocol-upgrades.md  
Related: ./031-mainnet-genesis-ceremony.md, ./055-simba-single-rule-bundle.md, ../fragments/legacy-distribution.md, ../research/external-code-review-beta.md  

## Problem

Most imported Simba/mainnet-candidate supply unlocks via **`isysd_attestation_v1`** when unbound ([GIP-24](../gips/gip-24.md)). [GIP-25](../gips/gip-25.md) (**Accepted**) diversifies that gate with **multi-attestor cosign** (`attestation_quorum_v1`).

**Mechanism** is locked. **Cosigner identities for mainnet are TBD** — a delicate collective process while the community digests Guld 2.0, the whitepaper, and Simba behavior. MUST NOT be a unilateral shortlist baked into the GIP file.

**Mainnet commitment:** by launch, the network MUST have **at least some** cosigners in the active attestation set (exact M-of-N still open). Simba MAY activate the **wire** with an empty roster in the Core catch-up bundle ([055](./055-simba-single-rule-bundle.md)) and keep `isysd_attestation_v1` until the roster is non-empty.

## Phases

| Phase | Work | Gate |
|-------|------|------|
| **1 — Social** | Publish process for nominating / vetting cosigners; invite community after 2.0 docs + Simba experience | Documented process; no forced deadline for *who* |
| **2 — GIP Accepted** | Mechanism `attestation_quorum_v1` locked; roster encoding in spec 15 | **Done** (2026-09-29) |
| **3 — Implement wire** | Proof profile + rule-bundle field; goldens; claim UI (empty roster OK) | Code + tests; ride [055](./055-simba-single-rule-bundle.md) |
| **4 — Mainnet roster** | Ceremony / genesis or height-activate so ≥ some cosigners are live for unbound ClaimLegacy | [031](./031-mainnet-genesis-ceremony.md) checklist |

## Done when

- [ ] Community cosigner selection process published (who may nominate, how disputes are handled, publish sites)  
- [ ] First cosigner set agreed (names/keys) — **at least some** beyond sole `isysd` for mainnet  
- [x] GIP-25 Accepted with mechanism + open roster parameters  
- [ ] Implementation + vectors + wallet claim path for `attestation_quorum_v1`  
- [ ] Mainnet (or pre-mainnet activation) enforces diversified path with non-empty roster  

## Non-goals

- Picking cosigners in this task file  
- Haircutting balances or dropping unbound grants  
- Blocking Simba Core bundle [055](./055-simba-single-rule-bundle.md) on a filled roster (empty roster + dual-window is OK)

## Notes

```
2026-09-29: Opened — maintainer direction: cosigners yes; selection is
           community digestion of 2.0; mainnet launches with at least some.
2026-09-29: GIP-25 Accepted; identities remain TBD; wire may land in [055](./055-simba-single-rule-bundle.md).
```
