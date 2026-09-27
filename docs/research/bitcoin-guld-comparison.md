# Bitcoin ↔ Guld 2.0 — parameter & tech comparison

Living checklist for Simba/mainnet lock decisions. **Goal:** default to Bitcoin’s choices and terminology unless Guld has a concrete reason to diverge.

**Reference tree (optional):**

```bash
git clone --depth 1 https://github.com/bitcoin/bitcoin.git /tmp/bitcoin-core-ref
# PoW retarget: src/pow.cpp
# Limits:       src/consensus/consensus.h
# Mainnet:      src/kernel/chainparams.cpp
```

**Guld sources:** `src/guld-consensus/`, `src/guld-state/src/economy.rs`, `docs/specs/06-blocks-and-consensus.md`, `docs/specs/07-fees-and-tokenomics.md`.

Legend: **Match** = same or intentional Bitcoin-class; **Diverge** = different by design; **TBD** = not frozen.

---

## 1. Time & difficulty

| Parameter | Bitcoin (mainnet) | Guld 2.0 (v1) | Match? | Notes |
|-----------|-------------------|---------------|--------|-------|
| Target block interval | 600 s (10 min) | 600 s | **Match** | `TARGET_BLOCK_INTERVAL_SECS` |
| Retarget period | 2016 blocks | 2016 blocks | **Match** | `DIFFICULTY_ADJUSTMENT_INTERVAL` |
| Retarget timespan | 1_209_600 s (14 days) | 1_209_600 s | **Match** | `POW_TARGET_TIMESPAN_SECS` |
| Timespan clamp | ÷4 … ×4 of expected | ÷4 … ×4 | **Match** | Same as `CalculateNextWorkRequired` |
| Retarget formula | `nBits × actual / expected` on compact target | `2^d × expected / actual` on bit-difficulty | **Adapted** | Same economics (fast blocks → harder); Guld uses leading-zero-**bits** instead of compact `nBits` |
| Between retargets | `nBits` unchanged | `difficulty` unchanged | **Match** | Was per-block ±1 bit before 2026-09 fix |
| Genesis PoW | `nBits` in genesis | `difficulty = 0` (skip check) | **Adapted** | Height 0 unmined / ceremony |
| Testnet min-difficulty rule | Special if block > 2× spacing | None (Simba uses real retarget) | **Diverge** | Could add later for testnet rescue |
| Median-time-past / max future drift | BIP30/94 rules | Locked spec 06 §3; enforcement task 010 | **2 h + MTP** | A10 locked; code pending |

---

## 2. Proof of work & block hash

| Parameter | Bitcoin | Guld 2.0 | Match? | Notes |
|-----------|---------|----------|--------|-------|
| Hash function | SHA256d (double SHA256) | SHA256d | **Match** | Locked spec 06 §2 |
| Block ID | Header hash | `block_hash` = same PoW hash | **Match** | |
| Header size / fields | 80-byte fixed header | Variable preimage (name, roots, rules hash, …) | **Diverge** | More commitments; merged-mining hook via `version` / witness (future) |
| PoW search field | `nonce` (32-bit) | `nonce` (64-bit) | **Adapted** | Larger nonce space |
| Target encoding | Compact `nBits` | `difficulty`: u32 leading zero bits | **Diverge (locked)** | [Decision: keep bits for v1](./pow-nbits-vs-leading-bits.md#7-decision-locked) |
| Chain work | Σ work(target) | Σ `2^difficulty` | **Adapted** | Same fork-choice role |
| Fork choice | Most work → height → hash | Same | **Match** | `choose_tip` |
| Reorg | Longest-work rewind | Forward sync only (reorg TBD) | **Diverge** | Implementation gap, not policy |
| Merged mining | Namecoin-era pattern | Future GIP (spec 06 §2.5) | **Planned** | User direction: keep SHA256d for compatibility |

---

## 3. Block & weight limits

| Parameter | Bitcoin | Guld 2.0 | Match? | Notes |
|-----------|---------|----------|--------|-------|
| Max block weight | 4_000_000 WU | 4_000_000 vB | **Match** | `BLOCK_WEIGHT_LIMIT` |
| Witness scale factor | 4× | N/A (no witness tier) | **Diverge** | Single weight dimension |
| Max sigops / block | 80_000 cost | No sigops meter | **Diverge** | Ed25519 verify cost via `W_SIG` instead |
| Coinbase maturity | 100 blocks | **100 blocks** — claim inclusion at h+100 ([GIP-22](../gips/gip-22.md)) | **Match (policy)** | Accepted; code pending activation |
| Block version / upgrades | `version` + BIP9 | `version` + height rules hash | **Adapted** | [`spec 17`](../specs/17-protocol-upgrades.md) |

---

## 4. Money & issuance

| Parameter | Bitcoin | Guld 2.0 | Match? | Notes |
|-----------|---------|----------|--------|-------|
| Atomic unit | 1 sat = 10⁻⁸ BTC | 1 quanta = 10⁻¹⁰ GULD | **Adapted** | `Amount::QUANTA_PER_GULD = 10_000_000_000` |
| Supply cap | 21_000_000 BTC | No hard cap (genesis x + inflation) | **Diverge** | Identity economics; pre-mine + schedule |
| Initial subsidy | 50 BTC / block | `subsidy(h)` from epoch issuance / 2016 (spec 07 §6.2) | **Diverge** | Year-1 ~100% on x (spread over ~26 epochs), 2/3 decay, 4% floor |
| Halving / issuance steps | 210_000 blocks (~4 y), subsidy ×½ | **2016 blocks** (~14 d): flat `subsidy` per epoch; `i(y)` annual table compounded per epoch | **Partial** | Same cadence as difficulty retarget; smoother than yearly steps |
| Blocks per year | 52_560 (365×144) | 52_560 | **Match** | Same 10-min math |
| Coinbase / reward tx | Explicit coinbase in block | `RewardCommit` tx[0] + `ClaimReward` at h+100 ([GIP-22](../gips/gip-22.md)) | **Partial** | Explicit txs; deferred mint vs immediate coinbase |

---

## 5. Fees & mempool

| Parameter | Bitcoin | Guld 2.0 | Match? | Notes |
|-----------|---------|----------|--------|-------|
| Fee market | sat/vB weight | quanta/vB weight | **Match** | Bitcoin-style, not gas ISA |
| Min relay fee | policy (satoshi/kB) | `fee_rate_min_per_vb` (default 1 quanta/vB) | **Adapted** | Consensus floor in mempool |
| Tx replacement (RBF) | Opt-in BIP125 | Not implemented | **Diverge** | Future |
| Mempool eviction | policy | fee-rate ordering | **Adapted** | |
| Registration protocol fee | N/A | `F_user` / `F_group` / `F_sub` | **Diverge** | Namespace economics |
| Registration fee vest | N/A | 8 blocks to miners | **Diverge** | Anti-lottery ([`gip-10`](../gips/gip-10.md)) |

| Weight term | Bitcoin (post-segwit) | Guld |
|-------------|----------------------|------|
| Base bytes | 4 WU/byte stripped | 1 vB/byte serialized tx |
| Signature cost | Part of script / witness | +64 vB × `W_SIG` per sig |
| Extra writes | N/A | +50 vB × extra account writes |

---

## 6. Transactions & state

| Parameter | Bitcoin | Guld 2.0 | Match? | Notes |
|-----------|---------|----------|--------|-------|
| State model | UTXO set | Accounts (names + balances) | **Diverge** | Identity-first |
| Tx types | Script / witness | Fixed enum (Transfer, Register*, …) | **Diverge** | No L0 VM |
| Serialization | Bitcoin custom wire | **BARE** (A2 locked); JSON HTTP + legacy P2P v1 | **Diverge** | [wire-codec-comparison.md](./wire-codec-comparison.md), [`schemas/`](../../schemas/README.md) |
| Signatures | ECDSA/secp256k1 | Ed25519 | **Diverge** | PQ migration path later |
| Address | Base58 / Bech32 | Registered **names** | **Diverge** | Core product |
| Account ID | N/A | `tagged_hash(name ‖ 0x00 ‖ key)` | **Diverge** | A3 — working in code |

---

## 7. Identity & names (Guld-only)

| Parameter | Value | Bitcoin analogue |
|-----------|-------|------------------|
| `REGISTRATION_PERIOD_BLOCKS` | 52_560 | N/A |
| `L_cap` (letter fee table) | 6 | N/A (A8 locked) |
| `MAX_SUBACCOUNTS` | 8 | N/A |
| `F_sub` | 0.1 GULD | N/A |
| Pay-or-release settle | `SettleRegistration` | N/A |

---

## 8. Genesis & legacy (Guld-only)

| Parameter | Simba | Notes |
|-----------|-------|-------|
| `chain_id` | 2 | Bitcoin: network magic / chain params |
| Import manifest | **x = 960,975.39527052 GULD** (A7/016); hash `0x59a39af…` | Bitcoin: no legacy ledger |
| `import_manifest_hash` in state | Yes | A9 |
| Foreign names at genesis | **None** (A11) — dapps register like anyone else | N/A |

---

## 9. Network & node

| Parameter | Bitcoin Core | Guld |
|-----------|--------------|------|
| P2P | Custom + compact blocks | libp2p (spec 09) |
| Block sync | headers + blocks | Hello + headers + blocks |
| RPC | JSON-RPC | JSON-RPC + HTTP `/api/v1` |
| Merged mining parent | Possible (SHA256d) | Future |

---

## 10. Decision log (maintainer)

| Date | Decision | Action |
|------|----------|--------|
| 2026-09-26 | PoW = SHA256d | Spec 06 §2 locked |
| 2026-09-26 | Retarget = **2016 blocks**, not per-block | `retarget.rs` + spec 06 §2.4 |
| 2026-09-26 | **Leading-zero bits locked** for PoW target (not `nBits`); merged mining = tooling/GIP |
| 2026-09-26 | **A2 locked — BARE** wire (Rust/JS/Python); JSON at HTTP only |
| 2026-09-26 | **GIP-22 Accepted** — `RewardCommit` + `ClaimReward` at h+100; mempool-open |
| 2026-09-26 | Coinbase maturity = **100 blocks** (claim inclusion, Bitcoin-class) |
| | Halving vs Guld inflation | **Keep Guld schedule** |

---

## How to use this doc

1. Before changing a constant in `guld-state` / `guld-consensus`, add or update a row here.
2. If **Match** is possible, prefer Bitcoin’s name and value unless the whitepaper commits otherwise.
3. Link Simba task [007](../tasks/open/007-simba-beta-public-readiness.md) A-rows to rows in this table.
