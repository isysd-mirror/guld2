---
gip: 33
title: Voluntary account unregister
description: Signed early release of individual, group, and subaccount names before expiry — frees sub slots without waiting for settle.
author: Guld contributors
discussions-to: ../tasks/open/041-voluntary-unregister.md
status: Accepted
type: Standards
category: Core
created: 2026-09-28
requires: 11, 12, 27
---

## Abstract

Add a signed **`UnregisterAccount`** transaction so holders can **voluntarily release** a name **before** `expires_at_height`. Primary motivation: close unused **subaccounts** and reclaim one of the **eight live slots** per individual parent without waiting for pay-or-release settle. Same tx shape covers **individual** and **group** roots when the holder chooses to abandon a name early.

## Motivation

[GIP-11](gip-11.md) only releases names via permissionless **`SettleRegistration`** when **overdue** (unfunded) or after auto-debit renew. [GIP-12](gip-12.md) deferred **CloseSubaccount** (“later — not v1”). Today:

1. **Subaccount cap.** An individual parent MAY hold at most **8** live subs. A device wallet (`alice.mobile`) the user no longer wants still occupies a slot until expiry — often **~1 year** — even with **zero balance**.
2. **No early exit.** Holders who registered the wrong label, rotated to a new sub elsewhere, or finished a project cannot free the name for themselves or others without draining the account and waiting for unfunded settle at period end.
3. **UX mismatch.** Wallets already show expiry and renew hints; users expect “delete this subaccount” the way they delete a local key profile.

`SettleRegistration` remains the **permissionless overdue** path. **`UnregisterAccount`** is the **holder-initiated voluntary** path while the lease is still current.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Transaction

```text
UnregisterAccount {
  name: Name,
  cosignatures: Vec<CosignProof>,   // threshold policy on `name` (see §3)
  inclusion_fee: Amount,
  memo: optional bytes,
}
```

**Weight:** same class as `SettleRegistration` (minimal — `(0, 2)` base + memo).

**Memo:** OPTIONAL; same limits as other user txs ([GIP-16](gip-16.md)).

### Eligibility

| Kind | MAY unregister? | Signer | Preconditions |
|------|-----------------|--------|---------------|
| `subaccount` | **Yes** | Subaccount **threshold** keys | Parent still exists |
| `individual` | **Yes** | Account **threshold** keys | **No live subaccounts** under this root |
| `group` | **Yes** | Account **threshold** keys | (no subs in v1) |
| `network` (`guld`) | **No** | — | Reserved |
| `foreign_chain` | **No** | — | Not used v1 |
| **Legacy-locked** | **No** | — | MUST `ClaimLegacy` first; then normal rules |

Additional checks (all kinds):

- Account MUST exist.
- MUST NOT be **lapsed** (`chain_height >= expires_at_height`). When overdue, use `SettleRegistration` (permissionless) instead — avoids duplicate release paths at the same height.
- **`balance` disposition** MUST succeed (§4).

### Authorization message

Cosignatures MUST verify under the account’s **current** `keys` / `threshold` over a domain-separated intent (tag `guld/unregister_account/v1`) binding at minimum:

```text
name ‖ nonce ‖ chain_id ‖ expires_at_height ‖ inclusion_fee ‖ memo?
```

(`nonce` is the account’s value **before** apply, same binding style as `UpdateMaster` / `RotateKeys`.)

Threshold **1** accounts MAY supply a single qualifying signature in `cosignatures[0]`.

### Effects by kind

#### Subaccount (`parent.label`)

1. Debit `inclusion_fee` from subaccount balance (inclusion → including miner).
2. Credit **remaining balance** to the **parent** individual root (saturating add). Parent MUST exist and MUST NOT be lapsed-deleted in the same block before this credit (normal block order).
3. **Delete** the subaccount record. Name `parent.label` becomes registrable again via `RegisterSubaccount`.
4. Parent **live sub count** decreases by one — parent MAY open a new sub up to `MAX_SUBACCOUNTS` again.

No protocol registration fee is charged or refunded; the holder is surrendering the remainder of the prepaid year.

#### Individual / group root

1. Debit `inclusion_fee`.
2. **Delete** the account. Name becomes registrable via `RegisterUsername` / `RegisterGroup`.
3. **No cascade** of subs (precondition forbids live subs). Implementations MUST NOT use this tx to delete a root that still has live subs — reject with `LiveSubaccountsRemain`.

**Balance rule (roots):** `balance` MUST equal **`inclusion_fee` only** after any optional user-initiated sweeps — i.e. **zero spendable balance** apart from the fee payer slot. Equivalently: `balance == inclusion_fee` at apply time. Wallets SHOULD guide users: **Transfer** remaining funds out, then unregister. (Avoids ambiguous “where does dust go?” on voluntary abandon.)

### Relationship to `SettleRegistration`

| | `UnregisterAccount` | `SettleRegistration` |
|--|---------------------|----------------------|
| Who | Holder (signed) | Anyone (permissionless) |
| When | **Before** expiry | **On/after** expiry |
| Sub balance | → **parent** | → vesting (with root cascade) |
| Root balance | MUST be fee-only | Funded renew or vesting dust |
| Sub slot | Freed immediately | Freed on unfunded root cascade only |

Both txs MUST NOT apply to the same name in the same block.

### State / indexing

- Remove account from name index; preserve no tip (`master_hash` discarded).
- **`account_id`** is not reused — a future registration of the same string is a **new** account ([spec 02](../specs/02-identity-and-accounts.md) §3.1).
- Activity / explorer: emit a final “unregistered” row or rely on last tx id before delete (implementation detail).

### RPC / HTTP

Implementations SHOULD add:

- `guld_unregisterAccount` (build + validate + broadcast helpers)
- HTTP `POST /chain/transactions` accepts `type: "unregister_account"` mirror

Estimation: no protocol fee; only `inclusion_fee`.

### Reference UI ([GIP-17](gip-17.md))

- **Subaccounts:** Wallet → account card → **Close subaccount** (advanced or keys panel) with copy: returns balance to parent, frees a slot, name may be re-registered.
- **Roots:** Advanced → **Release name** with strong warning, expiry comparison, and sweep-first checklist.
- MUST NOT expose for `guld`, legacy-locked, or lapsed accounts.

## Rationale

**One tx type** keeps codecs and explorers simple; kind-specific rules live in apply.

**Sub → parent credit** matches how subs are funded (`RegisterSubaccount` parent pays) and avoids trapping value in vesting on a voluntary hygiene action.

**Root zero-balance rule** prevents voluntary unregister from becoming a cheap vesting spam path; unfunded overdue settle already sends dust to miners.

**No unregister while subs live** mirrors [GIP-28](gip-28.md) individual→group guard — subs are first-class spenders; parent cannot unilaterally delete them without a cascade policy. Close subs explicitly first.

**Reject when lapsed** keeps a single overdue semantics layer (`SettleRegistration`).

**Legacy-locked** accounts have no signing keys on-chain; release stays on the settle/claim clock ([GIP-27](gip-27.md)).

Alternatives considered:

- **Parent-only close sub** — rejected; sub keys hold spend authority ([GIP-12](gip-12.md)); sub holder must consent.
- **Separate `CloseSubaccount` type** — redundant with kind branch in `UnregisterAccount`.
- **Refund `F_sub` pro-rata** — rejected; fees buy fixed periods; no partial refunds.

## Backwards Compatibility

- **New tx variant** — requires node + SDK + wallet updates; activate via [spec 17](../specs/17-protocol-upgrades.md) rule bundle ([055](../tasks/open/055-simba-single-rule-bundle.md) for Simba catch-up).  
- **No genesis change.**  
- [GIP-12](gip-12.md) “Close — later” is **superseded** for subaccounts.  
- Spec deltas: [spec 02](../specs/02-identity-and-accounts.md) §3.6, [spec 03](../specs/03-transactions.md) §3.8, [spec 07](../specs/07-fees-and-tokenomics.md), [spec 14](../specs/14-reference-ui.md).

## Security Considerations

- **Squatting:** Freed names are immediately registrable — same as unfunded settle. No extra squatting surface vs status quo.
- **Parent griefing:** Parent cannot force-close a sub; sub must sign.
- **Sub theft:** Parent receives only **current balance** at close; no access to sub private keys.
- **Re-register race:** Two parties may race for a released name — first valid register wins (existing rule).
- **DoS:** Weight floor unchanged; no heavier than settle.

## Reference Implementation

- Task: [041-voluntary-unregister.md](../tasks/open/041-voluntary-unregister.md)
- Touch: `guld-state` `Tx` enum + `apply_unregister_account`, `guld-types`, wire codec, `guld-node` RPC/HTTP, `guld-js`, `guld-web-ui` wallet subaccount close UI.

## Acceptance

- [x] GIP Accepted
- [x] Spec 02 / 03 / 07 / 14 updated
- [ ] State apply + tests (sub close frees slot; root rejected with live subs; root with balance > fee rejected)
- [ ] RPC + wallet UX for subaccount close
- [ ] Simba rule-bundle activation height chosen ([055](../tasks/open/055-simba-single-rule-bundle.md))

## History

- 2026-09-28: Draft — closes GIP-12 “CloseSubaccount — later” intent.
- Supersedes open parameter in [spec 02](../specs/02-identity-and-accounts.md) §6 (`CloseSubaccount`).
- 2026-09-29: **Accepted** — activate via rule bundle with other Core upgrades ([055](../tasks/open/055-simba-single-rule-bundle.md)).
