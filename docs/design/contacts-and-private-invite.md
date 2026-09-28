# Contacts address book & private registration invite

**Status:** design draft (pre-implementation)  
**GIP:** [`../gips/gip-31.md`](../gips/gip-31.md) (Draft)  
**Normative UI:** [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md) §8.3  
**Extends:** [GIP-20](../gips/gip-20.md) (local contacts; Accepted)  
**Task:** [`../tasks/open/038-contacts-private-invite.md`](../tasks/open/038-contacts-private-invite.md)

## 1. North star

People already know each other off-chain. Guld should help them **link those relationships to names** and **invite friends privately** — without minting a public claim URL or an on-chain invite contract.

**Address people by name** once they have a name. Until then: address book + a message you send over SMS, email, or chat.

## 2. Product decisions (locked)

| Decision | Rule |
|----------|------|
| **No invite binding** | Links and copy MUST NOT reserve a name, mint an invite code, or form an on-chain contract. The invitee always picks their own name at register. |
| **Smooth handoff only** | Prefill register URL *hints* and shareable message templates. Fees, keys, and sponsorship still follow Spec 16 when parties choose them. |
| **Optional sponsor offer** | A checkbox on invite compose: “Offer to sponsor their registration.” Changes template + hints; does not obligate payment until the inviter signs a real Spec 16 sponsor tx. |
| **No sponsor → pay desk** | Template steers the invitee to a payment-gateway-enabled peer (prefer the inviter’s current peer / OTC desk when configured; otherwise bootstrap `guld.io`). |
| **Squatter-safe** | No public “claim this name” URL. Privacy = send over a private channel, not protocol secrecy. |

## 3. Information architecture

### 3.1 Route: `/contacts/`

Primary address book. Settings keeps a thin link (“Open contacts”) and OTC desk prefs; day-to-day contact CRUD and invite live here.

| View | Purpose |
|------|---------|
| **List** | Searchable table/list: display name, Guld name (if linked), labels, favorite |
| **Detail** | Off-chain fields, link/unlink Guld name, labels, notes, **Invite…** |
| **Import** | Contact Picker API where available; CSV fallback |
| **Invite compose** | Checkbox (offer sponsor), editable copy, Web Share / copy link + copy message |

Wallet secondary CTA **Invite** → `/contacts/` (compose or list), not an OTC-only URL.

### 3.2 Relation to Send and `guld1contact:`

- **Send typeahead** continues to prefer favorites → recent → contacts that have a `guldName`, then chain prefix search (GIP-20).
- **`guld1contact:`** remains the **in-person Guld-name card** (Spec 14 §8.3.1). It is not the full address-book row and does not carry email/phone.

## 4. Local storage model (`guld.contacts.v2`)

Migrate from `guld.contacts.v1` on first load: each v1 `{ name, alias?, favorite? }` becomes a v2 contact with `guldName: name`, `displayName: alias || name`.

```json
{
  "v": 2,
  "contacts": [
    {
      "id": "c_…",
      "displayName": "Bob",
      "guldName": "bob",
      "emails": ["bob@example.com"],
      "phones": ["+1…"],
      "socials": [{ "network": "x", "handle": "bob" }],
      "labels": ["friends"],
      "notes": "",
      "favorite": true,
      "invite": {
        "offeredSponsor": true,
        "lastSentAt": "2026-09-28T15:00:00Z"
      }
    },
    {
      "id": "c_…",
      "displayName": "Sam (work)",
      "guldName": null,
      "emails": ["sam@corp.example"],
      "phones": [],
      "socials": [],
      "labels": ["work"],
      "notes": "",
      "favorite": false
    }
  ],
  "recent_recipients": [
    { "name": "carol", "last_sent_at": "2026-09-23T20:00:00Z" }
  ]
}
```

| Field | Notes |
|-------|--------|
| `id` | Stable local id (not on-chain) |
| `displayName` | Human label in the address book |
| `guldName` | Optional linked registered (or pending) Guld name; null until linked |
| `emails` / `phones` / `socials` | Local only; never uploaded by reference UI |
| `labels` | Freeform tags for filtering |
| `invite` | Optional metadata from last private invite compose |

**Recent recipients** stay name-only (on-chain counterparties), unchanged in spirit from GIP-20.

## 5. Import

| Source | Behavior |
|--------|----------|
| **Contact Picker API** | When `navigator.contacts` / picker is available: import name, email, tel into new rows (`guldName` null) |
| **CSV** | Columns such as `displayName,email,phone,guldName,labels` — documented sample in help |
| **`guld1contact:`** | Existing paste/QR → upsert by `guldName` / merge into matching row |

Import MUST stay on-device. Reference UI MUST NOT send address-book contents to the peer.

## 6. Private invite compose

### 6.1 Flow

1. Open contact (or “Invite someone new”).
2. Checkbox: **Offer to sponsor their registration** (default off unless contact already marked).
3. Preview editable message + register link (absolute URL on **current peer origin**).
4. **Share** (Web Share API) and/or **Copy message** / **Copy link**.
5. Optionally record `invite.lastSentAt` / `offeredSponsor` on the contact.

### 6.2 Register URL hints (non-binding)

Query params are **hints for the register wizard only**. They MUST NOT reserve names or authorize spends.

| Param | Meaning |
|-------|---------|
| `from` | Inviter’s Guld name (display / “send request back to …”) |
| `offer` | `1` = UI emphasizes friend-sponsor path after keygen; `0` = prefer pay desk |
| `pay` | Optional Paymento / desk payment link when inviter’s OTC is configured |
| `sponsor` | Existing OTC desk registrar **name** (not the friend-offer flag) |
| `peer` | Optional absolute origin hint if share is opened offline (rare) |

Examples:

- Sponsor offered: `https://<peer>/register/?from=alice&offer=1`
- No sponsor, desk: `https://<peer>/register/?from=alice&offer=0&pay=<paymentLink>`

### 6.3 Default message templates

**Sponsor offered**

> I’m on Guld — people address each other by name. Use this link to pick a name and protect your keys on your device:  
> `<url>`  
> When you’re ready, send me the registration request so I can sponsor you (`from` = my name). Don’t post this link publicly.

**No sponsor (pay desk)**

> I’m on Guld — address people by name. Sign up here (this peer can take payment for registration):  
> `<url>`  
> Pick your own name; keys stay on your device. Prefer sending this over a private channel.

Users MAY edit the template before sharing.

### 6.4 After the invitee registers (sponsor path)

Unchanged Spec 16 mechanics: invitee builds portable registration request → shares privately with inviter → inviter Wallet **Sponsor a name** (or equivalent). The invite link only taught them *where* to start and *whom* to return to.

## 7. Non-goals

- On-chain social graph / mutual connections
- Invite codes, name holds, or referral rewards
- Public invite landing pages or growth funnels that advertise claimable names
- Cross-device contact sync (future protocol / leaf — not this slice)
- Changing Spec 16 dual-signature rules

## 8. Implementation phases (after docs acceptance)

Tracked in task [038](../tasks/open/038-contacts-private-invite.md):

1. `/contacts/` shell + migrate `contacts.js` to v2  
2. Detail CRUD, link Guld name, labels  
3. Import (picker + CSV)  
4. Invite compose + register hint consumption  
5. Retarget Settings / wallet Invite CTAs  

## 9. Open decisions (implementation detail)

1. Exact CSV column set and sample file path under `docs/help/`.  
2. Whether `offer=1` without a logged-in inviter name still shows a generic “ask a friend” card.
3. Desk fallback when inviter has no OTC: always `guld.io` vs “any pay-enabled peer” picker.
