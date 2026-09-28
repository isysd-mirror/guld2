# Task: Mainnet genesis ceremony + import audit

Status: open  
Priority: normal (before mainnet; not Simba beta blocker)  
GIP: [`../../gips/gip-14.md`](../../gips/gip-14.md)  
Spec: [`../../specs/15-ledger-import.md`](../../specs/15-ledger-import.md)  
Depends: GIP-27 Simba regenesis ([026](../done/2026-09/026-simba-regenesis-gip-27.md)) SHOULD land first so mainnet inherits settle parity

## Problem

Simba has a committed genesis and tip pin. **Mainnet** still needs a locked import manifest audit, `data/networks/main.json` (or equivalent), faucet off, and a published ceremony — whitepaper §12.4 item 1–2.

## Done when

- [ ] Manifest re-audit vs 1.0 ledger rules; `x` and pin published
- [ ] Mainnet network descriptor locked; faucet disabled in main config
- [ ] Ceremony notes in deploy / FAQ; whitepaper §12.2 mainnet row closed
- [ ] **Genesis `timestamp`:** height-0 / `params.json` MUST use real ceremony UTC (not post-dated). Lesson from Simba ([040](./040-simba-genesis-timestamp-retarget.md)) — a future-stamped block 0 skews the first 2016-block difficulty retarget.
- [ ] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Opened from whitepaper gap review.
2026-09-28: From [040] — do not post-date genesis; Simba first retarget was skewed and will not be regenerated.
```
