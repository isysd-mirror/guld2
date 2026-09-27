# Spec 07 — Fees and tokenomics

**Status:** draft  
**Whitepaper:** §3.3, §8  
**GIP:** [`../gips/gip-12.md`](../gips/gip-12.md)

## 1. Weight

```text
weight(tx) = size_bytes(canonical_tx)
           + W_SIG * n_signatures_verified
           + W_EXTRA_WRITE * max(0, n_account_writes - 1)
```

| Constant | Draft value | Meaning |
|----------|-------------|---------|
| `W_SIG` | 64 | Extra vB per signature verified |
| `W_EXTRA_WRITE` | 50 | Extra vB per account write beyond first |

`n_signatures_verified` includes cosign signatures and payer/spend sigs.

## 2. Inclusion fee (→ miner)

```text
inclusion_fee >= ceil(weight(tx) * fee_rate)   // user-chosen fee_rate
```

Relay floor: `fee_rate_min` = genesis `EconomyParams.fee_rate_min_per_vb` (default **1** quanta per weight unit). Nodes MUST reject mempool inserts with `inclusion_fee < weight(tx) × fee_rate_min` (`SettleRegistration` exempt; `RewardCommit` not mempool-eligible).

**Payout path ([GIP-22](../gips/gip-22.md)):** inclusion fees from block **`h`** txs are debited at apply and included in `RewardCommit(h).amount`; they mint when block **`h`**’s `ClaimReward` is included (~`h + 100`). `ClaimReward.inclusion_fee` pays the miner who includes the claim in block **`B`** (added to **`B`’s** `inclusion_fees`).

Optional `memo` bytes ([`03-transactions.md`](03-transactions.md) §2.1) increase `size_bytes(canonical_tx)` like any other field — there is no free metadata channel.

## 3. Registration protocol fees (→ miners, 8-block vest)

Registration / settle protocol fees MUST be paid to **miners** via **`RewardCommit` / `ClaimReward`** ([GIP-22](../gips/gip-22.md)). They MUST NOT be burned. They MUST be **spread** over **`REGISTRATION_FEE_VEST_BLOCKS = 8`** consecutive blocks starting at the inclusion height (integer split; remainder to earliest heights). Each vest share is included in that height’s `RewardCommit.amount` and mints on the matching mature claim.

**Lottery:** including a registration schedules the fee across eight heights; recovering the full protocol fee requires winning all eight. GIP: [`../gips/gip-10.md`](../gips/gip-10.md).

### 3.1 Registration fees — **per year**

Fees buy **`REGISTRATION_PERIOD = BLOCKS_PER_YEAR` (52_560)** blocks of control ([`../gips/gip-11.md`](../gips/gip-11.md)). At period end, miners include `SettleRegistration`: auto-debit `F_*` or release the name (leftover dust `< F_*` → vesting queue).

#### Individual root names — letter-based `F_user(L)`

**GIP:** [`../gips/gip-9.md`](../gips/gip-9.md)

```text
label_letter_count(name) → L   // root label only (strip parent.label for subs)
L = count of Unicode alphabetic characters (NFC); hyphens/digits/punctuation ignored
L_eff = min(L, L_cap)            // L_cap = 6 (locked v1 — task 007 A8)
F_user(L) = TABLE[L_eff]         // same fee on register, settle, and estimate
```

Implementations MUST compute `L` identically in `RegisterUsername`, `RegisterGroup`, `SettleRegistration`, and `guld_estimateRegistrationFee`.

| L (letters) | `F_user(L)` / year | Example |
|-------------|-------------------|---------|
| 1 | **1_000 GULD** | `x` |
| 2 | **100 GULD** | `ai` |
| 3 | **10 GULD** | `bob` |
| 4 | **5 GULD** | |
| 5 | **2 GULD** | `isysd` |
| ≥ 6 | **1 GULD** | `carlos`, `jorge-luise-gonzalez` |

Long names hit the **floor at 6 letters** — `jorge-luise-gonzalez` (17 letters) pays **1 GULD**/year, same as any name with ≥ 6 letters.

#### Group names — `F_group(L, n)`

Groups use the same letter ladder as individuals, scaled by signer count:

```text
F_group(L, n) = F_user(L) × (2 + n)     // n = key count
```

| Example | L | n | Fee / year |
|---------|---|---|------------|
| 1-letter 1-of-1 group `x` | 1 | 1 | **3_000 GULD** (= 1000 × 3) |
| 2-letter 1-of-1 group `ai` | 2 | 1 | **300 GULD** (= 100 × 3) |
| Long-name 5-key group | ≥6 | 5 | **7 GULD** (= 1 × 7) |

**When charged:**

| Event | Amount |
|-------|--------|
| `RegisterGroup` | Full `F_group(L, n)` for initial `n` |
| `SettleRegistration` (funded) | Full `F_group(L, n)` for **current** `n` |
| `RotateKeys` with `n_new > n_old` | **Delta only:** `F_group(L, n_new) − F_group(L, n_old)` = `F_user(L) × (n_new − n_old)` |
| `RotateKeys` with `n_new ≤ n_old` | No protocol fee (inclusion only) |

This closes registering a cheap small group then rotating to a large signer set without paying for the extra proof burden.

#### Subaccounts (flat)

| Kind | Symbol | Amount / year |
|------|--------|----------------|
| Subaccount | `F_sub` | **0.1 GULD** |

Legacy-locked 1.0 imports are **not** settled until claimed; `ClaimLegacy` stays open indefinitely. After claim, yearly settle uses **`F_user(L)`** for their name. Keep the wallet funded before expiry — there is no separate renew tx.

Examples: 1-letter 1-of-1 group = **3_000 GULD**/yr; long-name 5-key group = **7 GULD**/yr.

### 3.2 Design goals

- **Scarcity pricing:** 1–3 letter root names are premium; ordinary long names stay ~**1 GULD**/year.
- **Anti-spam:** meaningful cost to squat short global labels.
- **Cheaper subs:** subaccounts stay **0.1 GULD**/year under an already-registered parent.
- **Miner incentive:** registrations still pay the includer the first vest share plus inclusion fee; remaining shares reward subsequent block winners.

### 3.3 RPC

`guld_estimateRegistrationFee(name, kind?, nKeys?, height?)` returns:

```json
{
  "fee": "<quanta>",
  "height": "<h>",
  "kind": "individual|group|subaccount",
  "nKeys": <n>,
  "letterCount": <L>,
  "feeGuld": "<decimal GULD string>"
}
```

`fee` is paid to miners over 8 blocks (not burned). Deprecated alias: `guld_estimateRegistrationBurn`. For individuals and groups, **`name`** is required so the node can compute `L` and `F_user(L)` (groups: `F_group(L, n)`). `kind`: `"individual"` (default), `"group"`, or `"subaccount"`.

## 4. Block weight limit

`BLOCK_WEIGHT_LIMIT = 4_000_000` (draft). Sum of `weight(tx)` in a block MUST NOT exceed limit.

## 5. Block time

| Constant | Value |
|----------|-------|
| `TARGET_BLOCK_INTERVAL` | **600** seconds (10 minutes) |
| `BLOCKS_PER_YEAR` | **52_560** (= 365 × 144) |
| `COINBASE_MATURITY_BLOCKS` | **100** (Bitcoin `COINBASE_MATURITY`; spec [06 §4](06-blocks-and-consensus.md)) |

Miner block rewards (subsidy + inclusion + vested registration share) MUST NOT mint until a matching **`ClaimReward`** is included at block height **`≥ earn_height + 100`** ([GIP-22](../gips/gip-22.md), [06 §4](06-blocks-and-consensus.md)). Claims MAY sit in mempool before maturity.

## 6. Issuance (locked v1)

Let `x = genesis_premine_supply` = **960,975.39527052** GULD (sum of imported member `*:Assets` rows; ERC20 omitted — [`15-ledger-import.md`](15-ledger-import.md) A7 / task 016).

Decimals: **10** (mandatory for exact 1.0 import).

### 6.1 Inflation rate (annual index)

Year index `y = floor((height - 1) / BLOCKS_PER_YEAR) + 1` (y = 1 at first mined block). Used for registration periods and the macro `(2/3)` decay table.

```text
i(y) = max(0.04, (2/3) ** (y - 1))   // y ≥ 1: 100%, ~66.7%, ~44.4%, … then 4% from year 9
```

### 6.2 Subsidy (2016-block epochs — locked)

Issuance steps every **`ISSUANCE_PERIOD_BLOCKS = 2016`**, aligned with difficulty retarget ([06 §2.4](06-blocks-and-consensus.md)). Within an epoch the per-block subsidy is **flat**; it steps at the same heights as PoW retarget (epoch 1: heights `1..2015`; epoch `k ≥ 2` starts at `(k-1) × 2016`).

Let `S(0) = x`. Issuance epoch `e` (1-indexed): epoch 1 = heights `1..2015`; epoch `k ≥ 2` starts at height `(k-1) × 2016` (same boundary as difficulty retarget). At the start of epoch `e`, let `y = year(height_at_epoch_start(e))` and supply `S`:

```text
i_period(y) = (1 + i(y)) ** (2016 / BLOCKS_PER_YEAR) - 1
epoch_issuance(e) = S * i_period(y)
subsidy(height) = epoch_issuance(e) / len(e)     // len(1) = 2015; len(e≥2) = 2016
S ← S + epoch_issuance(e)   // once per epoch
```

`i_period(y)` spreads each year’s nominal rate across ~26 retarget windows (~14 days each), giving a **smoother** curve than one step per year while preserving the same long-run `(2/3)^(y-1)` schedule on calendar years.

`subsidy(height)` MUST be a pure consensus function of `height` and genesis `x`. Full year-by-year table and graphs: whitepaper §8.6 (graphs may be updated for epoch steps).

Gross supply path (unchanged macro): year-1 supply ≈ **2×**; year-20 supply ≈ **15.6×**; thereafter **+4%/yr**. Peak per-block subsidy remains ≈ **27 GULD** around year 3 (slightly earlier/smooth ramp vs flat yearly steps).

**On-chain supply timing (GIP-22):** `subsidy(h)` is committed at **`h`** but typically mints at claim inclusion near **`h + 100`** — macro schedule anchors to commit height; circulating supply lags by ~100 blocks.

## 7. Component API

```text
fn tx_weight(tx: &Tx) -> u64;
fn label_letter_count(name: &Name) -> u32;
fn f_user_at(height: u64, name: &Name, params: &EconomyParams) -> Amount;  // letter table
fn f_sub_at(height: u64, params: &EconomyParams) -> Amount;   // fixed 0.1 GULD
fn f_group_at(height: u64, name: &Name, n: u16, params: &EconomyParams) -> Amount; // F_user(L) × (2 + n)
fn subsidy(height: u64, params: &EconomyParams) -> Amount;
fn vest_registration_fee_shares(fee: u128) -> Vec<u128>;  // REGISTRATION_FEE_VEST_BLOCKS = 8
```

## 8. Open parameters

- Mainnet re-audit of **x** if manifest is regenerated (Simba pin locked — A7; [`15-ledger-import.md`](15-ledger-import.md) §2.1)  
- `MAX_SUBACCOUNTS` (default **8**) — [`../gips/gip-12.md`](../gips/gip-12.md)

**Locked (A8):** `L_cap = 6`; premium table in §3.1; `F_group(L, n) = F_user(L) × (2 + n)` — [GIP-9](../gips/gip-9.md) Final.
