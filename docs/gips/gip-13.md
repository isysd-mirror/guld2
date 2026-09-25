---
gip: 13
title: RotateKeys
description: Change account keys/threshold under current policy; no username resale market.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Core
created: 2026-09-25
---

## Abstract

Change account keys/threshold under current policy; no username resale market.

## Goal

Owners MUST be able to change an account’s keys and threshold (device upgrade, compromise response, group membership change).

## Non-goals

- **Username resale / transfer market.** Names are not inventory to flip. Anti-squat is **annual expiry** ([`GIP-11`](gip-11.md)), not secondary-market friction.
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
| Effects | Replace keys/threshold; balance / `master_hash` / `account_id` / `expires_at_height` unchanged |
| Allowed | `individual`, `group`, `subaccount` (not lapsed; sub also requires parent current) |
| Forbidden | `network` / `foreign_chain`; legacy-locked |
| Inclusion fee | Always (weight market) |

### Group key-set expansion fee (closes cheap-register → fat-rotate loophole)

`F_group(L, n)` prices ongoing proof burden. Paying a small `n` at `RegisterGroup` then `RotateKeys` to a large `n` without a protocol fee would bypass that.

| Change | Protocol fee (→ 8-block miner vest, same as registration) |
|--------|-------------------------------------------------------------|
| **Group**, `n_new > n_old` | **`F_group(L, n_new) − F_group(L, n_old)`** = `F_user(L) × (n_new − n_old)` |
| **Group**, `n_new ≤ n_old` | **None** (inclusion only) |
| Individual / subaccount | **None** beyond inclusion (`F_user` / `F_sub` are not per-signer at register) |

`n_*` = `keys.len()` before/after the rotate. Threshold-only changes with the same `n` charge no protocol fee.

Balance check: `balance >= inclusion_fee + expansion_fee` (when any).

## Acceptance

- [x] Intent accepted (no-resale framing)
- [x] Spec + apply implemented (hygiene path)
- [x] Wallet UX for own key rotation
- [x] Expansion fee on group grow: spec + apply + tests + wallet preview

## History

Supersedes: `docs/intents/rotate-keys.md`
