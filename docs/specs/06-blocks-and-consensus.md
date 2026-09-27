# Spec 06 — Blocks and consensus

**Status:** draft (PoW / retarget / fork choice **locked v1** — see §2–§4)

## 1. Block structure

```text
Block {
  header: Header,
  txs: Vec<Tx>,
}

Header {
  version: u8,
  prev_hash: Hash32,          // single parent (DAG multi-parent is a later upgrade)
  height: u64,
  timestamp: u64,             // unix seconds (median-time-past rules — §3)
  state_root: Hash32,
  tx_root: Hash32,
  receipt_root: Hash32,
  guld_rules_hash: Hash32,    // digest of active guld home tip / rule bundle
  difficulty: u32,            // PoW: minimum leading zero bits (§2)
  nonce: u64,                 // PoW search field (Bitcoin-style)
  miner: Name,                // block producer (PoW); MUST match RewardCommit.miner (§4)
  inclusion_fees: Amount,     // sum of inclusion_fee from txs[1..]; MUST match apply
}
```

**Terminology (Bitcoin-aligned where sensible):**

| Guld | Bitcoin analogue |
|------|------------------|
| `block hash` | block hash (double-SHA256 of header preimage) |
| `difficulty` | proof-of-work target expressed as **leading zero bits** (simpler than compact `nBits`; same role) |
| `chain work` / `cumulative_work` | total chain work for fork choice |
| miner reward | [`RewardCommit`](../gips/gip-22.md) + [`ClaimReward`](../gips/gip-22.md) (GIP-22) |
| `nonce` | header nonce searched by miners |
| retarget | difficulty adjustment toward 600 s mean interval |

Guld headers commit to more fields than Bitcoin’s 80-byte header (`state_root`, `guld_rules_hash`, `miner` name, …). The **hash function and fork-choice class** follow Bitcoin; serialization is Guld-specific (§2.1).

## 2. Proof of work (locked v1)

**Decision:** Bitcoin-style **double-SHA256** on a canonical header preimage. RandomX, DAG-PoW, and other algorithms are **out of scope for v1** (Simba + mainnet-class networks). DAG-PoW MAY be proposed later as a consensus upgrade ([`17-protocol-upgrades.md`](17-protocol-upgrades.md)) without changing the v1 single-parent rule on existing chains until activated.

### 2.1 Block hash

```text
block_hash = SHA256( SHA256( header_pow_preimage ) )
```

`header_pow_preimage` is the concatenation, in order:

| Field | Encoding |
|-------|----------|
| `version` | 1 byte |
| `prev_hash` | 32 bytes |
| `height` | `u64` big-endian |
| `timestamp` | `u64` big-endian |
| `state_root` | 32 bytes |
| `tx_root` | 32 bytes |
| `receipt_root` | 32 bytes |
| `guld_rules_hash` | 32 bytes |
| `difficulty` | `u32` big-endian |
| `nonce` | `u64` big-endian |
| `miner` | UTF-8 bytes of registered name |
| separator | 1 byte `0x00` |
| `inclusion_fees` | `u128` big-endian (amount units) |

Implementation: `guld-consensus` (`header_pow_hash`, `check_header_pow`, `block_hash`).

### 2.2 Difficulty and valid PoW

- `difficulty` is the minimum count of **leading zero bits** in `block_hash` (big-endian byte order).
- **Genesis (height 0):** `difficulty == 0` — PoW check skipped (unmined or ceremony-fixed genesis).
- **Height ≥ 1:** `difficulty >= 1` and `leading_zero_bits(block_hash) >= difficulty`.

This is coarser than Bitcoin’s compact target but uses the same SHA256d search loop and retarget **intent** (scarce blocks ~ every 10 minutes).

**Locked (v1):** Guld uses **leading-zero bits**, not compact `nBits` — simpler verification; merged mining uses SHA256d + future witness GIP with custom pool tooling ([`../research/pow-nbits-vs-leading-bits.md`](../research/pow-nbits-vs-leading-bits.md)).

### 2.3 Chain work and fork choice

For each header, `work(header) = 2^difficulty` (saturating at `u128` limits).

**Fork choice (Nakamoto, Bitcoin-class):** among valid tips, choose highest **cumulative chain work**, then highest **height**, then lowest **block hash** (lexicographic).

```text
choose_tip(candidates) -> tip with max cumulative_work, then height, then hash
```

Reorgs MUST rewind to the common ancestor and replay the heavier fork under [`choose_tip`](#23-chain-work-and-fork-choice). Reference implementation: `guld-node` `chain_reorg.rs` (max depth **2016**). Dual-miner adversarial coverage: [task 019](../tasks/done/2026-09/019-dual-miner-reorg-integration-test.md) (**done**).

### 2.4 Difficulty retarget (locked v1 — Bitcoin 2016-block window)

| Constant | Value | Bitcoin analogue |
|----------|-------|------------------|
| `TARGET_BLOCK_INTERVAL` | **600 s** (10 min) | `nPowTargetSpacing` |
| `DIFFICULTY_ADJUSTMENT_INTERVAL` | **2016 blocks** | same |
| `POW_TARGET_TIMESPAN` | **1_209_600 s** (14 days) | `nPowTargetTimespan` |

**Between retarget heights:** `difficulty' = tip.difficulty` (unchanged — same as Bitcoin `nBits` carry-forward).

**At block heights `H` where `H % 2016 == 0` and `H > 0`:**

Let `tip` = header at height `H - 1`, `start` = header at height `H - 2016`.

```text
actual   = tip.timestamp - start.timestamp
expected = POW_TARGET_TIMESPAN
actual   = clamp(actual, expected/4, expected×4)    // Bitcoin 4× clamp

work_old = 2^tip.difficulty
work_new = work_old × expected / actual
difficulty' = min(d such that 2^d >= work_new, 64)
```

Implementation: `guld-consensus::next_difficulty`. Miners MUST load the period-start header from disk at retarget boundaries (see `guld-node` mining path).

Reference: Bitcoin Core `GetNextWorkRequired` / `CalculateNextWorkRequired` (`src/pow.cpp`).

### 2.5 Merged mining (future — not v1)

v1 does **not** require merged mining. The design keeps the door open the same way Bitcoin auxiliary chains do:

- **`version`** and/or coinbase-adjacent witness data MAY later commit an **auxiliary block hash** (another chain’s work) without redefining `block_hash`.
- A future GIP MAY specify: miners prove simultaneous work on Bitcoin (or another parent chain) by embedding that chain’s block hash in a Guld coinbase witness or `guld` home leaf; Guld still validates the Guld header PoW above.

Until such a GIP activates, nodes MUST NOT require auxiliary payloads.

## 3. Header validity

A block header is valid if:

1. Links to parent under fork choice (single `prev_hash` in v1).  
2. PoW meets `difficulty` (§2), except height 0.  
3. **Difficulty schedule (locked — [GIP-23](../gips/gip-23.md)):** for `height ≥ 1`, `header.difficulty` MUST equal `next_difficulty(height, parent, period_start)` (§2.4). At retarget boundaries (`height % 2016 == 0`), `period_start` MUST be the header at `height - 2016`. Full nodes MUST reject mismatches with a distinct error (e.g. `BadDifficulty`) on import, seal, and P2P relay.  
4. **Timestamp (Bitcoin-inspired, locked v1 — task 007 A10):**  
   - MUST be **greater** than the median timestamp of the prior up-to-**11** blocks (median-time-past).  
   - MUST NOT be more than **2 hours** ahead of local wall clock at validation.  
   - Full nodes MUST reject headers violating (4) on import and P2P relay. Implementation: [task 010](../tasks/done/2026-09/010-header-timestamp-validation.md) (**done**).  
5. All txs valid and apply cleanly.  
6. Roots match post-state.  
7. Coinbase amount = `subsidy(height) + inclusion_fees + vested_registration_fees(height)`.  
8. `guld_rules_hash` matches the rule bundle active at this height ([`17-protocol-upgrades.md`](17-protocol-upgrades.md)).

Full block validity includes (4)–(8) on the body; header-only sync checks (1)–(4) + PoW.

Registration/settle protocol fees vest over **8** blocks ([`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md) §3).

## 3a. Rules hash and upgrades

At height `h`, the only valid header digest is the rule bundle whose `activation_height ≤ h` and which is the latest such published under account `guld` (see spec 17). Nodes MUST reject blocks whose `guld_rules_hash` does not match that digest.

## 4. Miner rewards and maturity (locked — [GIP-22](../gips/gip-22.md))

**Constant:** `COINBASE_MATURITY_BLOCKS = 100` (Bitcoin `COINBASE_MATURITY`; see [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)).

Every block body MUST begin with exactly one **`RewardCommit`** at index **0** (not from mempool). User and permissionless txs follow at index ≥ 1. Minting happens only via mature **`ClaimReward`** ([`03-transactions.md`](03-transactions.md) §3.0–§3.1).

```text
reward_commit(h).amount = subsidy(h) + inclusion_fees + vested_registration_fees(h)
```

| Stage | When | Effect |
|-------|------|--------|
| Commit | Block `h`, `txs[0]` | Bind `amount`, `beneficiary`, `claim_signature`; **no mint** |
| Mempool | `h` onward | Matching `ClaimReward` MAY be accepted and relayed (pending pool) |
| Claim | Block **`B` where `B.height ≥ h + 100`** (first eligible: **`h + 100`**) | Mint `amount` to `beneficiary`; claim `inclusion_fee` accrues to **`B.header.miner`** |

**Inclusion fees in block `h`:** summed from `txs[1..]` only; included in `reward_commit(h).amount` and minted when block **`h`**’s claim is included (~`h + 100`). **`ClaimReward.inclusion_fee`** in block **`B`** accrues to **`B`’s** miner via **`B`’s** `inclusion_fees` / future `RewardCommit` — not retroactively to block **`h`**.

**Why (game theory):** deferred mint avoids issuing spendable subsidy on blocks that may later be orphaned by reorg; maturity is an **inclusion** rule on `ClaimReward`, not a mempool ban.

**Miner operations:** pre-sign claims at seal time (often via subaccount `parent.rewards`); retain ~**100** pending claims; persist across restarts ([task 008](../tasks/done/2026-09/008-mempool-persistence.md)).

**Activation:** GIP-22 is **Accepted**; reference code uses `RewardCommit` / `ClaimReward` on Simba. Dead `credit_miner` removed ([task 020](../tasks/done/2026-09/020-remove-credit-miner-footguns.md)). Chains that still ran implicit coinbase require a migration cutover GIP or reset.

## 5. Subsidy

See [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md). Function `subsidy(height) -> Amount` MUST be pure and consensus-critical.

**Locked v1 timing:** `TARGET_BLOCK_INTERVAL = 600` s (10 minutes); `ISSUANCE_PERIOD_BLOCKS = 2016` (same as retarget); annual index `BLOCKS_PER_YEAR = 52_560`. Subsidy steps every **2016 blocks**; annual rate `i(y) = max(0.04, (2/3)^(y-1))` is spread per epoch as `(1+i(y))^(2016/52560)-1` (spec 07 §6.2).

## 6. Component API — `guld-consensus`

```text
trait Consensus {
  fn check_header_pow(header: &Header) -> bool;
  fn work(header: &Header) -> U256;
  fn choose_tip(candidates: &[ChainTip]) -> ChainTip;
  fn subsidy(height: u64) -> Amount;
}
```

## 7. Open parameters (post–PoW freeze)

- Dead `credit_miner` removed; ClaimReward height-gated only ([task 020](../tasks/done/2026-09/020-remove-credit-miner-footguns.md))  
- Dual-miner adversarial reorg test — **done** ([task 019](../tasks/done/2026-09/019-dual-miner-reorg-integration-test.md))  
- DAG-PoW / multi-parent headers (research — not v1)  
- Merged-mining witness format (future GIP)  
- Rules activation margins per network ([`17-protocol-upgrades.md`](17-protocol-upgrades.md))
- Consensus golden vectors ([task 021](../tasks/open/021-consensus-golden-vectors.md) / [GIP-26](../gips/gip-26.md))
