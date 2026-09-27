---
gip: 22
title: Deferred miner rewards (ClaimReward)
description: Commit rewards at PoW height; mint via pre-signed ClaimReward after 100-block maturity.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Core
created: 2026-09-26
requires: 10
---

## Abstract

Replace implicit `credit_miner()` coinbase accounting with an explicit two-step reward path: each block **commits** its reward terms at height `h`, and a separate **`ClaimReward`** transaction **mints** to the beneficiary only after **`h + COINBASE_MATURITY_BLOCKS`**. Claims MAY sit in the mempool immediately; **block inclusion** is maturity-gated. Miners pre-sign claims (with `inclusion_fee`) at seal time, often via a dedicated subaccount.

## Motivation

Spec 06 §4 locks **100-block coinbase maturity** (Bitcoin `COINBASE_MATURITY`) so miners cannot spend issuance from block `B` before `B` is buried — otherwise an orphaning fork double-spends rewards. Pre-GIP-22 implementations called `credit_miner()` and credited spendable balance immediately; that path is **removed** (task 020).

Problems with the implicit path:

1. **Reorg complexity** — credits at `h` must be clawed back if block `h` orphans before reorg support exists.
2. **Opacity** — rewards are not a first-class tx in the block body or explorer.
3. **Ad-hoc state** — immature-balance bookkeeping parallels the normal tx apply path.

**ClaimReward** keeps orphan safety without immediate mint: if block `h` never reaches depth 100 on the main chain, no claim is valid and **no supply is issued** for that block. Maturity is a **consensus inclusion rule**, not a mempool ban — claims SHOULD propagate during the waiting period so they are ready to mine the moment they mature.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Constants

| Name | Value | Note |
|------|-------|------|
| `COINBASE_MATURITY_BLOCKS` | **100** | Same as spec 06 §4 / spec 07 §5 |
| `REWARD_COMMIT_INDEX` | **0** | First tx in every block body |

### Overview

```text
Height h (miner wins PoW):
  txs[0] = RewardCommit { … }     // mandatory; commits amount + beneficiary
  txs[1..] = user txs
  miner MAY pre-sign ClaimReward { ref_height: h, … } and broadcast it

Mempool (any height ≥ h while h is on main chain):
  ClaimReward MAY be accepted, validated, relayed, and retained locally

First valid inclusion block height = h + COINBASE_MATURITY_BLOCKS (Bitcoin-class):
  ClaimReward for block h MAY appear in block txs[1..] at height h + 100
  → mints commit amount to beneficiary; claim inclusion_fee → that block's miner

Block height < h + COINBASE_MATURITY_BLOCKS:
  ClaimReward MUST NOT be included
```

### `RewardCommit` (block-embedded, height `h`)

**Placement:** MUST be `block.txs[REWARD_COMMIT_INDEX]`; exactly **one** per block. MUST NOT originate from mempool.

```text
RewardCommit {
  version: u8,                    // 1
  miner: Name,                    // MUST match header.miner
  beneficiary: Name,              // payee (MAY be miner subaccount, e.g. alice.rewards)
  amount: Amount,                 // quanta minted when claim succeeds
  claim_signature: SignatureBytes // over claim binding (see below)
}
```

**Amount (consensus-critical):**

```text
amount = subsidy(h) + inclusion_fees + vested_registration_fees(h)
```

where `inclusion_fees` is the sum of user-tx inclusion fees in the same block (header field MUST match, as today).

**Weight:** `RewardCommit` MUST NOT count toward `BLOCK_WEIGHT_LIMIT` (or counts as 0 weight — pick one at implementation freeze).

**Effects at apply:** MUST NOT credit `beneficiary` balance. MUST record commitment so a matching `ClaimReward` can be verified later (exact storage: implementation detail; MAY be derivable from chain history + tx bytes).

**Claim binding:** `claim_signature` MUST be a signature by `beneficiary`’s spending key (threshold-1 MVP: `keys[0]`) over:

```text
guld/claim_reward/bind/v1
  ref_height: u64
  ref_hash: Hash32        // block_hash of block h
  beneficiary: Name
  amount: Amount
```

Miners SHOULD use a **dedicated subaccount** (`parent.rewards`) so block attribution (`header.miner`) does not require exposing the main account signing key.

### `ClaimReward` (mempool + mature inclusion)

```text
ClaimReward {
  version: u8,
  ref_height: u64,
  ref_hash: Hash32,
  beneficiary: Name,
  amount: Amount,
  inclusion_fee: Amount,
  signature: SignatureBytes   // same message as RewardCommit.claim_signature
}
```

**Validity (structural — mempool and block):**

1. `ref_height` / `ref_hash` MUST identify a block on the **current best chain** (ancestor of tip).
2. That block’s `RewardCommit` at index 0 MUST match `beneficiary`, `amount`, and `claim_signature`.
3. `signature` MUST verify under `beneficiary` on the claim binding message.
4. **No double-claim:** MUST NOT apply if this reward was already claimed (consensus tracks spent commitments per `ref_hash` or `(ref_height, ref_hash)`).
5. `inclusion_fee` MUST satisfy relay floor: `inclusion_fee ≥ weight(ClaimReward) × fee_rate_min` (unlike `SettleRegistration`, claims are fee-paying).

**Mempool policy:**

- Nodes **MAY** accept and retain `ClaimReward` as soon as (1)–(4) hold — **including** before `ref_height + COINBASE_MATURITY_BLOCKS` is reached on the chain.
- Nodes **SHOULD** persist pending claims across restarts (see task [008](../tasks/done/2026-09/008-mempool-persistence.md)).
- Miners **SHOULD** retain roughly **`COINBASE_MATURITY_BLOCKS`** pending claims (one per immature block they mined).

**Block inclusion (consensus):**

Let `B` be the block under construction (`B.height` is the height being formed). `ClaimReward` for `ref_height = h` is valid in `B` iff:

```text
B.height >= h + COINBASE_MATURITY_BLOCKS
```

(Bitcoin `COINBASE_MATURITY` semantics: reward from block **h** is first claimable in block **h + 100**, not h + 101.)

When applied in block `B`:

1. **Mint** `amount` to `beneficiary.balance` (fulfills block **h**’s `RewardCommit`).
2. **Inclusion fee:** `ClaimReward.inclusion_fee` is treated like any other tx in **B** — it MUST be summed into `B`’s `inclusion_fees` and accrues to **`B.header.miner`** (the miner who included the claim at height **h + 100**), not the miner of block **h**. It MUST NOT be folded into block **h**’s `RewardCommit`.

**Clarification:** Maturity gates **inclusion**, not **mempool presence**. Blocking early relay only hurts propagation before maturity.

### Block validity changes

Replace spec 06 checks that compare implicit coinbase to:

1. `txs[0]` is `RewardCommit` with correct `amount` and `miner`.
2. User txs follow; roots and weight unchanged aside from `RewardCommit` weight rule.
3. Remove standalone `credit_miner()` after tx loop — mint happens only via mature `ClaimReward`.

### Issuance timing

Nominal schedule `subsidy(h)` (spec 07 §6) is defined at PoW height **`h`**, but **on-chain supply increases when the claim is included**, typically near **`h + COINBASE_MATURITY_BLOCKS`**. Macro economics remain anchored to the commit amount at `h`; supply lags by ~100 blocks.

### Miner operations (non-normative)

- Pre-sign `ClaimReward` with `inclusion_fee` at seal time when keys are available.
- Pre-signed fee is a bet on the fee market ~100 blocks later; miners and allied operators often include each other’s claims — the including miner receives the fee.
- Persist claims locally; rebroadcast after reconnect (mempool persistence task).

## Rationale

### vs mandatory coinbase credit (Bitcoin-style)

| Topic | Immediate coinbase | Deferred claim (this GIP) |
|-------|-------------------|---------------------------|
| Orphan before maturity | Must unwind mint on reorg | No mint yet — claim never valid |
| Maturity enforcement | Immature balance lots on `Transfer` | Inclusion rule on `ClaimReward` |
| Mempool | N/A | Pending pool; mature-ready at `h+100` |
| Supply timing | At `h` | At claim inclusion (~`h+100`) |
| Block body | `Coinbase` tx[0] credits immediately | `RewardCommit` tx[0] commits only |

Deferred claim was chosen for Simba v1 to **avoid issuance clawback before reorg exists**, while keeping rewards as explicit txs and pushing operational burden to miners (same as PoW).

### vs blocking claims from mempool until maturity

Early acceptance improves propagation on small networks. Consensus already prevents premature inclusion; mempool admission adds no safety by waiting.

### Dedicated subaccount

Separates block `header.miner` identity from payout keys — limited exposure while mining.

## Backwards Compatibility

- **Wire / block format:** breaking — every block gains mandatory `RewardCommit` at index 0; shifts user tx indices by 1.
- **Activation:** MUST ship via height-activated rule bundle (spec 17). Not valid on chains that started with implicit coinbase unless a migration GIP defines cutover (out of scope for this draft).
- **Explorers / RPC:** `tx_index` 0 is reward commit; pending `ClaimReward` visible in mempool APIs (GIP-19).

## Security Considerations

- **Forgery:** Claims MUST bind to `RewardCommit` + block hash on main chain.
- **Double-claim:** State MUST mark commitments consumed.
- **DoS:** Mempool MAY cap total bytes / count; miners SHOULD prioritize matured claims near fee market. ~100 pending claims per active miner is expected, not an attack.
- **Censorship:** Pre-signed `inclusion_fee` incentivizes inclusion; allied miners include each other’s claims — same economics as any paid tx.
- **Orphan race:** Claim for block no longer on main chain MUST become invalid and SHOULD be evicted from mempool on reorg (when reorg exists).

## Reference Implementation

| Area | Path | Status |
|------|------|--------|
| Reward commit / claim | `guld-consensus` (`rewards.rs`) + `guld-state` `apply_at_height` | Shipped |
| Maturity constant | `guld-state/src/economy.rs` (`COINBASE_MATURITY_BLOCKS = 100`) | Enforced |
| Mempool | `guld-consensus/src/mempool.rs` | Accepts immature claims |
| Persistence | `{datadir}/mempool.jsonl` | Task 008 done |
| Dead `credit_miner` | — | Removed (task 020) |

Normative specs: [`../specs/06-blocks-and-consensus.md`](../specs/06-blocks-and-consensus.md) §4, [`../specs/03-transactions.md`](../specs/03-transactions.md) §3.0–§3.1, [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md) §2–§5.

**Activation:** GIP-22 is **Accepted** on Simba (regenesis / artifact tip). Chains that still ran implicit coinbase need a cutover GIP or reset. Height-activated rule bundles remain the path for later mainnet forks ([spec 17](../specs/17-protocol-upgrades.md)).

## History

- 2026-09-26: Draft from maintainer discussion — deferred claim, mempool-open / inclusion-gated maturity, subaccount signing.
- 2026-09-26: **Accepted** — normative specs updated; implementation + spec-17 activation pending.
