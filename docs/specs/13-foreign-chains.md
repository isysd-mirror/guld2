# Spec 13 — Cross-chain and foreign witnessing (informative / future dapps)

**Status:** informative — **not L0 v1 consensus**  
**Related:** [`02-identity-and-accounts.md`](02-identity-and-accounts.md), [`04-proofs.md`](04-proofs.md), whitepaper §3.4  
**Decision (A11):** Guld **does not** reserve genesis names such as `bitcoin`, `ethereum`, or `solana`. Bridge builders, indexers, and “witness” dapps **register ordinary names** (or operate under their own labels) and ship **leaf** software. Any cross-chain story is **application-layer**, not a built-in account kind in Simba v1.

## 1. What Guld L0 ships (v1)

| In scope | Out of scope (v1) |
|----------|-------------------|
| Registered **individual / group / sub** names | Genesis **`foreign_chain`** shells |
| `threshold_cosign_v1` tip updates | Enumerated **`bitcoin_spv_v1`** / **`ethereum_light_v1`** in consensus |
| `Transfer`, registration, PoW, GIP-22 rewards | Reserved **`bitcoin`** namespace slot |
| Leaves under any registered name | Mandatory foreign light-client verify in every full node |

Only **`guld`** is reserved at genesis (network account). Every other label—including short names attractive to bridge UX—is subject to **normal registration economics** (`F_user(L)`, letter table). Squatting `bitcoin` is a **market** problem for dapp teams, not a protocol reservation.

## 2. Theoretical dapp capabilities (whitepaper §3.4)

The whitepaper describes **patterns dapps MAY build** on top of Guld’s name + hash + cosign substrate. They are **not** promises of reference-node behavior in v1:

| Pattern | Dapp responsibility | L0 v1 role |
|---------|---------------------|------------|
| **Foreign chain indexer** | Register e.g. `acme-bridge`; run BTC/ETH/SOL infra off-chain; publish checkpoints in **leaf** CAS | Stores only authorized **tips** if the dapp cosigns `UpdateMaster` |
| **guldex-style exchange** | Leaf logic + optional external indexers; settle in GULD via ordinary `Transfer` | No exchange opcode |
| **Lightning-style channels** | Off-hub state; periodic hash commit under a registered name | Witnesses cosigned head only |
| **Personal / app chain** | Leaf ledger; checkpoint `master_hash` | Same as any group/individual |
| **Token bridge (peg)** | Lock/mint contracts, watchers, fraud proofs — **separate product** | Not implied by names |

Cross-chain **liquidity** and **foreign consensus verification** are **not** native L0 opcodes. Teams that want a canonical public name choose one, pay the letter fee, and operate their stack.

## 3. Future protocol upgrades (optional)

If the ecosystem later wants **consensus-enumerated foreign proof kinds** (SPV, light client, …), that requires:

1. A **GIP** + height-activated rule bundle ([`17-protocol-upgrades.md`](17-protocol-upgrades.md))  
2. Possibly reintroducing an account kind or proof-kind table — **not** assumed in Simba beta  
3. Honest bounds on verify cost (tx weight)

Until then, spec 13 is **design vocabulary** for leaf authors, not a checklist for `guld-node` v1.

## 4. Research sketches (non-normative)

These sections preserve earlier exploration; **do not implement** without a new GIP.

### 4.1 Hypothetical foreign proof kinds

| Kind | Would verify | Would require upgrade |
|------|--------------|------------------------|
| `bitcoin_spv_v1` | BTC header chain + Merkle proof | Yes |
| `ethereum_light_v1` | ETH sync committee / light update | Yes |
| `threshold_cosign_v1` | Guld keys | **Shipped** (all accounts) |

### 4.2 Hypothetical `foreign_chain` account

Previously drafted: genesis-reserved names with `chain_params_hash` and foreign proof-gated tips. **Rejected for v1 (A11)** in favor of dapp-registered names and ordinary cosign tips.

### 4.3 Node requirements (if ever activated)

| Node type | Foreign proof verify | Full foreign node |
|-----------|----------------------|-------------------|
| Guld full node | Only kinds in active rule bundle | MUST NOT require |
| Wallet / leaf | Optional | Runs whatever the dapp needs |

## 5. RPC (future)

Methods such as `guld_estimateForeignProofWeight` remain **TBD** until a foreign-proof GIP activates.

## 6. Summary

- **v1:** Guld is a **witness hub for registered identities** — not a built-in multi-chain oracle.  
- **Cross-chain:** **Dapp problem** — register a name, run leaves, use HTTP/P2P/off-chain coordination.  
- **No genesis foreign names (A11 locked).**  
- **Bridges / SPV / pegs:** informative here; normative only after a future upgrade GIP.
