# Task: GIP-26 Final — non-Rust golden vector consumer

Status: done  
Priority: normal (raise to high before mainnet)  
GIP: [`../../gips/gip-26.md`](../../gips/gip-26.md)  
Depends: [`021-consensus-golden-vectors.md`](021-consensus-golden-vectors.md)

## Problem

GIP-26 is **Accepted** with Rust + pre-commit consuming consensus vector JSONL. **Final** requires at least one non-Rust consumer (JS or Python) so multi-impl credibility is not single-stack theater.

## Done when

- [x] JS and/or Python runner verifies the published vector set in CI or pre-commit
- [x] GIP-26 status → Final
- [x] Task → `done/2026-09/`

## Notes

```
2026-09-27: Tracked from 021 stretch / whitepaper §12.4.
2026-09-27: JS runner in src/guld-js (`npm run verify-vectors`); pre-commit runs it when schemas/ or guld-{wire,consensus,js} staged.
2026-09-27: GIP-26 → Final; docs consistency pass.
```
