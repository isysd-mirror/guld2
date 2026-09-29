---
gip: 31
title: Contacts address book and private invites
description: Local address book with off-chain fields and non-binding private registration invites.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Application
created: 2026-09-28
requires: 5, 8, 20
---

## Abstract

Extend the reference PWA with a **Contacts** address book (off-chain fields + optional Guld name link) and **private, non-binding** registration invite templates — optional “offer to sponsor” vs payment-desk steering — without on-chain invite codes or name holds.

## Motivation

[GIP-20](gip-20.md) shipped local favorites/aliases and Send typeahead, but contacts live as a thin Settings fieldset. Inviting a friend still means either raw Spec 16 JSON or a generic OTC payment URL. Public “claim this name” invites were set aside because of squatting risk. Users still need a smooth **invite a friend** path over private channels (SMS, email, chat) that pre-fills instructions without binding a name on-chain.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

Normative UI detail: [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md) §8.3 (including §8.3.2). Creative SoT: [`../design/contacts-and-private-invite.md`](../design/contacts-and-private-invite.md).

1. **Surface** — Reference UI MUST provide `/contacts/` for list, detail, import, and invite compose. Wallet **Invite** SHOULD open Contacts. Settings MUST NOT be the only contact CRUD surface once this GIP is Accepted and implemented.
2. **Storage** — Extend local contacts to v2 (display name, optional `guldName`, emails/phones/socials, labels, notes, favorite). Migrate v1 rows. MUST remain local-only (no peer upload of address books).
3. **Send** — Typeahead MUST continue to use contacts that have a `guldName` (plus recent / chain prefix per GIP-20).
4. **Private invite** — Compose MAY offer checkbox **Offer to sponsor their registration**. Share templates and register query hints (`from`, `offer`, `pay`, …) MUST be **non-binding**: they MUST NOT reserve names, mint invite codes, or authorize spends. Use `offer=1` for friend-sponsor steering; keep existing OTC `sponsor=<registrarName>` for desk invites. Sponsorship, when performed, MUST use existing Spec 16 dual-signature flows. Without sponsor offer, templates SHOULD steer to a payment-gateway-enabled peer (inviter’s desk when configured).
5. **Import** — SHOULD support Contact Picker where available and CSV fallback; MUST keep import on-device.
6. **`guld1contact:`** — Unchanged (in-person Guld-name card only).

**No consensus changes.**

## Rationale

- **Non-binding invites** avoid squatter-friendly public claim URLs while still improving UX.
- **Contacts page** matches social-app expectations; Guld name is an optional link, not the only identity in the book.
- **Sponsor checkbox** reuses Spec 16 and GIP-8 desk paths instead of inventing invite economics.

## Backwards Compatibility

- `guld.contacts.v1` rows migrate to v2 on load.
- Existing Send typeahead and `guld1contact:` remain valid.
- Register without invite query params behaves as today.

## Security Considerations

- Address books contain PII — never send to the node by default; warn before any future export.
- Invite links are not credentials; leaking a link does not reserve a name or spend GULD.
- Sponsor offer is social only until the inviter signs Spec 16; UI MUST NOT imply funds are escrowed.

## Reference Implementation

- Design: [`../design/contacts-and-private-invite.md`](../design/contacts-and-private-invite.md)
- Task: [`../tasks/open/038-contacts-private-invite.md`](../tasks/open/038-contacts-private-invite.md)
- Code (after acceptance): `src/js/lib/contacts.js`, `/contacts/`, register hint parsing

## History

- Extends [GIP-20](gip-20.md). Reframes human-first P1 “share-first friend invite” ([`../design/human-first-ux.md`](../design/human-first-ux.md)) as Contacts private invite.
- 2026-09-29: **Accepted** — reference UI / Application; no consensus change.
