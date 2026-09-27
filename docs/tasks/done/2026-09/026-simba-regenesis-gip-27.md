# Task: Simba regenesis for GIP-27

Status: done
Priority: **high**
GIP: ../../gips/gip-27.md
Spec: ../../specs/15-ledger-import.md, ../../specs/17-protocol-upgrades.md
Genesis: ../../../data/genesis/simba/
Epic: [022](./022-legacy-settle-parity.md)
Depends: [023](./023-legacy-settle-state.md), [024](./024-legacy-import-expiry.md), [025](./025-gip-27-specs-sync.md)
Related: ./012-simba-genesis-ceremony.md

## Problem

Live Simba tip was built with `NEVER_EXPIRES` locked imports. GIP-27 activation on Simba is **regenesis** (one more reset OK), not a mid-tip migration.

## Goals

1. Rebuild genesis artifacts so every legacy-locked import has `expires_at_height = REGISTRATION_PERIOD`.
2. New committed tip / state root / params as needed; update `data/genesis/simba/README.md` and pin docs (`SIMBA_BETA`, deploy/SIMBA).
3. `simba_genesis_smoke` asserts finite expiry on a sample locked import (e.g. not `u64::MAX`) and still pins network/chainId.
4. Announce reset: prior tip obsolete; claim/renew clock starts at new height 0.
5. Optional appendix: if a durable tip ever needed mid-chain activation, sketch rule-bundle rewrite (spec 17) — **not** required for Simba if regenesis ships.

## Non-goals

- Mainnet ceremony.
- Changing manifest balances / remaps (016 already done) unless rebuild tooling requires a no-op regen.

## Done when

- [x] New Simba tip committed; smoke + pre-commit genesis gate green
- [x] Operators told tip changed (beta page / deploy notes)
- [x] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Split from 022. Follow 012 ceremony tooling where possible.
```
