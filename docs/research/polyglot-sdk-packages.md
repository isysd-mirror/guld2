# Polyglot SDK packages (JS / Python)

**Status:** **Accepted** (2026-09-27) — JS first; Python later.  
**Seed:** [task 032](../tasks/done/2026-09/032-gip-26-non-rust-vectors.md) / [GIP-26](../gips/gip-26.md) (non-Rust golden vector consumer — **Final**).  
**Implement:** [task 036](../tasks/done/2026-09/036-guld-js-sdk.md) (`src/guld-js` / `@guld/js`) — **done**.  
**Related:** [spec 00 §3.9](../specs/00-overview.md), [spec 11](../specs/11-leaf-host.md), [spec 12](../specs/12-rpc.md), [`guld-js` README](../../src/guld-js/README.md), [`LATER.md`](../LATER.md), [task 033](../tasks/done/2026-09/033-leaf-host-materialize.md), [reference dapp](reference-dapp.md) / [037](../tasks/done/2026-09/037-guld-tic-tac-toe.md).

## Why this exists

Rust owns the validator (`guld-node`, `guld-consensus`, …). Users who never compile a node still need to:

1. **Trust encodings** — prove a JS wallet or Python script agrees with Rust on `TxId`, headers, and apply samples (GIP-26 Final).
2. **Talk to peers** — construct, sign, and broadcast txs over `/api/v1` (and transitional JSON-RPC).
3. **Live in leaves** — build home trees, compute `master_hash`, gather threshold cosigns, push optional git remotes, materialize CAS for clients.

That third plane is where most “Guld product” work will happen. The chain only witnesses tips; **leaf toolkits** are how people actually use names.

This note imagines a **small, layered** package set for **JavaScript/TypeScript** and **Python** — not a second consensus client, and not a replacement for the reference PWA or `guld-cli`.

## Design principles

| Principle | Implication |
|-----------|-------------|
| **Layers, not a monolith** | Core crypto/wire stays tiny and vector-tested; leaf helpers depend upward. |
| **HTTP first** | Prefer `/api/v1/…`; JSON-RPC is an adapter ([spec 12](../specs/12-rpc.md)). |
| **Same fixtures** | Both languages consume `schemas/guld/v1/vectors/` — that is how GIP-26 becomes Final. |
| **Not consensus-critical** | Bugs in SDKs inconvenience users; they do not fork the chain. Still treat encoding bugs as severe. |
| **Opaque leaves** | SDKs hash and ship bytes; they do not invent “the one leaf format.” Offer *conventions* (git tree, static site, `leaf.json`) as optional helpers. |
| **Mirror Rust names lightly** | `wire` / `crypto` / `client` / `leaf` map to mental models of `guld-wire`, `guld-crypto`, `guld-client`. Do not clone every crate. |
| **Publish where users look** | npm scoped `@guld/*`; PyPI `guld-*`. Canonical source remains `repos/*.git` via peers ([HOSTING](../HOSTING.md)). |

## Audience map

| Who | Needs | Language bias |
|-----|--------|----------------|
| Browser wallet / extension / dapp | Sign txs, cosign UX, read chain | **JS** |
| Static site already in-repo | Shared types + fetch helpers (today duplicated in `src/js/`) | **JS** |
| Agents, notebooks, ETL, importers | Async scripts, batch ClaimLegacy / faucet / indexing | **Python** |
| Leaf host operators | Materialize homes, assist `UpdateMaster`, optional runtimes | **Either** (Python for ops scripts; JS for web-leaf tooling) |
| Multi-impl reviewers | Vector runner only | **Either** (task 032) |

---

## Proposed package layers

Think of five layers. Ship bottom-up; stop when the next layer is unused.

```text
┌─────────────────────────────────────────────────────────┐
│  leaf toolkit     home trees · remotes · UpdateMaster   │
├─────────────────────────────────────────────────────────┤
│  tx / wallet      build · sign · fee estimate · cosign  │
├─────────────────────────────────────────────────────────┤
│  node client      HTTP /api/v1 · optional RPC · SSE     │
├─────────────────────────────────────────────────────────┤
│  crypto           Ed25519 · tagged hashes · cosign msgs │
├─────────────────────────────────────────────────────────┤
│  wire / vectors   BARE · TxId · GIP-26 fixtures         │
└─────────────────────────────────────────────────────────┘
```

Umbrella packages (`guld-js`, `guld-python`) MAY re-export a curated subset so `npm i guld-js` / `pip install guld` works for newcomers without forcing every subpackage.

---

## Layer 0 — Wire + golden vectors (task 032 seed)

**Purpose:** Prove byte identity with Rust. Smallest useful non-Rust artifact.

| Capability | Notes |
|------------|--------|
| Decode/encode L0 tx payloads (BARE; JSON interim if still needed) | Match `guld-wire` |
| Compute `TxId` for every L0 type | Incl. RewardCommit / ClaimReward / ClaimLegacy |
| Header hash / PoW check samples | From published JSONL |
| Difficulty / MTP reject samples | Minimum coverage in GIP-26 |
| CLI or test entrypoint that fails CI on drift | Pre-commit or GH/peer CI job |

**JS:** `@guld/wire` (or first slice of `guld-js`) using `@bare-ts/tools` once schemas exist.  
**Python:** `guld-wire` using `bare-py` (or equivalent).  
**Done-bar for task 032:** *one* of these runners verifying the checked-in vector set.

This layer should stay **dependency-light** and free of network I/O.

---

## Layer 1 — Crypto primitives

**Purpose:** Sign and verify what the wallet and leaf toolkit need — not a general crypto suite.

| Capability | Notes |
|------------|--------|
| SHA-256 (Web Crypto / hashlib) | ObjectId = SHA256(bytes) |
| Ed25519 sign/verify | Account keys at genesis |
| Tagged hashes for cosign messages | `guld/cosign/v1` and siblings ([spec 04](../specs/04-proofs.md)) |
| `threshold_cosign_v1` assemble + verify | Index list, distinct keys, threshold check |
| Name / amount / hex helpers | Align with `guld-types` rules |

**JS:** `@guld/crypto` — browser-safe; no Node-only APIs in the default build.  
**Python:** `guld-crypto` — `cryptography` or `PyNaCl`; fine for servers and CLIs.

Do **not** put AES keyring encryption here unless shared with the reference wallet; wallet-at-rest crypto can stay in the PWA / extension until there is a clear shared need.

---

## Layer 2 — Node client

**Purpose:** Typed thin client for a peer’s HTTP API. No private keys required for read paths.

| Capability | Notes |
|------------|--------|
| `GET /api/v1/chain/status` | `chain_id`, network, faucet readiness |
| Accounts, balances, tips, mempool | Mirror shipped routes in spec 12 |
| `POST /api/v1/chain/transactions` | Broadcast signed txs |
| CAS put/get when exposed | For leaf materialize loops |
| Optional JSON-RPC fallback | Same logical ops |
| SSE `chain/events` when available | GIP-19-style live feeds |
| Simba faucet helpers | Register / drip — testnet only |

**JS:** `@guld/client` — `fetch`-based; works in browser and Node.  
**Python:** `guld-client` — `httpx` or `aiohttp`; sync + async surfaces.

This is what dapps, explorers, and agents should import first. Keep auth story explicit: protocol writes are **proof-bearing**; operator API keys are not consensus.

---

## Layer 3 — Transaction / wallet helpers

**Purpose:** Construct and interpret L0 txs without hand-rolling BARE fields.

| Capability | Notes |
|------------|--------|
| Builders for `RegisterUsername`, `RegisterGroup`, `RegisterSubaccount` | Fee estimates |
| `Transfer` (v1 single-sig + v2 cosign) | Memo limits per spec |
| `UpdateMaster`, `RotateKeys` | Proof attachment |
| `ClaimLegacy` helpers | PGP / legacy paths as needed |
| Fee / weight estimation | Before broadcast |
| Decode + humanize mempool / explorer payloads | Interpret, not just construct |
| Cosign request/response helpers | Align with `guld1cosignreq` / `guld1cosignres` workstation formats |

**JS:** `@guld/tx` (or `@guld/wallet-core`) — what the site and `guld-extension` should eventually share instead of duplicating logic in `src/js/` and extension `lib/`.  
**Python:** `guld-tx` — scripts, bots, sponsored-registration desks, batch ops.

Key storage stays **caller-owned** (browser keyring, OS keychain, env for bots). Libraries sign with injected keys; they should not invent a second keystore format without a strong reason.

---

## Layer 4 — Leaf toolkit (the helpful plane)

**Purpose:** Make “my name’s home” usable: build trees, tip advances, remotes, materialization. This is the package most unique to Guld vs a generic chain SDK.

| Capability | Notes |
|------------|--------|
| Build / walk home Merkle trees | Layout per [spec 08](../specs/08-cas-and-homes.md) as it firms up |
| Compute candidate `master_hash` from a working directory | Hash then prove |
| Put/get objects via node CAS or local store | Materialize by tip |
| Read account `remotes[]`; optional `git fetch` + verify ObjectIds | Never trust forge alone |
| Prepare `UpdateMaster` (new tip + gather cosigns + submit) | Race/nonce re-read loop |
| Optional `leaf.json` manifest helpers | `runtime: none \| http-static \| exec` ([spec 11](../specs/11-leaf-host.md)) |
| Export a **convention pack** (not mandatory): e.g. `site/`, `repos/`, encrypted blob dir | Documented recipes, not consensus |

**JS:** `@guld/leaf` — strong for static-site leaves, browser-side tree preview, dapp “publish tip” flows.  
**Python:** `guld-leaf` — strong for leaf-host daemons, notebooks, agent workspaces, bulk import from 1.x shelves.

A thin **leaf-host CLI** (`guld-leaf serve` / `materialize <name>`) can sit on top of this layer and satisfy much of [task 033](../tasks/done/2026-09/033-leaf-host-materialize.md) before a Rust `--leaf-host` flag exists. Python is a natural first host language for ops; JS for “publish my site tip from CI.”

---

## Language-shaped extras (optional packages)

### JavaScript-only (or JS-first)

| Package | Role |
|---------|------|
| **`guld-js` umbrella** | Re-exports `@guld/wire` + `crypto` + `client` + `tx` (+ leaf). npm entry for dapps. |
| **`@guld/provider`** | Already sketched under `guld-extension` — dapp `window.guld` / EIP-1193-ish login ([task 030](../tasks/done/2026-09/030-extension-site-login.md)). Keep extension-thin; core signing in `@guld/tx`. |
| **`@guld/vectors`** | Tiny CI-only package: run GIP-26 fixtures (could be a bin inside `@guld/wire`). |
| **Site extract** | Optional: PWA/extension **import** shared digests from `@guld/js` instead of copying — apps remain in `src/js/` / `guld-extension`. |

### Python-only (or Python-first)

| Package | Role |
|---------|------|
| **`guld` / `guld-python` umbrella** | `pip install guld` → client + tx + leaf; extras: `[leaf-host]`, `[vectors]`, `[dev]`. |
| **`guld-leaf-host`** | Small ASGI/HTTP service implementing draft spec 11 routes; talks to a local or remote node. |
| **`guld-schemas`** | Load JSON Schema / BARE schemas; `jsonschema` validation for API payloads and leaf manifests (historical intent in [`PACKAGES.md`](../PACKAGES.md)). |
| **`guld-import` / research helpers** | Legacy claim tooling, archive ETL, notebook recipes — keep out of the core install. |
| **Agent kit** | Thin helpers: watch tip, propose tree patch, pause for human cosign — leaf politics stay out of consensus. |

---

## What *not* to build (yet)

| Temptation | Why defer |
|------------|-----------|
| Full validating node in JS/Python | Spec and research say Rust (or Go) for the mesh; polyglot is for leaves and clients. |
| On-chain VM / “run Python as consensus” | Explicitly out of model. |
| Mandatory leaf format SDK (“everything is git”) | Git is a fine *leaf* encoding; network homes are hash trees. Offer recipes, not exclusivity. |
| Second reference wallet UI in npm | PWA in the umbrella is SoT; libraries feed it. |
| Indexer-as-SDK | Optional SQL projection is a separate service ([spec 00 §3.10](../specs/00-overview.md)); publish query clients later if explorers need them. |
| Wrapping libp2p in Python/JS for “light P2P” | Wallets speak HTTP to a node; keep it that way for v1. |

---

## Suggested build order

Practical sequence that pays off early:

1. **`@guld/wire` + `guld-wire` vector runners** → close GIP-26 Final / task 032.  
2. **`@guld/crypto` + `@guld/client`** (JS) → unblock shared site/extension cleanup and dapp reads.  
3. **`guld-client` + `guld-tx` (Python)** → scripts, faucet bots, ClaimLegacy ops, research notebooks.  
4. **`@guld/tx`** → dedupe wallet construction paths; feed extension provider.  
5. **`guld-leaf` / `@guld/leaf`** → home tree + UpdateMaster assist; optional Python leaf-host stub toward task 033.  
6. Umbrella metapackages and docs once two layers are stable.

Rust `guld-client` / `guld-cli` remain the high-assurance CLI path; polyglot packages optimize for **ecosystem reach**, not for replacing the reference wallet.

---

## Repository / packaging sketch

| Artifact | Location (proposed) | Publish |
|----------|---------------------|---------|
| JS packages | Evolve `src/guld-js/` into a workspace (`packages/wire`, `crypto`, …) **or** keep one repo with subpath exports | npm `@guld/*` |
| Python packages | Restore / create `src/guld-python/` (src layout, optional monorepo of libs) | PyPI `guld`, `guld-wire`, … |
| Vectors | Stay in umbrella `schemas/guld/v1/vectors/` | Consumed by path or vendored pin |
| CI | Peer/pre-commit: Rust + at least one non-Rust runner | GIP-26 |

Bare remotes stay `repos/guld-js.git` / `repos/guld-python.git` with pins in the umbrella — same software-flow as other leaves of the project.

---

## Success criteria (product sense)

A Guld user who is not a Rust contributor should be able to:

1. **Verify** `pip install` / `npm install` tooling against golden vectors (credibility).  
2. **Read** chain status and their account tip from any public peer.  
3. **Sign and send** a Transfer (and register a name) from a short script or dapp.  
4. **Publish a leaf tip** — change files → new `master_hash` → collect cosigns → `UpdateMaster` — without reimplementing Merkle and cosign message formats.  
5. **Materialize** someone else’s home for a client (when objects are available via CAS/remotes).

If we only ship (1)–(3), we have a normal chain SDK. **(4)–(5) are the Guld-shaped differentiator** — the leaf toolkit — and should stay first-class in the roadmap even if they trail the vector runner.

---

## Open questions

- Home tree encoding freeze date (blocks honest leaf SDKs).  
- Whether leaf-host HTTP lands first in Python or as `guld-node --leaf-host` (Rust) with thin polyglot clients.  
- How much shared crypto the PWA/extension should **import** from `@guld/js` vs keep local (apps stay apps; SDK stays SDK).  
- Single npm/PyPI name vs many scoped packages on day one (recommendation: **scoped internals + one umbrella** once layer 0–2 exist).

## History

- 2026-09-27: Drafted from task 032 discussion — seed for leaf SDKs beyond golden vectors.
- 2026-09-27: Linked [reference dapp sketch](reference-dapp.md) (witnessed turn game as SDK consumer).
- 2026-09-27: **Accepted** — bootstrap JS SDK first ([036](../tasks/done/2026-09/036-guld-js-sdk.md)); Python deferred.
- 2026-09-27: `@guld/js` layers complete (wire→leaf) + robust tests. PWA/extension are consumers at most — they do not move into the SDK.
