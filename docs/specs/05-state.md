# Spec 05 — State

**Status:** draft

## 1. State database

Full nodes MUST maintain:

| Store | Contents |
|-------|----------|
| Account trie / SMT | `name` or `account_id` → `Account` |
| Chain meta | tip hash, height, total subsidy issued, … |
| Receipt log | optional prune policy |

Authenticated structure: **sparse Merkle tree** (or equivalent) over account leaves; header commits to `state_root`.

## 2. Account leaf encoding

Canonical serialization of `Account` (**codec TBD**; fields per [`02-identity-and-accounts.md`](02-identity-and-accounts.md)).

`state_root = MerkleRoot(account_leaves)`.

Each account leaf MUST include **`nonce`** (monotonic `u64`) and **`master_hash`**. Nonce semantics and leaf race resolution: [`02-identity-and-accounts.md`](02-identity-and-accounts.md) §3.0.1, [`04-proofs.md`](04-proofs.md) §3.1.

## 3. Apply block

```text
fn apply_block(state: &mut State, block: &Block) -> Result<NewRoots, Error> {
  // 1. verify header links + PoW (consensus crate)
  // 2. apply txs[0] RewardCommit — commit only; no mint (GIP-22)
  // 3. for tx in block.txs[1..]: validate + apply (includes mature ClaimReward)
  // 4. schedule Σ registration_fee into 8-block vest from this height
  // 5. verify RewardCommit.amount == subsidy(h) + inclusion_fees + vested_at(h)
  // 6. compute state_root, tx_root, receipt_root
}
```

Track **claimed** rewards (per `ref_hash`) so `ClaimReward` cannot double-mint. Mint only via mature `ClaimReward` through `apply_at_height` ([`06-blocks-and-consensus.md`](06-blocks-and-consensus.md) §4 / GIP-22). There is no `credit_miner` path.

## 4. Parallelism

Txs that touch **disjoint** `Name` sets MAY apply in parallel. Implementations MUST produce the same `state_root` as sequential apply in canonical tx order (specify: **parallel schedule then serialize in block order** — block order is authoritative).

## 5. Component API — `guld-state`

```text
trait StateView {
  fn get_account(&self, name: &Name) -> Option<Account>;
  fn state_root(&self) -> Hash32;
}

trait StateWrite: StateView {
  fn put_account(&mut self, account: Account);
  fn commit(&mut self) -> Hash32;
}

trait StateBackend {
  // KV: RocksDB / fjall / …
  fn open(path: &Path) -> Self;
}
```

## 6. Genesis

Genesis MUST:

1. Create account `guld` with initial `master_hash` pointing at genesis protocol tree.  
2. Apply the 1.0 import manifest ([`15-ledger-import.md`](15-ledger-import.md)): every positive member `name:Assets` as a **legacy-locked** balance; **omit** ERC20 protocol buckets; pin `import_manifest_hash`. Supply **x = 960,975.39527052 GULD** (Simba — A7 / task 016).  
3. Set `chain_id`, initial weight params, fee params, subsidy schedule digest (**(2/3)^(y−1)** floored at **4%**, 10-min blocks), **10** decimal places.

Spend from imported names is disabled until `ClaimLegacy`.

## 7. Open parameters

- ~~SMT library choice~~ → in-tree `guld-state` SMT (SHA-256 tagged; membership proofs)  
- Pruning of historical account versions (keep tip only vs N tips for active)  
- Audited import manifest replacing working totals before mainnet
