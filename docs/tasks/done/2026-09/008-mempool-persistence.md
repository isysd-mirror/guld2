# Task: Mempool persistence across restarts

Status: done
Priority: normal
GIP: ../gips/gip-22.md (Accepted)
Spec: ../specs/10-node.md, ../specs/09-p2p.md, ../specs/12-rpc.md

## Problem

The node mempool was **in-memory only**. On restart pending user txs and ~100 GIP-22 `ClaimReward` entries were lost until peers re-gossiped.

## Goals

1. Persist mempool under the node datadir on change.
2. Reload and re-validate on startup.
3. Re-gossip restored txs after P2P is up.
4. Keep GIP-22 pending claim pool across restarts.

## Done when

- [x] Datadir-backed mempool store (`mempool.jsonl`) with insert/remove/mine hooks
- [x] Startup reload + re-validation; stale entries removed with log
- [x] P2P re-gossip after reload (`seed_p2p_mempool`)
- [x] Unit test: rewrite/reload roundtrip + empty rewrite (reorg wipe)
- [x] Spec 10 §3.1.1 + datadir layout; `deploy/SIMBA.md` updated
- [x] Task 007 C2 gap note updated

## Notes

```
2026-09-26: Opened — GIP-22 claim pool fragility on restart.
2026-09-26: Closed — store already landed; fixed drop_ids + reorg disk sync;
           reload test; spec 10 + SIMBA docs.
```
