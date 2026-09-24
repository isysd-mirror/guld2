# Spec 06 — Blocks and consensus

**Status:** draft

## 1. Block structure

```text
Block {
  header: Header,
  txs: Vec<Tx>,
}

Header {
  version: u8,
  prev_hash: Hash32,          // or parents[] for DAG-PoW later
  height: u64,
  timestamp: u64,             // unix seconds
  state_root: Hash32,
  tx_root: Hash32,
  receipt_root: Hash32,
  guld_rules_hash: Hash32,    // digest of active guld home tip / rule bundle
  difficulty: u32,            // or target
  nonce: u64,                 // PoW
  miner: Name | RewardScript, // coinbase beneficiary — draft: Name
  inclusion_fees: Amount,     // sum claimed; MUST match txs
}
```

`BlockHash` / PoW hash: **TBD** algorithm (candidate: double-SHA256 header commitment like BTC, or RandomX — freeze later).

## 2. Validity

A block is valid if:

1. Header links to parent under fork choice.  
2. PoW meets target.  
3. Timestamps within drift bounds (**TBD**).  
4. All txs valid and apply cleanly.  
5. Roots match post-state.  
6. Coinbase amount = `subsidy(height) + inclusion_fees`.  
7. `guld_rules_hash` matches the rule bundle active at this height ([`17-protocol-upgrades.md`](17-protocol-upgrades.md)).

## 2a. Rules hash and upgrades

At height `h`, the only valid header digest is the rule bundle whose `activation_height ≤ h` and which is the latest such published under account `guld` (see spec 17). Nodes MUST reject blocks whose `guld_rules_hash` does not match that digest.

## 3. Fork choice (v1)

**Draft:** Nakamoto longest weighted chain (most accumulated work). DAG-PoW is a later revision of this document.

## 4. Subsidy

See [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md). Function `subsidy(height) -> Amount` MUST be pure and consensus-critical.

**Locked draft timing:** `TARGET_BLOCK_INTERVAL = 600` s (10 minutes); `BLOCKS_PER_YEAR = 52_560`. Inflation `i(y)` geometric **100% → 4%** over 20 years, then **4%** (whitepaper §8.6).

## 5. Component API — `guld-consensus`

```text
trait Consensus {
  fn check_header_pow(header: &Header) -> bool;
  fn work(header: &Header) -> U256;
  fn choose_tip(candidates: &[ChainTip]) -> ChainTip;
  fn subsidy(height: u64) -> Amount;
}
```

## 6. Open parameters

- PoW algorithm & retarget (target mean interval **600 s**)  
- DAG-PoW yes/no for v1  
- Rules activation margins per network ([`17-protocol-upgrades.md`](17-protocol-upgrades.md))
