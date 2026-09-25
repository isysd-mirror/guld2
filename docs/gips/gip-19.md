---
gip: 19
title: Mempool visualizer
description: Live mempool and tip view in the PWA via SSE from guld-node.
author: Guld contributors
discussions-to: ./README.md
status: Draft
type: Standards
category: Interface
created: 2026-09-25
---

## Abstract

Live mempool and tip view in the PWA via SSE from guld-node.

## Goal

Give the reference PWA a **live mempool view** — pending transactions as they enter, leave, or get mined — so operators and curious users can see the chain “breathe” without hammering JSON-RPC poll loops.

Transport preference: **SSE** (`EventSource`) for server→client push. Uni-directional tip + mempool events do not need WebSocket. Aligns with open params in spec 12 and the HTTP research note (SSE sufficient for `newHeads` / mempool hints; no HTTP/2 server push).

**Web stack (locked):** same as the reference wallet — framework-less JS, ES modules, CSS tokens, multi-page HTML. No bundler, no React.

## Why

- Explorer today is **pull + Refresh**; tip and pending txs go stale between clicks.
- Wallet users submitting txs have no first-class “in flight” surface beyond activity after inclusion.
- A shared stream unlocks explorer **and** small wallet status chips without inventing a second protocol.

## Surfaces

| Surface | Role |
|---------|------|
| **Explorer** (`/explorer/`) | Primary: live mempool list + tip height / last block; optional compact “pending” strip on home |
| **Wallet** (optional later) | “Pending” badge / toast when own tx enters mempool or is mined — same SSE client |
| **`guld-node --http`** | Canonical producer: snapshot + event stream under `/api/v1/…` |

## Transport decision

| Option | Verdict |
|--------|---------|
| **SSE** `GET /api/v1/chain/events` | **Preferred** — browser-native, reconnects, uni-directional, works over TLS + reverse proxies |
| WebSocket | Out of scope for v1 unless SSE is blocked by a specific deploy (then document escape hatch) |
| Polling | **Fallback only** — `GET /api/v1/chain/mempool` + status on interval when `EventSource` unavailable |

Do **not** use HTTP/2 server push.

## Node API (draft)

### Snapshot

`GET /api/v1/chain/mempool`

Returns pending txs the node will consider for the next block (order = mempool selection order; document if fee-rate sorted).

Suggested shape:

```json
{
  "count": 3,
  "weight_used": 1200,
  "weight_limit": 1000000,
  "fee_hints": { "fee_rate_min": "…", "fee_rate_recommended": "…" },
  "txs": [
    {
      "id": "…",
      "type": "Transfer",
      "from": "alice",
      "summary": "…",
      "weight": 400,
      "inclusion_fee": "…",
      "received_at": "2026-09-24T21:00:00Z"
    }
  ]
}
```

Exact field set follows existing HTTP account/tx JSON conventions once wired. Cap list size (e.g. top N by fee rate + `truncated` flag) to keep the PWA light.

### Stream

`GET /api/v1/chain/events`  
`Accept: text/event-stream`

| Event `event:` | `data:` (JSON) | When |
|----------------|----------------|------|
| `hello` | `{ tip_height, chain_id? }` | On connect |
| `newHeads` | header summary / height + hash | Block accepted |
| `mempoolAdded` | tx summary (same fields as snapshot row) | Successful mempool insert |
| `mempoolRemoved` | `{ id, reason }` (`included` \| `evicted` \| `replaced` \| …) | Dropped from mempool |
| `ping` | `{ t }` | Keepalive (optional; proxy-friendly) |

Clients reconnect with last-event-id if useful; v1 MAY omit resume and just re-fetch the snapshot on open.

JSON-RPC MAY keep a thin adapter later (`eth_subscribe`-style is **not** required). Spec 12 open param “SSE / WebSocket for `newHeads`” is satisfied by this stream; mempool events are the product hook.

## UI (explorer v1)

One composition on `/explorer/` (or `#/mempool`):

- Connection state: streaming / reconnecting / polling fallback
- Tip height + age (from `newHeads`)
- Pending count, weight used vs limit, fee hints
- Live list: type, parties / summary, fee, weight; rows animate in/out on SSE events
- Click-through to existing tx/account routes where ids/names exist

Stay visual but restrained: motion for enter/leave and tip tick only — not a dashboard of unrelated widgets. Match existing `explorer.css` tokens.

Manual Refresh remains for snapshot re-sync; SSE is the default live path.

## Phases

### Phase 1 — Stream + explorer mempool (this intent)

- [ ] Spec 12: document SSE route + event set + mempool GET
- [x] Spec 12: `GET /api/v1/chain/mempool` + `guld_getMempool` snapshot
- [ ] `guld-node`: emit events on insert / remove / new head; serve snapshot
- [x] `guld-node`: serve mempool snapshot (polling)
- [ ] PWA `EventSource` client helper (shared `src/js/lib/…`)
- [x] Explorer mempool view wired to snapshot (home panel + `#/mempool` + `#/tx/pending/<id>`)
- [ ] Explorer mempool view wired to SSE + snapshot fallback
- [ ] Rate limits / max subscribers per IP documented for operators

### Phase 2 — Wallet awareness (optional)

- [ ] After send: watch stream for own `tx id` → pending → included
- [ ] No new transport — reuse Phase 1 client

### Phase 3 — Richer signals (later)

- [ ] Fee-market sparklines / depth chart
- [ ] Cross-node mempool comparison
- [ ] WebSocket only if a concrete SSE deploy blocker appears

## Out of scope (v1)

- Consensus / P2P gossip visualization
- Full tx decode of every opcode in the UI (summaries + links enough)
- Operator auth on the public read stream (reads stay permissionless; DoS limits only)
- Replacing JSON-RPC entirely (adapter may stay; HTTP is canonical for the PWA)
- Bundlers / SPA frameworks

## Acceptance (Phase 1)

- [ ] Spec documents `GET /api/v1/chain/mempool` and `GET /api/v1/chain/events` (SSE)
- [ ] Submitting a tx via wallet or RPC makes a new row appear in explorer without Refresh
- [ ] Mining / inclusion removes the row and advances tip via `newHeads`
- [ ] Killing the stream falls back to polling snapshot without a blank page
- [ ] Works against `guld-node --http` (+ `--http-static .`) with the locked PWA stack
- [ ] CSP / `connect-src` allow the configured node origin (same rules as today’s RPC)

## Open parameters

- Exact mempool row JSON + list cap / truncation policy
- Whether `received_at` is node-local wall clock (document as such)
- Keepalive interval vs reverse-proxy idle timeouts
- Whether wallet Phase 2 ships in the same release as explorer Phase 1

## History

Supersedes: `docs/intents/mempool-visualizer.md`
