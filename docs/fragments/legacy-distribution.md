# Guld 1.0 accounts and legacy distribution

**Status:** living disclosure brief ([GIP-24](../gips/gip-24.md))  
**Audience:** operators, auditors, and 2.0 users who want an honest picture of the imported premine  
**Normative rules:** [spec 15](../specs/15-ledger-import.md), [GIP-14](../gips/gip-14.md)  
**Simba artifacts:** [`import-manifest.json`](../../data/genesis/simba/import-manifest.json), [`negatives.json`](../../data/genesis/simba/negatives.json), [`omissions.json`](../../data/genesis/simba/omissions.json)  
**Archive SoT:** `archives/ledger-guld/`, concatenated `archives/guld-ledger-all.dat`

This document explains **what Guld 1.0 accounts were**, **how balances got there**, and **what 2.0 inherits**. Numbers below are measured from the committed Simba manifest unless noted; regenerate with the next genesis ceremony ([task 012](../tasks/done/2026-09/012-simba-genesis-ceremony.md)).

---

## 1. Continuity principles (non-negotiable)

Guld 2.0 is a **hard fork** of a 1.0 ledger snapshot. Continuity means:

1. **Every 1.0 journal effect that affected member `Assets` is respected** — including registration fees, fee rebates, transfers, and Equity grants. We do not rewrite history to make the premine look flatter.
2. **Every 1.0 name that holds (or held) an `Assets` balance must remain representable as a 2.0 `Name`.** Silent drops during preprocess were a **bug** — fixed by explicit remap + fail-closed preprocess ([task 016](../tasks/done/2026-09/016-reconcile-genesis-x-vs-manifest.md)).
3. **Import rule for circulating balances:** `imported = max(0, quantity(name:Assets))` at the Assets **root**, commodity `GULD` only. Negatives import as **0**; the name is still in history for `ClaimLegacy`.
4. **No haircut, no consolidation, no reassignment of names** for optics. Policy changes would need a separate Standards GIP.

What 2.0 **does not** import: Income / Expenses / Liabilities / Equity trees as spendable balances ([spec 15](../specs/15-ledger-import.md) §2). Those trees explain *how* Assets got their values; only Assets roots become on-chain coins.

---

## 2. What a Guld 1.0 “account” was

1.0 used **ledger-cli** multi-book accounting. Each username was a set of accounts, not a single balance field:

| Tree | Meaning on 1.0 | Imported to 2.0? |
|------|----------------|------------------|
| `name:Assets` | Spendable / claimable GULD | **Yes** (if &gt; 0) |
| `name:Income:*` | Credits received (grants, rebates, transfers in) | No (explanatory) |
| `name:Expenses:*` | Debits paid (esp. `Expenses:guld:register`) | No (explanatory) |
| `guld:Equity:name` | Protocol Equity reservation for that contributor | No (mirror of grant policy) |
| `guld:Income:register:*` | Protocol-side registration fee income | No |
| `guld:Assets:ERC20` | Foreign-mirror / ERC20 bucket | **Omitted** (see §7) |

A username could exist with **Equity reserved** and **Assets credited** in the same pre-founding journal entry — the classic grant pattern:

```text
name:Assets              +100 GULD
name:Income:guld         -100 GULD
guld:Liabilities         -100 GULD
guld:Equity:name         +100 GULD
```

The Equity leg recorded *why* the tokens existed (contributor reservation). The Assets leg is what 2.0 imports.

---

## 3. Upstream Equity policy and mass 100 GULD grants

Guld 1.0 ran an **upstream contributor Equity** policy: the network reserved tokens for people and projects in the dependency / identity graph — package authors, known open-source handles, and symbolic figures — **so that if they ever registered PGP keys (or otherwise proved control), the grant was already booked**.

### 3.1 Flat 100 GULD cohort

On the Simba manifest:

| Fact | Value |
|------|-------|
| Exact **100 GULD** rows | **2,023** |
| Mass | **201,600 GULD** (~**21.0%** of imported sum) |

Most of these come from **2016-06-01 “guld pre-founding contributions”** journals under `archives/ledger-guld/guld/` (and later similar grant batches). Many smaller grants were **mined from package-manager graphs** (npm and related) around the Guld 1.0 stack and its dependencies: the username often matches a public package or GitHub/npm handle, not a person who ever ran a Guld node.

### 3.2 Larger reserved / symbolic grants

Examples (not exhaustive):

| Name | Manifest balance | Notes |
|------|------------------|-------|
| `satoshi` | **1,000** GULD | Equity reservation for a symbolic upstream figure; **unbound** (no PGP in `keys-pgp`) |
| `torvalds` | **10,000** GULD | Same class of reserved upstream recognition; unbound |
| `W1ll1am` / `w1ll1am` | **1,000** after lowercase merge | Case fold at import; see §6 |

Treat these as **historical Equity reservations**, not as “team treasury dressed up as users.” Whether any given reserved name ever claims is a **1.0 identity / social-proof problem**, not something 2.0 can honestly rewrite.

### 3.3 Practical circulation

2.0 users MAY treat long-unclaimed reserved grants (e.g. `satoshi`) as **effectively out of circulation** for market and security intuition — the coins still exist on-chain as legacy-locked balances, claims stay open indefinitely, and nothing burns them. That is a **user heuristic**, not a consensus burn.

---

## 4. Registration fees, rebates, and negative Assets

1.0 charged **registration fees** against `name:Assets` → `name:Expenses:guld:register`, with protocol mirrors under `guld:Income:register:{individual|group}:name`. Many registrations later received a **~90% fee rebate** (`name:Income:guld:register:fee-rebate`).

Those journal lines are **first-class history**. Respecting them means:

- Someone who registered with **no prior Assets** can end the snapshot with **negative `Assets`** equal to the unrebated residue (typically **10% of the fee**, or a flat **0.1** when the late individual fee had no rebate).
- 2.0 imports `max(0, Assets)` → these names get **0** coins and remain claimable names if policy allows (balance 0 is still a name history; spendable import is empty).

### 4.1 Negative Assets appendix (Simba / live journal)

Measured with `ledger bal --flat Assets` on `archives/guld-ledger-all.dat` (**15** names, sum **−1,028.2 GULD**):

| Name | Assets | Pattern |
|------|--------|---------|
| `spartan` | −1,000 | Group fee 10,000 − rebate 9,000 |
| `hodlmybeer` | −25 | Group fee 250 − rebate 225 |
| `300e` | −2 | Group fee 20 − rebate 18 |
| `mozilla1`, `w1ll1am`, `ira` | −0.1 each | Individual fee 1 − rebate 0.9 |
| `annawanderer`, `ayayay`, `babybeatrice`, `defrancod`, `ganguskhan`, `hnathan`, `jaimec`, `lucerogray94`, `melmanci` | −0.1 each | Individual fee 0.1, **no** rebate |

**Treatment:** import **0**; machine-readable list in [`data/genesis/simba/negatives.json`](../../data/genesis/simba/negatives.json) ([task 018](../tasks/done/2026-09/018-publish-omitted-buckets-and-negatives.md)). This is appropriate: the fee was paid (or booked); we do not invent positive balances to paper over empty wallets.

---

## 5. Unlock paths: PGP vs attestation (legacy identity debt)

Import creates **legacy-locked** accounts. Spend requires `ClaimLegacy` ([spec 15](../specs/15-ledger-import.md) §5):

| Proof | When |
|-------|------|
| `pgp_cleartext_v1` | Name has keys under `archives/keys-pgp/<name>/` |
| `isysd_attestation_v1` | No PGP binding — groups, package-manager grants, missed registration, symbolic Equity |
| `dev_unlock_v1` | Local `--dev` only |

### 5.1 Simba unlock split (committed manifest)

| Path | Rows | Supply (GULD) | Share of row sum |
|------|------|---------------|------------------|
| PGP-bound (`binding_hint`) | **60** / 2,217 | **≈ 179,439.95** | **≈ 18.7%** |
| Unbound (attestation) | **2,157** / 2,217 | **≈ 781,535.45** | **≈ 81.3%** |

The unbound majority includes the largest holders — notably **groups** `mizim`, `raadyx`, `tigoctm`, `betatown`, `zimmi` — and nearly all flat 100 GULD package-manager / Equity grants. **Proof of ownership for those names was always off-consensus social context** on 1.0 (npm, GitHub, email, operator knowledge, group membership). 2.0 did not invent that dependency; it **inherited** it. Diversifying attestation is [GIP-25](../gips/gip-25.md) (Draft) — not a reason to haircut or drop grants now.

### 5.2 Groups and continuity

Several large unbound balances are **1.0 group accounts**, not lone individuals:

- **`mizim`** was a **2-of-2** cosigning group between **`isysd` and `cz`**. Once `cz` has claimed her 2.0 keys (and `isysd` already has), the parties can **formalize that same 2-of-2** under ordinary 2.0 group / threshold keys on the imported `mizim` name. Until then it stays legacy-locked like any other unbound row.
- **`raadyx`**, **`tigoctm`**, **`betatown`**, **`zimmi`**, and other groups had **other members**. This brief will **not** disclose or arbitrate their internal ledgers, membership lists, or dispute history. Import preserves the **group name and Assets balance**; who may authorize a claim is still the 1.0 / attestation path, not a public roster published here.

**Sequencing for people who were active on 1.0:** individuals should **`ClaimLegacy` and upgrade their own keys first**. Group upgrades, threshold setups, and continuity among former co-signers can then be discussed **among those parties** — off this document, without turning the distribution brief into a membership court.

---

## 6. Names must all be valid on 2.0

2.0 `Name` rules (lowercase labels, no trailing `-`, no `--`, optional one-dot subaccount) are stricter than raw 1.0 journal strings.

**Closed (task 016):** preprocess remaps seven illegal hyphen names and **fails closed** on any other unmapped illegal string — no silent drops.

| 1.0 name | → 2.0 | Balance |
|----------|-------|---------|
| `luk-` | `luk` | 100 |
| `matt-` | `matt` | 100 |
| `page-` | `page` | 100 |
| `qix-` | `qix` | 100 |
| `shade-` | `shade` | 100 |
| `xavi-` | `xavi` | 100 |
| `y--` | `y` | 100 |

Case fold (`W1ll1am` → `w1ll1am`) and merge are fine. `gap.json` remains as imported (parses as a one-dot subaccount form).

---

## 7. Omitted buckets

Machine-readable: [`data/genesis/simba/omissions.json`](../../data/genesis/simba/omissions.json).

| Bucket | Size (GULD) | Treatment |
|--------|-------------|-----------|
| `guld:Assets:ERC20` | **100,000.0000000000** | Omitted from circulating 2.0 premine (foreign mirror; not member `*:Assets`) |
| `mizim:Assets:Credit:bitcoin` | **1,000.0000000000** | Credit subtree; root `mizim:Assets` already imported — do not double-count |
| `mizim:Assets:Credit:ethereum` | **1,000.0000000000** | Same |

---

## 8. Simba distribution brief (GIP-24 checklist)

Source: `data/genesis/simba/import-manifest.json`  
`import_manifest_hash` = `0x59a39af461d66fa1ef892708f8fa8838684d812cccfbe253816a34f448980e70`

### 8.1 Holders and sum

| Item | Value |
|------|-------|
| Positive import rows | **2,217** |
| Sum of row balances | **960,975.39527052 GULD** (9,609,753,952,705,200 quanta) |
| Economy **`x`** (`GENESIS_X_QUANTA`) | **960,975.39527052 GULD** (= sum of rows) |

### 8.2 Reconciliation: `x` vs row sum

**Closed (task 016):** `x := sum(imported rows)`. Preprocess remaps seven illegal hyphen names and fails closed on any other unmapped illegal 1.0 string.

| Quantity | GULD | Notes |
|----------|------|-------|
| Positive `*:Assets` roots (journal) | 960,975.39527052 | |
| Negative roots | −1,028.20000000 | import **0** — §4 / task 018 |
| Remapped hyphen grants | +700.00000000 | `luk-`…`y--` → legal names |
| **Manifest / `x`** | **960,975.39527052** | agree |

Historical note: the prior pin used **net** Assets (959,947.19527052) while silently dropping 700 GULD of illegal names — that gap (+328.2) is obsolete after this regenesis.

### 8.3 Concentration

| Cohort | GULD | Share of row sum |
|--------|------|------------------|
| Top 1 | 359,868.10 | **37.4%** |
| Top 5 | 542,727.60 | **56.5%** |
| Top 10 | 607,947.28 | **63.3%** |
| Top 20 | 677,017.15 | **70.5%** |

**Top 10 names**

| Rank | Name | Balance (GULD) | Kind | Unlock |
|------|------|----------------|------|--------|
| 1 | `mizim` | 359,868.10 | **group** | attestation |
| 2 | `isysd` | 82,957.87133823 | individual | PGP |
| 3 | `cz` | 41,057.271 | individual | PGP |
| 4 | `raadyx` | 31,277.36 | **group** | attestation |
| 5 | `tigoctm` | 27,567 | **group** | attestation |
| 6 | `betatown` | 19,000 | **group** | attestation |
| 7 | `zimmi` | 16,217.68 | **group** | attestation |
| 8 | `aehaynes` | 10,002 | individual | attestation |
| 9 | `minotaur` | 10,000 | individual | attestation |
| 10 | `torvalds` | 10,000 | individual (reserved) | attestation |

`mizim`, `raadyx`, `tigoctm`, `betatown`, and `zimmi` are **1.0 group accounts**. `mizim` is the disclosed **isysd + cz (2-of-2)** case (§5.2); other groups’ internal membership is **not** published here. Together these groups dominate top-heavy unbound supply until claims / threshold formalization.

This is **1:1 continuity of historical balances**, not a claim of peer-fair initial distribution.

### 8.4 Mass cohorts

See §3 (**2,023** × 100 GULD after hyphen remaps). Remaining rows: small dust / fee residues, mid-size holders, and large named accounts above.

### 8.5 Framing for users

- **Imported supply** is concentrated; a large share is **Equity / package-manager reserved** or sits in **1.0 groups** (see §5.2) and may move only after key upgrades / cosign formalization.
- **Unlock authority** for most supply is still **`isysd` attestation** until GIP-25 (or equivalent) lands — a trust fact, not a hidden one. Active holders: claim personal keys first; group continuity is among former members, not a public arbitration process.
- **New issuance** after genesis is PoW subsidy on top of disclosed `x` / row sum ([spec 07](../specs/07-fees-and-tokenomics.md)).

---

## 9. Related documents

| Doc | Role |
|-----|------|
| [GIP-24](../gips/gip-24.md) | Informational requirement for this brief |
| [GIP-14](../gips/gip-14.md) / [spec 15](../specs/15-ledger-import.md) | Import + ClaimLegacy rules |
| [GIP-25](../gips/gip-25.md) | Diversify attestation (Draft) |
| [task 016](../tasks/done/2026-09/016-reconcile-genesis-x-vs-manifest.md) | `x` vs manifest + name-remap (**done**) |
| [task 018](../tasks/done/2026-09/018-publish-omitted-buckets-and-negatives.md) | Negatives / omissions appendix (**done**) |
| [`negatives.json`](../../data/genesis/simba/negatives.json) / [`omissions.json`](../../data/genesis/simba/omissions.json) | Machine-readable appendices |
| [`data/genesis/simba/README.md`](../../data/genesis/simba/README.md) | Simba pins + ceremony |
| [FAQ](../FAQ.md) | Short user-facing answers |

---

## History

- 2026-09-26: Initial brief from Simba manifest audit + maintainer continuity rules (respect fees/rebates/names; Equity / package-manager narrative; negatives as fee residue).
- 2026-09-26: Task 016 regenesis — remapped 7 hyphen names; `x = sum(rows) = 960,975.39527052`; tip `0xadbff540…`.
- 2026-09-26: Task 018 — committed `negatives.json` + `omissions.json` under `data/genesis/simba/`.
