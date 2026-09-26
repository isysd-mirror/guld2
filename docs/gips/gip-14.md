---
gip: 14
title: Ledger 1.0 to 2.0 import and claim
description: Import 1.0 balances 1:1 and port spend authority via ClaimLegacy key upgrade.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Core
created: 2026-09-25
---

## Abstract

Import 1.0 balances 1:1 and port spend authority via ClaimLegacy key upgrade.

## Goal

Replace Guld 1.0 ledger-cli journals with a **custom** ledger suited to full nodes — native rules and **native weight fees**, without requiring external L1 fees or foreign VM semantics. Preserve historical **balances** from `archives/ledger-guld` **1:1**, and let each user **port** spend authority via a **key upgrade** (`ClaimLegacy`).

## Preferred research direction

**Active L0 sketch (2026-03):** lean witness substrate — username + **master hash**, first-class **cosign**, weight-priced txs (not an EVM gas ISA), CAS personal trees (git optional leaf), validators on KV+SMT; Postgres/PGP/git **off** the consensus path. SoT: [`../research/modern-l1-direction.md`](../research/modern-l1-direction.md). Whitepaper: [`../whitepaper/guld-2.0-draft.md`](../whitepaper/guld-2.0-draft.md) §8.6.

### Still useful (non-consensus / transitional)

- **Postgres** as metadata mirror / **user or app-server indexer** (not required for block production)
- **Git + PGP** for select leaves and today’s `guld-python` meta-FS hosts; **PGP also** as the 1.0 ownership proof for `ClaimLegacy`
- Precedents: [`../research/postgres-blockchain.md`](../research/postgres-blockchain.md), scale split [`../research/storage-scale-git-postgres.md`](../research/storage-scale-git-postgres.md), window/election foil [`../research/block-window-consensus.md`](../research/block-window-consensus.md)

### Prior consensus sketch (superseded as L1 default)

- Nodes: Postgres + guld git hosts; block window over commits; weighted git votes → PoS; PoW anti-spam only  
- Retained as an alternative / bridge narrative; not the from-scratch modern L1 preference

## Not preferred (for core ledger)

- Ethereum / Solana / other fee-bearing L1s as the **required** ledger for every node
- Embedding the full ledger chain in git
- FUSE / OS-level mounts as the primary operator path

Optional later: bridges to external tokens for settlement, after the native ledger is solid.

## Snapshot findings (working, from `ledger-guld`)

| Item | Value |
|------|--------|
| Journal period | 2016-06-01 → 2018-12-09 |
| Member circulating (`*:Assets` roots) = **x** | **959,947.19527052** GULD (locked — task 007 A7) |
| ERC20 / protocol mirrors | **omitted** from import |
| Positive holders | ≈ 2,217 |
| Max decimal places in amounts | **10** → freeze 2.0 decimals at 10 |
| Block time | **10 minutes** |
| Inflation | `max(0.04, (2/3)^(y-1))` — year 1 **100%**, then two-thirds decay to **4%** |

## Simba genesis pin (A7 — 2026-09-26)

Full 1.0 ledger in committed manifest:

| Field | Value |
|-------|--------|
| Artifact | [`data/genesis/simba/import-manifest.json`](../../data/genesis/simba/import-manifest.json) |
| `import_manifest_hash` | `0xd5f12f6df4ab2b802ed6957b08d7c104d9eae0878decb10728f7e20975e2df27` |
| **x** | **959,947.19527052 GULD** |
| Holders | ≈ 2,217 positive member roots |
| Omitted | ERC20 / foreign-mirror buckets |

Mainnet MAY re-audit before its own genesis ceremony; Simba testnet treats this pin as locked.

## Normative claim profiles (spec 15 §5.1)

| Kind | Use |
|------|-----|
| `pgp_cleartext_v1` | PGP-bound names only |
| `isysd_attestation_v1` | Unbound names only |
| `dev_unlock_v1` | Local dev — never mainnet |

Legacy import: `keys = []`, `threshold = 0` until claim; lock enforced by `legacy.status = locked` (spec 15 §8). **ClaimLegacy** keeps the imported name unchanged (no rename).

## Acceptance

- [x] Deterministic import rule: `ledger-guld` → per-name `Assets` + manifest hash (spec 15)
- [x] Decimals: **10**
- [x] Simba manifest hash + **x** pinned (A7)
- [x] PGP binding-set format for `ClaimLegacy` (`archives/keys-pgp/<name>/<FP>.asc`)
- [x] `LegacyOwnershipProof` profiles normative v1
- [x] Empty-key locked import encoding (A6)
- [ ] Mainnet genesis ceremony (separate from Simba pin)

## Deferred / non-blocking

- [ ] Account `roles` map (optional future)
- [ ] PQ / hybrid genesis keys (research)
- [ ] (Alt path) Postgres journal + weighted git votes — superseded for L0 v1

## Out of scope for now

- Reimplementing 1.0 FS layouts
- Replaying every 1.0 journal tx as 2.0 consensus history (balances only at genesis)
- Shipping a production token before the research above converges

## Sample 1.0 journal (archive only)

```
2018/02/15 * transfer
    isysd:Assets   -40 GULD
    isysd:Expenses   40 GULD
    joestang:Assets   40 GULD
    joestang:Income   -40 GULD
```

## History

Supersedes: `docs/intents/ledger-migration.md`
