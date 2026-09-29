# Task: Single Simba rule-bundle upgrade (Core catch-up)

Status: open (published — waiting for height **4444** tip verify)  
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
| **3 — Implement** | Code + goldens for all bundle deltas | **done** |
| **4 — One Simba bundle** | Publish single next rules digest with `activation_height = 4444` | **published** 2026-09-29 — tip verify at `H` remaining |

## Bundle payload (live)

All activate at the **same** `H = 4444`:

1. **Merkle** `tx_root` / `receipt_root` (`root_scheme=merkle_v1`) — [GIP-35](../gips/gip-35.md)  
2. **`UnregisterAccount`** — [GIP-33](../gips/gip-33.md)  
3. **Account `bio` + `UpdateBio`** — [GIP-34](../gips/gip-34.md)  
4. **`attestation_quorum_v1` wire** — empty roster / threshold 0; `isysd_attestation_v1` dual-window continues ([045](./045-gip-25-attestation-cosigners.md))  
5. Observable fee delta: 1-letter fee `1000 → 1001`

| Pin | Value |
|-----|--------|
| Previous `guld_rules_hash` | `0x81bebfee4afa6c3f7d22b659eeeeebdf4d320eb9d95a8fa85b8587b9ee62be50` |
| New `guld_rules_hash` | `0xcde6a320d76fb18beb89d7d92d661eb9c0b8cf2a5b1f1622b2f85cfd5826d4d1` |
| UpdateMaster `tx_id` | `0x6c755b6116713b51ebf746a85aa49c958cac03bc15dd596dbacdc1ba9c4c0301` |
| Binary floor | umbrella `f14b4e3` / `guld-node` `1912417` |
| Ops notice | [deploy/SIMBA.md](../../deploy/SIMBA.md) · [SIMBA_BETA.md](../SIMBA_BETA.md) |

## Goals

1. ~~After [042](../done/2026-09/042-rule-bundle-upgrade-e2e.md) green, land implementation~~  
2. ~~Draft one rule-bundle + ops notice~~  
3. Coordinate miner/peer upgrade; publish on `guld` tip; **verify post-`H` tip on ≥2 peers** ← remaining  
4. ~~Update specs README matrix + SIMBA docs~~  

## Non-goals

- Simba regenesis / tip wipe.  
- Multiple staged activations for this catch-up set.  
- Naming mainnet cosigners in the bundle (roster can land later via another bundle or genesis policy).  
- Merged mining / AuxPoW.

## Done when

- [x] [042](../done/2026-09/042-rule-bundle-upgrade-e2e.md) green  
- [x] Code + GIP-26 vectors (Merkle / unregister / update_bio; empty-roster quorum in e2e)  
- [x] Single published Simba bundle with agreed `H=4444`; dual schedule on guld.io + local peer  
- [ ] Post-activation tip verified (`guld_getGuldRulesHash` → new digest at height ≥ 4444 on ≥2 peers)  
- [x] Specs matrix + whitepaper §12 + ops notice archived  

## Notes

```
2026-09-29: Opened — maintainers: docs first → 042 e2e → implement →
           one Simba rule bundle for Core catch-up (33/34/25 wire + Merkle).
2026-09-29: Step 2–3 done; GIP-26 merkle + unregister/update_bio goldens.
2026-09-29: Published live — H=4444; new digest 0xcde6a320…d4d1; dual schedule
           confirmed on guld.io + this machine. Tip hash stays old until H.
           Close task after post-H verify.
```
