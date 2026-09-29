# Guld 2.0 Specifications

**Status:** normative for **mainnet** (SoT); Simba is a catching snapshot  
**SoT hierarchy:** [**whitepaper**](../whitepaper/guld-2.0.md) (wins all disputes) → **these specs** (normative detail) → implementation  
**Whitepaper:** v0.29 — [`../whitepaper/guld-2.0.md`](../whitepaper/guld-2.0.md) (current; product narrative; normative detail in specs)  
**Research backdrop:** [`../research/modern-l1-direction.md`](../research/modern-l1-direction.md)

**Mainnet vs Simba:** Specs and the whitepaper describe **mainnet** protocol intent. **Simba** (`chain_id` 2) is a **live snapshot implementation** that trails Accepted Core GIPs until miners approve a **single height-activated rule bundle** ([055](../tasks/open/055-simba-single-rule-bundle.md)). Dry-run first: [042](../tasks/open/042-rule-bundle-upgrade-e2e.md). No Simba tip wipe.

## Reading order

1. [`00-overview.md`](00-overview.md) — components, trust boundaries, data flows  
2. [`01-cryptography.md`](01-cryptography.md) — hashes, keys, encodings  
3. [`02-identity-and-accounts.md`](02-identity-and-accounts.md) — names, homes, reserved `guld`, bio, unregister  
4. [`03-transactions.md`](03-transactions.md) — fixed tx vocabulary  
5. [`04-proofs.md`](04-proofs.md) — leaf-consensus proofs (`threshold_cosign_v1`)  
6. [`05-state.md`](05-state.md) — account state, roots, nonces  
7. [`06-blocks-and-consensus.md`](06-blocks-and-consensus.md) — headers, PoW, fork choice  
8. [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md) — weight fees, registration fees, issuance  
9. [`08-cas-and-homes.md`](08-cas-and-homes.md) — object store; active `guld` **rule-bundle digest**; **no** L0 pin/DA/slash-for-availability market  
10. [`09-p2p.md`](09-p2p.md) — peer protocol (libp2p; phase A Hello + tx gossip)  
11. [`10-node.md`](10-node.md) — full node process & internal APIs  
12. [`11-leaf-host.md`](11-leaf-host.md) — leaf materialization & client-facing host API (**§8** JS SDK + ttt v1 reference; HTTP daemon still draft)  
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
**GIP (Accepted):** [GIP-23](../gips/gip-23.md) — consensus-enforced difficulty schedule.  
**GIP (Accepted):** [GIP-24](../gips/gip-24.md) — legacy distribution transparency (Informational).  
**GIP (Accepted):** [GIP-25](../gips/gip-25.md) — `attestation_quorum_v1`; cosigner identities **TBD for mainnet** ([045](../tasks/open/045-gip-25-attestation-cosigners.md)).  
**GIP (Final):** [GIP-26](../gips/gip-26.md) — consensus golden vectors (Rust + JS `@guld/js`).  
**GIP (Final):** [GIP-27](../gips/gip-27.md) — legacy-locked names under pay-or-release ([022](../tasks/done/2026-09/022-legacy-settle-parity.md)–[027](../tasks/done/2026-09/027-legacy-parity-comms.md)).  
**GIP (Accepted):** [GIP-28](../gips/gip-28.md) — `ConvertAccountKind` (individual↔group).  
**GIP (Accepted):** [GIP-29](../gips/gip-29.md) — threshold `Transfer` cosignatures (BARE v2).  
**GIP (Accepted):** [GIP-31](../gips/gip-31.md) — Contacts address book + private invites (Application).  
**GIP (Accepted):** [GIP-32](../gips/gip-32.md) — shared `guld-web-ui` + extension pairing (Application).  
**GIP (Accepted):** [GIP-33](../gips/gip-33.md) — `UnregisterAccount` (Core — code landed; Simba activate [055](../tasks/open/055-simba-single-rule-bundle.md)).  
**GIP (Accepted):** [GIP-34](../gips/gip-34.md) — account `bio` / `UpdateBio` (Core — code landed; Simba activate [055](../tasks/open/055-simba-single-rule-bundle.md)).  
**GIP (Accepted):** [GIP-35](../gips/gip-35.md) — Merkle `tx_root` / `receipt_root` (height-activated `root_scheme`; Simba [055](../tasks/open/055-simba-single-rule-bundle.md)).  
**Wire codec (A2):** [BARE](https://baremessages.org/) — [`schemas/`](../../schemas/README.md), [research](../research/wire-codec-comparison.md).  
**GIP (Accepted):** [GIP-20](../gips/gip-20.md) — wallet contacts, explorer account pages, prefix search.  
**Process:** [GIP-1](../gips/gip-1.md) · [GIP index](../gips/README.md).

**Research:** [`../research/jsonrpc-vs-http-api.md`](../research/jsonrpc-vs-http-api.md) — HTTP canonical; P2P vs HTTP reachability.
**Tasks:** [`../tasks/README.md`](../tasks/README.md) — git-native issue queue (`open/`, `done/`).

## Implementation matrix (mainnet SoT · Simba catch-up)

Normative text targets **mainnet**. **Code** column reflects the **reference Simba** tree today. Catch-up Core bundle **published** with `activation_height = 4444` ([055](../tasks/open/055-simba-single-rule-bundle.md)); tip digest switches at `H` (verify post-activation).

| Area | Spec / GIP | Decision | Code (Simba) | Task |
|------|------------|----------|--------------|------|
| PoW + 2016 retarget | 06 §2 | Locked (A1) | **yes** (seal) | — |
| Difficulty == schedule on import | 06 §2.4–§3, [GIP-23](../gips/gip-23.md) | Accepted | **yes** | [014](../tasks/done/2026-09/014-enforce-difficulty-on-import.md) done |
| Timestamps (MTP + 2 h) | 06 §3 | Locked (A10) | **yes** | [010](../tasks/done/2026-09/010-header-timestamp-validation.md) done |
| Coinbase maturity 100 | 06 §4, 07 §5 | Locked | **yes** (GIP-22 path) | [011](../tasks/done/2026-09/011-gip-22-miner-rewards.md) |
| GIP-22 RewardCommit / ClaimReward | GIP-22, 03 | Accepted | **yes** | [011](../tasks/done/2026-09/011-gip-22-miner-rewards.md), [020](../tasks/done/2026-09/020-remove-credit-miner-footguns.md) |
| Fork choice + reorg | 06 §2–3, 10 | Required | **yes** | [013](../tasks/done/2026-09/013-chain-reorg-implementation.md), [019](../tasks/done/2026-09/019-dual-miner-reorg-integration-test.md) done |
| BARE wire / TxId | 01, 03, GIP-4 | Locked (A2/A4) | **yes** (TxId + dual-wire) | [009](../tasks/done/2026-09/009-bare-wire-implementation.md) done; datadir BARE deferred |
| Golden vectors | [GIP-26](../gips/gip-26.md) | Final | **yes** (Rust + JS) | [021](../tasks/done/2026-09/021-consensus-golden-vectors.md), [032](../tasks/done/2026-09/032-gip-26-non-rust-vectors.md) |
| Legacy settle parity | [GIP-27](../gips/gip-27.md) | Final | **yes** | [022](../tasks/done/2026-09/022-legacy-settle-parity.md)–[027](../tasks/done/2026-09/027-legacy-parity-comms.md) |
| ConvertAccountKind | 03 §3.4b, [GIP-28](../gips/gip-28.md) | Accepted | **yes** | [034](../tasks/done/2026-09/034-convert-account-kind.md) done |
| Threshold Transfer | 03 §3.6, [GIP-29](../gips/gip-29.md) | Accepted | **yes** | [028](../tasks/done/2026-09/028-threshold-transfer-cosign.md) done |
| AccountId preimages | 01, 02 | Locked (A3) | **yes** | — |
| Letter fees `F_user` / `F_group` | 07, GIP-9 | Final (A8) | **yes** | — |
| 1.0 import + ClaimLegacy | 15, GIP-14 | Locked (A5–A7) | **yes** | [016](../tasks/done/2026-09/016-reconcile-genesis-x-vs-manifest.md) done |
| Distribution disclosure | [GIP-24](../gips/gip-24.md) | Accepted | n/a (docs) | [016](../tasks/done/2026-09/016-reconcile-genesis-x-vs-manifest.md) + [018](../tasks/done/2026-09/018-publish-omitted-buckets-and-negatives.md) done |
| Attestation diversification | [GIP-25](../gips/gip-25.md) | Accepted | **wire yes** (empty roster @`H=4444`); names TBD | [045](../tasks/open/045-gip-25-attestation-cosigners.md); [055](../tasks/open/055-simba-single-rule-bundle.md) |
| UnregisterAccount | 03 §3.8, [GIP-33](../gips/gip-33.md) | Accepted | **yes** | [041](../tasks/open/041-voluntary-unregister.md); [055](../tasks/open/055-simba-single-rule-bundle.md) |
| Account bio / UpdateBio | 02 §3.5, 03 §3.9, [GIP-34](../gips/gip-34.md) | Accepted | **yes** | [055](../tasks/open/055-simba-single-rule-bundle.md) |
| Merkle tx/receipt roots | 06 §2.1a, [GIP-35](../gips/gip-35.md) | Accepted | **yes** (interim until `H=4444`, then `merkle_v1`) | [043](../tasks/done/2026-09/043-merkle-tx-receipt-roots-gip.md)/[044](../tasks/open/044-merkle-roots-implement-simba-activate.md) → [055](../tasks/open/055-simba-single-rule-bundle.md) |
| Genesis ceremony / block 0 | 15, 05 §6 | G1–G4 + pre-commit smoke | **yes** (Simba) | [012](../tasks/done/2026-09/012-simba-genesis-ceremony.md) done; mainnet [031](../tasks/open/031-mainnet-genesis-ceremony.md) |
| No foreign genesis names | 13, 02 | Locked (A11) | **yes** | — |
| Mempool snapshot / persist | 12, GIP-19 | Spec 10 §3.1.1 | **yes** | [008](../tasks/done/2026-09/008-mempool-persistence.md) done |
| HTTP `/api/v1` + wallet UI | 12, 14, GIP-5/17 | Shipped baseline | **yes** | UX tasks 002–005 |
| Contacts / private invite | 14 §8.3, [GIP-31](../gips/gip-31.md) | Accepted | **yes** | [038](../tasks/done/2026-09/038-contacts-private-invite.md) done |
| Shared web-ui + extension pair | 14 §10, [GIP-32](../gips/gip-32.md) | Accepted | **yes** (local); guld.io bare publish | [039](../tasks/open/039-guld-web-ui-extension-pair.md) |
| Protocol upgrades (height rules) | 17 | Spec + e2e | **yes** (Simba schedule live: `0` + `4444`) | [042](../tasks/done/2026-09/042-rule-bundle-upgrade-e2e.md) done; [055](../tasks/open/055-simba-single-rule-bundle.md) published |
| Docs ↔ code sync | — | — | **yes** (2026-09-26) | [015](../tasks/done/2026-09/015-reconcile-docs-with-code.md) done |

**Draft banner:** lift per spec when the row’s **Code** column is **yes** for Simba-critical paths (not all at once) — [048](../tasks/open/048-lift-locked-spec-draft-banners.md).

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
| **guld-web-ui** | leaf (`src/guld-web-ui/`) | Shared wallet UI ([GIP-32](../gips/gip-32.md)) |
| **Leaf SDKs** | Python / JS (existing packages evolve) | Build proofs, push leaf remotes |
| **Indexer** | optional Postgres | Off-consensus query (not required to validate) |

## What is *not* in consensus

- Leaf interpreters (games engines, HTTP apps, git hooks as policy)  
- Indexer SQL schemas  
- Forge APIs (GitHub, …) — hints only  
- Email / PGP UIDs as identity
