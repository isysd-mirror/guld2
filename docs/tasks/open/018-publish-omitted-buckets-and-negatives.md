# Task: Publish omitted buckets + negative-balance appendix

Status: open
Priority: normal
GIP: ../gips/gip-24.md, ../gips/gip-14.md
Spec: ../specs/15-ledger-import.md §2
Genesis: ../../data/genesis/simba/

## Problem

Spec 15 says:

- ERC20 / protocol mirror buckets are **omitted** (“barely used”) — **size not published**
- Negative `Assets` names (~15, sum ≈ −1,028) import as **0**, with an **appendix** — **not present** in the committed Simba manifest JSON (keys: `version`, `rows`, `manifest_hash` only)

GIP-24 requires these disclosures for an honest distribution brief.

## Goals

1. Measure omitted ERC20 (and any other skipped) bucket totals from `archives/ledger-guld` (or export tooling) and publish GULD amounts.
2. Commit `data/genesis/simba/negatives.json` (or section in README) listing negative names, amounts, and treatment.
3. Link from genesis README + GIP-24 brief.
4. Optionally extend manifest schema with an `omissions` / `negatives` object (non-consensus metadata) — only if ceremony [012](./012-simba-genesis-ceremony.md) is already regenerating artifacts.

## Non-goals

- Importing ERC20 into consensus state.
- Changing negative treatment (remain 0) without a new Standards GIP.

## Done when

- [ ] Omitted bucket sizes published
- [ ] Negative appendix committed and linked
- [ ] Spec 15 “appendix” promise satisfied for Simba

## Notes

```
2026-09-26: Opened from external review under-disclosure items 10–11.
```
