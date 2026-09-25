# Task: Wallet Send — favorites, aliases, recent recipients

Status: open
Priority: normal
GIP: [`../../gips/gip-20.md`](../../gips/gip-20.md)
Spec: [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §8.3  
Surface: **guld.io PWA** (primary reference wallet)

## Problem

Send is a bare text field. Users re-type names; no local nicknames; no history of people paid.

## Done when

- [ ] Keyring stores `contacts` and `recent_recipients` (see intent)
- [ ] Send “To” combobox: favorites first, then recent, then free text
- [ ] Settings (or Contacts sub-panel) to add favorite, set alias, remove
- [ ] Successful send updates recent list
- [ ] Activity scan can backfill recent on first open
- [ ] Debounced exists/balance hint while typing a chain name
