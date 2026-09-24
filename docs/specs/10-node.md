# Spec 10 — Full node (`guld-node`)

**Status:** draft

## 1. Process

Binary: `guld-node` (Rust).

```text
guld-node --datadir PATH --rpc PATH|ADDR --p2p ADDR [--leaf-host]
```

## 2. Subsystems wiring

```text
guld-node
├── Config
├── Crypto
├── StateBackend + State
├── Cas
├── Consensus
├── Mempool
├── P2P
├── RPC server
└── optional LeafHost
```

## 3. Internal service APIs

### 3.1 Mempool

```text
trait Mempool {
  fn insert(&mut self, tx: Tx) -> Result<(), MempoolError>;
  fn select(&self, max_weight: u64) -> Vec<Tx>;  // by fee rate
  fn remove_included(&mut self, txids: &[TxId]);
}
```

### 3.2 Block production (miner)

```text
trait Miner {
  /// Assemble block template from mempool + coinbase; search PoW.
  fn mine(&self, tip: &ChainTip) -> Option<Block>;
}
```

### 3.3 Sync

```text
trait Sync {
  fn tick(&mut self) -> Result<(), SyncError>;
}
```

## 4. Data directory layout (draft)

```text
datadir/
  state/          # KV
  cas/            # objects
  peerstore/
  keys/           # miner / node identity (not account keys)
  guld-home/      # materialized checkout of account guld (optional working tree)
  config.toml
```

## 5. Health / readiness

Full validating node readiness MUST include:

- State tip readable  
- `guld` home fully materialized  
- P2P listening (unless `--offline`)  
- RPC up  

## 6. Relationship to this repository

The software built from this monorepo is distributed as a **sub-leaf** of on-chain account `guld`. Nodes SHOULD verify running binary digests against the active `guld` tip policy when activation rules require it (**TBD** exact attestation).

## 7. Open parameters

- Config schema  
- Metric endpoints  
- Privilege separation (miner vs validator)
