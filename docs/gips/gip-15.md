---
gip: 15
title: P2P mesh (libp2p)
description: guld-p2p + guld-node: discovery, tx gossip, block sync, CAS objects over libp2p.
author: Guld contributors
discussions-to: ./README.md
status: Final
type: Standards
category: Networking
created: 2026-09-25
---

## Abstract

guld-p2p + guld-node: discovery, tx gossip, block sync, CAS objects over libp2p.

## Goal

Ship **`guld-p2p`** and wire it into **`guld-node`** so peers discover each other, gossip txs, and **sync blocks/headers**. Client HTTP/JSON-RPC stays as today; P2P is consensus mesh only.

**Transport (locked):** **libp2p** — TCP + Noise + Yamux + identify + gossipsub (+ request-response).

## User stories

1. Run `guld-node --p2p 127.0.0.1:4001` → listens; `guld_peerCount` reflects connected peers.
2. Second node `--p2p 127.0.0.1:4002 --bootnode <multiaddr>` dials the first → Hello exchange.
3. `guld_sendTransaction` on A → B inserts the same tx into its mempool (InvTx → GetTx → Tx).
4. A mines a block → B imports it (InvBlock → GetBlock / headers sync).
5. B starts behind A’s tip → Hello `PeerAhead` → GetHeaders → GetBlock → catch up without copying datadir (same genesis required).
6. `--offline` → no listen/dial; peer count stays 0.
7. With `--p2p` (non-`--dev`), dial **guld.io** as an optional mesh fallback.

## Phases

### A — Scaffold + Hello + tx gossip

- [x] Crate `guld-p2p` with handle API
- [x] Node flags `--p2p`, `--bootnode`, `--offline`, `--network`
- [x] Persist libp2p identity under `datadir/keys/p2p.key`
- [x] Hello + InvTx / GetTx
- [x] `guld_peerCount` live; unit tests

### B — Blocks / headers

- [x] InvBlock gossip + GetBlock / GetHeaders request-response
- [x] `import_block` in `guld-consensus`
- [x] Broadcast sealed blocks; seed local chain into P2P store
- [x] PeerAhead → headers-first catch-up; orphan buffer
- [x] `guld_syncing` reflects catch-up

### C — CAS + hardening

- [x] GetObjects / Objects (`/guld/objects/1.0.0`)
- [x] DoS limits, ban scoring, peerstore durability (`datadir/peerstore/peers.json`)
- [x] mdns optional for LAN `--dev`

## Non-goals

- Hole punching / relay / DHT bootstrap network
- Light-client protocol variant
- Replacing HTTP for wallets

## Acceptance

### Phase A

- [x] Spec 09 transport locked to libp2p
- [x] `cargo test -p guld-p2p` Hello + tx round-trip
- [x] Live `guld_peerCount` after dial

### Phase B

- [x] `cargo test -p guld-p2p` includes block gossip
- [x] `import_block` consensus test
- [x] Node imports remote blocks and syncs when behind (same genesis)

### Phase C

- [x] `cargo test -p guld-p2p` CAS object round-trip
- [x] Peerstore load/save + ban persistence
- [x] `--dev` enables mDNS; simba/prod leave it off
- [x] Spec 09 documents objects + DoS/ban caps

## History

Supersedes: `docs/intents/p2p-mesh.md`
