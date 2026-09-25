# Spec 00 — System overview

**Status:** draft  
**Depends on:** whitepaper v0.18+ ([`../whitepaper/guld-2.0-draft.md`](../whitepaper/guld-2.0-draft.md) — wins all disputes)

## 1. Purpose

Define the **components** of a Guld 2.0 deployment, their responsibilities, and the **APIs** between them. Implementations MUST preserve these boundaries so validators stay lean and leaf runtimes stay off the consensus path.

## 2. Planes

```
┌──────────────────────────────────────────────────────────────┐
│ CLIENTS                                                      │
│  static PWA (guld.io tree) · desktop wallet · CLI · dapps    │
│  · leaf runtimes · third-party wallets (out of protocol)     │
└─────────────┬───────────────────────────────┬────────────────┘
              │ HTTP API (/api/v1) · leaf-host │ optional forge
              ▼                                 ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│ FULL NODE               │         │ EXTERNAL LEAF REMOTES   │
│  consensus + state + CAS│         │  GitHub / Forgejo / …   │
│  + HTTP API + leaf-host │◄───────►│  (fetch/push bytes)     │
│  (+ transitional RPC)   │         └─────────────────────────┘
└─────────────┬───────────┘
              │ P2P (blocks / txs / CAS)
              ▼
┌─────────────────────────┐
│ PEER FULL NODES         │
└─────────────────────────┘
```

| Plane | Stores | Who must have it |
|-------|--------|------------------|
| **Consensus / state** | Headers, accounts, balances, tips | Every full node |
| **CAS** | Home/leaf object bytes by SHA-256 | **`guld` rule bundle** for all full nodes (small); other account bytes on demand / leaf-host |
| **Leaf host** | Working trees, optional runtimes | Nodes that serve contentful clients |
| **Indexer** | SQL projections | Optional operators / apps |

**Trust note:** guld.io (or any domain) MAY mirror the static reference wallet and optionally run a paid registrar desk. That host is **not** a consensus authority. Users SHOULD prefer their own node’s HTTP API when possible.

## 3. Components

### 3.1 `guld-node` (full node binary)

**Responsibility:** Participate in P2P, validate blocks/txs, maintain state + required CAS, expose **HTTP API** (and optionally transitional JSON-RPC), optionally embed leaf-host and serve static reference UI (`--http-static`).

**MUST:**

- Sync and verify the canonical chain under the fork-choice rule ([`06-blocks-and-consensus.md`](06-blocks-and-consensus.md)).
- Materialize account **`guld`** **rule bundle** at the tip and match `guld_rules_hash` in headers ([`02-identity-and-accounts.md`](02-identity-and-accounts.md), [`08-cas-and-homes.md`](08-cas-and-homes.md)). Protocol **source code** is off-chain git — not a CAS obligation.
- Reject txs/blocks that fail schema, proof, fee, or state rules.

**MUST NOT:**

- Execute arbitrary leaf interpreters as part of block validation.
- Require Postgres or an indexer to validate.
- Require guld.io or any single domain for validation.

### 3.2 `guld-consensus`

**Responsibility:** Block header validation, PoW check, fork choice, coinbase/subsidy schedule.

**API (logical):** see [`10-node.md`](10-node.md) § Consensus service.

### 3.3 `guld-state`

**Responsibility:** Account map, nonces, balances, apply transactions, compute `state_root`.

**API:** [`05-state.md`](05-state.md), [`10-node.md`](10-node.md) § State service.

### 3.4 `guld-crypto`

**Responsibility:** SHA-256, signature verify, threshold cosign verify, hashing of typed messages.

**API:** [`01-cryptography.md`](01-cryptography.md), [`04-proofs.md`](04-proofs.md).

### 3.5 `guld-cas`

**Responsibility:** Put/get objects by content hash; local retention; export/import packs.

**API:** [`08-cas-and-homes.md`](08-cas-and-homes.md), [`10-node.md`](10-node.md) § CAS service.

### 3.6 `guld-p2p`

**Responsibility:** Peer discovery, gossip of txs/blocks/headers, object sync requests.

**API:** [`09-p2p.md`](09-p2p.md) (skeleton).

### 3.7 Node HTTP API (canonical) + transitional JSON-RPC

**Responsibility:** Expose chain/account/tx/CAS operations to wallets, explorers, leaf hosts, exchanges, and dapps.

**Canonical transport:** HTTP resource routes under `/api/v1/…` (`guld-node --http`). Same operation set and validation rigor regardless of encoding.

**Transitional:** JSON-RPC 2.0 on `--rpc` (`POST /`, `POST /rpc`) — same handlers; MAY be removed once clients migrate.

**API:** [`12-rpc.md`](12-rpc.md) (operations + both encodings).

**Auth:** protocol writes are **proof-bearing** (signatures / leaf proofs / content hashes). Operator API keys are not part of consensus. Bind full admin surfaces to localhost by default.

### 3.8 `guld-leaf-host`

**Responsibility:** Given a name + network tip, materialize home bytes, expose files to clients, optionally start leaf-defined runtimes. Produce or assist `UpdateMaster` proofs via SDKs.

**API:** [`11-leaf-host.md`](11-leaf-host.md). SHOULD fold into the same `/api/v1` tree as the node HTTP API over time.

### 3.8b Reference UI (repo-root PWA + optional `guld-wallet`)

**Responsibility:** Reference user agents: **static PWA at repo root** (primary wallet) and optional **desktop wallet**. Not consensus. Speak node **HTTP API**. guld.io the domain is a bootstrap mirror + optional paid registrar desk ([`../gips/gip-8.md`](../gips/gip-8.md)) — out of protocol.

**API:** [`14-reference-ui.md`](14-reference-ui.md).

### 3.9 Leaf SDKs (Python / JS / …)

**Responsibility:** Build leaf trees, compute `master_hash`, gather cosignatures, submit txs via HTTP API (or transitional RPC), push optional git remotes.

**Not consensus-critical.** Existing `guld-python` / `guld-js` evolve into this role.

### 3.10 Indexer (optional)

**Responsibility:** Project chain + metadata into SQL for apps (e.g. explorers).

**MUST NOT** be on the validation hot path.

## 4. End-to-end flows

### 4.1 Register individual

1. Client builds / signs registration (self-pay or sponsored intent — [`16-sponsored-registration.md`](16-sponsored-registration.md)).
2. Client → `POST /api/v1/chain/transactions` (or transitional `guld_sendTransaction` / `guld_sendRawTransaction`).
3. Node verifies schema (dual sig for register), charges `F_user(L)` (to miner) and inclusion fee, updates state.
4. Mempool → block → P2P.

### 4.2 Update home tip

1. Leaf host/SDK builds new home tree in CAS (and optional forge push).
2. Cosigners fetch current `(master_hash, nonce)`; sign `threshold_cosign_v1` message ([`04-proofs.md`](04-proofs.md), [`02-identity-and-accounts.md`](02-identity-and-accounts.md) §3.0.1).
3. `UpdateMaster` tx submitted; node verifies proof + fees; state `master_hash` advances and `nonce++`.
4. Other leaf hosts fetch objects by hash (CAS/P2P/forge hints) to serve clients.

### 4.3 Transfer GULD

1. Wallet builds `Transfer` with inclusion fee.
2. Node verifies signature(s), balances, nonce; applies delta.

### 4.4 Protocol upgrade

Normative detail: [`17-protocol-upgrades.md`](17-protocol-upgrades.md).

1. Governance under account `guld` publishes a new tip whose home commits the next **rule bundle** (schemas, fee tables, proof kinds), including **`activation_height = H`**.  
2. Operators ship **node software** from ordinary git that understands the new digest and apply logic **before** H.  
3. Headers through height **H−1** keep the old `guld_rules_hash`; from **H** inclusive they MUST carry the new digest.  
4. Peers that never learned the new hash cannot validate the tip (Hello / `BadRulesHash`) — intentional hard stop, not silent drift.

Testnets MAY use short activation margins; mainnet SHOULD leave a multi-week gap between publish and H.

## 5. Trust boundaries

| Boundary | Trust assumption |
|----------|------------------|
| Client → node HTTP API | Operator of that node (prefer own node for custody) |
| Node → peers | Adversarial; verify all consensus objects |
| Leaf host → forge | Availability convenience only |
| Light client → headers | PoW / depth assumptions |

## 6. Open parameters

- Wire encoding (SSZ-like vs protobuf vs canonical JSON+hex) — default proposal in [`01-cryptography.md`](01-cryptography.md).
- P2P stack — **libp2p** locked ([`09-p2p.md`](09-p2p.md)); CAS object fetch still phase C.
- Exact PoW algorithm — [`06-blocks-and-consensus.md`](06-blocks-and-consensus.md).
- Protocol upgrade activation — [`17-protocol-upgrades.md`](17-protocol-upgrades.md) (height-scheduled; soft/hard class advisory).
