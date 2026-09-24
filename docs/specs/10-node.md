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
  guld-rules/     # materialized on-chain guld rule bundle (small; not full source tree)
  config.toml
```

## 5. Health / readiness

Full validating node readiness MUST include:

- State tip readable  
- `guld` **rule bundle** materialized; `guld_rules_hash` matches headers  
- P2P listening (unless `--offline`)  
- RPC up  

## 6. Relationship to this repository

The open-source tree at `guld.io/repos/guld.git` is **operator-maintained node/wallet software** — not consensus data. On-chain account `guld` commits only the **rule bundle** digest (`guld_rules_hash`). Nodes MUST enforce rules from their built-in rule set matching that digest; they MUST NOT require cloning this git tree from CAS to validate blocks.

## 7. Open parameters

- Config schema  
- Metric endpoints  
- Privilege separation (miner vs validator)
