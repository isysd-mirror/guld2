# Spec 07 — Fees and tokenomics

**Status:** draft  
**Whitepaper:** §3.3, §8  
**Intent:** [`../intents/subaccounts.md`](../intents/subaccounts.md)

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

Relay floor: `fee_rate_min` (**TBD**). Paid to block miner via coinbase accounting.

Optional `memo` bytes ([`03-transactions.md`](03-transactions.md) §2.1) increase `size_bytes(canonical_tx)` like any other field — there is no free metadata channel.

## 3. Registration protocol fees (→ miners, 8-block vest)

Registration / settle protocol fees MUST be paid to **miners** via coinbase accounting. They MUST NOT be burned. They MUST be **spread** over **`REGISTRATION_FEE_VEST_BLOCKS = 8`** consecutive blocks starting at the inclusion height (integer split; remainder to earliest heights). Inclusion (weight) fees remain one-shot to the including miner.

**Lottery:** including a registration schedules the fee across eight heights; recovering the full protocol fee requires winning all eight. Intent: [`../intents/registration-fee-vesting.md`](../intents/registration-fee-vesting.md).

### 3.1 Registration fees — **per year**

Fees buy **`REGISTRATION_PERIOD = BLOCKS_PER_YEAR` (52_560)** blocks of control ([`../intents/name-expiry.md`](../intents/name-expiry.md)). At period end, miners include `SettleRegistration`: auto-debit `F_*` or release the name (leftover dust `< F_*` → vesting queue).

#### Individual root names — letter-based `F_user(L)`

**Intent:** [`../intents/letter-based-registration-fees.md`](../intents/letter-based-registration-fees.md)

```text
label_letter_count(name) → L   // root label only (strip parent.label for subs)
L = count of Unicode alphabetic characters (NFC); hyphens/digits/punctuation ignored
L_eff = min(L, L_cap)            // L_cap = 6 (draft)
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
F_group(L, n) = F_user(L) × (2 + n)     // n = initial key count
```

| Example | L | n | Fee / year |
|---------|---|---|------------|
| 1-letter 1-of-1 group `x` | 1 | 1 | **3_000 GULD** (= 1000 × 3) |
| 2-letter 1-of-1 group `ai` | 2 | 1 | **300 GULD** (= 100 × 3) |
| Long-name 5-key group | ≥6 | 5 | **7 GULD** (= 1 × 7) |

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

## 6. Issuance (locked draft)

Let `x = genesis_premine_supply` ≈ **959,947.19527052** GULD (member `*:Assets` only; ERC20 omitted — [`15-ledger-import.md`](15-ledger-import.md)).

Decimals: **10** (mandatory for exact 1.0 import).

### 6.1 Inflation rate

Year index `y = floor((height - 1) / BLOCKS_PER_YEAR) + 1` (y = 1 at first mined block).

```text
i(y) = max(0.04, (2/3) ** (y - 1))   // y ≥ 1: 100%, ~66.7%, ~44.4%, … then 4% from year 9
```

### 6.2 Subsidy

Let `S(0) = x`. For each year y ≥ 1:

```text
annual_issuance(y) = S(y - 1) * i(y)
S(y) = S(y - 1) + annual_issuance(y)
subsidy(height) = annual_issuance(y) / BLOCKS_PER_YEAR
                 // constant within year y
```

`subsidy(height)` MUST be a pure consensus function of `height` and genesis `x`. Full year-by-year table and graphs: whitepaper §8.6.

Gross supply path: year-1 supply **2×**; year-20 supply ≈ **15.6×**; thereafter **+4%/yr**. Peak per-block subsidy ≈ **27 GULD** around year 3.

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

- Final premium table values and `L_cap` (5 vs 6)  
- Whether name **deposits** exist alongside registration fees  
- Final audited `x` / per-name manifest hash (does not change `i(y)` shape)  
- `MAX_SUBACCOUNTS` (default **8**) — [`intents/subaccounts.md`](../intents/subaccounts.md)
