# Research: wire codec for consensus objects (A2)

**Status:** decided — **BARE locked for A2** (2026-09-26)  
**Related:** task [007](../tasks/open/007-simba-beta-public-readiness.md) **A2**, [spec 01 §4](../specs/01-cryptography.md), [spec 09](../specs/09-p2p.md), [spec 03](../specs/03-transactions.md), [`schemas/`](../../schemas/README.md)

## Question

What **binary encoding** should Guld use for consensus-critical bytes — `TxId`, account leaves, P2P block/tx payloads, and (eventually) wallet signing preimages — replacing today’s ad hoc **JSON**?

Spec 01 lists **BARE** or **protobuf** as proposals; spec 00 mentions **SSZ-like**. This doc compares realistic options for **A2** (wire codec) and ties to **A4** (account / tx schema freeze).

---

## 1. What must be encoded

| Object | Used for | Today | Must be deterministic? |
|--------|----------|-------|------------------------|
| **Transaction** | Mempool, blocks, `TxId = tagged_hash("guld/tx_id/v1", …)` | `serde_json` of `Tx` enum | **Yes** — consensus |
| **Block body** | P2P sync, disk | JSON `Block { header, txs }` | **Yes** |
| **Header (PoW)** | Fork choice, retarget | **Custom binary preimage** (spec 06 §2.1) | **Yes** — already frozen separately |
| **Account leaf** | `state_root`, proofs | JSON-ish serde in tests; leaf codec **TBD** (spec 05) | **Yes** |
| **P2P messages** | libp2p request-response | JSON envelope + nested JSON tx/block | **Yes** for tx/block bytes; envelope can version |
| **HTTP / JSON-RPC** | Wallets, explorer | JSON | **No** for wire — MAY stay JSON as API surface |
| **Signatures** | Ed25519 over message bytes | UTF-8 string messages (`guld/transfer/v1`, …) | **Yes** — separate from wire codec but must not drift |

**A2 scope:** binary **consensus wire** (P2P + `TxId` + account leaf + block storage).  
**Out of scope:** HTTP response shape (can translate at the boundary); wallet keyring JSON (spec 01 §3.1).

---

## 2. Requirements (normative targets)

Any chosen codec MUST satisfy:

1. **Deterministic encoding** — same logical value → identical bytes on every implementation and language. Required for `TxId`, Merkle roots, and cross-peer mempool dedup.
2. **Schema evolution** — forward-compatible field addition with explicit versioning or extension rules; hard breaks only via spec-17 activation.
3. **Multi-language** — at minimum **Rust** (node) and **JavaScript/TypeScript** (PWA wallet) MUST encode/decode identically without calling Rust WASM for every tx build (WASM acceptable as parity check, not sole signer).
4. **Compact on wire** — materially smaller than JSON for blocks with many txs (bandwidth + DoS limits in spec 09).
5. **Auditable** — schema is publishable (`.bare`, `.proto`, SSZ container list, or spec table); no hidden serde defaults.
6. **Integer safety** — `Amount` is **u128** quanta; `height`/`nonce` are **u64**; no silent float rounding (JSON pain point today).
7. **Human debug path** — hex dump + schema-aware decoder for operators (all binary options can provide this via tooling).

**Nice-to-have:** Merkle-friendly layouts (SSZ-style mix-in hashing), zero-copy decode on node, alignment with existing tagged-hash story (spec 01 §1).

---

## 3. Current state (interim JSON)

| Location | Mechanism |
|----------|-----------|
| `guld-consensus::Mempool::tx_id` | `serde_json::to_vec(tx)` → `tagged_hash("guld/tx_id/v1", …)` |
| P2P `GetTx` / `Block` | Full object as `serde_json::Value` |
| HTTP `guld_submitTransaction` | JSON → same `Tx` struct |
| Block disk | `serde_json` in node datadir |

### Problems

| Issue | Impact |
|-------|--------|
| **Not canonical JSON** | `serde_json` field order follows Rust struct definition, not sorted keys; other languages may hash differently → **broken `TxId` parity** |
| **Float / number JSON** | Large u128 amounts may stringify inconsistently across parsers |
| **Size** | Field names repeated per tx; hex in JSON APIs doubles bytes |
| **Implicit defaults** | `#[serde(default)]` can change bytes when new optional fields ship |
| **Dual truth** | Header PoW preimage is binary; body is JSON — two encoding cultures in one block |

JSON remains fine for **HTTP** and **logs** if consensus uses a frozen binary codec and APIs document the translation.

---

## 4. Candidates

### 4.1 Canonical JSON (RFC 8785 JCS)

**Idea:** Keep JSON on the wire but mandate **JSON Canonicalization Scheme** (sorted keys, minimal numbers, no whitespace).

| Pros | Cons |
|------|------|
| Human-readable on the wire | Still verbose vs binary |
| JS/Rust libraries exist (`serde_json` + JCS crate; `canonicalize` in JS) | Easy to accidentally emit non-canonical JSON from hand-written clients |
| Minimal conceptual jump from today | Does not help account leaf size; no native u128 in JSON |

**Verdict:** Acceptable **stopgap** if Simba lock is urgent; weak long-term vs binary for blocks. If chosen, MUST replace `to_vec` with JCS everywhere `TxId` is defined and add cross-lang test vectors.

---

### 4.2 BARE ([baremessages.org](https://baremessages.org/))

**Idea:** Schema-first binary format designed for blockchain P2P; deterministic; Rust + other generators.

| Pros | Cons |
|------|------|
| Purpose-built for protocol messages | Smaller ecosystem than protobuf |
| Deterministic by spec | Team must maintain `.bare` schemas in repo |
| Typically compact | Fewer off-the-shelf debug tools than protobuf |
| Aligns with spec 01 draft proposal | Wallet needs generated TS or hand port |

**Verdict:** **Strong fit** for Guld — deterministic, schema-owned, not tied to one vendor. Good default recommendation if we want a clean break from JSON on P2P.

---

### 4.3 Protocol Buffers (protobuf)

**Idea:** `.proto` files; `prost` in Rust; `protobufjs` / `buf` in TS.

| Pros | Cons |
|------|------|
| Mature tooling, wide hiring familiarity | **Canonical encoding** requires discipline (proto3 optional fields, unknown field preservation) |
| Compact binary | JSON mapping for protobuf is **not** identical to binary (dangerous if mixed with `TxId`) |
| Versioning story (field numbers) | `uint64` ok; **u128** needs split lo/hi or `bytes` — awkward for `Amount` |
| gRPC optional later | Heavier dependency footprint |

**Verdict:** Workable if we **never** hash JSON protobuf mappings for consensus — only hash **binary protobuf bytes**. Document `Amount` as `bytes` (big-endian u128) or `{ uint64 lo, uint64 hi }`. Common industry choice; slightly heavier than BARE for a greenfield protocol.

---

### 4.4 SSZ (Simple Serialize) — Ethereum-style

**Idea:** Fixed + variable parts; **Merkle tree** over containers; deterministic; used by Ethereum consensus.

| Pros | Cons |
|------|------|
| Deterministic; battle-tested in PoW/PoS hybrids | Ethereum-specific conventions (endianness, type union encoding) |
| Merkle proofs align with `state_root` story | Steeper learning curve for contributors expecting protobuf |
| Good for fixed headers + dynamic tx lists | Union / enum encoding must be specified precisely for Guld tx vocabulary |
| Rust (`ssz_rs`, `ethereum_ssz`) and TS libraries exist | Overkill if we do not use SSZ Merkle for all state |

**Verdict:** **Strong** if we commit to SSZ Merkle for account trie and want one encoding from tx → leaf → root. **Weaker** if state tree stays custom SMT with opaque leaf bytes — then SSZ buys less.

---

### 4.5 CBOR (RFC 8949, canonical form)

**Idea:** Binary JSON-like; **canonical CBOR** (deterministic subset) for hashing.

| Pros | Cons |
|------|------|
| JS (`cbor-x` canonical mode) and Rust (`ciborium`, `minicbor`) | Canonical mode less familiar to devs than protobuf |
| Compact | Schema less explicit than `.proto` / BARE unless CDDL added |
| Used in Cardano and others | Another “almost JSON” mental model |

**Verdict:** Viable middle ground; prefer BARE/protobuf if we want explicit published schemas in-repo.

---

### 4.6 Bitcoin-style custom wire

**Idea:** Hand-rolled compact types like Bitcoin `CDataStream` (varint, little-endian, command strings).

| Pros | Cons |
|------|------|
| Minimal dependencies | Every field manual; high audit cost |
| Bitcoin alignment aesthetic | Poor fit for rich account/tx enum (registrations, cosign, GIP-22 types) |
| Tiny on wire | Reinventing schema evolution |

**Verdict:** **Reject** for full tx/account model — reasonable only for **header PoW preimage** (already done in spec 06).

---

### 4.7 Rust-only bincode / postcard / rmp-serde

| Pros | Cons |
|------|------|
| Fast to ship in Rust | **Not suitable** for multi-language consensus — encoding rules tied to Rust types |

**Verdict:** **Reject** for consensus wire (dev-only snapshots ok).

---

## 5. Comparison matrix

| Criterion | JSON (today) | JCS JSON | BARE | Protobuf | SSZ | CBOR canonical |
|-----------|--------------|----------|------|----------|-----|----------------|
| Deterministic | ✗ | ✓ (if strict) | ✓ | ✓ (binary only) | ✓ | ✓ (canonical subset) |
| Rust + JS parity | fragile | moderate | good | good | moderate | moderate |
| Compactness | poor | poor | good | good | good | good |
| u128 `Amount` | string risk | string | schema-defined | bytes / split | uint256-like | bignum |
| Schema in repo | implicit serde | implicit | **`.bare`** | **`.proto`** | container spec | CDDL optional |
| Merkle-native | ✗ | ✗ | optional | ✗ | **✓** | ✗ |
| Debuggability | excellent | good | tools | excellent | moderate | moderate |
| Ecosystem size | huge | small | small | **huge** | ETH-sized | medium |
| Migration from JSON | n/a | easy | moderate | moderate | moderate | moderate |

---

## 6. Layering recommendation

Split **API encoding** from **consensus encoding** (common pattern):

```text
Wallet / HTTP  →  JSON (ergonomic)  →  decode  →  logical Tx
                                                    ↓
Consensus / P2P / TxId / disk         ←  encode  ←  frozen binary codec (A2)
```

Rules:

- **`TxId` and block hash commitments** MUST use **binary codec bytes only**.
- Nodes MUST reject P2P txs whose binary encoding does not match declared `tx_id`.
- HTTP MAY accept JSON indefinitely if server converts to canonical binary before mempool / hash.

This lets Simba ship wallet JSON while freezing P2P binary before mainnet.

---

## 7. Options ranked for Guld

### Option A — **BARE** for wire + keep JSON HTTP (recommended lean)

- Publish `schemas/*.bare` for `Tx`, `Account`, `Block`, `Header` (logical; header PoW preimage may stay as spec 06 table).
- Replace `Mempool::tx_id` and P2P payloads with BARE bytes.
- Generate Rust + TS encoders; add cross-lang test vectors in `guld-types` or `tests/vectors/`.

**Why:** Matches spec 01 draft; deterministic; schema-owned; sized for P2P; no Ethereum coupling.

### Option B — **Protobuf** for wire + JSON HTTP

Same layering as A; `.proto` with `Amount = bytes` (16-byte BE u128).

**Why:** Faster hiring/tooling; pick if team prefers `buf` / `prost` over BARE generators.

### Option C — **SSZ** for wire **and** account Merkle leaves

Unify leaf encoding + proofs with SSZ containers.

**Why:** Best if we redesign state proofs around SSZ Merkleization; highest upfront spec cost.

### Option D — **JCS JSON** short-term only

Canonical JSON everywhere for `TxId`; defer binary to post-Simba.

**Why:** Cheapest migration from today; **do not** call Simba “wire frozen” on this alone — size and JS parity remain fragile.

---

## 8. Migration / activation

1. Pick codec (**A2 decision**); document in spec 01 §4 + spec 09 §3.
2. Publish byte test vectors for every `Tx` variant (including GIP-22 `RewardCommit` / `ClaimReward` when added).
3. Implement dual-decode window **or** clean break at `activation_height` (spec 17) — **not** a Simba wipe (tip locked; breaking changes → new testnet).
4. Bump P2P protocol id: e.g. `/guld/tx/2.0.0` (binary) vs `/guld/tx/1.0.0` (JSON legacy).
5. Pin genesis / block-0 with binary-encoded body when **G2** ceremony runs.

---

## 9. Relationship to A3 / A4

| Task | Dependency |
|------|------------|
| **A3** `AccountId` preimage | Independent of codec **if** id hashes a defined byte sequence (not JSON). Wire codec must encode the same logical fields. |
| **A4** Account / tx freeze | **Blocked on A2** for consensus bytes — field list can be frozen in spec 03 first, but `TxId` must not ship to mainnet on non-canonical JSON. |

Suggested order: **freeze logical tx/account fields (A4 prose)** → **pick codec (A2)** → **publish vectors** → **flip P2P + TxId**.

---

## 10. Decision log

| Date | Item | Status |
|------|------|--------|
| 2026-09-26 | Document created for task 007 **A2** | Done |
| 2026-09-26 | **BARE locked** for consensus wire | **Accepted** |
| | Tooling | Rust: [`serde_bare`](https://crates.io/crates/serde_bare) + [`bare_proc`](https://git.sr.ht/~chiefnoah/bare_proc); JS/TS: [`@bare-ts/tools`](https://www.npmjs.com/package/@bare-ts/tools); Python: [`bare-py`](https://git.sr.ht/~martijnbraam/bare-py) |
| | Caveat | BARE IETF draft not final ([baremessages.org](https://baremessages.org/)) — pin generator versions; golden vectors in repo |
| | HTTP / JSON-RPC | Stays JSON at API boundary; nodes convert before mempool / `TxId` |
| | SSZ / protobuf | Not selected |

---

## 11. Next steps

- [x] Pick codec: **BARE** (task 007 A2)
- [ ] Publish `schemas/guld/v1/*.bare` + cross-lang golden vectors
- [x] Update spec 01 §4 and spec 09
- [ ] Implement: replace `serde_json` `TxId`; P2P `/guld/tx/2.0.0` binary payloads
- [ ] Pin `bare` CLI + crate versions in repo dev docs
