# Guld 2.0 Specifications

**Status:** draft  
**SoT hierarchy:** whitepaper (intent) → **these specs** (normative draft) → implementation  
**Whitepaper:** [`../whitepaper/guld-2.0-draft.md`](../whitepaper/guld-2.0-draft.md)  
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
9. [`08-cas-and-homes.md`](08-cas-and-homes.md) — object store, mandatory `guld` clone; **no** L1 pin market  
10. [`09-p2p.md`](09-p2p.md) — peer protocol (skeleton)  
11. [`10-node.md`](10-node.md) — full node process & internal APIs  
12. [`11-leaf-host.md`](11-leaf-host.md) — leaf materialization & client-facing host API  
13. [`12-rpc.md`](12-rpc.md) — node API: HTTP `/api/v1` (canonical) + transitional JSON-RPC  
14. [`13-foreign-chains.md`](13-foreign-chains.md) — L0: `bitcoin` / `ethereum` / `solana` as names; foreign proofs; settlement dapps  
15. [`14-reference-ui.md`](14-reference-ui.md) — static PWA wallet + optional desktop wallet  
16. [`15-ledger-import.md`](15-ledger-import.md) — 1.0 `ledger-guld` snapshot, pre-mine **x**, `ClaimLegacy` key upgrade  
17. [`16-sponsored-registration.md`](16-sponsored-registration.md) — pay-for-name bootstrap; dual-signature register  

**Intent (accepted):** [`../intents/pwa-reference-wallet.md`](../intents/pwa-reference-wallet.md) — static guld.io PWA + `guld-node --http`.  
**Intent (accepted):** [`../intents/bootstrap-gateway-registrar.md`](../intents/bootstrap-gateway-registrar.md) — optional paid registrar (any peer + third-party gateway).  
**Intent (accepted):** [`../intents/subaccounts.md`](../intents/subaccounts.md) — `parent.label` device wallets; fixed fees in spec 07.  
**Intent (accepted):** [`../intents/rotate-keys.md`](../intents/rotate-keys.md) — key change = username transfer via `RotateKeys`.  
**Intent (draft):** [`../intents/wallet-contacts-and-account-lookup.md`](../intents/wallet-contacts-and-account-lookup.md) — wallet contacts, explorer account pages, prefix search (later).

**Research:** [`../research/jsonrpc-vs-http-api.md`](../research/jsonrpc-vs-http-api.md) — HTTP canonical; P2P vs HTTP reachability.
**Tasks:** [`../tasks/README.md`](../tasks/README.md) — git-native issue queue (`open/`, `done/`).

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
