# Task: Contact card QR (in-person add)

Status: done  
Priority: low  
GIP: [`../../gips/gip-20.md`](../../gips/gip-20.md)  
Spec: [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §8.3.1

## Problem

Registration QR covers sponsor bootstrap. Meeting someone in person should also allow exchanging a contact (name + optional pubkey) without messaging JSON.

## Done when

- [x] Payload format `guld1contact:` documented in spec 14 §8.3.1
- [x] Wallet Settings shows QR for “my contact card”
- [x] Wallet can import from pasted contact payload → local alias
- [x] No chain tx; local storage only

## Notes

```
2026-09-27: Frozen guld1contact: v1; Settings show/import + copy payload.
```
