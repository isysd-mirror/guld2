# Task: Mempool persistence across restarts

Status: open
Priority: normal
GIP: ../gips/gip-22.md (Accepted)
Spec: ../specs/10-node.md, ../specs/09-p2p.md, ../specs/12-rpc.md

## Problem

The node mempool (`guld-consensus::Mempool`, held in `guld-node` `AppState`) is **in-memory only**. On process restart:

- All pending user transactions are lost until peers re-gossip them.
- Locally submitted txs that never propagated are gone.
- **[GIP-22](../gips/gip-22.md)** `ClaimReward` txs — miners SHOULD keep ~**100** pending reward claims — are especially painful to lose; they must be re-signed or recovered from sealed block data.

Today `seed_p2p_mempool` re-gossips whatever is already in RAM after P2P connect; there is no datadir backup. On small testnets (Simba), restarts and thin peer counts make “stuck” or vanished pending txs common.

## Goals

1. **Persist mempool to disk** under the node datadir on change (insert / remove / block mined).
2. **Reload and re-validate** on startup against current tip (drop stale, duplicate, or invalid entries).
3. **Re-gossip** restored txs after P2P is up (extend existing `seed_p2p_mempool` path).
4. Support **GIP-22** pending claim pool without requiring miners to manually rebroadcast after every restart.

## Non-goals (this task)

- Cross-node mempool sync protocol changes (spec 09 behavior stays gossip-based).
- Mempool fee estimation / RBF (separate future work).
- Consensus rule changes (covered by GIP-22).

## Proposed design

### Storage

| Item | Suggestion |
|------|------------|
| Path | `{datadir}/mempool/` or single `{datadir}/mempool.jsonl` |
| Record | `{ tx_id, canonical_tx_bytes or Tx JSON, inserted_at_height, inserted_at_unix }` |
| Write | Debounced flush (e.g. 1s) or fsync on insert for high-value txs — **TBD** |
| Cap | Configurable max entries / max MB; evict lowest fee-rate when over cap (same policy as RAM) |

### Startup

```text
1. Open chain tip / state as today
2. Load mempool snapshot from disk
3. For each entry: re-run mempool validation (fee floor, weight, type-specific rules)
4. Drop txs that are already confirmed on chain
5. Drop ClaimReward whose ref block is orphaned / already claimed (when GIP-22 live)
6. Replace in-memory Mempool; log counts (loaded / dropped / kept)
7. After P2P connect: seed_p2p_mempool + merge peer InvTx as today
```

### Shutdown

- Best-effort flush on SIGTERM / clean exit (optional hook in `main`).

## Done when

- [x] Datadir-backed mempool store with insert/remove/mine hooks in `guld-node`
- [x] Startup reload + re-validation; stale entries removed with debug log
- [x] Existing P2P re-gossip runs after reload (`seed_p2p_mempool`)
- [x] Unit or integration test: insert tx → restart node (or reload fn) → tx still present
- [ ] Document path and behavior in spec 10 (node) §mempool persistence — short paragraph
- [ ] Task 007 known-gap note: mempool fragility partially addressed (persistence); network size still affects peer relay

## Follow-ups

- Priority lane for matured `ClaimReward` near tip (GIP-22 miner UX).
- Optional `--mempool-import` for manual claim recovery from `RewardCommit` + block archive.
