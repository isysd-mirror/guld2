# Task: Bootstrap guld-js SDK (wire → crypto → client)

Status: done  
Priority: normal  
GIP: [`../../gips/gip-26.md`](../../gips/gip-26.md) (vectors stretch)  
Research: [`../../research/polyglot-sdk-packages.md`](../../research/polyglot-sdk-packages.md) (**Accepted**)  
Depends: [`032-gip-26-non-rust-vectors.md`](032-gip-26-non-rust-vectors.md) (partially satisfies)  
Unblocks: [`033-leaf-host-materialize.md`](033-leaf-host-materialize.md), [`037-guld-tic-tac-toe.md`](037-guld-tic-tac-toe.md)

## Problem

Polyglot research accepted a layered JS SDK under `src/guld-js/` for dapps, scripts, and leaf tooling. That package also hosts the GIP-26 JS golden-vector consumer ([032](032-gip-26-non-rust-vectors.md) **done**; GIP-26 **Final**). The reference PWA (`src/js/`) and `guld-extension` are separate **apps** — they stay put; they MAY later import `@guld/js` instead of duplicating helpers.

## Done when

- [x] `src/guld-js` is a Node≥20 ESM package (`@guld/js`) with layers: hex, crypto, wire, client, cosign, site-login, tx, leaf
- [x] Wire verifies all GIP-26 JSONL vectors (`tx_id`, `header_pow`, `difficulty`, `timestamp`) via `npm test` / bin
- [x] Robust unit tests for crypto (incl. site-login golden), cosign, tx builders, HTTP client mocks, leaf HomeTree
- [x] README documents imports + vector runner; [`PACKAGES.md`](../../PACKAGES.md) updated
- [x] Pre-commit runs `npm run verify-vectors` when schemas / wire / consensus / guld-js staged
- [x] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Accepted polyglot-sdk-packages.md; JS first (app uses JS); tic-tac-toe dapp later.
2026-09-27: Finished SDK layers + expanded tests (40 cases). Apps (PWA/extension) are not part of this package.
2026-09-27: Archived — package in tree.
```
