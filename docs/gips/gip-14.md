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
| Member circulating (imported rows) = **x** | **960,975.39527052** GULD (locked — task 007 A7 / 016); see [legacy distribution](../fragments/legacy-distribution.md) |
| ERC20 / protocol mirrors | **omitted** from import |
| Positive holders | **2,217** |
| Distribution disclosure | [GIP-24](gip-24.md) / [`../fragments/legacy-distribution.md`](../fragments/legacy-distribution.md) |
| Max decimal places in amounts | **10** → freeze 2.0 decimals at 10 |
| Block time | **10 minutes** |
| Inflation | `max(0.04, (2/3)^(y-1))` — year 1 **100%**, then two-thirds decay to **4%** |

## Simba genesis pin (A7 / 016 — 2026-09-26)

Full 1.0 ledger in committed manifest (hyphen names remapped):

| Field | Value |
|-------|--------|
| Artifact | [`data/genesis/simba/import-manifest.json`](../../data/genesis/simba/import-manifest.json) |
| `import_manifest_hash` | `0x59a39af461d66fa1ef892708f8fa8838684d812cccfbe253816a34f448980e70` |
| **x** | **960,975.39527052 GULD** (= sum of rows) |
| Holders | **2,217** positive import rows |
| Tip | `0xf4cdc0172082485ae7b77879aedb1706d9bd7fe3da972409a15e415a3638beb4` (GIP-27) |
| Omitted | ERC20 / foreign-mirror buckets |

Mainnet MAY re-audit before its own genesis ceremony; Simba testnet treats this pin as locked (one more reset OK per G4).

## Normative claim profiles (spec 15 §5.1)

| Kind | Use |
|------|-----|
| `pgp_cleartext_v1` | PGP-bound names only |
| `isysd_attestation_v1` | Unbound names only |
| `dev_unlock_v1` | Local dev — never mainnet |

Legacy import: `keys = []`, `threshold = 0` until claim; lock enforced by `legacy.status = locked` (spec 15 §8). **ClaimLegacy** keeps the **imported** (post-remap) name unchanged.

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

- 2026-09-27: Legacy settle exemption removed — [GIP-27](gip-27.md) (pay-or-release parity while locked).

