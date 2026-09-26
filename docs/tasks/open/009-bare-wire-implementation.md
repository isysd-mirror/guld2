# Task: BARE wire codec implementation (A4)

Status: open
Priority: high
GIP:
Spec: ../specs/01-cryptography.md §4, ../specs/03-transactions.md, ../specs/05-state.md, ../specs/09-p2p.md
Research: ../research/wire-codec-comparison.md
Schemas: ../../schemas/README.md
Parent checklist: ./007-simba-beta-public-readiness.md **A2** (locked) / **A4** (implementation)

## Problem

**A2 is decided: BARE** for consensus wire. **A4 is not shipped:** the node still uses **JSON** for `TxId`, P2P block/tx payloads, and datadir block storage. That breaks cross-language `TxId` parity (serde field order, u128 JSON, implicit defaults) and is explicitly interim per spec 01 §4 and the [wire codec comparison](../research/wire-codec-comparison.md).

Until this task lands, **A4** stays partial and any genesis lock that assumes stable `TxId` is risky.

## Goals

1. Publish **`.bare` schema files** under `schemas/guld/v1/` (`tx.bare`, `account.bare`, `block.bare`, `header.bare` logical fields).
2. **`TxId`** = `tagged_hash("guld/tx_id/v1", bare_encode(Tx))` in Rust — replace `serde_json::to_vec` in mempool/consensus.
3. **P2P** carries BARE payloads on a new protocol id (e.g. `/guld/tx/2.0.0`, `/guld/block/2.0.0`); keep JSON ids as legacy until peers upgrade.
4. **Block disk** stores canonical BARE bytes (or BARE + optional JSON cache for debug — **TBD**).
5. **Golden vectors** in `schemas/guld/v1/vectors/` — checked in Rust; add TS (wallet) parity when schemas stabilize.
6. **HTTP / JSON-RPC** MAY stay JSON at the boundary; document 1:1 field mapping to BARE (no consensus hash over JSON).

## Non-goals (this task)

- Changing tx **semantics** or adding new tx types (GIP-22 `RewardCommit` / `ClaimReward` BARE fields belong here only as schema fields — rule logic is separate).
- SSZ-style mix-in hashing or protobuf.
- Mandatory Python node (vectors + bare-py smoke is enough for A2 multi-language bar).

## Work breakdown

| # | Item | Crate / path |
|---|------|----------------|
| W1 | Draft `tx.bare` from spec 03 tx enum (incl. GIP-22 types) | `schemas/guld/v1/` |
| W2 | Draft `account.bare` from spec 02 / 05 | `schemas/guld/v1/` |
| W3 | Draft `block.bare` (header ref + tx list) | `schemas/guld/v1/` |
| W4 | Rust codegen (`bare_proc` / `serde_bare`) + `Tx` encode/decode | `guld-types` or new `guld-wire` |
| W5 | Switch `Mempool::tx_id` and block tx hashing | `guld-consensus` |
| W6 | P2P request-response BARE paths + version negotiation | `guld-node` P2P |
| W7 | Datadir block read/write migration (dev networks may reset) | `guld-node` |
| W8 | Golden vectors + CI round-trip tests | `schemas/guld/v1/vectors/`, `guld-types` tests |
| W9 | Wallet/client: TS `@bare-ts/tools` compile + sign/build tx bytes | `guld-client` / wallet |
| W10 | Spec 03 / 05 / 09 cross-refs; mark A4 row in task 007 | docs |

## Activation / rollout

Simba beta MAY ship on JSON wire **once** with a published reset policy; **durable lock** SHOULD wait for W5–W8 at minimum.

Options (maintainer picks at rollout):

| Mode | Behavior |
|------|----------|
| **Hard cut** | Simba regenesis; old JSON P2P disabled |
| **Dual wire** | Accept JSON + BARE until height **H** (spec-17 bundle); hash always from BARE |
| **Testnet-only** | BARE on dev/Simba first; mainnet never saw JSON wire |

Document the chosen mode in `deploy/SIMBA.md` and task 007 notes when implemented.

## Done when

- [ ] `.bare` files committed under `schemas/guld/v1/`
- [ ] `TxId` and block inclusion use BARE bytes in `guld-consensus`
- [ ] P2P peers exchange BARE txs/blocks (new protocol id)
- [ ] Golden vectors pass in Rust (+ TS smoke for at least one tx type)
- [ ] Task 007 **A4** row: spec [x], code [x]
- [ ] Simba reset or dual-wire plan recorded if this changes `TxId` on an live network

## Notes

```
2026-09-26: Task opened — A2 locked (BARE); implementation tracked here for A4.
```
