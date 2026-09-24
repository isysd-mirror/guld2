# Spec 13 — Foreign chains in the namespace (L0 witness)

**Status:** draft  
**Related:** [`02-identity-and-accounts.md`](02-identity-and-accounts.md), [`04-proofs.md`](04-proofs.md), whitepaper §3.4 (L0)

## 1. Intent (1.0 continuity + L0 framing)

Guld 1.0 allowed **blockchains to appear in the namespace**. Guld 2.0 keeps that idea and names the role clearly: Guld is an **L0 witness substrate**. Other chains are first-class **names**; their tips advance under **foreign consensus proofs**. Dapps (e.g. a hypothetical **guldex**) MAY build application proofs over those tips. Fast paths (“lightning”), personal chains, and rollups-as-leaves settle by committing **hashes** to Guld—same `UpdateMaster` toolset as any leaf.

- Reserve or register names such as **`bitcoin`**, **`ethereum`**, **`solana`**, …  
- Those accounts’ **tips** represent a Guld-facing view of that chain (or a curated home about it).  
- Advancing those tips MAY require proofs that invoke **that chain’s consensus rules** (light-client / SPV style)—not Guld cosign alone.

This is **cross-chain at the identity and tip layer**. It is **not** automatically a token bridge.

## 2. What “cross-chain” means here

| Capability | In scope for this spec? | Notes |
|------------|-------------------------|--------|
| Address `bitcoin` / `ethereum` / `solana` by **name** | **Yes** | Same UX as people/groups |
| Commit foreign tips under SHA-256 `master_hash` | **Yes** | Home may hold headers, checkpoints, metadata leaves |
| Require **foreign consensus proofs** to update those tips | **Yes** | Enumerated proof kinds |
| Dapps proving over witnessed foreign tips (e.g. guldex) | **Yes** (leaf / app) | Not a special opcode |
| Periodic hash settlement (“lightning”, personal chains) | **Yes** (leaf) | Ordinary `UpdateMaster` / txs |
| Atomic BTC↔GULD / ETH↔GULD peg | **No** (separate bridge spec later) | Needs lock/mint, watchers, fraud proofs, … |
| Every Guld node runs a full BTC/ETH/SOL node | **MUST NOT** | Use light-client / SPV / succinct proofs only |

So: **yes, Guld is cross-chain L0** — a **unified namespace that can witness other networks’ consensus outcomes**. Bridging value is optional on top. Settlement dapps are expected leaf uses.

## 3. Account kinds (extension)

| Kind | Registration | Tip authorization |
|------|--------------|-------------------|
| `individual` / `group` | Paid register | `threshold_cosign_v1` (etc.) |
| `network` | Genesis (`guld`) | Network governance cosign + full clone |
| `foreign_chain` | Genesis reserved **or** gated registration | **Foreign consensus proof kind** for that chain |

**Draft reserved names (genesis):** `bitcoin`, `ethereum`, `solana` (extend as needed). MUST NOT be user-registrable.

Optional later: permissionless `RegisterForeignChain` with high burn + governance—out of v1.

## 4. Foreign-chain account state

```text
Account {
  … usual fields …
  kind: foreign_chain,
  chain_params_hash: Hash32,   // digest of light-client params in guld home or account meta
  // master_hash commits to home tree (checkpoints, header digests, docs, bridges config, …)
}
```

`chain_params_hash` MUST be updated only under the same proof rules as tip advances (or via `guld` rules activation)—so nodes agree on *which* BTC/ETH rules they verify.

## 5. Proof kinds (extension to Spec 04)

| Kind | Verifies | Typical use |
|------|----------|-------------|
| `bitcoin_spv_v1` | BTC header chain PoW + Merkle proof to a committed payload | Advance `bitcoin` tip / announce BTC-embedded commitment |
| `ethereum_light_v1` | ETH light-client update (sync committee / equivalent **TBD**) | Advance `ethereum` tip |
| `threshold_cosign_v1` | Guld keys | People/groups; MAY also be used for *admin* leaves under a foreign account if policy allows a hybrid |

### 5.1 Conceptual `UpdateMaster` for `bitcoin`

```text
UpdateMaster {
  name: "bitcoin",
  new_master_hash,
  proof: {
    kind: bitcoin_spv_v1,
    // headers / proof bytes sufficient for any full node to verify PoW cumulative work
    // and that new_master_hash (or a document containing it) is committed as claimed
  }
}
```

Exact SPV payload layout **TBD**. Requirement: verification cost MUST be **bounded and metered in tx weight** (large proofs ⇒ expensive inclusion).

### 5.2 Eth note

Full Ethereum consensus verification is heavier than BTC SPV. v1 MUST pick a **light-client** scheme with bounded cost or defer `ethereum` tip updates to a hybrid (light proof + Guld multisig of known guardians)—document honesty if hybrid.

## 6. Leaves under foreign accounts

Leaves under `bitcoin` / `ethereum` / `solana` MAY include:

- Checkpoint archives  
- Indexer schemas / explorers  
- Bridge configs  
- Human docs  

**Recognizing consensus** applies to **authorizing the account tip**, not to executing arbitrary leaf software. Leaf hosts MAY run BTC/ETH/SOL-related tools; Guld validators only check the enumerated proof.

### 6.1 Settlement dapps (informative)

| Pattern | Mechanism |
|---------|-----------|
| **guldex** (example) | Leaf/dapp under its own name; consumes foreign tips + builds app proofs; settles via its tip / Guld txs |
| **Lightning-style** | Off-hub channel state; interact with guldex or peers; periodically commit settlement hash to Guld |
| **Personal / app chain** | Leaf ledger under a user/group name; `UpdateMaster` checkpoints state root |

These are **not** consensus upgrades; they are expected uses of §4 leaf sovereignty + this foreign-tip surface.

## 7. Node requirements

| Node type | BTC/ETH proof verify | Full foreign node |
|-----------|----------------------|-------------------|
| Guld full node | MUST verify enumerated foreign proof kinds it claims to support | MUST NOT require |
| Soft fork | New proof kinds via `guld` rules tip | — |

A node that cannot verify `bitcoin_spv_v1` MUST reject blocks containing those txs (or MUST NOT advertise full validation)—same as unknown tx types.

## 8. RPC additions (draft)

| Method | Result |
|--------|--------|
| `guld_getAccount` | includes `kind: "foreign_chain"` |
| `guld_getChainParamsHash` | `[name]` → hash |
| `guld_estimateForeignProofWeight` | `[kind, proofSize]` → weight |

## 9. Game theory (short)

- Reserved foreign names prevent squatters from impersonating `bitcoin` in the Guld namespace.  
- Proof cost in **weight** prevents header spam.  
- Guld does **not** inherit BTC/ETH security for GULD balances—only for the truth of *that named tip*.  
- Bridges need extra incentives; do not equate namespace recognition with peg safety.

## 10. Open parameters

- Exact reserved name list at genesis  
- BTC SPV message layout + minimum work delta per tip update  
- ETH light-client scheme or defer  
- Whether foreign tips MAY also accept `threshold_cosign` for non-consensus admin leaves (sub-paths) without moving `master_hash`

## 11. Summary answer

**Yes — this makes Guld cross-chain** as a **named witness hub**: one namespace, many consensus oracles (`guld` native cosign, `bitcoin` PoW SPV, `ethereum` light client, …).  

**No — it does not by itself make Guld a cross-chain liquidity layer**; that remains a later bridge design using these tips as anchors.
