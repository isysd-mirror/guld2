# Intent: RotateKeys (own key hygiene)

Status: **accepted** (revised — not a resale path)  
Related: [`../specs/03-transactions.md`](../specs/03-transactions.md), [`name-expiry.md`](name-expiry.md)

## Goal

Owners MUST be able to change an account’s keys and threshold (device upgrade, compromise response, group membership change).

## Non-goals

- **Username resale / transfer market.** Names are not inventory to flip. Anti-squat is **annual expiry** ([`name-expiry.md`](name-expiry.md)), not secondary-market friction.
- Recovery after total key loss — if keys are gone, the name is **lost to the network** (soft-occupied / lapsed).

`RotateKeys` remains the on-chain way to install new keys under the **current** controller’s authorization. Product/docs MUST NOT frame it as “sell a name.”

## Design

```text
RotateKeys {
  name: Name,
  new_keys: Vec<Pubkey>,
  new_threshold: u16,
  cosignatures: Vec<CosignEntry>,  // under OLD keys/threshold
  new_key_signature: Signature,    // new_keys[0] consent (device bind)
  inclusion_fee: Amount,
}
```

| Rule | Value |
|------|--------|
| Effects | Replace keys/threshold; balance / `master_hash` / `account_id` unchanged |
| Protocol fee | Inclusion only |
| Allowed | `individual`, `group`, `subaccount` (not lapsed; sub also requires parent current) |
| Forbidden | `network` / `foreign_chain`; legacy-locked |

## Acceptance

- [x] Intent accepted (no-resale framing)
- [x] Spec + apply implemented
- [x] Wallet UX for own key rotation
