# Research: JSON-RPC vs HTTP API for Guld

Status: research  
**Related:** [`../specs/12-rpc.md`](../specs/12-rpc.md), [`../specs/00-overview.md`](../specs/00-overview.md), [`../specs/09-p2p.md`](../specs/09-p2p.md), [`../specs/11-leaf-host.md`](../specs/11-leaf-host.md), [`../specs/04-proofs.md`](../specs/04-proofs.md)

## Question

Guld today has **two** HTTP-facing shapes: JSON-RPC on `guld-node` and a separate REST façade (`guld-api` / guld.io). Should that stay? Who is the API for? Can one strict HTTP interface replace JSON-RPC without losing batching, streaming, or auth rigor? What is guld.io’s role if the network is not centralized on that domain?

## Short answers

| Question | Answer |
|----------|--------|
| **Who is the API for?** | **Exchanges and dapp developers** (plus wallets). They already speak **HTTP + OpenAPI**, not Ethereum-style `eth_*` JSON-RPC. “Ecosystem familiarity” with chain JSON-RPC is the wrong reference audience. |
| **One interface or two?** | **One.** Same method coverage and validation rules as today’s spec 12 — expressed as **HTTP resources**, not a looser “website-only” subset. Dual stack (RPC + façade) is transitional debt. |
| **Performance: framing?** | Negligible either way. Use **HTTP/2** (and optional HTTP/3) for multiplexing; do not keep JSON-RPC just for batching. |
| **Auth without operators?** | **Yes — show the proof.** Protocol writes are authorized by **signatures / leaf proofs / content hashes**, not by guld.io-issued API keys. |
| **Is the network centered on guld.io?** | **No.** guld.io is a **bootstrap URL** (and a reference copy of the static client). Anyone runs the same site + node software on their own domain. |
| **Cross-dapp leaf ↔ leaf?** | Same HTTP API over **HTTPS** between peer domains (or browser-mediated). P2P stays consensus-only. |

---

## 1. What exists today (transitional)

```
Browser / copy of reference UI
        │  GET /api/v1/…     (REST façade — temporary)
        ▼
   guld-api
        │  POST JSON-RPC
        ▼
   guld-node (:8545 JSON-RPC)
        │  P2P
        ▼
   peer full nodes
```

This split exists because the node shipped JSON-RPC first and the website needed CORS-friendly GETs. It is **not** the target architecture.

**Target:** every `guld-node` speaks **one HTTP API** (spec 12 rewritten as routes). Reference UI, exchange integrators, and dapps all call that. Optional reverse proxies only terminate TLS / bind ports — they do not redefine the protocol.

---

## 2. Audience: exchanges and dapps, not “chain RPC culture”

Keeping JSON-RPC because “Ethereum/Bitcoin operators know it” optimizes for the wrong crowd.

| Integrator | What they already ship | What they expect |
|------------|------------------------|------------------|
| **Exchange** | REST/HTTP deposit-credit webhooks, OpenAPI clients, HTTPS | Stable URLs, status codes, idempotent POSTs, clear error bodies |
| **Dapp developer** | `fetch`, browser CORS, OpenAPI/Swagger, HTTP/2 CDNs | Resource paths, JSON bodies, TLS on 443 |
| **Wallet (local)** | Same HTTP stack against `127.0.0.1` | Identical API — no second dialect |

JSON-RPC batch envelopes and `method`/`params`/`id` are familiar to **node operators who already live in that world**. Guld’s integration surface should feel like **any other web API** with **blockchain-grade verification** underneath — not like a private geth admin port.

---

## 3. One HTTP API = same bar as JSON-RPC, different encoding

“HTTP API” here does **not** mean a curated, lossy façade. It means:

- **Same operations** as current `guld_*` (chain, account, tx, CAS, net, leaf assist).
- **Same validation** and error semantics (map today’s `-3200x` codes to HTTP status + structured `error.code`).
- **Same trust rules** (proofs, fees, nonces) — the wire format changes; consensus does not.
- **One OpenAPI** (or equivalent) as the machine-readable contract — no parallel “RPC spec” and “website spec.”

Sketch (illustrative, not normative yet):

| Today (JSON-RPC) | Target (HTTP) |
|------------------|---------------|
| `guld_getBalance(["alice"])` | `GET /v1/accounts/alice/balance` |
| `guld_getBlockByNumber([n, true])` | `GET /v1/blocks/{height}?fullTxs=1` |
| `guld_sendRawTransaction([hex])` | `POST /v1/transactions` body `{ "raw": "0x…" }` |
| `guld_getObject([id])` | `GET /v1/objects/{id}` |
| `guld_putObject([bytes])` | `PUT /v1/objects` body raw/bytes → `{ "id" }` |

Leaf-host routes (spec 11) fold into the **same** `/v1/…` tree on the node (or a documented subpath), not a second product.

**Deprecation path:** keep JSON-RPC as a thin adapter during migration, or drop once clients move — do not maintain two first-class contracts forever.

---

## 4. HTTP/2 (and friends) instead of “smarter sockets via JSON-RPC”

### 4.1 What JSON-RPC was buying us

| Need | JSON-RPC habit | HTTP equivalent |
|------|----------------|-----------------|
| Many reads, one RTT | JSON-RPC **batch** array | **HTTP/2 multiplexing** — N concurrent requests on one TLS connection; or one **compound** GET where it is truly one resource |
| Head-of-line blocking | Single HTTP/1.1 connection pain | HTTP/2 streams are independent |
| Push `newHeads` | Often WebSocket/`eth_subscribe` | **SSE** (`GET /v1/events`) or WebSocket — both fine over TLS; SSE is enough for uni-directional tips |
| Large CAS bodies | Base64 inside JSON-RPC | **Raw HTTP body** + content-hash — better |

For Guld’s wallet and exchange workloads, **HTTP/2 multiplexing covers the batch case** without a custom batch envelope. Compound endpoints remain useful when the *semantic* unit is one resource (e.g. account summary), not as a substitute for transport.

### 4.2 Is requiring HTTP/2 too restrictive?

| Client class | HTTP/2 reality |
|--------------|----------------|
| Browsers | HTTPS ⇒ HTTP/2 widely available; cleartext `h2c` is **not** used in browsers (TLS required anyway for public peers) |
| Exchange backends (Go, Java, Python, Node) | Mature HTTP/2 clients; often already on HTTP/2 to other APIs |
| curl / ops scripts | `--http2` fine; HTTP/1.1 fallback still works if the server offers both |
| Very old or broken middleboxes | May force HTTP/1.1 — **acceptable fallback**; slightly worse concurrency, same API |

**Recommendation:** Prefer HTTP/2 when negotiated; **do not refuse HTTP/1.1**. That is not restrictive for target integrators. Optional HTTP/3 is a later edge win, not a requirement.

**Do not rely on HTTP/2 server push** (browsers disabled/ignored it). Use explicit requests, SSE, or WebSocket for server→client notifications.

### 4.3 Can two random home peers connect over HTTP/2?

**Usually no.** HTTP/2 is only framing on top of TCP (or QUIC for HTTP/3). It does **not** invent routes through NATs, carrier-grade NAT, or inbound firewalls.

| Setup | HTTP(S) between them? | Why |
|-------|----------------------|-----|
| Both behind typical home NAT / CGNAT, no port forward | **No** | Neither has a stable public listener. Outbound works; inbound does not. |
| One has public IP + open port (or VPS / 443 reverse proxy + DNS) | **Yes** (the other dials that one) | Classic client → server. HTTP/2 may negotiate after TLS. |
| Both have public HTTPS names | **Yes** (either direction) | Same as any two websites calling each other. |
| Both only on localhost / LAN | **Yes** on that LAN | Irrelevant to “the network.” |

So: **routing/routers often *do* get in the way** for “two random dudes running nodes.” Configurable ports and HTTP/2 do not change that. What works instead:

1. **Consensus / block sync / random peer mesh** → **P2P** (spec 09): dial attempts, hole punching, relay circuits — not “open HTTP/2 to each other’s living rooms.”
2. **App / dapp / exchange HTTP** → at least one side is a **reachable HTTPS origin** (domain on 443, VPS, or prepared host). The other side is a **client**.
3. **Browser-mediated cross-dapp** → browser dials public dapp origins; wallet dials **localhost**. The two home NATs never need to accept inbound from each other.

HTTP/2 answers “how efficient is the connection **after** you can dial.” It does not answer “can you dial.”

---

## 5. Permissionless auth: show us the proof

Operator API keys and “who may call this REST route” are the **centralized façade** model. Protocol operations should be **permissionless with cryptographic evidence**.

| Operation | Authorization | What the node checks |
|-----------|---------------|----------------------|
| **Read** chain/account/block | None (public data) | Well-formed request; DoS rate limits only |
| **Submit tx** | Embedded **tx signature(s)** / dual-register sigs / leaf proof | Verify under account keys + fee/nonce/state rules ([`03-transactions`](../specs/03-transactions.md), [`04-proofs`](../specs/04-proofs.md)) |
| **Claim legacy** | `legacy_proof` (PGP or attestation) | Binding set + message ([`15-ledger-import`](../specs/15-ledger-import.md)) |
| **Update master / leaf assist** | Threshold cosign proof over new root | Proof verify; then same as tx path |
| **Put CAS object** | **Content address** — bytes must hash to `id`; anyone MAY publish | Hash match + size caps + rate limits (optional fee later) |
| **Admin / dangerous local ops** | Bind to **localhost** or unix socket | Not a global permission system — process isolation |

No step requires “account at guld.io” or a bearer token minted by a foundation server. A remote caller who can produce a valid signed tx has the same right to `POST /v1/transactions` as a local wallet.

**Rate limits and bind addresses** are anti-abuse, not identity. **TLS** authenticates *the server name* to the client (so you know you reached `alice.example`), not the user’s right to mutate state — that stays in the proof.

If a host wants extra gates (exchange IP allowlists, internal mTLS), that is **deployment policy** outside the protocol — the open internet peer still accepts proof-bearing requests.

---

## 6. guld.io is bootstrap only — not the network center

Clarifying non-goals:

- The network is **not** centralized on the guld.io domain or any single server.
- Consensus peers are **full nodes over P2P**, not “whoever hosts the website.”
- The reference UI and docs are **software people copy**; many peers run the same static tree on their own origin.

```
                    TRUSTED FOR CONSENSUS          BOOTSTRAP / UX HINTS ONLY
                    ─────────────────────          ─────────────────────────
Full node + P2P     ████████████████████
Local HTTP API      ████████████████████         (your machine / your domain)
Any peer’s HTTPS    ░░░░░░░░░░░░░░░░░░░░         ████████  (verify proofs/hashes)
guld.io copy        ░░░░░░░░░░░░░░░░░░░░         ████████  (one of many mirrors)
```

**Bootstrap URL:** a well-known HTTPS entry (default hint: guld.io) may publish unsigned or signed **hints** — genesis hash, rules hash, seed peer multiaddrs, client release digests. Nodes and clients **verify** against local config / P2P / embedded checkpoints. Changing the bootstrap hostname must never be required to stay on the network.

“Everyone runs copies of it, more or less” = same reference client + same node HTTP API on **their** domain or localhost. guld.io is convenience and first contact, not a hub.

---

## 7. Web-native peers and cross-dapp HTTP

```
  wallet @ localhost → own guld-node HTTP API
  dapp @ https://alice.example → alice’s node (same API)
  dapp @ https://bob.app     → bob’s node (same API)
         ▲                         ▲
         └──── P2P (blocks/tx/CAS) ┘
```

**Implemented today:** `guld-node --http <addr>` serves `/api/v1/…` (wallet chain reads) from the same handlers as JSON-RPC. `--http-static .` serves the open-source repo (static wallet) from that process. JSON-RPC remains on `--rpc` as a transitional adapter. P2P for the mesh is still TBD (spec 09).

Cross-dapp interactive flows use the **same HTTP API** over HTTPS (browser-mediated or leaf-to-leaf). Settlement still lands as signed txs on P2P. Configurable listen ports + 443 reverse proxy remain a **deployment** concern; they do not justify a second API dialect.

---

## 8. Recommendations

1. **Make one HTTP API the canonical node surface** — same coverage and rigor as today’s JSON-RPC (rewrite [`12-rpc.md`](../specs/12-rpc.md) toward resources + OpenAPI). Target audience: exchanges, dapps, wallets.
2. **Do not keep JSON-RPC for “ecosystem familiarity.”** That familiarity is the wrong ecosystem. Optional temporary adapter only.
3. **Prefer HTTP/2 multiplexing** over JSON-RPC batch; keep HTTP/1.1 fallback; use SSE or WebSocket for tip feeds — not HTTP/2 server push.
4. **Authorize by proof**, not by operator API keys. Reads public; writes carry signatures/proofs; CAS by content hash; localhost for process-admin only.
5. **Treat guld.io as bootstrap + reference mirror**, not protocol center. Same software runs everywhere.
6. **Fold leaf-host and chain HTTP into one `/v1` tree** so cross-dapp and wallet share one client.
7. **Invest performance in P2P + proof verify**, not in RPC-vs-REST framing debates.

---

## 9. Open questions

- Normative route table and error mapping for the HTTP rewrite of spec 12.
- Exact SSE event set (`newHeads`, mempool hints) vs WebSocket.
- Default ports + reverse-proxy cookbook (Caddy) for domain-hosted peers.
- Bootstrap manifest format and whether hints are signed (and by which key).
- How aggressively to deprecate the JSON-RPC adapter in-tree.

---

## 10. References in repo

- Node handler today: `src/guld-node/src/main.rs` (`POST /`, `POST /rpc`) + `http_api.rs` (`--http` `/api/v1/…`)
- Deprecated façade: `src/guld-api/` (do not use for reference wallet)
- Reference client: repo root static PWA (serve via `--http-static .` or any static host)
- Specs: [`12-rpc.md`](../specs/12-rpc.md), [`11-leaf-host.md`](../specs/11-leaf-host.md), [`04-proofs.md`](../specs/04-proofs.md), [`09-p2p.md`](../specs/09-p2p.md)
