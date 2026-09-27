# Task: Sync hygiene — fork pollution / stuck-peer catch-up

Status: done  
Priority: normal  
Spec: [`../../specs/06-blocks-and-consensus.md`](../../specs/06-blocks-and-consensus.md), [`../../specs/09-p2p.md`](../../specs/09-p2p.md)  
Depends: [`013-chain-reorg-implementation.md`](013-chain-reorg-implementation.md), [`019-dual-miner-reorg-integration-test.md`](019-dual-miner-reorg-integration-test.md)  
Ops: [`../../../deploy/SIMBA.md`](../../../deploy/SIMBA.md)

## Problem

Heavier-tip reorg and dual-miner adversarial coverage shipped. Remaining gap: peers that fall behind or ingest fork-polluted tips may need **HTTP / P2P catch-up** that does not ban honest lag, plus documented recovery (mempool wipe + replay cost already noted in SIMBA.md).

## Done when

- [x] Documented recovery path for stuck tip (ops + code if needed)
- [x] Catch-up path proven for a peer behind a reorged tip without false ban (test or soak script)
- [x] Whitepaper §12.2 sync row closed or narrowed
- [x] Task → `done/2026-09/`

## Notes

```
2026-09-27: Split from whitepaper §12.3 leftover after 019.
2026-09-27: Shipped — P2P reseed_canonical after live reorg; first-wins height map;
  reorg_catchup_no_ban test; SIMBA stuck-tip checklist; §12.2 narrowed (P2P, not HTTP sync).
```
