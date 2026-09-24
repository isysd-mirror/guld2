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

## 3. Registration protocol fees (→ miner)

Registration fees MUST be paid to the **block miner** who includes the transaction (same coinbase path as inclusion fees). They MUST NOT be burned or spread across future blocks.

**Lottery:** whoever mines the block that includes a registration receives the full protocol fee in addition to block subsidy and inclusion fees.

### 3.1 Registration fees — **per year**

Fees buy **`REGISTRATION_PERIOD = BLOCKS_PER_YEAR` (52_560)** blocks of control ([`../intents/name-expiry.md`](../intents/name-expiry.md)). At period end, miners include `SettleRegistration`: auto-debit `F_*` or release the name (leftover dust `< F_*` → miner).

#### Individual root names — letter-based `F_user(L)`

**Intent:** [`../intents/letter-based-registration-fees.md`](../intents/letter-based-registration-fees.md)

```text
L = count of Unicode alphabetic characters in the root label (NFC)
    hyphens, digits, and punctuation do not count
L_eff = min(L, L_cap)     // L_cap = 6 (draft)
F_user = FLOOR[L_eff]     // lookup table; same fee on register and settle
```

| L (letters) | `F_user(L)` / year | Example |
|-------------|-------------------|---------|
| 1 | **1_000 GULD** | `x` |
| 2 | **100 GULD** | `ai` |
| 3 | **10 GULD** | `bob` |
| 4 | **5 GULD** | |
| 5 | **2 GULD** | `isysd` |
| ≥ 6 | **1 GULD** | `carlos`, `jorge-luise-gonzalez` |

Long names hit the **floor at 6 letters** — `jorge-luise-gonzalez` (17 letters) pays **1 GULD**/year, same as any name with ≥ 6 letters.

#### Other kinds (flat)

| Kind | Symbol | Amount / year |
|------|--------|----------------|
| Subaccount | `F_sub` | **0.1 GULD** |
| Group | `F_group(n)` | **2 + n** GULD (`n` = initial key count) |

Legacy-locked 1.0 imports are **not** settled until claimed; `ClaimLegacy` stays open indefinitely. After claim, yearly settle uses **`F_user(L)`** for their name. Keep the wallet funded before expiry — there is no separate renew tx.

Examples: 1-of-1 group = **3 GULD**/yr; 5-key group = **7 GULD**/yr.

### 3.2 Design goals

- **Scarcity pricing:** 1–3 letter root names are premium; ordinary long names stay ~**1 GULD**/year.
- **Anti-spam:** meaningful cost to squat short global labels.
- **Cheaper subs:** subaccounts stay **0.1 GULD**/year under an already-registered parent.
- **Miner incentive:** registrations are valuable to include (protocol fee + inclusion fee).

### 3.3 RPC

`guld_estimateRegistrationBurn(name, kind?, nKeys?, height?)` returns:

```json
{
  "fee": "<quanta>",
  "burn": "<quanta>",
  "height": "<h>",
  "kind": "individual|group|subaccount",
  "nKeys": <n>,
  "letterCount": <L>,
  "feeGuld": "<decimal GULD string>"
}
```

`fee` and `burn` are identical (no burn). For individuals, **`name`** is required so the node can compute `L` and `F_user(L)`. `kind`: `"individual"` (default), `"group"`, or `"subaccount"`.

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
i(y) = 0.04 ** ((y - 1) / 19)     // y = 1..20  (100% → 4% geometric)
i(y) = 0.04                        // y >= 21
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

Gross supply path: year-1 supply **2×**; year-20 supply ≈ **147.5×**; thereafter **+4%/yr**. Peak per-block subsidy ≈ **199 GULD** around years 11–12.

## 7. Component API

```text
fn tx_weight(tx: &Tx) -> u64;
fn label_letter_count(name: &Name) -> u32;
fn f_user_at(height: u64, name: &Name, params: &EconomyParams) -> Amount;  // letter table
fn f_sub_at(height: u64, params: &EconomyParams) -> Amount;   // fixed 0.1 GULD
fn f_group_at(height: u64, n: u16, params: &EconomyParams) -> Amount; // 2 + n GULD
fn subsidy(height: u64, params: &EconomyParams) -> Amount;
```

## 8. Open parameters

- Final premium table values and `L_cap` (5 vs 6)  
- Whether group root names use the same letter ladder  
- Whether name **deposits** exist alongside registration fees  
- Final audited `x` / per-name manifest hash (does not change `i(y)` shape)  
- `MAX_SUBACCOUNTS` (default **8**) — [`intents/subaccounts.md`](../intents/subaccounts.md)
