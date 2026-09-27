# Task: Wallet Send — favorites, aliases, recent recipients

Status: done  
Priority: normal  
GIP: [`../../gips/gip-20.md`](../../gips/gip-20.md)  
Spec: [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §8.3  
Surface: **guld.io PWA** (primary reference wallet)

## Problem

Send is a bare text field. Users re-type names; no local nicknames; no history of people paid.

## Done when

- [x] Local storage `guld.contacts.v1` holds `contacts` and `recent_recipients`
- [x] Send “To” typeahead: favorites first, then recent, then contacts, then free text
- [x] Settings: add favorite, set alias, remove
- [x] Successful send updates recent list
- [x] Activity scan backfills recent on wallet open
- [x] Debounced exists/balance hint while typing a chain name

## Notes

```
2026-09-27: Shipped with prefix typeahead (004) and contact QR (003).
```
