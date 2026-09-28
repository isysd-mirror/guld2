# Task: Contacts page + private registration invite

Status: open  
Priority: high  
GIP: ../gips/gip-31.md  
Design: ../design/contacts-and-private-invite.md  
Spec: ../specs/14-reference-ui.md §8.3  

## Problem

Contacts are a Settings fieldset + Send typeahead (GIP-20). Inviting a friend is either raw Spec 16 JSON or a generic OTC URL. We need a proper address book and a **private, non-binding** invite-a-friend share flow (optional sponsor offer vs pay desk) without public name-claim URLs.

## Work

### Docs (this slice)

- [x] Design SoT: [`../design/contacts-and-private-invite.md`](../design/contacts-and-private-invite.md)
- [x] Spec 14 §8.3 / §8.3.2 + `/contacts/` surface
- [x] GIP-31 Draft
- [x] Human-first P1 retarget; Spec 16 / FAQ pointers

### Implementation (after docs review)

- [x] `/contacts/` list + detail CRUD; migrate `contacts.js` to v2
- [x] Import: Contact Picker + CSV
- [x] Invite compose (sponsor checkbox, templates, Web Share / copy)
- [x] Register wizard consumes `from` / `offer` / `pay` hints only (non-binding)
- [x] Wallet **Invite** + Settings link → Contacts
- [x] Tests for migration + invite URL builders

## Out of scope

- Consensus / Spec 16 signature changes  
- On-chain invite codes or name holds  
- Cross-device contact sync  
- Public invite landing / referral rewards  
