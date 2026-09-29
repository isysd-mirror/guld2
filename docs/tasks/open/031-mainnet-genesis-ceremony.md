# Task: Mainnet genesis ceremony + import audit

Status: open  
Priority: normal (before mainnet; not Simba beta blocker)  
GIP: [`../../gips/gip-14.md`](../../gips/gip-14.md)  
Spec: [`../../specs/15-ledger-import.md`](../../specs/15-ledger-import.md)  
Depends: GIP-27 Simba settle parity ([026](../done/2026-09/026-simba-regenesis-gip-27.md)); attestation cosigners track ([045](./045-gip-25-attestation-cosigners.md)) for unbound ClaimLegacy posture at launch

## Problem

Simba has a committed genesis and tip pin. **Mainnet** still needs a locked import manifest audit, `data/networks/main.json` (or equivalent), faucet off, and a published ceremony — whitepaper §12.4 item 1–2.

## Done when

- [ ] Manifest re-audit vs 1.0 ledger rules; `x` and pin published
- [ ] Mainnet network descriptor locked; faucet disabled in main config (**profile already `mode: mainnet` → faucet off** — reconfirm at ceremony; [054](../done/2026-09/054-faucet-registrar-hardening.md))  
- [ ] Ceremony notes in deploy / FAQ; whitepaper §12.2 mainnet row closed
- [ ] **Genesis `timestamp`:** height-0 / `params.json` MUST use real ceremony UTC (not post-dated). Lesson from Simba ([040](./040-simba-genesis-timestamp-retarget.md)) — a future-stamped block 0 skews the first 2016-block difficulty retarget.
- [ ] **Attestation:** mainnet unbound ClaimLegacy MUST NOT be sole-`isysd` forever — at least **some** GIP-25 cosigners live at or before launch ([045](./045-gip-25-attestation-cosigners.md)); roster selection is community process  
- [ ] **Security-budget messaging:** ceremony / FAQ / launch notes use [security-budget blurb](../../fragments/security-budget.md) — solo SHA256d; AuxPoW later optional; **no** “Bitcoin-class security” claims ([053](../done/2026-09/053-mainnet-security-budget-messaging.md))  
- [ ] **Faucet / registrar ops:** run [faucet-registrar-hardening](../../fragments/faucet-registrar-hardening.md) checklist on bootstrap host; faucet stays off on main  
- [ ] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Opened from whitepaper gap review.
2026-09-28: From [040] — do not post-date genesis; Simba first retarget was skewed and will not be regenerated.
2026-09-29: From [053] — fold security-budget / solo-PoW messaging into ceremony checklist.
2026-09-29: From [054] — faucet already off on main profile; hardening checklist linked.
```
