# Guld 2.0 Specifications

**Status:** draft  
**SoT hierarchy:** [**whitepaper**](../whitepaper/guld-2.0-draft.md) (wins all disputes) → **these specs** (normative detail) → implementation  
**Whitepaper:** v0.25 — [`../whitepaper/guld-2.0-draft.md`](../whitepaper/guld-2.0-draft.md) (product narrative; normative detail in specs)  
**Research backdrop:** [`../research/modern-l1-direction.md`](../research/modern-l1-direction.md)

## Reading order

1. [`00-overview.md`](00-overview.md) — components, trust boundaries, data flows  
2. [`01-cryptography.md`](01-cryptography.md) — hashes, keys, encodings  
3. [`02-identity-and-accounts.md`](02-identity-and-accounts.md) — names, homes, reserved `guld`  
4. [`03-transactions.md`](03-transactions.md) — fixed tx vocabulary  
5. [`04-proofs.md`](04-proofs.md) — leaf-consensus proofs (`threshold_cosign_v1`)  
6. [`05-state.md`](05-state.md) — account state, roots, nonces  
7. [`06-blocks-and-consensus.md`](06-blocks-and-consensus.md) — headers, PoW, fork choice  
8. [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md) — weight fees, registration fees, issuance  
9. [`08-cas-and-homes.md`](08-cas-and-homes.md) — object store, mandatory `guld` **rule bundle**; **no** L0 pin market  
10. [`09-p2p.md`](09-p2p.md) — peer protocol (libp2p; phase A Hello + tx gossip)  
11. [`10-node.md`](10-node.md) — full node process & internal APIs  
12. [`11-leaf-host.md`](11-leaf-host.md) — leaf materialization & client-facing host API  
13. [`12-rpc.md`](12-rpc.md) — node API: HTTP `/api/v1` (canonical) + transitional JSON-RPC  
14. [`13-foreign-chains.md`](13-foreign-chains.md) — **Informative:** cross-chain / witnessing as **dapp** patterns (not L0 v1; A11)  
15. [`14-reference-ui.md`](14-reference-ui.md) — reference UI: coverage matrix (all tx types + RPC/HTTP), flows, groups + cosign workstation  
16. [`15-ledger-import.md`](15-ledger-import.md) — 1.0 `ledger-guld` snapshot, pre-mine **x**, `ClaimLegacy` key upgrade  
17. [`16-sponsored-registration.md`](16-sponsored-registration.md) — pay-for-name bootstrap; dual-signature register  
18. [`17-protocol-upgrades.md`](17-protocol-upgrades.md) — rule-bundle activation height; soft/hard class  

**GIP (Accepted):** [GIP-5](../gips/gip-5.md) — static guld.io PWA + `guld-node --http`.  
**GIP (Accepted):** [GIP-17](../gips/gip-17.md) — UI matrix for all txs; groups + cosign workstation.  
**GIP (Accepted):** [GIP-8](../gips/gip-8.md) — optional paid registrar (any peer + third-party gateway).  
**GIP (Final):** [GIP-16](../gips/gip-16.md) — optional tx `memo`; height-activated upgrades.  
**GIP (Final):** [GIP-9](../gips/gip-9.md) — letter-based `F_user(L)`; `L_cap = 6`; `F_group(L,n)`.  
**GIP (Accepted):** [GIP-12](../gips/gip-12.md) — `parent.label` device wallets; `F_sub` flat in spec 07.  
**GIP (Accepted):** [GIP-13](../gips/gip-13.md) — key change = username transfer via `RotateKeys`.  
**GIP (Accepted):** [GIP-14](../gips/gip-14.md) — 1.0 import + `ClaimLegacy`; Simba manifest pin (A7).  
**GIP (Accepted):** [GIP-22](../gips/gip-22.md) — `RewardCommit` + deferred `ClaimReward` (100-block maturity).  
**GIP (Draft):** [GIP-23](../gips/gip-23.md) — consensus-enforced difficulty schedule.  
**GIP (Draft):** [GIP-24](../gips/gip-24.md) — legacy distribution transparency.  
**GIP (Draft):** [GIP-25](../gips/gip-25.md) — diversified ClaimLegacy attestation.  
**GIP (Draft):** [GIP-26](../gips/gip-26.md) — consensus golden vectors.  
**Wire codec (A2):** [BARE](https://baremessages.org/) — [`schemas/`](../../schemas/README.md), [research](../research/wire-codec-comparison.md).  
**GIP (Draft):** [GIP-20](../gips/gip-20.md) — wallet contacts, explorer account pages, prefix search (later).  
**Process:** [GIP-1](../gips/gip-1.md) · [GIP index](../gips/README.md).

**Research:** [`../research/jsonrpc-vs-http-api.md`](../research/jsonrpc-vs-http-api.md) — HTTP canonical; P2P vs HTTP reachability.
**Tasks:** [`../tasks/README.md`](../tasks/README.md) — git-native issue queue (`open/`, `done/`).

## Implementation matrix (Simba v1)

Normative text is largely **locked** for A1–A11 ([task 007](../tasks/open/007-simba-beta-public-readiness.md)); rows below track **reference code** vs **open tasks**. Update when shipping.

| Area | Spec / GIP | Decision | Code | Task |
|------|------------|----------|------|------|
| PoW + 2016 retarget | 06 §2 | Locked (A1) | **yes** (seal) | — |
| Difficulty == schedule on import | 06 §2.4–§3, [GIP-23](../gips/gip-23.md) | Accepted | **yes** | [014](../tasks/done/2026-09/014-enforce-difficulty-on-import.md) done |
| Timestamps (MTP + 2 h) | 06 §3 | Locked (A10) | **yes** | [010](../tasks/done/2026-09/010-header-timestamp-validation.md) done |
| Coinbase maturity 100 | 06 §4, 07 §5 | Locked | **yes** (GIP-22 path) | [011](../tasks/done/2026-09/011-gip-22-miner-rewards.md) |
| GIP-22 RewardCommit / ClaimReward | GIP-22, 03 | Accepted | **yes** | [011](../tasks/done/2026-09/011-gip-22-miner-rewards.md), [020](../tasks/done/2026-09/020-remove-credit-miner-footguns.md) |
| Fork choice + reorg | 06 §2–3, 10 | Required | **yes** | [013](../tasks/done/2026-09/013-chain-reorg-implementation.md), [019](../tasks/done/2026-09/019-dual-miner-reorg-integration-test.md) done |
| BARE wire / TxId | 01, 03, GIP-4 | Locked (A2/A4) | **yes** (TxId + dual-wire) | [009](../tasks/done/2026-09/009-bare-wire-implementation.md) done; datadir BARE deferred |
| Golden vectors | [GIP-26](../gips/gip-26.md) | Draft | **no** | [021](../tasks/open/021-consensus-golden-vectors.md) |
| AccountId preimages | 01, 02 | Locked (A3) | **yes** | — |
| Letter fees `F_user` / `F_group` | 07, GIP-9 | Final (A8) | **yes** | — |
| 1.0 import + ClaimLegacy | 15, GIP-14 | Locked (A5–A7) | **yes** | [016](../tasks/done/2026-09/016-reconcile-genesis-x-vs-manifest.md) done |
| Distribution disclosure | [GIP-24](../gips/gip-24.md) | Draft | n/a (docs) | [016](../tasks/done/2026-09/016-reconcile-genesis-x-vs-manifest.md) + [018](../tasks/done/2026-09/018-publish-omitted-buckets-and-negatives.md) done |
| Attestation diversification | [GIP-25](../gips/gip-25.md) | Draft | **no** | (after Review) |
| Genesis ceremony / block 0 | 15, 05 §6 | G1 done; G2–G4 open | partial | [012](../tasks/open/012-simba-genesis-ceremony.md) |
| No foreign genesis names | 13, 02 | Locked (A11) | **yes** | — |
| Mempool snapshot / persist | 12, GIP-19 | Spec 10 §3.1.1 | **yes** | [008](../tasks/done/2026-09/008-mempool-persistence.md) done |
| HTTP `/api/v1` + wallet UI | 12, 14, GIP-5/17 | Shipped baseline | **yes** | UX tasks 002–005 |
| Protocol upgrades (height rules) | 17 | Spec draft | partial | bundle with GIP-22 / GIP-23 activation |
| Docs ↔ code sync | — | — | **yes** (2026-09-26) | [015](../tasks/done/2026-09/015-reconcile-docs-with-code.md) done |

**Draft banner:** lift per spec when the row’s **Code** column is **yes** for Simba-critical paths (not all at once).

## Normative language

In these specs: **MUST**, **MUST NOT**, **SHOULD**, **MAY** follow RFC 2119.

Open parameters are marked **TBD** and listed in each doc’s *Open parameters* section.

## Component map (summary)

| Component | Crate / package (planned) | Role |
|-----------|---------------------------|------|
| **guld-types** | Rust | Shared types, canonical encodings |
| **guld-crypto** | Rust | SHA-256, Ed25519, threshold verify |
| **guld-state** | Rust | Account DB, SMT/MMR, apply tx |
| **guld-consensus** | Rust | Headers, PoW, fork choice |
| **guld-cas** | Rust | Content-addressed object store |
| **guld-p2p** | Rust | Gossip, sync, peer discovery |
| **guld-node** | Rust binary | Full node: wires the above + HTTP API (+ transitional RPC) |
| **guld-leaf-host** | Rust (or Python bridge) | Materialize homes; optional runtimes |
| **Node HTTP API** | part of node (`--http`) | Canonical wallet/dapp surface |
| **guld.io / site** | repo root (`index.html`, `wallet/`, `src/css`, `src/js`) | Static reference wallet / explorer / docs |
| **Leaf SDKs** | Python / JS (existing packages evolve) | Build proofs, push leaf remotes |
| **Indexer** | optional Postgres | Off-consensus query (not required to validate) |

## What is *not* in consensus

- Leaf interpreters (games engines, HTTP apps, git hooks as policy)  
- Indexer SQL schemas  
- Forge APIs (GitHub, …) — hints only  
- Email / PGP UIDs as identity
