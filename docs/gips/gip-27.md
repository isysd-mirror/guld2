---
gip: 27
title: Legacy names under pay-or-release
description: End indefinite settle exemption for legacy-locked imports; same F_* clock as all other names.
author: Guld contributors
discussions-to: ../tasks/done/2026-09/022-legacy-settle-parity.md
status: Final
type: Standards
category: Core
created: 2026-09-27
requires: 9, 11, 14
---

## Abstract

Remove the forever-exemption that keeps **legacy-locked** 1.0 imports out of `SettleRegistration`. Imported balances stay on-chain and **spend** still requires `ClaimLegacy`, but name control follows the same **pay-or-release** rules as every other non-network account. Amends [GIP-11](gip-11.md) (Legacy row) and [GIP-14](gip-14.md) / [spec 15](../specs/15-ledger-import.md) open “locked forever” posture.

## Motivation

Indefinite reservation of unclaimed legacy names creates lasting tokonomy and credibility risk:

1. **Dead weight.** Names such as `satoshi` are unlikely to ever claim, yet occupy scarce labels forever.
2. **High-value remaps.** Hyphen remaps (e.g. `y--` → **`y`**, one of 26 single-letter individuals) park L=1 names behind an attestation that may never arrive — locking a **1000 GULD/yr** letter indefinitely for a small imported balance.
3. **Attestation overhang.** Markets and reviewers always ask whether dormant legacy coins or names will suddenly unlock. An open-ended claim window without a renewal clock answers “maybe forever.”

Holding a 1.0 balance is not a free permanent name lease. Continuity of **coins** until funded settle or claim is enough; **name control** MUST obey the same fee schedule as fresh registrations. During Simba beta, outreach and attestations SHOULD maximize prepared claims before mainnet — not justify a permanent privilege for empty-key imports.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Settled terminology

- **Legacy-locked** still means: `legacy.status = locked`; `Transfer` / `RotateKeys` / register-as-payer / etc. MUST fail; only `ClaimLegacy` installs spend keys.
- **Pay-or-release** still means: [GIP-11](gip-11.md) `SettleRegistration` — funded renew or unfunded delete + dust → vesting.

### Normative changes

1. **Import expiry.** Genesis import of a legacy-locked account MUST set  
   `expires_at_height = import_height + REGISTRATION_PERIOD`  
   (Simba / mainnet artifact genesis: `import_height = 0` → `expires_at_height = REGISTRATION_PERIOD`).  
   MUST NOT use `NEVER_EXPIRES` (`u64::MAX`) for legacy-locked individuals/groups.

2. **Settle eligibility.** `SettleRegistration` MUST treat legacy-locked accounts of kind Individual / Group / Subaccount **exactly** like unlocked ones of the same kind when overdue:
   - Funded (`balance ≥ F_*`): debit fee → vesting; `expires_at_height += REGISTRATION_PERIOD`; account remains legacy-locked until `ClaimLegacy`.
   - Unfunded: leftover balance → vesting; account **deleted**; name free for ordinary `RegisterUsername` / `RegisterGroup`.
   - MUST NOT return `LegacyLocked` solely because `legacy.status = locked`.

3. **Miner enqueue.** `names_due_for_settle` MUST NOT skip `is_legacy_locked()`.

4. **ClaimLegacy.** Unchanged except: after claim, `expires_at_height` continues the same clock (claim MUST set `expires_at_height = max(height, current_expires) + REGISTRATION_PERIOD` or equivalent so a mid-period claim does not erase prepaid time — implementers MUST document the chosen formula in spec 15; default: `height + REGISTRATION_PERIOD` as today is ACCEPTABLE for v1 if import already started the clock).

5. **Network `guld`.** Unchanged — still never settled.

6. **Spec 15 §5.3.** After a legacy name is **released** by settle, fresh registration of that string MUST be allowed (existence check only). The “reject any import-manifest name forever” rule is **RETIRED**.

7. **Activation.** On Simba, shipped via **regenesis** (task 007 D1 / [026](../tasks/done/2026-09/026-simba-regenesis-gip-27.md)). **Simba tip is now locked — no further resets**; later incompatible changes MUST use a new named testnet or a height-activated rule bundle ([spec 17](../specs/17-protocol-upgrades.md)). On any live tip that already imported `NEVER_EXPIRES` locked rows without regenesis, activate via rule bundle: at `activation_height`, rewrite locked accounts with `expires_at_height = activation_height + REGISTRATION_PERIOD` (or `max(expires, …)` if already finite).

### Explicit non-goals

- Burning or confiscating balances **before** an overdue unfunded settle.
- Removing `ClaimLegacy` or attestation/PGP profiles.
- Changing `F_user(L)` / letter table ([GIP-9](gip-9.md)).
- Special VIP lists (no forever-free `satoshi` carve-out).

## Rationale

**Full parity (this GIP)** beats renew-only-while-locked: renew-only would still park scarce names forever for anyone who can scrape together `F_*` once a year without ever claiming keys — and leaves markets asking when reclaim happens.

**Balances “intact”** means intact under the same rules as everyone else: settle may debit `F_*` from the imported balance, and unfunded settle may recycle leftover dust. That is not a special clawback of 1.0 coins; it is DNS-style lease failure.

**Short remaps** (`y`, etc.) correctly face L-based pricing. If the imported balance cannot fund a year, the name returns to the commons unless the holder claims and tops up during the first period — aligning scarcity with willingness to pay.

## Backwards Compatibility

- Amends Accepted [GIP-11](gip-11.md) decision “Legacy 1.0: settle skips legacy-locked.”
- Amends [GIP-14](gip-14.md) / spec 15 §9 “locked forever is accepted.”
- Requires genesis artifact rewrite (new tip / state root) on Simba, or a rule-bundle migration on a durable tip.
- FAQ / [legacy-distribution](../fragments/legacy-distribution.md) “effectively out of circulation” heuristic for long-unclaimed Equity reservations becomes **false** once the first settle period elapses without funding.

## Security Considerations

- **Supply narrative:** unfunded settles move dust to the miner vesting queue (same as ordinary abandonments) — disclose in beta/mainnet notes so “legacy overhang” is not mistaken for a silent unlock of spend authority.
- **Attestation DoS:** isysd remains the unbound unlock path; this GIP does not add claim timeouts. Diversification stays [GIP-25](gip-25.md).
- **Top-ups:** transfers **to** a locked name remain allowed so sponsors or the holder (via another claimed wallet) can fund renewals before claim.

## Reference Implementation

- Epic: [022-legacy-settle-parity.md](../tasks/done/2026-09/022-legacy-settle-parity.md) (**done**)
- Children: [023](../tasks/done/2026-09/023-legacy-settle-state.md)–[027](../tasks/done/2026-09/027-legacy-parity-comms.md)
- Tip: `0xf4cdc0172082485ae7b77879aedb1706d9bd7fe3da972409a15e415a3638beb4`

## History

- 2026-09-27: Accepted — protocol owner decision during Simba beta readiness (attestations outreach + retire indefinite legacy name privilege).
- 2026-09-27: Final — code + Simba tip `0xf4cdc017…` + specs/comms (tasks 022–027).
