# Intent: Registration fee vesting (8 blocks)

Status: accepted · implemented  
**Related:** [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md), [`../specs/06-blocks-and-consensus.md`](../specs/06-blocks-and-consensus.md), whitepaper §3.3 / §8.7

## Problem

If the full registration / settle protocol fee `F_*` (or release dust) is credited to the **including** block's miner in one shot, a miner can register (or settle) a name in a block they mine and **recover the entire fee** as coinbase in that same block — netting nearly free names aside from opportunity cost / inclusion weight.

## Rule

```text
REGISTRATION_FEE_VEST_BLOCKS = 8
```

When a tx debits protocol fee `R` (register, funded settle, or unfunded settle dust):

1. Payer (or released account) is debited `R` at apply time (unchanged).
2. Consensus schedules `R` across heights `H .. H+7` where `H` is the including block height.
3. Integer split: `base = R / 8`, remainder `R % 8` added +1 to the earliest shares.
4. Each block's coinbase includes only that height's vested bucket (plus subsidy + inclusion fees).

Recovering the **full** `R` therefore requires winning **8 consecutive** blocks. Inclusion fees remain paid entirely to the including miner (weight market unchanged). Fees are still transfers to miners — not burned.

## Non-goals

- Spreading inclusion (weight) fees
- Changing `F_*` amounts or letter tables
- Header field for vested totals (deterministic from state + receipts)
