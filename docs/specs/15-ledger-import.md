# Spec 15 — Ledger 1.0 import and key upgrade

**Status:** draft  
**Whitepaper:** §3.3, §8.6  
**Related:** [`02-identity-and-accounts.md`](02-identity-and-accounts.md), [`03-transactions.md`](03-transactions.md), [`05-state.md`](05-state.md), [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)  
**Archive SoT:**
- Balances: `archives/ledger-guld/` (per-user `*.dat` journals; concatenated working copy `archives/guld-ledger-all.dat`)
- PGP binding set: `archives/keys-pgp/<name>/<FINGERPRINT>.asc` (TigoCTM / 1.0 public keys)

## 1. Intent

Guld 2.0 **MUST** respect every positive Guld 1.0 member `Assets` balance. Coins are imported at genesis as a disclosed pre-mine and become spendable only after the holder completes a **key upgrade** that ports the name from legacy (PGP / 1.0 binding) to 2.0 account keys.

## 2. Snapshot definition

| Field | Value |
|-------|--------|
| Source tree | `archives/ledger-guld/<name>/*.dat` |
| Concatenation | Files ordered by basename timestamp (unix seconds), with a trailing newline forced between files |
| Coverage | 2016-06-01 → 2018-12-09 (ledger `stats` period) |
| Balance rule | For each 1.0 **name** (except omitted protocol mirrors), `imported_balance = max(0, quantity(name:Assets))` at the `Assets` **root** |
| Commodity | `GULD` only for genesis balances |

### 2.1 Working totals (unaudited; pin at freeze)

| Quantity | Approx. GULD |
|----------|----------------|
| **x** = sum of positive member `name:Assets` roots | **959,947.19527052** |
| Positive member holders | **≈ 2,217** |
| Negative `Assets` names (anomaly) | **≈ 15** (sum ≈ **−1,028**); import **0**, list in manifest appendix |

**Explicitly omitted from import:** `guld:Assets:ERC20` and any other ERC20 / foreign-mirror protocol buckets (legacy experiment; not part of circulating 2.0 pre-mine).

Genesis MUST embed `import_manifest_hash = SHA-256(canonical_manifest)` so operators can re-verify.

### 2.2 Decimal places

The 1.0 journal uses at most **10** fractional digits. Consensus `Amount` MUST use **10** decimal places (1 GULD = 10¹⁰ quanta).

## 3. Genesis effects

For each row in the import manifest with `balance > 0`:

1. Create account `name` if absent (`kind = individual` unless the manifest marks a group).  
2. Set `balance = imported_balance` (quanta).  
3. Set `legacy = { status: locked, binding_hint: … }` (see §4).  
4. Set `keys = []`, `threshold = 0` (or a sentinel “no spend policy”).  
5. `master_hash` MAY be zero / empty-home until first tip after claim.

For network account `guld`:

1. Account exists as network kind (spec 02).  
2. **No** ERC20 bucket credit — genesis balance from import is **0** unless a future audited manifest says otherwise.  
3. **`guld` is keyless** (empty `keys`, threshold 0). There is no `guld` spend/tip signature. CAP / rules evolution is **witnessed by miners**: sealed headers commit `guld.master_hash` and `guld_rules_hash`; extending the chain on a tip attests that CAP state. `guld` is **not** legacy-locked.  
4. Genesis MUST pin `import_manifest_hash` in chain meta (and/or a consensus-visible field) so peers can re-verify the committed manifest.  
5. Simba / public testnets SHOULD genesis-claim **`isysd`** (PGP clearsign over the ClaimLegacy challenge, applied as a height-0 state effect with empty block body) so unbound `isysd_attestation_v1` works from block 0. Artifacts live under `data/genesis/<network>/`.

**MUST NOT:**

- Haircut, round (except exact quanta conversion), or merge distinct names.  
- Import ERC20 / foreign-mirror protocol buckets into circulating supply.  
- Allow `Transfer` / spend from a `legacy.status = locked` account.  
- Treat OpenPGP as the post-claim hot path.  
- Invent a funded fictional premine account (e.g. `alice`) on shared networks.

## 4. Legacy lock

```text
LegacyState {
  status: locked | claimed,
  binding_hint: optional bytes,
  claimed_at_height: optional u64,
}
```

While `status = locked`:

- `Transfer` and ordinary `RotateKeys` MUST fail.  
- `ClaimLegacy` (§5) is the only transition that unlocks.  
- Balance still counts toward disclosed supply **x**.

## 5. Key upgrade — `ClaimLegacy`

```text
ClaimLegacy {
  name: Name,
  new_keys: Vec<Pubkey>,
  new_threshold: u16,
  initial_master_hash: Hash32,
  legacy_proof: LegacyOwnershipProof,
  inclusion_fee: Amount,
}
```

### 5.1 `LegacyOwnershipProof` (draft)

```text
message = tagged_hash(
  "guld/claim_legacy/v1",
  chain_id ‖ name ‖ hash(new_keys ‖ new_threshold) ‖ initial_master_hash ‖ account_nonce
)
```

| Proof kind | Requirement |
|------------|-------------|
| `pgp_cleartext_v1` | OpenPGP cleartext or detached signature over `message` hex, by a key in `archives/keys-pgp/<name>/*.asc`. **Only** when the binding set is non-empty for `name`. |
| `isysd_attestation_v1` | Ed25519 signature (or threshold cosign JSON) by the live **`isysd`** account over `message`. **Only** when `name` has **no** PGP binding (groups, missed key registration). Custom social proofs (GitHub/npm/notes) are off-consensus context for isysd. |
| `dev_unlock_v1` | Local-dev only; never for mainnet genesis |

**Rules:** PGP-bound names MUST NOT use `isysd_attestation_v1`. Unbound names MUST NOT use `pgp_cleartext_v1`. Claims stay open indefinitely; settle skips legacy-locked accounts.

### 5.2 Effects (atomic)

1. Account exists; `legacy.status = locked`; `name` matches.  
2. Verify `legacy_proof` over `message`.  
3. `keys = new_keys`; `threshold = new_threshold`; `master_hash = initial_master_hash`.  
4. `legacy.status = claimed`; `claimed_at_height = current`.  
5. `expires_at_height = height + REGISTRATION_PERIOD` (then yearly `SettleRegistration` like any account).  
6. Pay `inclusion_fee`; increment nonce.  
7. **Balance unchanged** (aside from inclusion fee).

### 5.3 Name conflicts with fresh registration

`RegisterUsername` / `RegisterGroup` MUST reject any `name` present in the import manifest (claimed or locked).

## 6. What to import (checklist)

| Artifact | Required |
|----------|----------|
| Per-name member `Assets` root balances (positive) | YES — claimable balances |
| `guld:Assets:ERC20` / ERC20 mirrors | **NO** — omit |
| Negative `Assets` anomalies | YES — appendix only; on-chain balance 0 |
| Income / Expenses / Liabilities / Equity trees | NO for balances |
| Per-tx journal replay as consensus history | NO |
| PGP fingerprint ↔ name binding table | YES — `archives/keys-pgp/<name>/<FP>.asc` for `ClaimLegacy` |
| Content hash of concatenated `.dat` set / manifest | YES — genesis constant |

## 7. Component API

```text
fn BindingSet::load_dir(archives/keys-pgp) -> BindingSet;
fn load_assets_balances(guld-ledger-all.dat) -> Vec<AssetsBalance>;
fn build_manifest(balances, Option<&BindingSet>) -> ImportManifest;
fn apply_genesis_import(state: &mut State, manifest) -> Result<u64>;
fn verify_claim_proof(name, message, proof, &BindingSet) -> Result<()>;
// State.set_claim_verifier(BindingClaimVerifier) wires apply(ClaimLegacy)
```

Crate: `guld-legacy`. Tools: `guld-genesis` (`preprocess` / `challenge` / `verify-claim` / `build`). Node: `--network <name>` loads `data/genesis/<name>/`; ad-hoc `--keys-pgp` / `--import-ledger` remain for local/dev only.

## 8. Open parameters

- Canonical manifest encoding (JSON rows + `manifest_hash` SHA-256 — drafted in `guld-legacy`)  
- Whether empty-key locked accounts use `threshold = 0` vs a dedicated flag bit  
- Abandonment / recycle of never-claimed names — **deferred**; locked forever is accepted  
- Audited replacement of working **x** before mainnet genesis  
- Repair / omit corrupt `.asc` files under `keys-pgp` (loader skips; list in `BindingSet.skipped`)
