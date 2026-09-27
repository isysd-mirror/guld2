# Guld BARE schemas (consensus wire)

**Codec:** [BARE](https://baremessages.org/) — locked for task 007 **A2** ([research](../docs/research/wire-codec-comparison.md)).  
**Reference encoder:** [`src/guld-wire/`](../src/guld-wire/) (hand-rolled LE; not yet `serde_bare` codegen).

## Layout

```text
schemas/
  README.md
  guld/v1/
    tx.bare              ← Tx union tags 0–9 (frozen for TxId)
    block.bare           ← interim P2P /guld/block/2.0.0 envelope
    account.bare         ← DRAFT deferred (SMT leaf still custom hash)
    vectors/             ← GIP-26 goldens (see vectors/README.md)
      README.md
      tx_id.jsonl
      header_pow.jsonl
      difficulty.jsonl
      timestamp.jsonl
      transfer-v1.hex     ← legacy comment-style (subset of tx_id)
      reward-commit-v1.hex
      claim-reward-v1.hex
      settle-registration-v1.hex
```

Normative field semantics: [`docs/specs/03-transactions.md`](../docs/specs/03-transactions.md).  
`.bare` + `guld-wire` are the **byte** source of truth for `TxId`. Header PoW / retarget / MTP: `guld-consensus`.

## Status (tasks 009 + 021 / GIP-26)

| Surface | Status |
|---------|--------|
| **TxId** = `tagged_hash("guld/tx_id/v1", bare_encode(Tx))` | **Shipped** |
| P2P dual-wire JSON v1 + BARE v2 | **Shipped** |
| **GIP-26 vectors** (all L0 TxId + header/diff/time) | **Accepted** — Rust CI + pre-commit |
| Datadir blocks | Still JSON on disk (W7 deferred) |
| Account leaf BARE | Deferred (`account.bare` draft only) |
| TS `@bare-ts` wallet smoke / vector consumer | Deferred (W9 / GIP-26 Final); HTTP stays JSON |

## Code generation (future)

| Language | Tool | Notes |
|----------|------|-------|
| Rust | hand-rolled `guld-wire` today; later [`serde_bare`](https://crates.io/crates/serde_bare) | Keep goldens green across migrations |
| TypeScript | [`@bare-ts/tools`](https://www.npmjs.com/package/@bare-ts/tools) | W9 |
| Python | [`bare-py`](https://git.sr.ht/~martijnbraam/bare-py) | optional smoke |

## Consensus rules

- **`TxId`** = `SHA256("guld/tx_id/v1" ‖ 0x00 ‖ bare_bytes)` — never hash JSON.
- **Amount** = **little-endian** u128 quanta (BARE uint; matches `guld-wire`).
- **P2P:** prefer `/guld/tx|block/2.0.0` (BARE); fall back to `1.0.0` (JSON).
- **Golden vectors (GIP-26):** [`schemas/guld/v1/vectors/`](guld/v1/vectors/README.md) — asserted by `cargo test -p guld-wire --test vectors_tx_id` and `cargo test -p guld-consensus --test vectors_gip26` (pre-commit Vectors gate).

## BARE draft notice

The BARE encoding is an [IETF Internet-Draft](https://baremessages.org/). Pin generator versions; re-run vectors if the draft changes materially before final RFC.
