# Spec 08 — CAS and homes

**Status:** draft  
**Whitepaper:** §3.5, §8.7

## 1. Objects

```text
ObjectId = SHA256(object_bytes)   // raw content hash; no tag
```

Objects are opaque byte strings. Home trees are Merkle trees of `ObjectId`s + path metadata (**layout TBD**; candidate: git-like tree objects but **not** requiring git pack format at network layer).

## 2. Home tree (network layer)

A home is addressed by `home_tree_root` inside `master_hash`. Entries map path → `ObjectId` or child tree root.

Git repositories MAY appear as **leaf blobs or subtrees** (e.g. a `repos/node.git/` subtree). Consensus does not parse git.

## 3. CAS service API — `guld-cas`

Local node object store (not an L0 pin market):

```text
trait Cas {
  fn put(&self, bytes: &[u8]) -> ObjectId;
  fn get(&self, id: &ObjectId) -> Option<Vec<u8>>;
  fn has(&self, id: &ObjectId) -> bool;

  /// Local retention hint for this node’s disk policy (operator config).
  /// MUST NOT be confused with consensus pin/slash txs — those do not exist.
  fn retain_local(&self, id: &ObjectId) -> Result<(), CasError>;

  /// Ensure all objects reachable from root are present (recursive).
  fn materialize_tree(&self, root: &Hash32) -> Result<(), CasError>;
}
```

Storage backend: filesystem or KV under the node data dir.

## 4. Mandatory `guld` rule bundle

On tip update affecting account `guld`, or on node startup, a **full validating node** MUST:

1. Materialize the CAS objects reachable from account `guld`’s current `master_hash` home tree.  
2. Verify header `guld_rules_hash` matches the digest of that **rule bundle** (schemas, fee tables, proof kinds — whitepaper §3.5).

```text
cas.materialize_tree(account("guld").home_tree_root)  // small rule bundle only
assert header.guld_rules_hash == hash(active_rule_bundle)
```

**NOT required:** materializing node/wallet/website **source code** from CAS. Those ship from ordinary git; engineers’ checkouts are off-chain.

Failure to materialize the rule bundle or rules-hash mismatch ⇒ node MUST NOT advertise as a full validating peer.

**Upgrades:** publishing a new rule bundle under `guld` does not instantly change validation — see [`17-protocol-upgrades.md`](17-protocol-upgrades.md) (`activation_height`).

## 5. Other accounts — tip ≠ DA

**Locked:** consensus has **no** `PinClaim` / `PinRelease` / bonded slash-for-missing-data.

- Validators MUST store account tips (`master_hash`, keys, balances).  
- Validators MUST NOT be required to store ordinary account home bytes.  
- Clients and leaf hosts fetch objects via P2P, `remotes[]` hints, or local import.  
- Retention agreements (payment, escrow, punishment) live in **private leaves** or ordinary `Transfer`s—not fixed L0 storage txs.

Optional future storage markets are **apps**, not required protocol surface.

## 6. Sync

Nodes MAY fetch missing objects:

- P2P `GetObjects(ids)` ([`09-p2p.md`](09-p2p.md))  
- HTTP(S) from `remotes[]` hints  
- Local leaf-host import  

## 7. Open parameters

- Exact Merkle tree / path encoding  
- Max object size  
- Pack format for bulk sync
