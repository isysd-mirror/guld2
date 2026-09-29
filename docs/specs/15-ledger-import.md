# Spec 15 — Ledger 1.0 import and key upgrade

**Status:** draft  
**Whitepaper:** §3.3, §8.6  
**Related:** [`02-identity-and-accounts.md`](02-identity-and-accounts.md), [`03-transactions.md`](03-transactions.md), [`05-state.md`](05-state.md), [`07-fees-and-tokenomics.md`](07-fees-and-tokenomics.md)  
**Archive SoT:**
- Balances: `archives/ledger-guld/` (per-user `*.dat` journals; concatenated working copy `archives/guld-ledger-all.dat`)
- PGP binding set: `archives/keys-pgp/<name>/<FINGERPRINT>.asc` (TigoCTM / 1.0 public keys)

## 1. Intent

Guld 2.0 **MUST** respect every positive Guld 1.0 member `Assets` balance in the snapshot (hard fork — see [FAQ.md](../FAQ.md)). Coins are imported at genesis as a disclosed pre-mine and become spendable on 2.0 only after the holder completes a **key upgrade** that ports the name from legacy (PGP / 1.0 binding) to 2.0 account keys.

## 2. Snapshot definition

| Field | Value |
|-------|--------|
| Source tree | `archives/ledger-guld/<name>/*.dat` |
| Concatenation | Files ordered by basename timestamp (unix seconds), with a trailing newline forced between files |
| Coverage | 2016-06-01 → 2018-12-09 (ledger `stats` period) |
| Balance rule | For each 1.0 **name** (except omitted protocol mirrors), `imported_balance = max(0, quantity(name:Assets))` at the `Assets` **root** |
| Commodity | `GULD` only for genesis balances |

### 2.1 Import totals (locked for Simba — task 007 A7 / 016)

| Quantity | GULD |
|----------|------|
| **x** = sum of imported positive member `name:Assets` rows | **960,975.39527052** |
| **`import_manifest_hash`** (Simba) | `0x59a39af461d66fa1ef892708f8fa8838684d812cccfbe253816a34f448980e70` |
| Positive member holders (manifest rows) | **2,217** |
| Negative `Assets` names (anomaly) | **15** (sum **−1,028.2**); import **0** — [`../../data/genesis/simba/negatives.json`](../../data/genesis/simba/negatives.json) + brief §4 |

**Rule:** `x := sum(manifest rows)`. Illegal 1.0 names MUST be remapped via `LEGACY_NAME_REMAP` at preprocess (fail closed — no silent drops). Remap table: [`data/genesis/simba/README.md`](../../data/genesis/simba/README.md).

**Explicitly omitted from import:** `guld:Assets:ERC20` (**100,000 GULD**) plus credit subtrees — sizes in [`omissions.json`](../../data/genesis/simba/omissions.json). Distribution narrative: [`../fragments/legacy-distribution.md`](../fragments/legacy-distribution.md).

Genesis MUST embed `import_manifest_hash = SHA-256(canonical_manifest)` so operators can re-verify.

### 2.2 Decimal places

The 1.0 journal uses at most **10** fractional digits. Consensus `Amount` MUST use **10** decimal places (1 GULD = 10¹⁰ quanta).

## 3. Genesis effects

For each row in the import manifest with `balance > 0`:

1. Create account `name` if absent (`kind = individual` unless the manifest marks a group).  
2. Set `balance = imported_balance` (quanta).  
3. Set `legacy = { status: locked, binding_hint: … }` (see §4).  
4. Set `keys = []`, `threshold = 0` — **no spend policy** until `ClaimLegacy` (§8).  
5. Set `expires_at_height = import_height + REGISTRATION_PERIOD` (artifact genesis: `REGISTRATION_PERIOD` from height 0). MUST NOT use `u64::MAX` for legacy-locked imports ([GIP-27](../gips/gip-27.md)).  
6. `master_hash` MAY be zero / empty-home until first tip after claim.

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
- `ClaimLegacy` (§5) is the only transition that unlocks **spend**.  
- Balance still counts toward disclosed supply **x**.  
- Name control follows ordinary pay-or-release: overdue `SettleRegistration` MUST apply ([GIP-27](../gips/gip-27.md)) — funded renew keeps `legacy.status = locked`; unfunded settle deletes the account.

## 5. Key upgrade — `ClaimLegacy`

**Name rule (locked):** a 1.0 holder receives **exactly** the name imported from the ledger manifest — the same UTF-8 string as in `ledger-guld`. `ClaimLegacy` **only installs keys** on that existing account. It MUST NOT register, rename, alias, or “port” balance to a different name. There is no `new_name` field and no migration path to another label.

```text
ClaimLegacy {
  name: Name,              // MUST equal the legacy-locked import name — immutable
  new_keys: Vec<Pubkey>,
  new_threshold: u16,
  initial_master_hash: Hash32,
  legacy_proof: LegacyOwnershipProof,
  inclusion_fee: Amount,
}
```

### 5.1 `LegacyOwnershipProof` (normative v1)

```text
message = tagged_hash(
  "guld/claim_legacy/v1",
  chain_id ‖ name ‖ hash(new_keys ‖ new_threshold) ‖ initial_master_hash ‖ account_nonce
)
```

| Proof kind | Requirement |
|------------|-------------|
| `pgp_cleartext_v1` | OpenPGP cleartext or detached signature over `message` hex, by a key in `archives/keys-pgp/<name>/*.asc`. **Only** when the binding set is non-empty for `name`. |
| `isysd_attestation_v1` | Ed25519 signature (or threshold cosign JSON) by the live **`isysd`** account over `message`. **Only** when `name` has **no** PGP binding (groups, missed key registration). Custom social proofs (GitHub/npm/notes) are off-consensus context for isysd. **Simba / pre-quorum:** sole attestor until `attestation_quorum_v1` activates with a non-empty roster. |
| `attestation_quorum_v1` | **M-of-N** cosignature set over `message` under attestor keys published in the active **rule bundle** (or designated attestation group). Unbound names only. **Accepted** ([GIP-25](../gips/gip-25.md)); **cosigner roster for mainnet is TBD** ([045](../tasks/open/045-gip-25-attestation-cosigners.md)). After activation with non-empty roster, unbound claims MUST accept this kind; `isysd_attestation_v1` MAY remain during a dual window then demote per bundle. |
| `dev_unlock_v1` | Local-dev only; never for mainnet genesis |

**Rules:** PGP-bound names MUST NOT use `isysd_attestation_v1` or `attestation_quorum_v1`. Unbound names MUST NOT use `pgp_cleartext_v1`. `ClaimLegacy` remains available while the account still exists and is locked; settle does **not** skip legacy-locked accounts ([GIP-27](../gips/gip-27.md)). `dev_unlock_v1` MUST NOT be enabled on mainnet.

### 5.2 Effects (atomic)

1. Account exists at **`name`**; `legacy.status = locked`; `account.name == name` (tx name MUST match stored name — no rename).  
2. Verify `legacy_proof` over `message` (which embeds the same **`name`**).  
3. `keys = new_keys`; `threshold = new_threshold`; `master_hash = initial_master_hash`.  
4. **`name` unchanged**; `account_id` unchanged (legacy id — [02 §3.1](02-identity-and-accounts.md)).  
5. `legacy.status = claimed`; `claimed_at_height = current`.  
6. `expires_at_height = height + REGISTRATION_PERIOD` (v1; import already started the yearly clock — [GIP-27](../gips/gip-27.md)).  
7. Pay `inclusion_fee`; increment nonce.  
8. **Balance unchanged** (aside from inclusion fee).

Want a different public name? That name was never yours in 1.0 — use `RegisterUsername` for a free name, not `ClaimLegacy`.

### 5.3 Name conflicts with fresh registration

`RegisterUsername` / `RegisterGroup` MUST reject a `name` that **already exists** on-chain (locked or claimed). After an unfunded settle **releases** a former import, that string is free for ordinary registration.
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

## 8. Empty keys and `threshold = 0` (legacy import)

Imported 1.0 accounts that are **legacy-locked** MUST be created with `keys = []` and `threshold = 0`.

| Account | `keys` | `threshold` | Spend lock |
|---------|--------|-------------|------------|
| Legacy import (locked) | `[]` | `0` | `legacy.status = locked` — `Transfer`, `RotateKeys`, registration-as-payer, etc. MUST fail until `ClaimLegacy` |
| Network `guld` | `[]` | `0` | `kind = network`, no `legacy` — CAP witnessed via headers, not account signatures |
| After `ClaimLegacy` | `new_keys` | `new_threshold ≥ 1` | Normal individual/group/sub rules |

**Why not a separate flag?** The authoritative lock is **`legacy.status`**, not empty keys alone. Empty keys + zero threshold are still required so generic paths (`RotateKeys`, registration validators, faucet) reject “no signing policy” without consulting `legacy`. Do **not** use empty keys on accounts that are meant to be spendable.

Alternative encodings (e.g. a dedicated `no_spend_policy` bit without `threshold = 0`) are **out of scope for v1** — genesis and import MUST use the table above.

## 9. Open parameters

- Canonical manifest encoding (JSON rows + `manifest_hash` SHA-256 — drafted in `guld-legacy`)  
- Mainnet re-audit of **x** if manifest is regenerated (Simba pin locked — A7)  
- Repair / omit corrupt `.asc` files under `keys-pgp` (loader skips; list in `BindingSet.skipped`)  
- Never-claimed name recycle: **done via ordinary settle** ([GIP-27](../gips/gip-27.md)) — no separate abandonment ceremony  
- **GIP-25 roster:** M-of-N, cosigner identities, dual-window length for `isysd_attestation_v1` — community process ([045](../tasks/open/045-gip-25-attestation-cosigners.md)); mechanism Accepted, identities TBD for mainnet  
- Exact wire encoding of `attestation_quorum_v1` proof bytes in rule-bundle roster (before height activation)
