# Task: Contact card QR (in-person add)

Status: open
Priority: low
GIP: [`../../gips/gip-20.md`](../../gips/gip-20.md)
Spec: [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §12.3

## Problem

Registration QR covers sponsor bootstrap. Meeting someone in person should also allow exchanging a contact (name + optional pubkey) without messaging JSON.

## Done when

- [ ] Payload format `guld1contact:` documented in spec 14
- [ ] Wallet can show QR for “my contact card”
- [ ] Wallet can import from pasted/scanned contact payload → local alias
- [ ] No chain tx; local keyring only
