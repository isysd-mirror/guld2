# Task: Node RPC prefix account search

Status: done  
Priority: low  
GIP: [`../../gips/gip-20.md`](../../gips/gip-20.md)  
Spec: [`../../specs/12-rpc.md`](../../specs/12-rpc.md), [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md)

## Problem

`guld_searchAccounts` / `GET /chain/accounts` are **shipped** on the node. Wallet send and contacts need a polished **prefix typeahead** consumer (explorer already uses prefix lookup).

## Done when

- [x] Spec defines `guld_searchAccounts(prefix, limit)` → `[{ name, balance?, kind? }]`
- [x] Node implements bounded prefix scan (dev-scale acceptable)
- [x] Wallet Send typeahead consumes HTTP search (with local favorites/recent)
- [x] Document performance limits and future indexer alternative (spec 12)

## Notes

```
2026-09-27: RPC half done; remaining work is wallet UI wiring.
2026-09-27: Wallet Send merges local suggestions + GET /chain/accounts?prefix=.
```
