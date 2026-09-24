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
| `group` | `RegisterGroup` | `n` keys; fee = `F_user(L) × (2 + n)` GULD |
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
  nonce: u64,                    // monotonic; see §3.0.1
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

### 3.0.1 Account nonce (tip and spend sequencing)

Each account carries a monotonic **`nonce`** (`u64`, starts at **0** at registration or `ClaimLegacy`).

**Purpose:** serialize state-changing operations for that account and **resolve leaf race conditions** when two parties try to advance the same tip concurrently.

**Incremented** on successful apply of any tx that acts *as* the account (or as payer/parent where applicable), including:

- `UpdateMaster` — tip advance  
- `Transfer` — when account is `from`  
- `RotateKeys`, `SettleRegistration`, `ClaimLegacy`  
- Registration txs — payer (and parent for subaccounts)

**`UpdateMaster` binding:** cosignatures MUST cover the account’s **current** `nonce` (before apply), `prev_master_hash`, and `new_master_hash` ([`04-proofs.md`](04-proofs.md) §3.1). On success: `master_hash ← new`, `nonce++`.

**Leaf race resolution:** if two leaf processes both build an update from tip `(H, n)`:

1. The tx included first wins; chain state becomes `(H′, n+1)`.  
2. The loser’s tx is **invalid** — signatures were over stale `(H, n)` and/or `prev_master_hash` no longer matches.  
3. The leaf MUST re-fetch `(master_hash, nonce)` from a node, rebuild the home tree, and re-gather cosignatures.

Leaf hosts and wallets MUST NOT sign blind: fetch current tip + nonce via HTTP API before cosign. There is no merge/conflict resolution at L0 — only one successor tip per nonce step.

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

Whitepaper §3.5. The on-chain **`guld`** account is the network identity — not a mirror of developer source repositories.

| Rule | Requirement |
|------|-------------|
| Registration | MUST NOT be available via `RegisterUsername` / `RegisterGroup` |
| Genesis | MUST exist at genesis with network key policy |
| On-chain home | Compact **rule bundle** only: schemas, genesis params, weight/fee tables, proof-kind definitions |
| Off-chain software | Node, wallet, leaf SDKs, and website ship from **ordinary git** (e.g. `https://guld.io/repos/guld.git`) |
| Full nodes | MUST materialize CAS for the current `guld` **rule bundle**; MUST match header `guld_rules_hash` to the node’s built-in rule set |
| NOT required | Cloning or serving protocol **source code** from the `guld` CAS tree to validate blocks |

```
on-chain account "guld"
  └── master_hash  →  rule params, schemas, fee tables (small normative bundle)
        └── NOT required: full node / wallet / website source trees
```

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
