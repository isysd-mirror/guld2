# Task: Reference dapp — guld-tic-tac-toe

Status: done  
Priority: normal  
Research: [`../../research/reference-dapp.md`](../../research/reference-dapp.md)  
Depends: [`036-guld-js-sdk.md`](036-guld-js-sdk.md), [`033-leaf-host-materialize.md`](033-leaf-host-materialize.md)

## Problem

Need a teachable leaf dapp that exercises `@guld/js` (client / leaf / cosign): register a group name, advance tips with moves in `state.json`, materialize and audit the board.

## Done when

- [x] Submodule + bare `repos/guld-tic-tac-toe.git` / `src/guld-tic-tac-toe`
- [x] Pure rules + home tip hashing + packaged `game/` UI
- [x] Site demo at `/demo/ttt/`
- [x] Unit tests (`npm test` in package)
- [x] Task → `done/YYYY-MM/`

## Follow-on (not blocking archive)

- Simba / testnet e2e: 1-of-2 register → `UpdateMaster` → materialize/audit ([033](033-leaf-host-materialize.md); faucet auto-ensures `ttt-demo`)

## Notes

```
2026-09-27: Scaffolded package + local demo; chain cosign wiring remaining.
2026-09-27: Package + /demo/ttt/ in tree; archived. Live Simba cosign e2e → 033 follow-on.
```
