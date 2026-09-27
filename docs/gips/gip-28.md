---
gip: 28
title: Atomic individual↔group kind conversion
description: Convert account kind without releasing the name; avoid squat races on re-register.
author: Guld contributors
discussions-to: ../tasks/done/2026-09/034-convert-account-kind.md
status: Accepted
type: Standards
category: Core
created: 2026-09-27
requires: 9, 11, 12, 13
---

## Abstract

Allow a live root account to **atomically** change `kind` between **`individual` and `group`** (and install a matching key policy) **without** releasing the name. Today the only path is unfunded settle / abandon then `RegisterUsername` / `RegisterGroup`, which races squatters for scarce labels. Businesses that grow from one founder to a multi-key org (or shrink the other way) need a safe on-chain transition.

## Motivation

Under [GIP-11](gip-11.md) pay-or-release, dropping a name to re-register as the other kind exposes the holder to front-running: anyone can register the free label in the next block. That is unacceptable for:

- Solo founders who later need multi-key / threshold **group** control on the same brand name.
- Groups that consolidate to a single-controller **individual** (or fewer keys under individual kind rules).
- Any holder of a short / high-`F_user(L)` name where re-acquisition cost or loss risk is extreme.

`RotateKeys` ([GIP-13](gip-13.md)) already changes keys under a **fixed** kind. It MUST NOT silently flip `kind` (fees and subaccount rules differ). A dedicated conversion tx keeps kind changes explicit and fee-honest.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Transaction: `ConvertAccountKind`

```text
ConvertAccountKind {
  name: Name,
  new_kind: individual | group,   // MUST differ from current kind
  new_keys: Vec<Pubkey>,
  new_threshold: u16,
  cosignatures: Vec<CosignEntry>, // under OLD keys/threshold
  new_key_signature: Signature,   // new_keys[0] consent (same bind as RotateKeys)
  inclusion_fee: Amount,
  memo: optional bytes,
}
```

### Eligibility

| Rule | Requirement |
|------|-------------|
| Account | Exists; not legacy-locked; not lapsed (or settle first) |
| Current kind | `individual` or `group` only |
| Target kind | The other of `{individual, group}` |
| Forbidden kinds | `network`, `foreign_chain`, `subaccount` (subs stay subs) |
| Name | Root only (no `.`) |

### Effects (atomic)

1. Verify old-policy threshold cosign over a tagged convert message (MUST bind `name`, `new_kind`, `new_keys`, `new_threshold`, `inclusion_fee`, memo, chain id, nonce).  
2. Verify `new_key_signature` by `new_keys[0]` over the convert intent (device / member bind).  
3. Enforce key/threshold sanity: `1 ≤ new_threshold ≤ new_keys.len()`, `new_keys` non-empty, `≤ MAX_KEYS`.  
4. Debit **protocol fee** (below) + `inclusion_fee` from the account balance (same vest path as registration).  
5. Set `kind = new_kind`; replace `keys` / `threshold` with `new_*`.  
6. **Preserve** `name`, `account_id`, `balance` (after fees), `master_hash`, `expires_at_height`, `legacy`, `nonce` (then `nonce++`).  
7. MUST NOT create or delete the account; MUST NOT free the name for others mid-tx.

### Fees

Reuse the **registration** schedule ([GIP-9](gip-9.md)) for the **target** kind — no convert-specific formula:

| Target `new_kind` | Protocol fee (→ 8-block miner vest) |
|-------------------|-------------------------------------|
| **individual** | `F_user(L)` |
| **group** | `F_group(L, n) = F_user(L) × (2 + n)` where `n = new_keys.len()` |

`L = label_letter_count(name)`. Same estimator / apply path as `RegisterUsername` / `RegisterGroup` (plus `inclusion_fee`). No rebate of fees paid under the prior kind.

Balance check: `balance ≥ protocol_fee + inclusion_fee`.

### Subaccounts ([GIP-12](gip-12.md))

Only **individual** roots may hold live subaccounts. Therefore:

- **individual → group** MUST fail if the account has **any** live `parent.label` subaccount. Holder MUST close/settle subs first (v1: unfunded settle of each sub, or a future `CloseSubaccount`).  
- **group → individual** has no subs to consider; after conversion the account MAY open subs under normal `RegisterSubaccount` rules.

### Non-goals

- Converting to/from `network` / `foreign_chain` / `subaccount`.  
- Renaming / transferring the label to another party (still not a resale market — [GIP-13](gip-13.md)).  
- Automatic subaccount migration under a group parent.  
- Changing `expires_at` outside ordinary settle.

### Wire / schema

Add a new `Tx` union variant (BARE tag after existing ClaimReward). Update `schemas/guld/v1/tx.bare`, `guld-wire`, and [GIP-26](gip-26.md) `tx_id.jsonl` with one golden. P2P JSON `type` string: `convert_account_kind`.

### Activation

Ship on Simba via ordinary binary upgrade (new tx type; no state rewrite). Mainnet: include in genesis rule bundle or height-activate per [spec 17](../specs/17-protocol-upgrades.md) if a tip already froze the Tx vocabulary without this tag.

## Rationale

Release-and-re-register is safer for the *network* (name returns to commons) but hostile to legitimate org evolution. Atomic convert is intentionally close to registration: same key/threshold checks, same `F_user` / `F_group` schedule, but the name never leaves the holder. Requiring empty subs avoids orphaning `parent.label` under a group that cannot legally parent them.

## Backwards Compatibility

Additive tx. Old clients reject unknown types (safe). Specs 02 / 03 / 07 and UI register/settings surfaces need updates when Accepted.

## Security Considerations

- Threshold cosign under **old** policy prevents unilateral kind flip by a minority key.  
- `new_keys[0]` bind prevents installing a key set nobody controls.  
- Charging full registration fee for the target kind closes “register individual cheap → convert to fat group” bypass of `F_group`.  
- No kind flip while legacy-locked (spend/control still gated by `ClaimLegacy`).

## Reference Implementation

- Task: [034-convert-account-kind.md](../tasks/done/2026-09/034-convert-account-kind.md)
- Expected: `guld-state` apply + messages (mirror register fee helpers); `guld-wire` BARE tag; vectors; PWA settings/register UX (spec 14)

## History

- 2026-09-27: Drafted — atomic kind conversion to avoid squat races on org grow/shrink.
- 2026-09-27: Fees = registration schedule for target kind (`F_user` / `F_group`), not a convert delta.
- 2026-09-27: Accepted — implemented in state/wire; lifecycle + node e2e.
