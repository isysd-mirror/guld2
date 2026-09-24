# Spec 02 — Identity and accounts

**Status:** draft  
**Related:** [`03-transactions.md`](03-transactions.md), [`08-cas-and-homes.md`](08-cas-and-homes.md), [`../intents/subaccounts.md`](../intents/subaccounts.md)

## 1. Names

- A **name** is a UTF-8 NFC string.
- Length: **1..=64** bytes UTF-8.
- **Root** charset (**draft**): `a-z`, `0-9`, `-` — MUST match `^[a-z0-9]+(-[a-z0-9]+)*$`.
- **Subaccount** form: `{parent}.{label}` with exactly **one** `.`; both sides are root labels. Nesting (`a.b.c`) MUST be rejected.
- Names are **globally unique** among registered accounts (full string, including the dot).
- Comparison is exact on the canonical form (no case folding beyond requiring lowercase).

## 2. Account kinds

| Kind | Registration | Notes |
|------|--------------|-------|
| `individual` | `RegisterUsername` | One or more keys; typical threshold 1 |
| `group` | `RegisterGroup` | `n` keys; fee = `2 + n` GULD |
| `subaccount` | `RegisterSubaccount` | Under an **individual** parent only; max **8** live |
| `network` | Genesis only | Reserved name **`guld`** |
| `foreign_chain` | Genesis reserved (e.g. `bitcoin`, `ethereum`) | Tip via foreign consensus proof kinds — [`13-foreign-chains.md`](13-foreign-chains.md) |

Groups MUST NOT open subaccounts in v1.

## 3. Account state (logical)

```text
Account {
  name: Name,
  account_id: AccountId,
  kind: individual | group | subaccount | network | foreign_chain,
  parent: optional Name,     // required when kind = subaccount
  keys: Vec<Ed25519Pubkey>,      // 1..=MAX_KEYS
  threshold: u16,                // 1..=keys.len()
  roles: optional map key_index -> { tip, spend, recover }  // TBD
  nonce: u64,                    // tip/spend sequencing
  master_hash: Hash32,
  balance: Amount,               // GULD base units
  expires_at_height: u64,        // soft registration; u64::MAX = never
  remotes: Vec<RemoteHint>,      // non-consensus convenience
}
```

`MAX_KEYS` draft: **256**. `MAX_SUBACCOUNTS` draft: **8** live per individual parent.

### 3.0 Pay-or-release registration expiry

Fees buy **one year** of control (`REGISTRATION_PERIOD = BLOCKS_PER_YEAR`). See [`../intents/name-expiry.md`](../intents/name-expiry.md).

- Current while `chain_height < expires_at_height`; due for `SettleRegistration` when `chain_height >= expires_at_height`.
- **Pay-or-release:** miners include permissionless `SettleRegistration` — debit `F_*` and extend, or delete the name and pay leftover dust to the miner.
- Parent release **cascades** delete of live subaccounts.
- Legacy-locked imports: settle forbidden; `ClaimLegacy` open indefinitely. After claim: normal 1y period.
- Network / foreign: `u64::MAX`. No resale market; lost keys ⇒ eventually unfunded settle ⇒ name free.

### 3.1 `master_hash`

```text
master_hash = tagged_hash(
  "guld/master_hash/v1",
  home_tree_root ‖ meta_root ‖ schema_version_u32
)
```

- `home_tree_root`: SHA-256 Merkle root (or equivalent) of the account **home** object tree.  
- Home encoding is a **hash tree of objects**, not git, at the network layer.  
- Leaf formats under the home (git packs, binaries, …) are opaque blobs addressed by `ObjectId`.

### 3.2 Remote hints

```text
RemoteHint { url: String, kind: "git" | "http" | "other" }
```

Hints MUST NOT affect validation. Clients/leaf-hosts MAY use them to fetch bytes.

### 3.3 Subaccounts

- Spend authority is **only** the subaccount’s keys (parent does not co-sign Transfers).
- Parent pays `F_sub` to register; see [`03-transactions.md`](03-transactions.md) `RegisterSubaccount`.
- Transfers address the full dotted name (`isysd.mobile`).

## 4. Reserved account `guld`

| Rule | Requirement |
|------|-------------|
| Registration | MUST NOT be available via `RegisterUsername` / `RegisterGroup` |
| Genesis | MUST exist at genesis with network key policy |
| Contents | Protocol software + consensus rule parameters (node, core, libs, clients, schemas, …) |
| Full nodes | MUST fully clone CAS objects for the current `guld` `master_hash` |
| Sub-leaves | Implementation repos (e.g. this `guld` codebase) are sub-leaves under the `guld` home |

Protocol activation / upgrades: see [`06-blocks-and-consensus.md`](06-blocks-and-consensus.md) and [`08-cas-and-homes.md`](08-cas-and-homes.md).

## 5. Amounts

- Currency code: **GULD**  
- Base unit: integer **quanta** with **10** decimal places (1 GULD = 10¹⁰ quanta), matching the maximum precision observed in the Guld 1.0 ledger journals.  
- `Amount` is `u128` quanta in state.

## 5.1 Legacy import fields

Accounts created from the 1.0 import MAY include:

```text
legacy: optional LegacyState  // see 15-ledger-import.md
```

While `legacy.status = locked`, spend/tip txs MUST be rejected except `ClaimLegacy`.

## 6. Open parameters

- Role bitfield vs separate thresholds  
- Exact Merkle tree layout for homes ([`08-cas-and-homes.md`](08-cas-and-homes.md))  
- Legacy binding-set format ([`15-ledger-import.md`](15-ledger-import.md))  
- `CloseSubaccount` (free a live slot) — later
