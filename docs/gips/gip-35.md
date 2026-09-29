---
gip: 35
title: Merkle tx_root and receipt_root
description: Replace interim concatenated JSON header roots with binary Merkle trees; height-activate via rule-bundle root_scheme.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Core
created: 2026-09-29
requires: 16, 22, 26
---

## Abstract

Header `tx_root` and `receipt_root` are still computed with an **interim** tagged hash over concatenated JSON leaves (`guld/tx_root/interim/v1`, `guld/receipt_root/interim/v1`). That is consensus-critical on locked Simba but is not a specified Merkle tree, and the domain tags advertise temporary status.

This GIP specifies **`merkle_v1`**: binary Merkle trees over domain-separated leaf hashes, with **BARE** tx leaf preimages (RewardCommit claim signature excluded), height activation through the rule-bundle field `root_scheme`, and GIP-26 golden vectors for both schemes.

## Motivation

External review and [043](../tasks/done/2026-09/043-merkle-tx-receipt-roots-gip.md) treat interim roots as a P0 consensus-freeze item. Tip wipe is not an upgrade path on Simba. Height activation via [spec 17](../specs/17-protocol-upgrades.md) lets miners roll binaries, then switch algorithms at a single `H` — including inside the Core catch-up bundle ([055](../tasks/open/055-simba-single-rule-bundle.md)).

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Activation (`root_scheme`)

Extend the canonical rules manifest ([spec 17](../specs/17-protocol-upgrades.md)):

```text
root_scheme: Option<String>   // omit / "interim" | "merkle_v1"
```

- Omitted or `"interim"` → headers MUST use the historical interim algorithm (§Historical).
- `"merkle_v1"` → from this manifest’s `activation_height` inclusive, seal and import MUST use Merkle v1 (§Merkle v1).
- Nodes MUST reject blocks whose header roots do not match the scheme required at that height (`BadRoots`).
- PoW preimage field **order** is unchanged; only the digest algorithm for the root slots switches.

### Merkle v1

**Tags** (via `tagged_hash` — [spec 01](../specs/01-cryptography.md)):

| Role | Tag |
|------|-----|
| Tx leaf | `guld/tx_leaf/v1` |
| Receipt leaf | `guld/receipt_leaf/v1` |
| Internal node | `guld/merkle_node/v1` |
| Empty tx root | `guld/tx_root/v1` |
| Empty receipt root | `guld/receipt_root/v1` |

**Tx leaf preimage:** canonical **BARE** encoding of the tx ([GIP-26](gip-26.md) / wire). For `RewardCommit`, encode a stub with `claim_signature` the empty string so miners can seal roots before the claim signature is filled ([GIP-22](gip-22.md)).

**Receipt leaf preimage:** canonical JSON serialization of `ApplyReceipt` (`registration_fee`, `inclusion_fee`, `state_root`) — same shape used at seal today. A future GIP MAY switch receipts to BARE without changing this GIP’s empty/odd/node rules.

**Leaf hash:** `tagged_hash(leaf_tag, preimage)`.

**Tree:**

1. Empty leaf list → `tagged_hash(empty_root_tag, "")`.
2. Otherwise build a binary Merkle tree over the ordered leaf hashes.
3. Odd layer length: **duplicate** the last hash before pairing.
4. Internal node: `tagged_hash("guld/merkle_node/v1", left ‖ right)` (64 bytes).
5. Root of the single remaining node is `tx_root` / `receipt_root`.

### Historical (interim)

Until `merkle_v1` activates at height `H`:

- `tx_root` = `tagged_hash("guld/tx_root/interim/v1", concat_i( len_be32(leaf_i) ‖ leaf_i ))` where each leaf is JSON of the tx (RewardCommit with empty `claim_signature`).
- `receipt_root` = `tagged_hash("guld/receipt_root/interim/v1", concat_i( json(receipt_i) ))` (no length prefixes).

Blocks at `h < H` MUST continue to verify under interim forever (no historical rewrite).

### Vectors (GIP-26)

Suites MUST cover: empty lists; single leaf; odd leaf count; RewardCommit-stub equality (sig excluded); multi-tx block; receipt list matching seal order; cross-scheme rejection (interim roots at `h ≥ H` and merkle roots at `h < H`).

## Rationale

BARE for txs aligns with `TxId` and dual-wire. Duplicating the last odd leaf matches common Bitcoin-family Merkle padding and keeps single-leaf trees well-defined. Rule-bundle `root_scheme` reuses the existing schedule machinery instead of a second activation clock.

## Backwards Compatibility

- Soft/hard: unknown `root_scheme` or wrong algorithm → peers that do not upgrade diverge at `H` (treat as hard for operators).
- Simba: activate together with other Accepted Core catch-up items in [055](../tasks/open/055-simba-single-rule-bundle.md).

## Security Considerations

- Leaf preimage malleability → MUST use canonical BARE / frozen receipt JSON.
- Wrong-scheme acceptance would fork the tip → import MUST hard-fail `BadRoots`.
- Empty-root tag separation prevents confusing tx vs receipt empty digests.

## Reference Implementation

`guld-consensus`: `RootScheme`, `tx_root_with` / `receipt_root_with`, seal/import branching; `guld-cas` manifest `root_scheme`; node `root_scheme_at(height)`. Implement task: [044](../tasks/open/044-merkle-roots-implement-simba-activate.md).

## History

- 2026-09-29: Opened from [043](../tasks/done/2026-09/043-merkle-tx-receipt-roots-gip.md); decision height-activate on Simba (no tip wipe).
- 2026-09-29: **Accepted** — norms match dual-path reference code; live cutover rides [055](../tasks/open/055-simba-single-rule-bundle.md).
