# Task: Leaf materialize path (JS SDK + reference dapp)

Status: done  
Priority: normal  
Spec: [`../../specs/11-leaf-host.md`](../../specs/11-leaf-host.md) (§8 v1 reference)  
Research: [`../../research/polyglot-sdk-packages.md`](../../research/polyglot-sdk-packages.md) (**Accepted**), [`../../research/reference-dapp.md`](../../research/reference-dapp.md)  
Depends: [`036-guld-js-sdk.md`](036-guld-js-sdk.md), [`037-guld-tic-tac-toe.md`](037-guld-tic-tac-toe.md)

## Problem

L0 stores tips only. Clients need a way to **materialize** a named home (fetch tree bytes matching `master_hash`, read files, optionally assist `UpdateMaster`). Spec 11 drafts a full leaf-host HTTP service; that remains valid later.

**Agreed delivery route (2026-09-27):** do **not** start with `guld-node --leaf-host`. Instead ship JS SDK + reference dapp, prove tips on testnet, cite Spec 11.

## Expected functionality

| Capability | Status |
|------------|--------|
| Resolve name → `master_hash` | SDK client |
| Materialize / hash home tree | `@guld/js` leaf + ttt `auditGameTip` |
| Read board / leaf files | `/demo/ttt/` + packaged `game/` |
| Advance tip on-chain | 1-of-2 `UpdateMaster`; faucet-ensured `ttt-demo` |
| Rust `guld-node --leaf-host` | Out of scope (Spec 11 draft HTTP) |

## Done when

- [x] `@guld/js` leaf layer enough for the dapp ([036](036-guld-js-sdk.md))
- [x] Reference ttt package + site demo ([037](037-guld-tic-tac-toe.md))
- [x] Testnet e2e: register / faucet-ensure → move tips → materialize/audit `state.json` (`guld-tic-tac-toe` e2e; optional `GULD_SIMBA_LIVE=1`)
- [x] Spec 11 §8 cites JS SDK + demo as v1 reference
- [x] Task → `done/2026-09/`

## Non-goals

- Full Spec 11 HTTP surface in Rust
- Python leaf-host daemon
- Replacing wallet send/register flows

## Notes

```
2026-09-27: Placeholder for whitepaper gap (Rust --leaf-host assumed).
2026-09-27: Retargeted — agreed JS SDK + tic-tac-toe reference dapp route.
2026-09-27: 036 + 037 archived in-tree; 033 remains for Simba e2e + spec cite.
2026-09-27: Closed — 1-of-2 ttt-demo faucet ensure; e2e auditGameTip; Spec 11 §8;
            live Simba needs faucet peer upgrade then GULD_SIMBA_LIVE=1.
```
