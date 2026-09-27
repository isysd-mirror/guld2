---
gip: 26
title: Consensus Golden Vectors
description: Checked-in multi-language fixtures for TxId, headers, roots, and apply.
author: Guld contributors
discussions-to: ../tasks/done/2026-09/021-consensus-golden-vectors.md
status: Final
type: Standards
category: Interface
created: 2026-09-26
requires: 4, 23
---

## Abstract

Establish a **golden vector** suite under `schemas/` (and/or `testdata/consensus/`) so Rust reference code and any future client share byte-identical `TxId`, header hash, merkle/tx roots, difficulty schedule samples, and selected state transitions. Required before mainnet freeze; strongly recommended before durable Simba lock once BARE lands.

## Motivation

Today consensus **`TxId`** uses BARE (`guld-wire`); dual-wire P2P is live ([task 009](../tasks/done/2026-09/009-bare-wire-implementation.md)). Broader golden vectors (headers, state roots, multi-impl) remain open. External review flagged single-implementation risk as a credibility gap.

Without cross-language fixtures, a second client (or even a JS wallet verifying locally) cannot prove agreement with `guld-consensus`.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Layout

```text
schemas/guld/v1/vectors/     # preferred once BARE schemas exist
  README.md                  # how to regenerate; pin tool versions
  tx_id.jsonl                # bare or hex payload → TxId
  header_pow.jsonl           # header fields → block_hash / pow ok
  difficulty.jsonl           # parent + period_start → expected difficulty
  apply/*.json               # optional: pre-state, tx, post-state roots
```

Until BARE files ship, vectors MAY live under `testdata/consensus/` with an explicit “JSON interim / not mainnet-final” banner — but **MUST NOT** be treated as frozen for Simba durable lock.

### CI requirements

1. `guld-consensus` (or workspace) MUST fail CI if vectors drift.
2. At least one **non-Rust** consumer MUST verify the same vectors in CI or pre-commit (JS `@guld/js` or Python `bare-py`).
3. Vector files MUST be deterministic (sorted keys / canonical BARE bytes only — no wall-clock).

### Minimum coverage

| Vector class | Min cases |
|--------------|-----------|
| `TxId` for each L0 tx type (incl. RewardCommit / ClaimReward / ClaimLegacy) | 1 each |
| Genesis + height-1 header hash | 1 each |
| Retarget boundary difficulty | 2 (up/down clamp) |
| Bad difficulty reject ([GIP-23](gip-23.md)) | 1 |
| MTP / future timestamp reject | 1 each |

## Rationale

Golden vectors are cheaper than a full second client and catch encoding mistakes early. They complement shipped [task 009](../tasks/done/2026-09/009-bare-wire-implementation.md) TxId goldens.

## Backwards Compatibility

Regenerating vectors after a BARE cutover is expected and MUST bump a vector-set version string in `README.md`.

## Security Considerations

Fixtures must not include real mainnet private keys. Use throwaway keys checked into the suite.

## Reference Implementation

- Task: [021-consensus-golden-vectors.md](../tasks/done/2026-09/021-consensus-golden-vectors.md) (**done**)
- Vectors: [`schemas/guld/v1/vectors/`](../../schemas/guld/v1/vectors/README.md)
- Rust: `cargo test -p guld-wire --test vectors_tx_id`; `cargo test -p guld-consensus --test vectors_gip26`
- Pre-commit Vectors gate when `schemas/` or `guld-{wire,consensus,js}` staged
- Depends on: [009](../tasks/done/2026-09/009-bare-wire-implementation.md) (**done**), [GIP-23](gip-23.md)
- Non-Rust: **JS `@guld/js`** (`npm run verify-vectors`) — [036](../tasks/done/2026-09/036-guld-js-sdk.md), [032](../tasks/done/2026-09/032-gip-26-non-rust-vectors.md)

## History

- 2026-09-26: Drafted from external project review (wire freeze + multi-impl credibility).
- 2026-09-27: Accepted — JSONL suite + Rust CI + pre-commit; JS/Python deferred for Final.
- 2026-09-27: JS consumer implemented (`@guld/js` wire layer).
- 2026-09-27: **Final** — non-Rust consumer shipped + pre-commit wired ([032](../tasks/done/2026-09/032-gip-26-non-rust-vectors.md)).
