# Task: Fuzz / property tests for apply + import

Status: **done**  
Priority: normal  
GIP:  
Spec: ../specs/05-state.md, ../specs/06-blocks-and-consensus.md  
Related: ../research/external-code-review-beta.md (P2 #10), ../done/2026-09/006-chain-lifecycle-tests.md  

## Problem

Lifecycle + goldens cover happy/adversarial miner paths, but there is no systematic **fuzz** or property suite on `guld-state` apply and `guld-consensus` `import_block` (malformed txs, weight limits, root mismatches, mempool size caps). Production L1 expectations include this class of testing.

## Done when

- [x] Choose harness (`cargo fuzz`, `proptest`, or structured random tx/block builder) — **`proptest`**  
- [x] Coverage targets: apply rejection invariants; import `BadRoots` / `BadDifficulty` / weight; mempool / P2P size caps documented + tested  
- [x] Document how to run locally; optional pre-commit or nightly skip flag — `GULD_SKIP_PROP=1`  
- [x] At least one CI-friendly smoke fuzz budget (seconds, not hours) — 24–32 cases default  

## Non-goals

- Formal verification  
- Full adversarial P2P DoS simulation (separate; see [032](../open/032-p2p-mesh-robustness-phase-b.md))  

## Notes

```
2026-09-29: Opened from external-code-review-beta finding 10.
2026-09-29: Done — proptest suites:
           cargo test -p guld-state --test prop_apply
           cargo test -p guld-consensus --test prop_import
           mempool TooHeavy; guld-p2p wire_size_caps_documented;
           pre-commit Prop gate + GULD_SKIP_PROP; crate READMEs.
           Longer: PROPTEST_CASES=256 …
```
