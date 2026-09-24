# Spec 04 — Leaf-consensus proofs

**Status:** draft

## 1. Purpose

Authorize account tip/key changes without the network interpreting leaf politics. Only **enumerated** proof kinds are valid.

## 2. Proof kinds (genesis)

| `kind` | Value | Status |
|--------|-------|--------|
| `threshold_cosign_v1` | `1` | REQUIRED at genesis |
| others | — | Soft/hard fork to add |

```text
LeafConsensusProof {
  kind: u8,
  body: ThresholdCosignV1 | …,
}
```

## 3. `threshold_cosign_v1`

### 3.1 Message

For `UpdateMaster`:

```text
msg = tagged_hash(
  "guld/cosign/v1",
  account_id ‖ prev_master_hash ‖ new_master_hash ‖ nonce_be_u64 ‖ chain_id_be_u32
)
```

- `nonce` is the account’s **current** nonce (before apply).  
- `chain_id` prevents cross-network replay (**TBD** value; testnet ≠ mainnet).

### 3.2 Body

```text
ThresholdCosignV1 {
  // Bitset or list of key indices that signed; draft: list of (index, signature)
  signatures: Vec<{ key_index: u16, sig: Signature }>,
}
```

**Verify:**

1. `signatures.len() >= threshold`  
2. All `key_index` distinct and `< keys.len()`  
3. Each `ed25519_verify(keys[i], msg, sig)`  
4. Reject extra signatures beyond a DoS cap (`signatures.len() <= keys.len()`)

### 3.3 Weight impact

Each signature contributes to tx weight via `W_sig` ([`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)).

## 4. Component API — `guld-crypto`

```text
fn verify_leaf_proof(
  proof: &LeafConsensusProof,
  account: &Account,
  message: &[u8; 32],
) -> bool;
```

## 5. Open parameters

- Compact bitset encoding vs index list  
- Separate message tags for `RotateKeys` / spend  
- Future proof kinds (BLS aggregate, PQ multisig, …)
