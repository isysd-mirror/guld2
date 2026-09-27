---
gip: 20
title: Wallet contacts and account lookup
description: Local contacts, recent recipients, explorer account lookup without on-chain social graph.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Application
created: 2026-09-25
---

## Abstract

Local contacts, recent recipients, explorer account lookup without on-chain social graph.

## Goal

Make the reference wallet feel **social** for everyday use (pay people you know) and make the **explorer** useful for looking up names — without QR codes for routine transfers.

Everyday send stays **name-to-name**. QR remains for one-time handshakes (sponsored registration, contact card).

## Out of scope (v1)

- Mutual “connection” graph on-chain
- Cross-device contact sync (needs protocol)
- Replacing leaf-host profiles as the long-term public identity surface

## Phases

### Phase 1 — Local social + exact lookup (no new consensus)

| Item | Surface | Notes |
|------|---------|--------|
| Explorer account page | guld.io | `#/account/<name>` → `guld_getAccount`, balance, keys, legacy, link to activity |
| Recent recipients | guld.io wallet Send | Derive from activity API + persist on successful send |
| Favorites + aliases | guld.io local storage | Local-only `{ name, alias?, favorite? }`; Send typeahead shows alias |
| Exists check while typing | guld.io Send | Debounced lookup via HTTP API |

**Storage (`guld.contacts.v1`):**

```json
{
  "contacts": [
    { "name": "bob", "alias": "Bob (meetup)", "favorite": true }
  ],
  "recent_recipients": [
    { "name": "carol", "last_sent_at": "2026-09-23T20:00:00Z" }
  ]
}
```

### Phase 2 — In-person contact exchange

| Item | Notes |
|------|--------|
| Contact QR payload | `guld1contact:` + compact JSON `{ v:1, name, pub?, alias? }` — save locally only (spec 14 §8.3.1) |
| Sponsor scan registration QR | Camera / paste in Settings → Sponsor (desktop scan TBD) |

### Phase 3 — Discoverability (node or indexer)

| Item | Notes |
|------|--------|
| `guld_searchAccounts(prefix, limit)` | Node RPC + HTTP; wallet Send + explorer consume |
| Explorer prefix browse | Client over search RPC |
| Public directory / rankings | Off-consensus indexer (**TBD**) |

## Acceptance (Phase 1)

- [x] Spec 14 documents contacts, recent recipients, explorer account route
- [x] Explorer renders live account page for exact name via RPC
- [x] Wallet Send shows typeahead: favorites → recent → contacts → chain prefix
- [x] Aliases display in Send UI; chain name used for tx
- [x] Contacts + recent persist locally; survive restart
- [x] Successful send appends/updates recent list
- [x] Activity scan backfills recent counterparties

## Acceptance (Phase 2)

- [x] Contact QR encode/decode documented and implemented in wallet Settings
- [ ] Registration sponsor flow accepts camera scan where platform allows

## Acceptance (Phase 3)

- [x] `guld_searchAccounts` spec + node implementation
- [x] Explorer and wallet use prefix search with sane limits

## Tasks

Tracked under [`../tasks/`](../tasks/) — [002](../tasks/done/2026-09/002-wallet-send-contacts.md)–[004](../tasks/done/2026-09/004-rpc-search-accounts.md) done.

## History

Supersedes: `docs/intents/wallet-contacts-and-account-lookup.md`

- 2026-09-27: Phases 1 + 3 + contact card QR shipped; status → Accepted (sponsor camera scan remains open under human-first UX).
