# Task: Explorer live account lookup

Status: open
Priority: normal
Intent: [`../../intents/wallet-contacts-and-account-lookup.md`](../../intents/wallet-contacts-and-account-lookup.md)
Spec: [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §12.4

## Problem

Main explorer shows blocks and txs only. Users cannot look up a registered name (balance, keys, legacy state) against a live node.

## Done when

- [ ] Search box on `/explorer/` (exact name)
- [ ] Route `#/account/<name>` loads account via `guld_getAccount`
- [ ] Page shows balance, kind, keys, legacy, `expires_at_height` when present
- [ ] Clear empty state when name not found
- [ ] Link from tx tables to account pages where a name appears
