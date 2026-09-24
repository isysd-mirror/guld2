# Intent: Tx memo + protocol upgrade activation

Status: accepted · memo implemented (activation_height still follow-up)  
**Related:** [`../specs/03-transactions.md`](../specs/03-transactions.md), [`../specs/17-protocol-upgrades.md`](../specs/17-protocol-upgrades.md), [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md)

## Goal

1. Document **height-activated** rule-bundle upgrades (so simba/mainnet are not “edit binary and pray”).  
2. Allow a small optional **`memo`** on fee-paying txs for order ids / accounting — consensus-opaque, fully weight-priced.

## Memo (design)

| Rule | Choice |
|------|--------|
| Field | `memo: bytes` optional (JSON: string, UTF-8; empty/omit = absent) |
| Max size | **64 bytes** after UTF-8 encode (UUID + margin; not a forum) |
| Consensus | Opaque — MUST NOT affect validity except size / weight / signature coverage |
| Weight | Counts in `size_bytes(canonical_tx)` like any other field |
| Auth | Included in the signed message body for that tx type |
| Which txs | All fee-paying types; **not** `SettleRegistration` (miner-injected, keep lean) |

Harmless relative to weight market: an order id is a few dozen bytes a user already pays to include.

## Upgrades (design)

See [`17-protocol-upgrades.md`](../specs/17-protocol-upgrades.md): `activation_height` on the rule bundle; headers switch digest at H; unknown digest ⇒ cannot follow tip.

## Implementation slices (later)

- [x] Rust: optional `memo` on `Tx` variants + message digests + weight  
- [x] Wallet / claim / registrar: pass-through memo UI  
- [ ] Rule manifest: `activation_height` field + node dual-hash awareness  
- [x] Spec index / whitepaper cross-links (this intent)

## Non-goals

- On-chain interpretation of memo (no “OP_RETURN contracts”)  
- Unbounded metadata or IPFS CIDs in L0 txs (use leaf / `UpdateMaster`)
