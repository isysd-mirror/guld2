# Intent: Letter-based registration fees

Status: **accepted**  
Related: [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md), [`../specs/02-identity-and-accounts.md`](../specs/02-identity-and-accounts.md), [`name-expiry.md`](name-expiry.md), [`../specs/16-sponsored-registration.md`](../specs/16-sponsored-registration.md)

## Goal

Replace flat **`F_user = 1 GULD`/year** with a **length-based** annual fee for **root individual** names. Short names (`x`, `ai`, `bob`) are premium; long names (`jorge-luise-gonzalez`) pay the floor. Caps at **6 letters** so extra-long names do not keep getting cheaper than the floor.

## Why

| Problem | How letter fees help |
|---------|----------------------|
| Global namespace is finite | 1–3 letter names are scarce; price should reflect scarcity |
| Flat 1 GULD lets squatters hoard `x` | Premium makes vanity / brand names costly |
| Long descriptive names are not scarce | Floor fee (~1 GULD) keeps ordinary registration cheap |
| Miner lottery unchanged | Full `F_user(L)` still goes to including miner |

Same mental model as premium short domains — without a resale market (pay-or-release only).

## Letter count `L`

For a **root** name (no `.`):

```text
L = count of Unicode alphabetic characters in the label (NFC)
```

- **Count:** letters only (`is_alphabetic()`), all scripts  
- **Ignore:** `-`, `_`, digits, and other punctuation  
- **Examples:** `x` → 1; `ai` → 2; `bob` → 3; `jorge-luise-gonzalez` → 17 → **capped**  
- **Subaccounts:** `parent.label` uses flat **`F_sub`** on the parent (parent already bought root namespace)  
- **Groups:** root group name uses the same **`F_user(L)`** table via **`F_group(L, n) = F_user(L) × (2 + n)`**

## Fee schedule (draft)

Cap: **`L_cap = 6`**. For `L ≥ L_cap`, fee = **`F_floor = 1 GULD`/year** (preserves 1.0 continuity for normal names).

| L | `F_user(L)` / year | Notes |
|---|-------------------|--------|
| 1 | **1_000 GULD** | e.g. `x` — available but expensive |
| 2 | **100 GULD** | e.g. `ai`, `io` |
| 3 | **10 GULD** | e.g. `bob`, `pay` |
| 4 | **5 GULD** | |
| 5 | **2 GULD** | e.g. `isysd` |
| ≥ 6 | **1 GULD** | floor — `carlos`, `jorge-luise-gonzalez`, … |

Constants live in genesis `EconomyParams` (consensus-enforced table or closed-form with cap).

## Settle / renew

`SettleRegistration` debits **`F_user(L)`** for the name’s current `L`, not a flat 1 GULD. Unfunded settle still releases the name when balance `< F_user(L)`.

Legacy-locked imports: after `ClaimLegacy`, normal yearly settle applies at **`F_user(L)`** for their imported name.

## RPC / UX

- `guld_estimateRegistrationFee` MUST accept **`name`** (or `label`) and return fee from `L`  
- Wallet / sponsor flow MUST show letter count + annual fee before pay  
- Explorer MAY show “renewal: N GULD/yr” from `L`

## Out of scope (unchanged)

- Subaccount fee **`F_sub = 0.1 GULD`/year** (flat)  
- Group **`F_group(L, n) = F_user(L) × (2 + n)` GULD/year** — e.g. 1-letter 1-of-1 = **3_000 GULD**/yr  
- Name deposits, resale, height-indexed fee ramps

## Open parameters

- Exact premium table (1k / 100 / 10 … vs smooth formula)  
- `L_cap` = 5 vs 6  
- Whether digits-only labels (`404`) count as L=0 or reject at validation  
## Next

- [x] Accept intent → lock table in spec 07 + whitepaper §3.3 / §8.7  
- [x] Implement `label_letter_count(name)` in `guld-types`  
- [x] Wire letter-based fees in `guld-state` / `guld_estimateRegistrationFee` / wallet estimate
