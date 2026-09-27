---
gip: 30
title: P2P mesh robustness
description: Keep validating peers connected and catching up under disconnects (redial, ping, paced sync).
author: Guld contributors
discussions-to: ../tasks/open/032-p2p-mesh-robustness-phase-b.md
status: Accepted
type: Standards
category: Networking
created: 2026-09-27
requires: 15
---

## Abstract

Harden the GIP-15 libp2p mesh so a Simba validating peer stays connected and catches up after disconnects: connection refcounting, empty-mesh redial with dial backoff, libp2p ping, peerstore unroutable filters (incl. CGNAT), and paced headers-first GetBlock with sync-peer failover.

## Motivation

Happy-path gossip works, but resilience was thin: disconnect with no redial until the mesh was empty, peerstore pollution from docker/private addrs, idle connections dropped without keepalive, and catch-up that could stall (headers timeout only on next `PeerAhead`) or flood (≤128 parallel GetBlocks). A laptop peer fell behind guld.io and kept losing ground.

## Specification

Normative detail: [`../specs/09-p2p.md`](../specs/09-p2p.md). Summary:

### Phase A (shipped)

1. **Connection refcount** — Track per-peer connection count. Only treat a peer as gone when remaining connections reach zero.  
2. **Empty-mesh redial** — When the mesh is empty, redial bootnodes and cleaned peerstore addrs immediately and on a ~30s tick.  
3. **Dial backoff** — Per-address exponential backoff (≈5s → 60s cap) MUST skip dials still in cooldown.  
4. **Ping** — libp2p `ping` MUST run; idle connection timeout SHOULD be long enough (minutes) that quiet validating peers are not dropped while ping keeps liveness.  
5. **Peerstore filters** — MUST NOT dial or remember loopback, unspecified, link-local, RFC1918 private, or CGNAT `100.64.0.0/10` (and IPv6 ULA / link-local).  
6. **Paced GetBlock** — After a headers page, outbound GetBlock concurrency MUST be capped (reference: 8).  
7. **Headers timeout** — Catch-up MUST time out and clear inflight on a periodic check, not only on the next `PeerAhead`.  
8. **Sync-peer failover** — On sync-peer disconnect or ban, clear headers inflight and retry catch-up from another ahead peer when available.  
9. **Orphan cap** — Buffered sync orphans MUST be bounded (drop oldest heights).

### Phase B (follow-up)

- Deduplicate Hello / mempool pull per peer (not every connection).  
- Richer GetHeaders locator (Bitcoin-style).  
- Prefer public/dns4 peerstore addrs; rank dial quality.  
- Ops: second published entry in `data/p2p-bootnodes.json` when a stable peer exists.

## Non-goals

Same as GIP-15: no DHT / relay / hole-punch; no QUIC / WebTransport in this GIP (still deferred polish).

## Rationale

Empty-mesh redial + ping addresses the observed “peerCount=0 forever” failure. Pacing and timeout fix catch-up stalls under fat blocks without inventing a new sync protocol. Phase B polish can wait; Phase A unblocks validating peers.

## Backwards Compatibility

Wire protocols unchanged. Older peers without ping still connect; ping is best-effort liveness. Peerstore files may drop previously stored private addrs on load.

## Security Considerations

Backoff and outbound GetBlock caps reduce self-DoS and inbound RR storms. Unroutable filters avoid dialing attacker-injected private addrs from identify. Ban scoring unchanged for malicious payloads.

## Reference Implementation

- `src/guld-p2p` — redial, backoff, ping, peerstore filters, `PeerDisconnected`  
- `src/guld-node` — paced GetBlock, headers timeout tick, sync failover, orphan cap  
- Task Phase B: [`../tasks/open/032-p2p-mesh-robustness-phase-b.md`](../tasks/open/032-p2p-mesh-robustness-phase-b.md)

## History

- 2026-09-27: Accepted — Phase A implemented with this GIP; Phase B checklist open.
