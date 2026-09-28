# Tx memo as a side-channel for payments, leaves, and proofs

**Status:** research (non-normative)  
**Related:** [GIP-16](../gips/gip-16.md) (Final), [spec 03 §2.1](../specs/03-transactions.md), [spec 07](../specs/07-fees-and-tokenomics.md), [spec 08](../specs/08-cas-and-homes.md), [spec 11](../specs/11-leaf-host.md), [spec 14 §9](../specs/14-reference-ui.md), [whitepaper §6](../whitepaper/guld-2.0-draft.md)  
**Wire:** [`schemas/guld/v1/tx.bare`](../../schemas/guld/v1/tx.bare)

## Summary

Guld’s optional **`memo`** is a deliberately small, **consensus-opaque** field on most fee-paying L0 transactions. It exists so humans and applications can **correlate** an on-chain movement with off-chain intent—most obviously a **payment order id**—without turning the chain into a general data bus.

Compared with typical payment crypto, the story is simpler:

| Question | Bitcoin-like UTXO | Guld |
|----------|-------------------|------|
| Who paid whom? | Parse outputs / scripts; no native account | **`from` → `to` names** are first-class |
| How do I attach an invoice? | OP_RETURN (extra output, policy-limited) | **`memo`** on the same signed `Transfer` |
| Is the tag authenticated? | Depends on script | **Always in the signed message** for that tx type |
| Cost | Block space / feerate | **Weight-priced** bytes in a fixed tx vocabulary |

Sixty-four bytes is not a forum. It is enough for **order ids**, **short correlation tokens**, **compact proof hints**, and **cross-leaf pointers** when paired with names, tips, and CAS objects. Bulk semantics belong in **leaves** (`UpdateMaster`), not L0.

---

## 1. What the protocol guarantees

From [GIP-16](../gips/gip-16.md) and [spec 03 §2.1](../specs/03-transactions.md):

| Property | Rule |
|----------|------|
| Max size | **64 bytes** (octet length; UTF-8 when used as text) |
| Consensus | **Opaque** — no validity rules except size, weight, signature coverage |
| Weight | Counted in `size_bytes(canonical_tx)` like any other field |
| Auth | **MUST** be covered by the tx’s signed binding message |
| Present on | All fee-paying types in wire v1 **except** miner-injected lean txs (`SettleRegistration`, block-embedded `RewardCommit`, mature `ClaimReward`) |
| Absent on | Empty string ≡ omit ≡ no memo |

**Transfer** ([spec 03 §3.6](../specs/03-transactions.md)) appends memo to the tagged digest:

```text
tagged_hash("guld/transfer/v1",
  account_id ‖ nonce ‖ to ‖ 0x00 ‖ amount ‖ inclusion_fee
  [ ‖ u16_be(memo_len) ‖ memo_bytes if non-empty ])
```

Threshold cosign ([spec 14 §9](../specs/14-reference-ui.md)) binds optional `memo` on `op=transfer` requests and responses, so cosigners cannot swap invoice tags after the initiator signs.

**Non-goals (explicit):** no on-chain interpretation of memo, no OP_RETURN-style contracts, no unbounded metadata on L0 ([GIP-16](../gips/gip-16.md) §Non-goals).

---

## 2. Why payment processing is easier here

### 2.1 The frustration with “payment crypto”

On account-less or script-heavy chains, reconciling a bank-style **order** to a **tx** often requires:

- Heuristics on output ordering and change detection  
- Indexers that understand each wallet’s address reuse policy  
- Separate “payment protocol” layers (BIP70, EIP-681, Lightning invoices, etc.)  
- OP_RETURN or calldata conventions that **validators do not standardize**

The payer knows what they meant; the merchant’s backend must reverse-engineer it from chain shape.

### 2.2 Guld’s native correlation surface

A **`Transfer`** already answers the hard question: **registered name → registered name**, with balances and nonce discipline. The **`memo`** adds a **merchant-local or protocol-local tag** in the same authenticated envelope:

```text
from:   merchant.checkout
to:     alice
amount: 10.00000000 GULD   (example quanta)
memo:   "ord_9f3k2m"       (≤64 B)
```

**Reconciliation loop (sketch):**

1. Checkout creates order `ord_9f3k2m` off-chain; displays payee name + amount + optional memo hint.  
2. Payer’s wallet signs `Transfer` including `memo`.  
3. Merchant watches mempool / blocks (or account activity API) for **`to = merchant.checkout`** with matching **`amount`** and **`memo`**.  
4. Confirmations follow normal block policy; order state updates.

No address parsing. No “which output was payment.” The **`to` field is the merchant account**; the **`memo` is the order handle**.

### 2.3 Registrar / OTC desk pattern

[Sponsored registration](../specs/16-sponsored-registration.md) already splits **registrant intent** (portable JSON) from **sponsor spend** (on-chain tx). Paid desks add a third off-chain leg (fiat via Paymento or similar — [spec 14](../specs/14-reference-ui.md)).

**Memo fits the on-chain leg** when a sponsor or payer account sends GULD *after* an off-chain order exists:

| Off-chain | On-chain anchor |
|-----------|-----------------|
| Desk order id `GULD-2026-…` | `Transfer` memo repeats order id |
| Registration request JSON | Optional memo on sponsor’s **fee/top-up transfer** to self or treasury (not on `RegisterUsername` body today — see §5) |
| Faucet attribution | Node already uses memos like `"faucet drip"` / `"ttt-demo auto-register"` in test tooling |

Human-facing copy in the wallet already nudges this: Send form placeholder **“order id / invoice”** ([reference UI](../specs/14-reference-ui.md)).

### 2.4 Practical encoding (payment profiles)

These are **application conventions**, not consensus rules. Pick one profile per integration and document it.

| Profile | Example memo | Bytes (typ.) | Notes |
|---------|----------------|--------------|-------|
| Plain order id | `ord_9f3k2m` | ~10 | Simplest; URL-safe charset |
| UUID | `550e8400-e29b-41d4-a716-446655440000` | 36 | Fits with room for prefix |
| Prefixed UTF-8 | `pay:ord_9f3k2m` | ≤64 | Version byte in text |
| Compact binary | `0x01 ‖ u32_be(order_seq)` | 5 | Needs hex/binary RPC path ([spec 03](../specs/03-transactions.md) — binary encoding TBD on JSON) |
| Hash pointer | `0x02 ‖ trun_16(ObjectId)` | 17 | Points to receipt blob in payer’s leaf (§4) |

**Matching policy:** merchants SHOULD require **exact memo match** *and* **exact amount** *and* **expected `from`** (if known) to mark paid. Treat near-misses (wrong amount, empty memo) as manual review, not auto-settle.

**Expiry:** memo does not embed time; order TTL stays off-chain. Stale memos on replayed amounts are a merchant bug—use unique order ids.

---

## 3. Security and abuse model

### 3.1 Authenticity

Because memo is **inside the signed message**, a third party cannot attach a fake order id to someone else’s transfer without breaking the signature. The **`from` account** vouches for the tag.

Cosign paths inherit the same binding: initiator’s request includes `memo`; collectors verify fragments against the same fields ([spec 14 §9](../specs/14-reference-ui.md)).

### 3.2 Privacy

Memo is **public forever** in the canonical tx (explorer, indexers, archivers). Do not put:

- PII, email, full postal addresses  
- Preimage secrets, session tokens, raw private invite payloads  
- Encryption keys  

Use memo as a **handle** into private systems, not the secret itself.

### 3.3 Spam and griefing

Anyone can send **1 quanta + insult memo** to a merchant name. Mitigations are **off-chain** (minimum amounts, allowlists, rate limits)—same as email spam to a public address. Memo does not make this worse; **names are already public receive endpoints**.

### 3.4 Malleability

`TxId` hashes the full canonical tx including memo. Changing the tag changes the id—good for uniqueness, bad if your workflow keyed on txid before broadcast confirmation. Order systems should key on **`(to, amount, memo, from, nonce)`** or wait for confirmed txid.

---

## 4. Cross-leaf communication

Leaves hold **authoritative application state** ([spec 08](../specs/08-cas-and-homes.md), [spec 11](../specs/11-leaf-host.md)). L0 witnesses **tips** (`master_hash`) and **value transfer**; it does not run leaf code.

Memo bridges the layers when a **small pointer** suffices:

```text
L0 Transfer  ──memo──▶  "ttt:move:4" | "leaf:0xabc…" | "guld1ref:…"
                              │
                              ▼
Leaf home (CAS)  ──▶  state.json, log.jsonl, receipt.json
```

### 4.1 Patterns

| Pattern | Memo carries | Leaf carries |
|---------|--------------|--------------|
| **Action id** | `move:4` / `evt:042` | Full board / event payload in `state.json` |
| **Object ref** | 16-byte truncated `ObjectId` + type byte | Full object in group home CAS |
| **Tip expectation** | `tip:0xdeadbeef…` (truncated) | Receiver verifies `master_hash` after `UpdateMaster` |
| **Ack** | `ok:evt:042` | Prior event hash in leaf log |

The **tic-tac-toe reference dapp** ([research](./reference-dapp.md)) uses **`UpdateMaster`** for moves, not `Transfer`—correct for game state. Memo on a **side payment** (entry fee, wager settlement) could still reference `move:4` for human-readable cross-links in explorers.

### 4.2 Two-party apps (1-of-2 groups)

When two individuals cosign tips for a shared leaf:

1. Proposer updates leaf files locally → computes `new_master_hash`.  
2. Cosign session ([spec 14 §9](../specs/14-reference-ui.md)) collects signatures.  
3. Optional **`Transfer`** with memo `tip:0x…` / `sess:…` notifies the counterparty **in their wallet activity feed** before they open the leaf UI.

Memo is the **ping**; the leaf tip is the **proof**.

### 4.3 When *not* to use memo for leaves

| Need | Use instead |
|------|-------------|
| Full chat log | Append-only files + `UpdateMaster` |
| Large receipts (PDF, JSON >64 B) | CAS object + tip or `remotes[]` |
| Cross-chain proof | [Foreign chain accounts](../specs/13-foreign-chains.md) + leaf policy (out of scope here) |
| Long URLs | Short id in memo; resolve via home HTTP |

---

## 5. Proofs and attestations

Memo can carry **compact verification hints**. Validators still ignore them; **auditors** use them.

### 5.1 Payment proof

Merchant publishes:

> “Order `ord_9f3k2m` paid iff ∃ confirmed `Transfer` with `to=merchant`, `amount=X`, `memo=ord_9f3k2m`.”

Third parties verify by scanning chain history—no merchant API required. This is a **weak proof of payment** (not proof of goods delivery).

### 5.2 Signed intent cross-reference

[Sponsored registration](../specs/16-sponsored-registration.md) binds registrant intent off-chain. A sponsor could attach the same **`request_id`** in memo on an unrelated **top-up transfer** or internal treasury move for accounting. The **register tx itself** also supports memo on wire v1—**application-defined** whether registrant/sponsor repeats a hash of the intent (consensus does not check).

### 5.3 Leaf transition digest (truncated)

Proposal:

```text
memo = 0x10 ‖ first_16_bytes(SHA256(canonical_state_json))
```

Auditor flow:

1. Read memo from co-occurring `Transfer` or `UpdateMaster`.  
2. Materialize leaf at tip; rehash; compare truncated digest.  

Full hash won’t fit with prefix in 64 B—truncate or use **second tx** pattern (tip tx carries full ref in leaf file named by memo id).

### 5.4 Threshold cosign receipts

After cosign broadcast, memo on the final **`Transfer`** / **`UpdateMaster`** could echo **`cosign:sha256(req)`** (truncated) linking L0 inclusion to the off-chain cosign session artifact—useful for enterprise audit without storing JSON on-chain.

---

## 6. Tx-type cheat sheet (wire v1)

From [`tx.bare`](../../schemas/guld/v1/tx.bare):

| Tx type | Memo allowed | Typical side-channel use |
|---------|--------------|---------------------------|
| `Transfer` | yes | **Order id, invoice, leaf ping** |
| `UpdateMaster` | yes | Tip/session id alongside hash advance |
| `RotateKeys` | yes | Ticket ref for support audit |
| `RegisterUsername` / `RegisterGroup` | yes | Desk order / intent fingerprint |
| `RegisterSubaccount` | yes | Parent workflow label |
| `ClaimLegacy` | yes | Claim batch id |
| `ConvertAccountKind` | yes | Migration ticket |
| `SettleRegistration` | **no** | Miner-injected — keep lean |
| `RewardCommit` / `ClaimReward` | **no** | Miner reward path |

**Implementation note:** wallet UI today exposes memo primarily on **Send** ([spec 14](../specs/14-reference-ui.md)); other builders *should* expose optional memo where operators need tags ([spec 14](../specs/14-reference-ui.md) §Memo).

---

## 7. Indexing and UX expectations

Explorers and account activity APIs **should** display memo when present (UTF-8 when valid). Indexers **may** offer:

- `GET /activity?to=merchant&memo_prefix=ord_`  
- Webhook on `(to, memo)` match for checkout  

No consensus requirement—**product opportunity** for nodes and block explorers.

**Wallet activity feed:** show memo inline on transfers so payers can confirm they tagged the right order before confirmation.

**Human-first UX** ([design note](../design/human-first-ux.md)): default Send shows memo as “Note (optional)”; Advanced can show byte counter `n/64`.

---

## 8. Comparison table (design intent)

| System | Metadata home | Guld memo |
|--------|---------------|-----------|
| Bitcoin OP_RETURN | Extra output, ~80 bytes typical policy | Field on typed tx; signed with transfer |
| Ethereum calldata | Unbounded gas-priced | **Hard 64 B cap** — forces leaves for bulk |
| Lightning invoices | Off-chain + on-chain anchor optional | Name + amount already explicit; memo optional |
| Guld leaf tip | Unlimited (off L0) | **`UpdateMaster`** for state; memo for **pointers** |

Whitepaper framing ([§6](../whitepaper/guld-2.0-draft.md)): fixed tx vocabulary + optional 64-byte memo; **bulk data and app logic in leaves**.

---

## 9. Open research questions

1. **Binary memo in JSON-RPC** — hex vs base64url vs `0x` prefix ([spec 03](../specs/03-transactions.md) TBD). Payment SDKs need one canonical encoding.  
2. **Registered memo schemas** — should `guld.io` document optional `guld1memo:` prefixes (like `guld1reg:` for registration QR)? Non-consensus registry only.  
3. **Register tx memo semantics** — should registrars require memo = hash(intent) for automated desk matching?  
4. **Multi-hop payments** — payer → subaccount → treasury with same memo vs new memo per hop.  
5. **Refund correlation** — merchant refund transfer memo `ref:ord_9f3k2m` convention.  
6. **Privacy upgrades** — if memos become sensitive at scale, research **encrypted memo in leaf** + **public random id** on L0 (id in memo, ciphertext in CAS).  
7. **Indexer standard** — minimal REST filter set for merchants (`to`, `from`, `memo`, `since_height`).

---

## 10. Recommended next steps (engineering)

| Priority | Task | Owner |
|----------|------|-------|
| P0 | Document one **payment profile** in [spec 16](../specs/16-sponsored-registration.md) or registrar README (`memo=order_id`) | Desk integrators |
| P1 | Explorer + activity API: **memo column** and filter | `guld-node` / explorer UI |
| P1 | `@guld/js` checkout helper: `buildPayment({ to, amount, memo })` | SDK |
| P2 | Cosign + register flows: optional memo field in UI | `guld-web-ui` |
| P2 | Publish **`guld1memo:`** URI scheme (research → informational GIP) | Protocol docs |
| P3 | Merchants sample: watch `(to, amount, memo)` → mark order paid | Reference leaf |

---

## 11. Bottom line

The memo field is Guld’s **deliberately small, signed, weight-priced side channel**. It exists because **names already solve addressing**; what remained painful in other payment crypto—**linking a tx to an order**—becomes a first-class, authenticated tag.

Use **64 bytes** for **ids, pings, and truncated hashes**. Use **leaves** for **state, proofs, and conversation**. Keep consensus opaque; let applications agree on **profiles** the way the web agrees on query strings—not by enlarging L0.
