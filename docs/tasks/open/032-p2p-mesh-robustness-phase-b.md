# Task: P2P mesh robustness Phase B

Status: open  
Priority: normal  
GIP: [`../../gips/gip-30.md`](../../gips/gip-30.md)  
Spec: [`../../specs/09-p2p.md`](../../specs/09-p2p.md)  
Depends: GIP-30 Phase A (connection lifecycle + paced sync)

## Problem

Phase A keeps peers connected and catching up. Remaining polish: Hello/mempool storms on multi-conn, weak tip+genesis locator, peerstore dial ranking, and single published bootnode.

## Done when

- [ ] Deduplicate Hello / mempool pull per peer (not every connection)
- [ ] Richer GetHeaders locator (Bitcoin-style / exponential)
- [ ] Prefer public/dns4 peerstore addrs; rank dial quality
- [ ] Second published entry in `data/p2p-bootnodes.json` when a stable peer exists
- [ ] Spec 09 §7 open items updated; task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Opened with GIP-30; Phase A ships separately.
```
