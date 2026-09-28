# Task: Voluntary account unregister (GIP-33)

Status: open  
Priority: normal  
GIP: ../gips/gip-33.md  
Spec: ../specs/02-identity-and-accounts.md, ../specs/03-transactions.md  

## Problem

Subaccounts occupy one of **8** live slots until yearly settle ([GIP-12](../gips/gip-12.md)). Holders cannot release a name early — e.g. retire `alice.mobile` after moving to `alice.laptop` — without waiting for expiry and unfunded settle. [GIP-33](../gips/gip-33.md) adds signed **`UnregisterAccount`** for voluntary release (especially subaccounts).

## Done when

- [ ] GIP-33 Accepted
- [ ] Spec 02 / 03 / 07 / 14 deltas merged
- [ ] `UnregisterAccount` in `guld-state` apply + golden vectors
- [ ] Wire + RPC + HTTP mirror
- [ ] `guld-js` build/sign helper
- [ ] Wallet: **Close subaccount** on sub account pages; advanced **Release name** for roots (sweep-first UX)
- [ ] Simba activation via rule bundle (height TBD with maintainer)

## Non-goals

- Partial fee refunds
- Parent-only close without sub signatures
- Unregister legacy-locked accounts (no keys)
- Cascade-delete subs on root unregister (require empty sub set)
