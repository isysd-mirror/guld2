# Research: L0 code-as-law, leaf sovereignty, and the trust boundary

**Status:** research (normative intent; non-normative exploration)  
**Date:** 2026-09-29  
**Related:** [whitepaper §4](../whitepaper/guld-2.0.md#4-leaves-witnessing-and-cowitnessing), [§9.4](../whitepaper/guld-2.0.md#94-data-availability-not-an-l0-product), [spec 00](../specs/00-overview.md), [spec 08](../specs/08-cas-and-homes.md), [memo-sidechannel.md](./memo-sidechannel.md), [external-code-review-beta.md](./external-code-review-beta.md), [modern-l1-direction.md](./modern-l1-direction.md)

---

## Verdict

Guld 2.0 separates **what the network enforces** from **what a community lives by**:

| Layer | “Code as law”? | Trust object |
|-------|----------------|--------------|
| **L0 (witness hub)** | **Yes** — fixed tx vocabulary, enumerated proofs, PoW headers, weight fees | Every full node re-checks the same schemas and digests |
| **Leaf (home / dapp)** | **Optional** — bylaws, VMs, guild scripts, games, encrypted vaults | Members who choose that leaf; **not** the validating set |
| **L0 toward leaves** | **No** — L0 does **not** treat leaf interpreters as law | L0 only **witnesses** that authorized keys advanced a tip hash |

That split is intentional. It buys **privacy, freedom, and unbounded leaf innovation**. It costs **native inter-leaf trust**: two leaves do not automatically share a VM, a court, or a DA guarantee. The expected remedy is **leaf-built tooling**—hashes, proofs, memos, and side channels—that other leaves can adopt without enlarging L0.

**Tip ≠ data availability** is the same boundary applied to bytes: the chain stores heads; content retention is leaf/host/operator. There is no L0 pin market, Celestia-style DA layer, or stake/slash-for-availability ([spec 08](../specs/08-cas-and-homes.md) §5).

---

## 1. What “code as law” means here

In smart-contract L1s, “code as law” usually means: **every validator re-executes** application logic; the shared VM *is* the social contract for dapps. Disputes that fit the bytecode are settled by consensus; everything else is off-protocol politics.

Guld uses the phrase more narrowly:

### 1.1 L0 — code as law (hard)

Validators **MUST** agree on:

- Name → keys / threshold / balances / `master_hash`  
- Whether a tx is schema-valid and weight-priced  
- Whether an **enumerated** proof verifies (`threshold_cosign_v1`, ClaimLegacy profiles, …)  
- Whether a header meets PoW, schedule, roots, and `guld_rules_hash`  

If two honest nodes disagree on those checks, the protocol is broken. That is **code as law at L0**.

### 1.2 Leaf — code as law (optional, local)

A leaf **MAY** treat its own stack as law among members: WASM guild rules, a game engine, encrypted policy docs, multi-party scripts, off-chain arbitration. That “law” binds people who opted into that leaf—not every Guld validator.

L0 never asks whether the leaf’s interpreter was fair. It asks only: *did the registered authorization policy authorize this new `master_hash`?*

### 1.3 The critical negation

**L0 does not treat leaf code as law.** Witnessing a tip is not endorsing leaf politics, leaf DA, or leaf semantics. Validators who never fetch leaf bytes remain fully valid consensus participants for tips and balances.

---

## 2. Planes and trust boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│ LEAF PLANE  — optional code-as-law among members            │
│  interpreters · bylaws · encryption · private process       │
│  Trust: social / contractual / leaf-defined proofs          │
└───────────────────────────┬─────────────────────────────────┘
                            │ commit hash only
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ WITNESS EDGE  — attributable authorization                  │
│  UpdateMaster + enumerated proof · Transfer · Register …    │
│  Trust: keys on named accounts; threshold cowitness         │
└───────────────────────────┬─────────────────────────────────┘
                            │ include in block
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ L0 PLANE  — code as law for the network                     │
│  PoW · fixed txs · state roots · rule-bundle digest         │
│  Trust: open validation; tip ≠ content permanence           │
└─────────────────────────────────────────────────────────────┘
```

| Boundary | What crosses | What must not cross |
|----------|--------------|---------------------|
| Leaf → L0 | Hash + enumerated proof + fee | Leaf interpreter, private bytes, dispute meaning |
| L0 → Leaf | Confirmed tip / balance / name policy | “The network says your bylaws are correct” |
| Leaf ↔ Leaf | Whatever they invent (HTTPS, IPC, memo pointers, shared CAS, …) | Assumption that L0 mediated their trust |

**Cowitness** (threshold cosign) is crypto-attribution on L0: enough keys signed *this* tip. Social meaning of cowitness stays in the leaf ([whitepaper §4.2](../whitepaper/guld-2.0.md#42-witness-and-cowitness-responsibility)).

---

## 3. Why this design (tradeoffs)

### 3.1 Gains

| Gain | Mechanism |
|------|-----------|
| **Lean validators** | No shared app VM; fixed tx surface |
| **Leaf privacy** | Opaque homes; encryption off-protocol; no forced global re-exec |
| **Leaf freedom** | Any language/runtime; “dapps that can literally do anything” ([§4.1b](../whitepaper/guld-2.0.md#41b-dapps-you-can-literally-do-anything)) |
| **Honest product boundary** | Tip finality ≠ content CDN; no fake “Bitcoin-class DA” claim |
| **Upgradeable without politics-in-consensus** | Spec 17 rule bundles change L0 law; leaf law changes without a network hard fork |

### 3.2 Costs (accepted)

| Cost | Why it follows |
|------|----------------|
| **Inter-leaf trust is not native** | Two leaves share a namespace and money rails, not a court or VM |
| **Content can go missing** | Tip≠DA by design; self-host / mirror / leaf contract |
| **Proof surface is enumerated** | Exotic leaf governance must compile down to registered proof kinds or stay off L0 |
| **Readers can confuse planes** | Outsiders import “full node = all data = all law” from other stacks |

Guld should **document** these costs, not “fix” them by collapsing the boundary (pin markets, L0 slash-for-availability, or mandatory leaf interpreters).

---

## 4. Nuances that get misread

### 4.1 Rule-bundle digest ≠ content DA

Full nodes must know the active **`guld_rules_hash`** (small normative params). That is **rules knowledge for L0 code-as-law**, not “clone every `guld` blob” or a pin market ([spec 08](../specs/08-cas-and-homes.md) §4). Source code ships from ordinary git.

### 4.2 Stake / slash language ≠ CAS enforcement

Historical **1.0 PoS** and superseded research (`block-window-consensus`, etc.) talk about stake/slash for **tip election**. That is **not** a roadmap for slashing operators who drop leaf CAS. 2.0 tip election is **PoW**; content retention has **no** L0 slash ([spec 08](../specs/08-cas-and-homes.md) §5).

### 4.3 “Witness” is not “endorse”

Mining or validating a block that includes `UpdateMaster(alice, H')` means: *the proof verified and the fee was paid.* It does **not** mean validators audited alice’s leaf or agree with her process.

### 4.4 Memos are opaque glue, not a second VM

The 64-byte `memo` is signed, weight-priced, and **consensus-opaque** ([memo-sidechannel.md](./memo-sidechannel.md)). It correlates payments and hints; it is not L0 interpreting leaf law.

---

## 5. Inter-leaf trust: the gap and the expected response

Because L0 refuses to be a shared application court, **trust between leaves must be constructed**.

### 5.1 What L0 already gives every leaf

- **Stable names** and key policies  
- **Money** (`Transfer`, fees, registration)  
- **Ordered tip history** under those names  
- **Domain-separated hashes** and enumerated proofs  
- **Optional memo** binding intent to a tx  
- **CAS addressing** (when someone chooses to fetch bytes)

That is a **witness substrate**, not an inter-dapp SDK.

### 5.2 What leaf innovation is expected to invent

Guld leaf builders are expected to ship **reusable proof tools**—conventions that other leaves can adopt without L0 upgrades—for example:

| Tool class | Sketch | L0 touch |
|------------|--------|----------|
| **Hash commits** | Preimage revealed later in leaf CAS; tip or memo pins commitment | `UpdateMaster` / memo |
| **Cross-leaf receipts** | Leaf A embeds leaf B’s tip hash + signed statement in memo or CAS | Opaque to validators |
| **Threshold / multi-name rituals** | Coordinated cosign across accounts | Existing cosign + leaf choreography |
| **Side channels** | HTTPS/IPC between dapps; L0 settles only when needed | Whitepaper §1.2 / node surfaces |
| **Selective disclosure** | Encrypted leaf blobs; proof of statement without opening home | Off-protocol crypto |
| **Attestation markets (leaf)** | Optional paid witnesses for leaf claims | App-layer; not L0 DA slash |
| **Bridge / indexer leaves** | Foreign-chain state → Guld tip checkpoints | Spec 13 informative; dapp only |

The thesis: **clever leaves empower other leaves.** L0 stays boring on purpose so that innovation compounds *above* the witness line instead of fighting for scarce consensus opcodes.

### 5.3 What should *not* happen

- Promoting every successful leaf pattern into L0 “so validators understand it”  
- Marketing tip depth as content permanence  
- Treating missing CAS as an L0 bug  
- Reintroducing stake/slash as a fake DA layer  

---

## 6. Trust model summary (one page)

```text
User / member
  trusts → leaf process (optional code-as-law) for meaning & privacy
  trusts → own keys / cosigners for what they authorize on L0
  trusts → open PoW + fixed validation for tip/balance finality
  does NOT get → network-enforced leaf fairness or universal content DA

Validator
  enforces → L0 schemas, proofs, PoW, rules digest
  ignores → leaf interpreters and ordinary home bytes
  MAY fetch → CAS for clients/ops; never as consensus endorsement

Leaf author
  owns → semantics, retention, inter-leaf protocols
  publishes → hashes + proofs the chain can check
  competes → by building tools other leaves reuse
```

---

## 7. Implications for specs, reviews, and demos

| Context | Guidance |
|---------|----------|
| **Specs / GIPs** | Keep leaf interpreters, pin markets, and DA slash **out** of L0. Enumerate proof kinds deliberately. |
| **External reviews** | Score tip≠DA as **design**, not unfinished CDN work ([external-code-review-beta.md](./external-code-review-beta.md) §5). |
| **Reference dapps** | MAY show materialize / “content missing on this peer” as **leaf UX** (e.g. ttt)—not as protocol SoT. |
| **Wallet** | Prefer clarity: “tip confirmed” ≠ “files available everywhere.” |
| **Mainnet narrative** | Identity + money + witnessed tips; leaves are the universe. |

---

## 8. Open questions (leaf plane — not L0 blockers)

1. Which cross-leaf receipt / commitment conventions should become **informational** GIPs (still non-consensus)?  
2. How far should `@guld/js` / leaf SDKs go in shipping shared proof helpers without implying L0 endorsement?  
3. When (if ever) does a wildly successful leaf pattern justify a **new enumerated proof kind** vs staying forever off-chain?  
4. How to teach the boundary in one diagram on guld.io without sounding like “we don’t care about your data”?

---

## 9. Decision log

| Date | Note |
|------|------|
| 2026-09-29 | Drafted: L0 code-as-law vs optional leaf law; tip≠DA; inter-leaf trust via leaf-built proof tools; stake/slash ≠ CAS DA |

---

## See also

- [memo-sidechannel.md](./memo-sidechannel.md) — memo as opaque correlation / proof hint  
- [reference-dapp.md](./reference-dapp.md) — leaf demo expectations  
- [wire-codec-comparison.md](./wire-codec-comparison.md) — what L0 freezes vs what leaves invent  
- [GIP-16](../gips/gip-16.md) — memo + upgrades (L0 law changes via height activation)  
