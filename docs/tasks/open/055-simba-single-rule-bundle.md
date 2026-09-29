# Task: Single Simba rule-bundle upgrade (Core catch-up)

Status: open  
Priority: **high** (one miner-approved cutover; no tip wipe)  
GIP: [25](../gips/gip-25.md), [33](../gips/gip-33.md), [34](../gips/gip-34.md), [35](../gips/gip-35.md)  
Spec: ../specs/17-protocol-upgrades.md, ../specs/06-blocks-and-consensus.md, ../specs/03-transactions.md, ../specs/15-ledger-import.md  
Depends: [042](../done/2026-09/042-rule-bundle-upgrade-e2e.md) **done** (green)  
Related: ../done/2026-09/043-merkle-tx-receipt-roots-gip.md, ./044-merkle-roots-implement-simba-activate.md, ./041-voluntary-unregister.md, ./045-gip-25-attestation-cosigners.md  

## Problem

Whitepaper and specs are **mainnet SoT**. Simba is a **snapshot** that trails Accepted Core work. Shipping each GIP as a separate live activation would force operators through multiple upgrade dramas. Prefer **one** height-activated rule bundle so Simba catches up in a single miner-approved cutover.

## Plan (ordered)

| Step | Work | Owner task |
|------|------|------------|
| **1 — Docs / specs** | Fold Accepted GIPs into specs | **done** (incl. [GIP-35](../gips/gip-35.md)) |
| **2 — Disposable e2e** | Prove publish → activate → resync | [042](../done/2026-09/042-rule-bundle-upgrade-e2e.md) **done** |
| **3 — Implement (branch OK)** | Code + goldens for all bundle deltas | 041, 044, GIP-25 wire, GIP-33/34/35 — **code landed; goldens TBD** |
| **4 — One Simba bundle** | Publish single next rules digest with one `activation_height = H` | this task + [044](./044-merkle-roots-implement-simba-activate.md) |

## Bundle payload (intended)

All of the following activate at the **same** `H` (exact field encoding in the rule CAS object):

1. **Merkle** `tx_root` / `receipt_root` (drop interim) — [GIP-35](../gips/gip-35.md) / [043](../done/2026-09/043-merkle-tx-receipt-roots-gip.md)/[044](./044-merkle-roots-implement-simba-activate.md)  
2. **`UnregisterAccount`** — [GIP-33](../gips/gip-33.md) / [041](./041-voluntary-unregister.md)  
3. **Account `bio` + `UpdateBio`** — [GIP-34](../gips/gip-34.md)  
4. **`attestation_quorum_v1`** wire — [GIP-25](../gips/gip-25.md); roster MAY be empty on Simba until community fills it ([045](./045-gip-25-attestation-cosigners.md)); dual-window keeps `isysd_attestation_v1` while roster empty  

**Out of this Core bundle (Application — no consensus):** [GIP-31](../gips/gip-31.md), [GIP-32](../gips/gip-32.md) — ship on their own UI tasks ([038](./038-contacts-private-invite.md), [039](./039-guld-web-ui-extension-pair.md)).

**Explicitly not in this catch-up:** [GIP-21](../gips/gip-21.md) Draft (gateway roster); [051](./051-account-leaf-datadir-bare.md) account-leaf BARE **rewrite** (→ [Mufasa](../MUFASA.md) if needed); AuxPoW. Freeze-as-is for today’s leaf hash may still land as docs/vectors without this bundle.

## Goals

1. After [042](./042-rule-bundle-upgrade-e2e.md) is green, land implementation (working branch acceptable) covering every Core delta above.  
2. Draft one rule-bundle CAS object + ops notice (binary version, `H`, old vs new `guld_rules_hash`).  
3. Coordinate miner/peer upgrade window; publish on `guld` tip; verify post-`H` tip on ≥2 peers.  
4. Update specs README matrix + [SIMBA_BETA.md](../SIMBA_BETA.md) / [deploy/SIMBA.md](../../deploy/SIMBA.md).

## Non-goals

- Simba regenesis / tip wipe.  
- Multiple staged activations for this catch-up set.  
- Naming mainnet cosigners in the bundle (roster can land later via another bundle or genesis policy).  
- Merged mining / AuxPoW.

## Done when

- [x] [042](../done/2026-09/042-rule-bundle-upgrade-e2e.md) green (observable rule delta — tip digest switch + fee-table bump in upgrade manifest)  
- [ ] Code + GIP-26 vectors for Merkle roots, UnregisterAccount, UpdateBio/bio, attestation_quorum_v1 (empty-roster path OK)  
- [ ] Single published Simba bundle with agreed `H`; post-activation tip verified  
- [ ] Specs matrix Code column updated; whitepaper §12 notes catch-up complete  
- [ ] Ops docs: upgrade notice archived  

## Notes

```
2026-09-29: Opened — maintainers: docs first → 042 e2e → implement →
           one Simba rule bundle for Core catch-up (33/34/25 wire + Merkle).
2026-09-29: Step 2 done — rule_bundle_upgrade e2e green; begin Core code (step 3).
2026-09-29: Step 3 Core code landed — UnregisterAccount/UpdateBio; Merkle dual-path
           (`root_scheme` / `merkle_v1` in rules manifest); `attestation_quorum_v1`
           wire (empty roster rejects quorum, keeps isysd dual-window). Next: Simba H.
2026-09-29: [GIP-35](../gips/gip-35.md) Accepted; 043 docs/spec gate closed. Remaining
           before publish: GIP-26 goldens for bundle deltas; pick H; ops notice.
2026-09-29: GIP-26 `merkle_roots.jsonl` + JS consumer green ([044](./044-merkle-roots-implement-simba-activate.md)
           code/goldens/e2e closed). Remaining before publish: pick H; ops notice; publish bundle.
```
