# Task: Node RPC prefix account search

Status: open
Priority: low
GIP: [`../../gips/gip-20.md`](../../gips/gip-20.md)
Spec: [`../../specs/12-rpc.md`](../../specs/12-rpc.md)

## Problem

Only exact lookup exists (`guld_getAccount`). Explorer/wallet cannot autocomplete or browse names by prefix.

## Done when

- [ ] Spec defines `guld_searchAccounts(prefix, limit)` → `[{ name, balance?, kind? }]`
- [ ] Node implements bounded prefix scan (dev-scale acceptable)
- [ ] Document performance limits and future indexer alternative
- [ ] Explorer or wallet consumes RPC for prefix typeahead (optional follow-up task)
