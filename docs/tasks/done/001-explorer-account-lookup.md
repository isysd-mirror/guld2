# Task: Explorer live account lookup

Status: done
Priority: normal
Intent: [`../../intents/wallet-contacts-and-account-lookup.md`](../../intents/wallet-contacts-and-account-lookup.md)
Spec: [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §12.4

## Problem

Main explorer shows blocks and txs only. Users cannot look up a registered name (balance, keys, legacy state) against a live node.

## Done when

- [x] Search box on `/explorer/` (exact name)
- [x] Route `#/account/<name>` loads account via `guld_getAccount`
- [x] Page shows balance, kind, keys, legacy, `expires_at_height` when present
- [x] Clear empty state when name not found
- [x] Link from tx tables to account pages where a name appears

