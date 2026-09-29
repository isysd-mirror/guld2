# Task: E2E rule-bundle upgrade with miner split → consensus → resync

Status: done  
Priority: **high** (spec 17 completeness — mainnet / durable-testnet blocker per [external review](../../research/external-code-review-beta.md) P0)  
GIP: (pair with any rules-change GIP under test; procedure is [spec 17](../../specs/17-protocol-upgrades.md))  
Spec: ../../specs/17-protocol-upgrades.md, ../../specs/06-blocks-and-consensus.md, ../../specs/08-cas-and-homes.md, ../../specs/09-p2p.md  
Related: ./019-dual-miner-reorg-integration-test.md, ./006-chain-lifecycle-tests.md, ./029-sync-fork-catchup.md, ./043-merkle-tx-receipt-roots-gip.md, ../../open/044-merkle-roots-implement-simba-activate.md, ../../open/055-simba-single-rule-bundle.md  

## Problem

Spec 17 defines height-activated **rule bundles** (`activation_height`, `previous_rules_hash`, header `guld_rules_hash`). `RulesSchedule` and import/Hello `BadRulesHash` checks exist, but there was **no** multi-peer e2e that proved the full social + consensus loop until this task shipped.

## Delivered

1. Integration test: `cargo test -p guld-node --test rule_bundle_upgrade`  
2. `guld_publishRulesUpgrade` RPC + keyless `guld` `UpdateMaster` + Datadir schedule reload  
3. Spec 17 §5.1–§5.2  
4. Specs README matrix: protocol upgrades → **yes** (e2e)

## Done when

- [x] Publish→activate schedule works end-to-end on a multi-node disposable chain  
- [x] Tip `guld_rules_hash` switches at `H`; seal uses `hash_at(height)` (wrong digest → `BadRulesHash`)  
- [x] Late peer joins during publish→activate window, catches tip without ban  
- [x] Observable delta: tip digest switch + upgrade manifest letter-fee bump  
- [x] Spec 17 + matrix updated  

## Notes

```
2026-09-29: Opened — prove spec 17 under adversarial miner split + catch-up.
2026-09-29: Gate for 055 — one live Simba Core bundle after this e2e is green.
2026-09-29: Done — e2e green; archived.
```
