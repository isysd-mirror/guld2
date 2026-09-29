# Spec 01 — Cryptography

**Status:** draft

## 1. Hashing

| Use | Algorithm | Output |
|-----|-----------|--------|
| Content addressing, Merkle/home roots, `master_hash`, message digests | **SHA-256** | 32 bytes |
| PoW block hash | **Double SHA-256** (SHA256d) on header preimage — locked v1; see [`06-blocks-and-consensus.md`](06-blocks-and-consensus.md) §2 | 32 bytes |

Domain separation: all structured hashes MUST use a **tagged** preimage:

```
SHA256( tag ‖ 0x00 ‖ payload )
```

where `tag` is a fixed UTF-8 string listed below (no length prefix in v1 **unless** noted).

| Tag | Payload |
|-----|---------|
| `guld/account_id/v1` | registration commitment fields |
| `guld/master_hash/v1` | home_tree_root ‖ meta_root ‖ … |
| `guld/cosign/v1` | account_id ‖ prev ‖ new ‖ nonce ‖ chain_id |
| `guld/tx_id/v1` | canonical tx bytes |
| `guld/block_header/v1` | canonical header bytes without nonce mix **or** as specified by PoW |
| `guld/site_login/v1` | ecosystem site-login digest (not consensus) — [`14-reference-ui.md`](14-reference-ui.md) §10.1 |

## 2. Account signatures (genesis)

| Algorithm | Spec |
|-----------|------|
| **Ed25519** | RFC 8032; public key 32 B; signature 64 B |

PQ / hybrid schemes are **future proof kinds**; genesis MUST ship Ed25519.

## 3. Encryption (wallet only — not consensus)

Guld **does not** define leaf or CAS content encryption. Validators hash and store **opaque bytes**; whether a blob is plaintext, encrypted, or compressed is **leaf owner policy** and invisible to L0.

| Algorithm | Where | Use |
|-----------|-------|-----|
| **AES-256** (or AEAD equivalent) | **Reference wallet / extension keyring only** | Encrypt private keys at rest (passphrase-derived key); MUST NOT upload ciphertext or secrets to nodes |

Leaf owners MAY encrypt home content with any scheme (including AES-256). That is **not** a protocol primitive: no consensus opcode, no required format, no key distribution in account state.

### 3.1 Wallet keyring (normative for reference clients)

Reference PWA, browser extension, and desktop wallet MUST **never** persist Ed25519 private keys in plaintext on disk or in `localStorage` / IndexedDB.

| Parameter | Value |
|-----------|--------|
| Cipher | **AES-256-GCM** (AEAD) |
| KDF | **PBKDF2-HMAC-SHA256**, ≥ **310_000** iterations (Web Crypto–compatible) |
| Salt | 16 random bytes per keyring unlock / re-wrap |
| IV / nonce | 12 random bytes per encrypted key record |
| Passphrase | User-chosen; never sent to nodes |

**Encrypted key record** (per account):

```json
{
  "name": "alice",
  "pubHex": "0x…",
  "enc": {
    "v": 1,
    "alg": "aes-256-gcm",
    "kdf": "pbkdf2-sha256",
    "iter": 310000,
    "salt": "<base64>",
    "iv": "<base64>",
    "ciphertext": "<base64>"
  }
}
```

Plaintext `privHex` MAY exist **only in memory** while the wallet is unlocked. On lock / timeout / tab close, decrypted material MUST be zeroed.

**Storage key:** `guld.keyring.v1` (browser) or equivalent path (desktop). Extension uses the same schema in extension-local storage.

Desktop `guld-wallet` MAY use OS keychain for the wrapping key instead of passphrase; if file-based, same AES-GCM + KDF rules apply.

See [`14-reference-ui.md`](14-reference-ui.md) §5.

## 4. Canonical encoding (locked — BARE)

**Decision (A2):** consensus-critical objects use **[BARE](https://baremessages.org/)** (Binary Application Record Encoding). Schemas live in [`schemas/`](../../schemas/README.md); research: [`wire-codec-comparison.md`](../research/wire-codec-comparison.md).

| Layer | Encoding |
|-------|----------|
| **Consensus wire** — P2P tx/block, disk blocks, `TxId`, account leaves | **BARE bytes** from frozen `.bare` schemas |
| **HTTP / JSON-RPC** — wallets, explorer | JSON (ergonomic); node MUST decode → BARE before mempool insert and `TxId` |
| **PoW header preimage** | Fixed binary layout ([06 §2.1](06-blocks-and-consensus.md)) — not BARE |
| **Ed25519 message strings** | UTF-8 tagged strings (`guld/transfer/v1`, …) — unchanged |

**Tooling (reference implementations):**

| Language | Generator / runtime |
|----------|-------------------|
| Rust | [`serde_bare`](https://crates.io/crates/serde_bare) + [`bare_proc`](https://git.sr.ht/~chiefnoah/bare_proc) |
| JavaScript / TypeScript | [`@bare-ts/tools`](https://www.npmjs.com/package/@bare-ts/tools) (`bare compile …`) |
| Python | [`bare-py`](https://git.sr.ht/~martijnbraam/bare-py) |

**Type conventions (Guld extensions on BARE):**

- `Amount` → `u128` — **little-endian** quanta (10 decimal GULD places; BARE uint)
- `Name` → `str` — UTF-8 NFC, max 64 bytes (validate before encode)
- Wire v1 signatures / most hashes → `str` (`0x`-hex), matching JSON-RPC field forms
- `ClaimReward.ref_hash` → `data[32]` raw `Hash32`
- Tx vocabulary → tagged **`union`** at top level (`schemas/guld/v1/tx.bare`)

**TxId:**

```text
TxId = SHA256("guld/tx_id/v1" ‖ 0x00 ‖ bare_encode(Tx))
```

**Activation:** dual-wire P2P — JSON `/guld/tx|block/1.0.0` + BARE `/guld/tx|block/2.0.0`; consensus `TxId` always from BARE ([task 009](../tasks/done/2026-09/009-bare-wire-implementation.md)). HTTP / JSON-RPC stay JSON at the boundary.

JSON-RPC conventions until clients ship BARE:

- Hex in APIs: `0x`-prefixed lowercase  
- Logical field names in spec 03 remain normative

## 5. Identifiers

| Id | Type | Construction |
|----|------|----------------|
| `AccountId` | 32 bytes | See [02 §3.2](02-identity-and-accounts.md) — variant by account kind; **MUST NOT change** after creation |
| `TxId` | 32 bytes | `SHA256("guld/tx_id/v1" ‖ 0x00 ‖ canonical_tx)` |
| `ObjectId` | 32 bytes | SHA-256 of object bytes (raw content hash) |
| `BlockHash` | 32 bytes | PoW-defined header hash |
| `tx_root` / `receipt_root` | 32 bytes | Interim concat or Merkle v1 — [GIP-35](../gips/gip-35.md) / [spec 06](06-blocks-and-consensus.md) §2.1a |

## 6. Component API — `guld-crypto`

Logical Rust-style interface (normative behavior, not syntax):

```text
trait Crypto {
  fn sha256(data: &[u8]) -> [u8; 32];
  fn tagged_hash(tag: &str, payload: &[u8]) -> [u8; 32];

  fn ed25519_verify(pubkey: &[u8; 32], msg: &[u8], sig: &[u8; 64]) -> bool;

  /// Verify threshold_cosign_v1 (see proofs spec).
  fn verify_threshold_cosign(proof: &ThresholdCosignV1, msg: &[u8; 32], keys: &[Pubkey], threshold: u16) -> bool;
}
```

## 7. Open parameters

- Publish `schemas/guld/v1/*.bare` + golden test vectors (implementation)  
- PQ migration path (ML-DSA / hybrid) as later proof/key types  
- Argon2id vs PBKDF2 for non–Web Crypto desktop paths (browser MUST use PBKDF2 via Web Crypto)
