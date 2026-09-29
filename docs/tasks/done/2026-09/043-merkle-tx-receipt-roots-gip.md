# Task: GIP + specs — Merkle `tx_root` / `receipt_root` (height-activated)

Status: **done** (GIP Accepted; live cutover → [055](./055-simba-single-rule-bundle.md) / [044](./044-merkle-roots-implement-simba-activate.md))  
Priority: **high** (consensus freeze; external review P0)  
GIP: [35](../gips/gip-35.md) **Accepted**  
Spec: ../specs/06-blocks-and-consensus.md §2.1a, ../specs/01-cryptography.md, ../specs/17-protocol-upgrades.md  
Related: ./044-merkle-roots-implement-simba-activate.md, ./042-rule-bundle-upgrade-e2e.md, ./055-simba-single-rule-bundle.md, ../gips/gip-26.md, ../research/external-code-review-beta.md  

## Problem

Header `tx_root` / `receipt_root` are still **interim**: tagged hash of concatenated JSON leaves (`guld/tx_root/interim/v1`, `guld/receipt_root/interim/v1`) in `guld-consensus`. That is consensus-critical on **locked Simba** but not a specified Merkle tree, and the domain tags advertise “temporary.”

Decision (2026-09-29): **fix via height activation on Simba** — not a tip wipe, not “keep interim forever.” This is also a first-class rehearsal for [spec 17](../specs/17-protocol-upgrades.md) / [042](./042-rule-bundle-upgrade-e2e.md).

## Goals

1. **Draft a Standards Track GIP** (Core) that:
   - Specifies leaf preimages for txs and receipts (prefer **BARE** / already-canonical bytes where possible; no JSON leaf for the new scheme).  
   - Specifies a **binary Merkle tree** (or equivalent well-defined tree hash) with domain-separated tags (`guld/tx_root/v1`, `guld/receipt_root/v1` — drop `interim`).  
   - Defines empty-list / single-leaf / odd-leaf padding rules.  
   - Requires **height activation**: until `H−1` seal/import use interim algorithm; from `H` inclusive use Merkle. Activation is scheduled through the **rule bundle** (or an explicit rules field / schedule entry the GIP names — align with spec 17).  
   - Adds **GIP-26 golden vectors** for both schemes and for cross-height import rejection cases.  
2. Update **spec 06** (and 01 as needed) with normative text; mark interim algorithm as **historical until H**.  
3. Document Simba ops: publish margin, binary roll, when miners must upgrade (no regenesis).

## Non-goals

- Implementing the dual-path code (→ [044](./044-merkle-roots-implement-simba-activate.md)).  
- Disposable-chain e2e harness (→ [042](./042-rule-bundle-upgrade-e2e.md); 044 consumes it).  
- Changing PoW preimage field *order* (roots stay in the same header slots; only the digest algorithm switches).

## Done when

- [x] Draft GIP filed under `docs/gips/` (editor-assigned number) and linked from this task  
- [x] Spec 06 / 01 / 17 deltas reviewed for Accepted path  
- [x] Activation mechanism named (rule-bundle field vs dedicated schedule) and compatible with locked Simba  
- [x] Vector outline listed (empty block, RewardCommit-only, multi-tx, receipt list)  
- [x] GIP status at least **Review** (preferably **Accepted**) before 044 lands on Simba tip  

## Notes

```
2026-09-29: Opened — decision: height-activate Merkle roots on Simba (testing opportunity for spec 17).
2026-09-29: Live Simba cutover is part of the **single** Core catch-up bundle ([055](./055-simba-single-rule-bundle.md)), not a solo activation.
2026-09-29: **Accepted** [GIP-35](../gips/gip-35.md); specs 06 §2.1a / 01 / 17 updated (`root_scheme`).
           Remaining: GIP-26 goldens + Simba H via [044](./044-merkle-roots-implement-simba-activate.md)/[055](./055-simba-single-rule-bundle.md).
```
