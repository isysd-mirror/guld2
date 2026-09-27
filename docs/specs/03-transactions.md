# Spec 03 — Transactions

**Status:** draft  
**Related:** [`04-proofs.md`](04-proofs.md), [`06-blocks-and-consensus.md`](06-blocks-and-consensus.md) §4, [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)  
**GIP:** [`../gips/gip-22.md`](../gips/gip-22.md) (miner rewards)

## 1. Principles

- Fixed vocabulary: **no** user-defined ops.  
- Each tx has a `type`, body fields, `inclusion_fee` (Amount), and authorization (sig or leaf proof).  
- Optional **`memo`**: opaque bytes for invoices / order ids — see §2.1.  
- `TxId = tagged_hash("guld/tx_id/v1", bare_encode(tx))` — BARE bytes ([`01-cryptography.md`](01-cryptography.md) §4, [`schemas/`](../../schemas/README.md)). JSON-RPC is not consensus-canonical.

## 2. Common envelope

```text
Tx {
  version: u8,              // 1
  type: TxType,
  body: TypeSpecific,
  inclusion_fee: Amount,    // → miner
  memo: Option<Bytes>,      // §2.1; omit or empty = absent
  // authorization embedded per type
}
```

Mempool and blocks store canonical bytes. JSON-RPC MAY accept a JSON form that maps 1:1 to fields.

### 2.1 `memo` (optional)

| Rule | Norm |
|------|------|
| Purpose | Off-consensus correlation (Paymento order id, invoice number, accounting tag) |
| Max length | **64 bytes** (UTF-8 octet length if encoded as text) |
| Consensus | **Opaque** — MUST NOT change validity except size, weight, and signature coverage |
| Weight | Fully counted in `weight(tx) = size_bytes(canonical_tx)` ([`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)) |
| Auth | MUST be covered by the tx’s signed message (spoof-resistant for the payer) |
| Allowed on | All fee-paying types |
| Forbidden on | `SettleRegistration` (keep miner-injected txs lean) |

JSON APIs SHOULD accept `memo` as a UTF-8 string; empty string ≡ absent. Binary / non-UTF-8 MAY be hex-prefixed (`0x…`) in RPC — exact encoding **TBD** with the wire format freeze.

Rationale: a few dozen bytes for an order id are already priced by the weight market; unbounded metadata belongs in a leaf tip (`UpdateMaster`), not L0.

## 3. Tx types

### 3.0 `RewardCommit` (block-embedded only)

**GIP:** [`../gips/gip-22.md`](../gips/gip-22.md)

```text
RewardCommit {
  version: u8,                    // 1
  miner: Name,                    // MUST match header.miner
  beneficiary: Name,              // claim payee (MAY be miner subaccount)
  amount: Amount,
  claim_signature: SignatureBytes  // beneficiary keys[0] over claim binding
}
```

**Placement:** MUST be `block.txs[0]`; exactly one per block. MUST NOT be accepted from mempool.

**Binding message** (`guld/claim_reward/bind/v1`):

```text
ref_height: u64
ref_hash: Hash32       // block_hash of this block
beneficiary: Name
amount: Amount
```

**Amount:**

```text
amount = subsidy(height) + Σ inclusion_fee(txs[1..]) + vested_registration_fees(height)
```

**Effects:** record commitment; MUST NOT mint. Zero weight toward `BLOCK_WEIGHT_LIMIT`.

### 3.1 `ClaimReward` (mempool + mature inclusion)

```text
ClaimReward {
  version: u8,
  ref_height: u64,
  ref_hash: Hash32,
  beneficiary: Name,
  amount: Amount,
  inclusion_fee: Amount,
  signature: SignatureBytes   // same binding as RewardCommit.claim_signature
}
```

**Mempool:** MAY accept when `ref` block is on the best chain and matches an unclaimed `RewardCommit`. MUST NOT require `tip ≥ ref_height + COINBASE_MATURITY_BLOCKS` for admission.

**Block inclusion:** valid in block `B` only if `B.height ≥ ref_height + COINBASE_MATURITY_BLOCKS` (first eligible block: **`ref_height + 100`**).

**Effects when included in block `B`:**

1. Mint `amount` to `beneficiary.balance` (once per `ref_hash`).
2. `inclusion_fee` → **`B.header.miner`** (summed into `B`’s `inclusion_fees` like any tx in `B`).

Miners SHOULD pre-sign at seal time and retain pending claims (~100) across restarts ([task 008](../tasks/done/2026-09/008-mempool-persistence.md)).

### 3.2 `RegisterUsername`

```text
RegisterUsername {
  name: Name,
  keys: Vec<Pubkey>,        // len >= 1
  threshold: u16,
  initial_master_hash: Hash32,
  // Auth: signature by keys[0] over tx body commitment OR all keys — TBD; draft: sig by keys[0]
  auth_sig: Signature,
}
```

**Effects (atomic):**

1. Name MUST NOT exist; MUST NOT be `guld`.  
2. Deduct `F_user(L)` from sponsor `payer`; schedule protocol fee for miner vesting; create new account for `name` (`L` = letter count — [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)).

**Funding model:** explicit `payer` (existing account) plus **`registrant_signature`** from `keys[0]` — see [`16-sponsored-registration.md`](16-sponsored-registration.md).

```text
RegisterUsername {
  payer: Name,
  name: Name,
  keys, threshold, initial_master_hash,
  endowment: Amount,
  payer_signature: Signature,
  registrant_signature: Signature,
  inclusion_fee: Amount,
}
```

**Checks:**

- Verify `registrant_signature` under `keys[0]` over `guld/register/intent/v1`.  
- Verify `payer_signature` under payer spend key over `guld/register/v1` (intent fields MUST match).  
- `payer.balance >= F_user(L) + endowment + inclusion_fee` where `L = label_letter_count(name)` ([`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md) §3.1).  
- Intent `registration_fee` in sponsored flow MUST equal `F_user(L)` at apply height.  
- Deduct protocol fee (vested to miners over 8 blocks); transfer `endowment`; pay `inclusion_fee` to coinbase; create account; increment payer nonce.
- `name` MUST NOT contain `.` (subaccounts use `RegisterSubaccount`).

### 3.3 `RegisterGroup`

Same as username, plus:

- `keys.len() = n >= 1`  
- `L = label_letter_count(name)`; protocol fee `F_group(L, n) = F_user(L) × (2 + n)` GULD (→ miners, 8-block vest)  
- `kind = group`  
- `name` MUST NOT contain `.`  
- Balance check: `payer.balance >= F_group(L, n) + endowment + inclusion_fee`

### 3.3a `RegisterSubaccount`

Opens `parent.label` under an **individual** root (GIP: [`../gips/gip-12.md`](../gips/gip-12.md)).

```text
RegisterSubaccount {
  parent: Name,                 // individual; pays fees
  label: String,                // sub label only (no dot)
  keys: Vec<Pubkey>,
  threshold: u16,
  initial_master_hash: Hash32,
  endowment: Amount,
  parent_signature: Signature,  // over guld/register_sub/v1
  sub_signature: Signature,     // keys[0] over guld/register_sub/intent/v1
  inclusion_fee: Amount,
}
```

**Checks:**

- Parent exists, `kind = individual`, not legacy-locked.  
- Live sub count for parent `< MAX_SUBACCOUNTS` (8).  
- Full name `parent.label` MUST NOT exist; MUST parse as a one-level subaccount name.  
- Dual-sig like sponsored register (parent spend + new key intent).  
- `parent.balance >= F_sub + endowment + inclusion_fee` (`F_sub = 0.1 GULD`).

**Effects:** create `kind = subaccount` with `parent` set; credit fees to miner; increment parent nonce.

### 3.4 `RotateKeys`

Change keys/threshold under the **current** policy (own key hygiene / group re-key). **Not** a username resale market — see [`../gips/gip-13.md`](../gips/gip-13.md) and pay-or-release in [`../gips/gip-11.md`](../gips/gip-11.md).

```text
RotateKeys {
  name: Name,
  new_keys: Vec<Pubkey>,
  new_threshold: u16,
  cosignatures: Vec<CosignEntry>,  // under OLD keys/threshold
  new_key_signature: Signature,    // new_keys[0] over intent
  inclusion_fee: Amount,           // paid from the account
}
```

**Checks:**

- Account exists; not legacy-locked; kind ∈ {individual, group, subaccount}.  
- Dual auth: old threshold cosign + `new_keys[0]` intent.  
- Let `n_old = keys.len()`, `n_new = new_keys.len()`.  
- **Group expansion fee** (protocol, not inclusion): if `kind = group` and `n_new > n_old`,  
  `expansion = F_group(L, n_new) − F_group(L, n_old)` (= `F_user(L) × (n_new − n_old)`).  
  Otherwise `expansion = 0`. Shrinking or same-size key sets: no protocol fee.  
- `balance >= inclusion_fee + expansion`.

**Effects:** `keys` / `threshold` replaced; `nonce++`; `account_id`, balance (after fees), `master_hash`, `parent`, `expires_at_height` unchanged. `expansion` (if any) is debited and vested to miners over 8 blocks like registration fees ([`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)).

Individuals and subaccounts: inclusion fee only (registration fees are not per-signer for those kinds).

### 3.4b `ConvertAccountKind`

Atomic **individual ↔ group** kind flip without releasing the name ([GIP-28](../gips/gip-28.md)). Avoids squat races from settle-then-re-register.

```text
ConvertAccountKind {
  name: Name,
  new_kind: individual | group,   // MUST differ from current
  new_keys: Vec<Pubkey>,
  new_threshold: u16,
  cosignatures: Vec<CosignEntry>, // under OLD keys/threshold
  new_key_signature: Signature,   // new_keys[0] consent
  inclusion_fee: Amount,
  memo: optional bytes,
}
```

**Checks:**

- Account exists; root only; not legacy-locked; not lapsed (settle first if due).  
- Current kind ∈ {individual, group}; `new_kind` is the other.  
- Dual auth: old threshold cosign + `new_keys[0]` intent (tags `guld/convert_account_kind/*`).  
- **individual → group** MUST fail if any live `parent.label` subaccount exists.  
- Protocol fee = registration fee for **target** kind: `F_user(L)` or `F_group(L, n)` (`n = new_keys.len()`). No rebate of prior kind fees.  
- `balance >= protocol_fee + inclusion_fee`.

**Effects:** set `kind = new_kind`; replace `keys` / `threshold`; debit fees (protocol → 8-block vest); `nonce++`. Preserve `name`, `account_id`, `master_hash`, `expires_at_height`, `legacy`, balance after fees.

### 3.4a `SettleRegistration`

Permissionless pay-or-release (typically miner-included). Valid when `chain_height >= expires_at_height` and not **network** (`guld`). Legacy-locked imports settle like unlocked peers ([GIP-27](../gips/gip-27.md)).

```text
SettleRegistration { name: Name }
```

**Effects:**

- If `balance >= F_*(kind, name)`: debit renewal fee → vesting queue (`F_user(L)` for individuals/groups at settle; `F_sub` for subaccounts);  
  `expires_at_height = max(height, expires_at_height) + BLOCKS_PER_YEAR`; `nonce++`.  
- Else: leftover balance → vesting queue; **delete** account; if root, cascade-delete live subs (their balances → vesting queue). Name becomes registrable again.

### 3.5 `UpdateMaster`

```text
UpdateMaster {
  name: Name,
  new_master_hash: Hash32,
  proof: LeafConsensusProof,   // threshold_cosign_v1 over tip advance
}
```

**Checks:**

- Account exists.  
- `proof` verifies under current keys/threshold for message:

```text
tagged_hash("guld/cosign/v1",
  account_id ‖ prev_master_hash ‖ new_master_hash ‖ nonce ‖ chain_id)
```

- `inclusion_fee` sufficient for weight.  
- **Effects:** `master_hash = new`; `nonce++`. Stale `(prev_master_hash, nonce)` ⇒ reject (leaf race loser).

### 3.6 `Transfer`

```text
Transfer {
  from: Name,
  to: Name,
  amount: Amount,
  /// Auth — exactly one of:
  signature: Signature,              // threshold == 1 only; keys[0] over transfer message
  cosignatures: Vec<CosignEntry>,    // required when threshold > 1; MAY be used when threshold == 1
  inclusion_fee: Amount,
  memo: Option<Bytes>,      // §2.1 — e.g. payment order id
}
```

**Auth message** (`guld/transfer/v1`):

```text
tagged_hash("guld/transfer/v1",
  account_id ‖ nonce_be64 ‖ to_utf8 ‖ 0x00 ‖ amount_be128 ‖ fee_be128
  [ ‖ u16_be(memo_len) ‖ memo_bytes if memo non-empty ])
```

**Checks:**

- `from` / `to` exist; `from` not legacy-locked; `from.keys` non-empty and `threshold ≥ 1`.  
- Balances: `from.balance ≥ amount + inclusion_fee`.  
- **If `cosignatures` non-empty:** `verify_threshold_cosign` under current keys/threshold over the transfer message.  
- **Else:** `threshold` MUST be `1` and `signature` MUST verify under `keys[0]`.  
- `inclusion_fee` sufficient for weight (extra cosignatures increase weight like UpdateMaster).

**Effects:** move `amount` if balances allow; increment `from` nonce. `memo` is recorded in the canonical tx (and thus tx id / receipts explorers may index) but has **no** balance effect.

**Wire (BARE):** Transfer version **1** = single `signature` (backward compatible). Version **2** = `cosignatures` list (no single-signature field). JSON MAY omit empty `signature` / `cosignatures`.

### 3.7 `ClaimLegacy` (1.0 key upgrade)

Unlocks a genesis-imported, **legacy-locked** account under new keys. **Does not register or rename** — the holder gets **exactly** the 1.0 name from the import manifest. Full rules: [`15-ledger-import.md`](15-ledger-import.md).

```text
ClaimLegacy {
  name: Name,              // MUST be the imported name — no alternate target
  new_keys: Vec<Pubkey>,
  new_threshold: u16,
  initial_master_hash: Hash32,
  legacy_proof: LegacyOwnershipProof,  // e.g. pgp_cleartext_v1 over claim message
}
```

**Effects:** verify legacy ownership for **`name`**; set keys/threshold/`master_hash`; set `legacy.status = claimed`; **`name` and `account_id` unchanged**; balance unchanged aside from `inclusion_fee`.

**MUST** reject if: account missing; not legacy-locked; `name` was never imported; or proof/`message` names disagree.

## 4. Validation pipeline (node)

For each tx, `guld-state` + `guld-crypto` MUST:

1. Decode / schema-check  
2. Compute weight; check `inclusion_fee` vs relay policy (mempool)  
3. Verify auth  
4. Apply state transition or reject  
5. For `Register*`, deduct protocol fee (vested to miner `RewardCommit` schedule)  
6. Reject `RewardCommit` from mempool; reject `ClaimReward` in block if immature or already claimed  

## 5. Component API

```text
trait TxValidate {
  fn check_standalone(tx: &Tx, state: &StateView) -> Result<CheckedTx, TxError>;
}

trait TxApply {
  fn apply(batch: &mut StateWrite, tx: CheckedTx) -> Result<Receipt, TxError>;
}
```

`Receipt { tx_id, fee_paid, registration_fee, logs }`

## 6. Open parameters

- Optional intent field restricting allowed sponsor  
- Multisig spend vs tip role separation  
- `LegacyOwnershipProof` packet profile — normative v1 ([`15-ledger-import.md`](15-ledger-import.md) §5.1)
