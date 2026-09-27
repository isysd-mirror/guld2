# Task: Extension site-login (dapp challenge)

Status: done  
Priority: low (after threshold Transfer + GIP-27)  
Spec: [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §10  
GIP: [`../../gips/gip-5.md`](../../gips/gip-5.md)  
Surface: `guld-extension` + dapp sample

## Problem

Extension can hold keys and send. **Site-login** (dapp presents challenge → extension signs under registered key → dapp verifies via node account lookup) is the next §1.4 identity step.

## Done when

- [x] Challenge / response format documented beside spec 14 (§10.1)
- [x] Extension signs site-login challenges with user confirm
- [x] Minimal HTML dapp demo verifies signature against on-chain pubkey
- [x] Task → `done/2026-09/`

## Notes

```
2026-09-27: Documented from whitepaper §12.2; implement after cosign spend.
2026-09-27: Format frozen — guld1loginreq / guld1login, tag guld/site_login/v1 (spec 14 §10.1).
2026-09-27: Implemented — extension guld_login + confirm UI; /demo/login/ verify path.
```
