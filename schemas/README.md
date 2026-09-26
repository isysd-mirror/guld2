# Guld BARE schemas (consensus wire)

**Codec:** [BARE](https://baremessages.org/) — locked for task 007 **A2** ([research](../docs/research/wire-codec-comparison.md)).

## Layout

```text
schemas/
  README.md           ← this file
  guld/v1/            ← frozen schema set for wire version 1 (draft — files TBD)
    tx.bare           ← Tx union (all L0 types incl. GIP-22 RewardCommit / ClaimReward)
    account.bare      ← Account leaf
    block.bare        ← Block { header, txs }
    header.bare       ← logical header fields (PoW preimage stays spec 06 §2.1 table)
```

Normative field definitions remain in [`docs/specs/03-transactions.md`](../docs/specs/03-transactions.md) and [`docs/specs/02-identity-and-accounts.md`](../docs/specs/02-identity-and-accounts.md). `.bare` files are the **byte** source of truth once published.

## Code generation

| Language | Tool | Example |
|----------|------|---------|
| Rust | [`bare_proc`](https://git.sr.ht/~chiefnoah/bare_proc) + [`serde_bare`](https://crates.io/crates/serde_bare) | `bare_schema!("guld/v1/tx.bare");` |
| TypeScript / JS | [`@bare-ts/tools`](https://www.npmjs.com/package/@bare-ts/tools) | `bare compile guld/v1/tx.bare --out=tx.ts` |
| Python | [`bare-py`](https://git.sr.ht/~martijnbraam/bare-py) | `bare guld/v1/tx.bare tx.py` |

Install the `bare` CLI from `@bare-ts/tools` (npm) or use bare-py’s bundled command — pin versions in repo when vectors land.

## Consensus rules

- **`TxId`** = `SHA256("guld/tx_id/v1" ‖ 0x00 ‖ bare_bytes)` — never hash JSON.
- **P2P** binary protocol ids (e.g. `/guld/tx/2.0.0`) carry BARE payloads; JSON `/guld/tx/1.0.0` is legacy until activation.
- **Golden vectors:** `schemas/guld/v1/vectors/` (TODO) — hex fixtures checked in Rust, TS, and Python CI.

## BARE draft notice

The BARE encoding is an [IETF Internet-Draft](https://baremessages.org/). Pin generator versions; re-run vectors if the draft changes materially before final RFC.
