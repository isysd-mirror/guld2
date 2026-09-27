# Task: Publish omitted buckets + negative-balance appendix

Status: done
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
4. Optionally extend manifest schema with an `omissions` / `negatives` object (non-consensus metadata) — only if ceremony [012](../open/012-simba-genesis-ceremony.md) is already regenerating artifacts.

## Non-goals

- Importing ERC20 into consensus state.
- Changing negative treatment (remain 0) without a new Standards GIP.

## Done when

- [x] Omitted bucket sizes published — [`omissions.json`](../../../data/genesis/simba/omissions.json) + brief §7 (`guld:Assets:ERC20` = 100,000; credit subtrees = 2×1,000)
- [x] Negative appendix committed and linked — [`negatives.json`](../../../data/genesis/simba/negatives.json) (15 names, sum −1,028.2) + brief §4.1
- [x] Spec 15 “appendix” promise satisfied for Simba

## Notes

```
2026-09-26: Opened from external review under-disclosure items 10–11.
2026-09-26: Negatives are registration-fee residue, not transfers-gone-wrong.
           All 15 negative *:Assets roots come from register individual/group
           txs that debited Assets → Expenses:guld:register without enough
           prior balance. Pattern:
             - Groups (spartan −1000, hodlmybeer −25, 300e −2): paid full
               group fee, got 90% fee-rebate, left with 10% of fee as permanent
               Assets hole (started at 0).
             - Individuals with 1 GULD fee + 0.9 rebate (mozilla1, w1ll1am, ira):
               same 10% residue → −0.1.
             - Individuals with 0.1 GULD fee and no rebate (annawanderer, ayayay,
               babybeatrice, defrancod, ganguskhan, hnathan, jaimec,
               lucerogray94, melmanci): single register tx → −0.1.
           Off-Assets books still show Expenses:register and (when present)
           Income:guld:register:fee-rebate; guld:Income:register:* mirrors the
           protocol side. Import rule max(0, Assets) → these names get 0 on 2.0
           and keep the name for ClaimLegacy. See task 016 for interaction with x.
2026-09-26: Closed — committed negatives.json + omissions.json; linked from
           genesis README, GIP-24, spec 15, and legacy-distribution brief.
           Manifest schema left unchanged (sidecar disclosure files; non-consensus).
```
