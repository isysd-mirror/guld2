# Consensus golden vectors (`guld/v1`)

**Vector set:** `guld/v1`  
**GIP:** [GIP-26](../../../docs/gips/gip-26.md)  
**Status:** Accepted (Rust CI); Final when a non-Rust consumer lands.

Throwaway fixture keys only (`0x` + repeating `ab` / `11` / `22` / `33`). Never use mainnet secrets.

## Files

| File | Coverage |
|------|----------|
| `tx_id.jsonl` | BARE bytes → `TxId` for every L0 tx type (10) |
| `header_pow.jsonl` | Genesis + mined height-1 → `block_hash` / PoW |
| `difficulty.jsonl` | Retarget up/down, unchanged mid-window, `BadDifficulty` reject |
| `timestamp.jsonl` | MTP reject + accept; future-drift reject |
| `*-v1.hex` | Legacy comment-style goldens (Transfer / RewardCommit / ClaimReward / SettleRegistration) — same bytes as matching `tx_id.jsonl` rows |

## Regenerate (Rust reference)

```bash
# From umbrella workspace root:
GULD_GEN_VECTORS=1 cargo test -p guld-wire --test vectors_tx_id -- --nocapture
GULD_GEN_VECTORS=1 cargo test -p guld-consensus --test vectors_gip26 -- --nocapture
```

Commit the JSONL diffs with the code change that caused them. Bump the `vector_set` string and this README if the encoding cutover is intentional.

## Verify (CI / pre-commit)

```bash
cargo test -p guld-wire --test vectors_tx_id
cargo test -p guld-consensus --test vectors_gip26
```

Pre-commit runs these when `schemas/` or `src/guld-{wire,consensus}` is staged (umbrella) or when committing inside those crates.

## Tool pins

| Component | Pin |
|-----------|-----|
| Reference encoder | `src/guld-wire` (hand-rolled BARE; not codegen) |
| Header PoW / retarget / MTP | `src/guld-consensus` |
| Rust toolchain | workspace `edition = "2021"`; see root `Cargo.toml` |
| Future TS | `@bare-ts/tools` (deferred — stretch before mainnet) |
| Future Python | `bare-py` (optional) |
