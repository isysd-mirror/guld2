# Task: Implement Merkle roots + activate on Simba

Status: open  
Priority: **high**  
GIP: [35](../gips/gip-35.md) **Accepted**  
Spec: ../specs/06-blocks-and-consensus.md §2.1a, ../specs/17-protocol-upgrades.md  
Depends: [043](../done/2026-09/043-merkle-tx-receipt-roots-gip.md) **done**; [042](../done/2026-09/042-rule-bundle-upgrade-e2e.md) green  
Related: ../gips/gip-26.md, ../done/2026-09/009-bare-wire-implementation.md, ../research/external-code-review-beta.md, ./055-simba-single-rule-bundle.md  

## Problem

After [043](../done/2026-09/043-merkle-tx-receipt-roots-gip.md) / [GIP-35](../gips/gip-35.md) specifies the tree, reference code must:

1. Compute **both** interim and Merkle roots, selecting by height / active rules.  
2. Reject wrong-scheme roots on import (`BadRoots`).  
3. Prove the cutover on a disposable mesh ([042](./042-rule-bundle-upgrade-e2e.md)), then **schedule Merkle roots inside the single Simba Core catch-up bundle** ([055](./055-simba-single-rule-bundle.md)) — not a solo live activation.

Simba is the intended first production activation: community-visible, reversible only by fork choice / heavier honest chain — not by regenesis.

## Goals

### Code

1. `guld-consensus`: `tx_root` / `receipt_root` (and seal/import) branch on schedule height; keep interim for `h < H`.  
2. Leaf bytes: match GIP (BARE preferred for txs).  
3. **GIP-26 vectors** in Rust + `@guld/js` for both algorithms + activation boundary cases.  
4. Node seal + P2P import use `rules.hash_at(height)` **and** root scheme for that height.  
5. Rule bundle / CAS: publish next manifest with `activation_height = H` (Simba: recommend comfortable margin once tip is known; disposable nets use tiny `H`).

### Test ladder

| Step | Where | Assert |
|------|--------|--------|
| Unit | `guld-consensus` | Merkle vs interim digests; odd/even leaves; empty |
| Goldens | GIP-26 | Cross-language match |
| Disposable e2e | [042](./042-rule-bundle-upgrade-e2e.md) | Miner split around `H`; wrong-scheme blocks rejected; peers resync |
| Simba activation | Operator + validating peers | Bundle published; binaries upgraded before `H`; post-`H` tip carries Merkle roots; lagging peers catch up or stall safely until upgrade |

### Ops / docs

- [SIMBA_BETA.md](../SIMBA_BETA.md) / [deploy/SIMBA.md](../../deploy/SIMBA.md): upgrade notice template (binary version, `H`, old vs new `guld_rules_hash`).  
- Specs README matrix: roots row + upgrades row updated.

## Non-goals

- Simba regenesis / tip wipe.  
- Changing historical block bytes for `h < H`.  
- AuxPoW or other header redesigns.

## Done when

- [x] Dual-path seal/import green; interim preserved below `H`  
- [x] GIP-26 vectors (Rust + JS) for Merkle roots + boundary  
- [x] Disposable upgrade e2e passes with **root-scheme change** as the observable rule delta (or alongside fee delta) — satisfies / extends [042](./042-rule-bundle-upgrade-e2e.md)  
- [x] Simba: next bundle published with agreed `H=4444`; dual schedule live — **post-activation tip verify still open** ([055](./055-simba-single-rule-bundle.md))
- [x] Docs + specs matrix updated; external-review P0 item closable *(ops notice filled in [deploy/SIMBA.md](../../deploy/SIMBA.md))*

## Suggested entry points

- `src/guld-consensus/src/lib.rs` — `tx_root` / `receipt_root` / `import_block`  
- `src/guld-cas/src/rules.rs` — schedule / manifest fields  
- `schemas/guld/v1/vectors/` — GIP-26  
- `src/guld-node/tests/` — extend rule-bundle upgrade test  

## Notes

```
2026-09-29: Opened — implement + Simba height-activate Merkle roots;
           042 is the dry-run; live cutover rides [055](./055-simba-single-rule-bundle.md) with other Core GIPs.
2026-09-29: Dual-path code landed (`RootScheme`, seal/import, `root_scheme` in rules).
           [GIP-35](../gips/gip-35.md) Accepted. Remaining: GIP-26 goldens (Rust+JS) + Simba H.
2026-09-29: GIP-26 `merkle_roots.jsonl` (empty/single/even/odd) + Rust verify + `@guld/js`
           `wire/merkle.js`; rule_bundle_upgrade asserts published manifest `root_scheme=merkle_v1`.
           Specs matrix + GIP-26 layout updated. Live Simba publish: H=4444 via [055](./055-simba-single-rule-bundle.md)
           (new digest 0xcde6a320…d4d1). Remaining: post-H tip verify.
```
