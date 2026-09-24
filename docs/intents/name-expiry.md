# Intent: Name registration expiry (DNS-style pay-or-release)

Status: **accepted** (revised — soft lapse replaced)  
Related: [`../specs/02-identity-and-accounts.md`](../specs/02-identity-and-accounts.md), [`../specs/03-transactions.md`](../specs/03-transactions.md), [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md), [`../specs/15-ledger-import.md`](../specs/15-ledger-import.md), [`subaccounts.md`](subaccounts.md), [`rotate-keys.md`](rotate-keys.md)

## Goal

Registration fees (`F_user` / `F_sub` / `F_group`) buy **one year of name control**, measured in blocks. At period end the network either **auto-debits** the fee or **releases** the name — like DNS. No soft-frozen occupied names. Names are **not** a resale market.

## Decisions (locked)

| Item | Value |
|------|--------|
| Period | `REGISTRATION_PERIOD = BLOCKS_PER_YEAR` (**52_560**) |
| Fee meaning | Fixed fees = **per year** (all active accounts) |
| Expiry mode | **Pay-or-release** via permissionless `SettleRegistration` |
| Soft lapse | **Removed** |
| Who settles | Miners in block formation (paid `F_*` or leftover dust) |
| Funded settle | Debit `F_*` → miner; `expires_at += REGISTRATION_PERIOD` |
| Unfunded settle | Leftover balance (`< F_*`) → miner; account **deleted**; name free |
| Early prepay | No `RenewRegistration` — keep wallet funded before expiry |
| Resale | **Not supported** — `RotateKeys` is own key hygiene only |
| Lost keys | Eventually unfunded settle ⇒ name free |
| Legacy 1.0 | Claim open indefinitely; settle **skips** legacy-locked. After claim: normal 1y period |
| Legacy claim | PGP binding ⇒ permissionless `pgp_cleartext_v1`; no PGP ⇒ only `isysd_attestation_v1` |
| Subaccounts | Parent release **cascades** delete of live subs (balances → miner) |

## Period math

```text
expires_at_height = start_height + REGISTRATION_PERIOD   // register / post-claim
settle renew: expires_at_height += REGISTRATION_PERIOD
```

Valid while `chain_height <= expires_at_height`. Overdue when `chain_height > expires_at_height` until settled.

## `SettleRegistration`

```text
SettleRegistration { name: Name }
```

Permissionless (no signature). Valid when overdue and not network / foreign / legacy-locked.

## Acceptance

- [x] Intent accepted
- [x] Specs + state/apply + miner enqueue
- [x] Dual ClaimLegacy (PGP vs isysd)
