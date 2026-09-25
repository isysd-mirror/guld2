---
gip: 20
title: Wallet contacts and account lookup
description: Local contacts, recent recipients, explorer account lookup without on-chain social graph.
author: Guld contributors
discussions-to: ./README.md
status: Draft
type: Standards
category: Application
created: 2026-09-25
---

## Abstract

Local contacts, recent recipients, explorer account lookup without on-chain social graph.

## Goal

Make the reference wallet feel **social** for everyday use (pay people you know) and make the **explorer** useful for looking up names — without QR codes for routine transfers.

Everyday send stays **name-to-name**. QR remains for one-time handshakes (sponsored registration, future contact card).

## Out of scope (v1)

- Mutual “connection” graph on-chain
- Cross-device contact sync (needs protocol)
- Prefix search over all chain names without a node/indexer RPC
- Replacing leaf-host profiles as the long-term public identity surface

## Phases

### Phase 1 — Local social + exact lookup (no new consensus)

| Item | Surface | Notes |
|------|---------|--------|
| Explorer account page | guld.io | `#/account/<name>` → `guld_getAccount`, balance, keys, legacy, link to activity |
| Recent recipients | guld.io wallet Send | Derive from activity API + persist on successful send |
| Favorites + aliases | guld.io local keyring | Local-only `{ name, alias?, favorite? }`; Send combobox shows alias |
| Exists check while typing | guld.io Send | Debounced lookup via HTTP API |

**Keyring extension (draft):**

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
| Contact QR payload | `guld1contact:` + compact JSON `{ name, pub?, alias? }` — save locally only |
| Sponsor scan registration QR | Camera / paste in Settings → Sponsor (desktop scan TBD) |

### Phase 3 — Discoverability (node or indexer)

| Item | Notes |
|------|--------|
| `guld_searchAccounts(prefix, limit)` | Node RPC; dev/small chains first |
| Explorer prefix browse | Client over search RPC or legacy static snapshot |
| Public directory / rankings | Off-consensus indexer (**TBD**) |

## Acceptance (Phase 1)

- [ ] Spec 14 documents contacts, recent recipients, explorer account route
- [x] Explorer renders live account page for exact name via RPC
- [x] Wallet Send shows dropdown: favorites → recent → type name
- [x] Aliases display in Send UI; chain name used for tx
- [x] Contacts + recent persist in keyring; survive restart
- [x] Successful send appends/updates recent list

## Acceptance (Phase 2)

- [ ] Contact QR encode/decode documented and implemented in wallet
- [ ] Registration sponsor flow accepts camera scan where platform allows

## Acceptance (Phase 3)

- [ ] `guld_searchAccounts` spec + node implementation
- [ ] Explorer or webapp uses prefix search with sane limits

## Tasks

Tracked as markdown under [`../tasks/open/`](../tasks/open/).

## History

Supersedes: `docs/intents/wallet-contacts-and-account-lookup.md`
