# Task: Voluntary account unregister (GIP-33)

Status: open  
Priority: **high** (Core — rides [055](./055-simba-single-rule-bundle.md))  
GIP: ../gips/gip-33.md (**Accepted**)  
Spec: ../specs/02-identity-and-accounts.md, ../specs/03-transactions.md  
Related: ./055-simba-single-rule-bundle.md, ../done/2026-09/042-rule-bundle-upgrade-e2e.md  

## Problem

Subaccounts occupy one of **8** live slots until yearly settle ([GIP-12](../gips/gip-12.md)). Holders cannot release a name early — e.g. retire `alice.mobile` after moving to `alice.laptop` — without waiting for expiry and unfunded settle. [GIP-33](../gips/gip-33.md) (**Accepted**) adds signed **`UnregisterAccount`** for voluntary release (especially subaccounts).

## Done when

- [x] GIP-33 Accepted  
- [x] Spec 02 / 03 / 07 / 14 deltas merged  
- [x] `UnregisterAccount` in `guld-state` apply (+ tests)  
- [x] Wire encode/decode (BARE tags) + mempool/activity hooks  
- [x] GIP-26 golden vectors (`unregister_account` in `tx_id.jsonl`)  
- [x] `guld-js` build/sign helper (`buildSignedUnregisterAccount` + message)  
- [x] Wallet: **Close subaccount** / **Release name** + **Profile bio** on keys account tools  
- [ ] Height-activated on Simba via [055](./055-simba-single-rule-bundle.md)  

## Non-goals

- Partial fee refunds  
- Parent-only close without sub signatures  
- Unregister legacy-locked accounts (no keys)  
- Cascade-delete subs on root unregister (require empty sub set)  
- Solo Simba activation separate from [055](./055-simba-single-rule-bundle.md)  

## Notes

```
2026-09-29: Apply/wire + GIP-26 + @guld/js + keys-page Close/Release/bio UX landed.
           Leaves Simba height activation to [055](./055-simba-single-rule-bundle.md).
```
