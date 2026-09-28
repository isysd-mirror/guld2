# Research: Merged mining Guld with Bitcoin

**Status:** exploratory — no GIP yet; v1 keeps solo SHA256d  
**Date:** 2026-09-27  
**Related:** [spec 06 §2.5](../specs/06-blocks-and-consensus.md), [pow-nbits-vs-leading-bits.md](./pow-nbits-vs-leading-bits.md) (Option C locked), [bitcoin-guld-comparison.md](./bitcoin-guld-comparison.md), [spec 17](../specs/17-protocol-upgrades.md)

## Verdict

**Medium difficulty.** Feasible and already anticipated in the protocol docs — not a research moonshot. SHA256d alignment unlocks the path; the hard parts are a careful AuxPoW consensus GIP, a Stratum/target adapter for leading-zero bit difficulty, and convincing Bitcoin pools to enable Guld. Engineering completeness does **not** equal Bitcoin-class security budget.

| Signal | State |
|--------|--------|
| Overall difficulty | **Medium** |
| SHA256d alignment | **Done** (spec 06 §2) |
| AuxPoW implemented | **0%** |
| Credible first ship | **~2–4 months** (code + Simba pilot) |
| Meaningful merge hashrate | **Unknown / social** |

---

## 1. What merged mining means here

Classic **AuxPoW** (Namecoin pattern):

1. A Bitcoin miner embeds a commitment to a Guld block (or aux Merkle root) in the Bitcoin **coinbase**.
2. The miner searches **SHA256d** on the Bitcoin header as usual.
3. If the parent hash meets **Guld’s** target, the miner submits the Guld block plus an AuxPoW witness (parent header, coinbase, Merkle proofs).
4. Guld nodes verify the link and accept the Guld block.

Bitcoin does **not** need a soft fork. Only Guld consensus and mining tooling change. Parent-chain work is reused; child-chain economics and state stay independent.

Historical reference: Namecoin activated merged mining in 2011; coinbase carries a magic + aux Merkle root; the aux chain validates parent PoW without syncing Bitcoin state.

---

## 2. Starting position (Guld today)

### Already favorable

- PoW is Bitcoin-class **SHA256d** on a canonical header preimage ([spec 06 §2](../specs/06-blocks-and-consensus.md)). Same search loop ASICs already run.
- Timing matches Bitcoin: **600 s** target, **2016-block / 14-day** retarget, **4× clamp**, MTP + 2 h drift, weight ~4M, 100-block reward maturity.
- Spec 06 §2.5 reserves a future AuxPoW / witness GIP. Locked research prefers **Option C** (keep bit-difficulty; adapt pools) over an immediate `nBits` migration ([pow-nbits-vs-leading-bits.md](./pow-nbits-vs-leading-bits.md)).

### Not Bitcoin-compatible yet

- Variable Guld header preimage (roots, rules hash, UTF-8 miner name, **u64** nonce) — not an 80-byte Bitcoin header.
- Target is **leading-zero bits**, not compact `nBits` — coarse 2× steps; Stratum share math needs a conversion layer.
- Rewards are `RewardCommit` / `ClaimReward` ([GIP-22](../gips/gip-22.md)), not a Bitcoin-style coinbase script.
- No AuxPoW types, no Stratum surface, no pool path in `guld-node` today (in-process `mine_nonce` only).

---

## 3. Difficulty by workstream

Effort bands assume one strong consensus engineer + one mining/ops person, building on Namecoin/RSK-style prior art — not greenfield cryptography.

| Workstream | Hardness | Est. | Why |
|------------|----------|------|-----|
| Consensus math / AuxPoW verify | Medium | 2–4 wk | Pattern is known; Guld must define parent commitment, chain id / tree index, rejection rules, and tests |
| Commitment slot design | Medium | 1–2 wk | Spec names `version` / coinbase-adjacent witness / `guld` home leaf. Must bind `RewardCommit` (tx[0]) cleanly |
| Difficulty encoding (bits vs `nBits`) | Low–Med | 1 wk | Locked Option C: map `d` ↔ power-of-two target for pools; avoid consensus migration unless pain forces it |
| `guld-consensus` + vectors | Medium | 2–3 wk | Parse AuxPoW, verify parent coinbase magic + Merkle links, enforce Guld PoW on aux header hash |
| Node seal / RPC / P2P | Medium | 2–4 wk | Optional merge path alongside solo `mine_nonce`; wire size for AuxPoW payloads; activation via rules hash |
| Stratum / pool adapter | **Hard** | 4–10 wk | Biggest unknown. Custom share target, job templates, dual submit. Historical Namecoin used a merge-mine proxy |
| Pool adoption / incentives | **Hard (social)** | Ongoing | Engineering ≠ hashrate. Operators need zero Bitcoin risk and clear Guld fee share |
| Security review / activation | Medium | 2–4 wk | Height-activated rule bundle ([spec 17](../specs/17-protocol-upgrades.md)). Review withholding, empty-block SPV mining, chain-id collisions |

---

## 4. Architecture sketch (Namecoin-class AuxPoW)

```text
1. Build Guld header H_g (roots, miner, difficulty d, …)
2. Commit hash(H_g) [or aux Merkle root] into Bitcoin coinbase
3. Mine Bitcoin header until SHA256d meets Guld target T(d)
4. If also under Bitcoin nBits → submit BTC block as usual
5. Submit Guld block + AuxPoW { BTC header, coinbase, merkle branches }
6. Guld peers: verify commitment + parent PoW ≥ Guld target; apply Guld body
```

Guld still validates its own header commitments and state transition. Bitcoin is only the **work oracle**. Solo SHA256d mining of bare Guld headers can remain valid until/unless a GIP requires AuxPoW.

For power-of-two targets (Guld’s current rule), pool adapters can use:

```text
T(d) = 2^(256-d) - 1    // maximum valid H
```

See conversion notes in [pow-nbits-vs-leading-bits.md §8](./pow-nbits-vs-leading-bits.md).

---

## 5. What is easy vs what bites

### Comparatively easy

| Item | Note |
|------|------|
| Hash algorithm | Already SHA256d — ASICs usable in principle |
| No BTC consensus change | Coinbase scriptSig / commitment space only |
| Prior art | Namecoin AuxPoW, merge-mine proxies, academic analyses |
| Protocol foreshadowing | Spec 06 §2.5 + locked Option C decision |

### Comparatively hard

| Item | Note |
|------|------|
| Variable header + u64 nonce | Not drop-in Bitcoin midstate tooling |
| Bit difficulty | Pools speak `nBits` / float difficulty |
| `RewardCommit` model | Commitment location must be Guld-native |
| No pool surface today | Only in-process miner in `guld-node` |
| Adoption | Security budget tracks **actual** merge hashrate |

---

## 6. Security and product caveats

1. **Not automatic Bitcoin security.** Rewrite cost tracks empirical merge hashrate pointing at Guld, not the mere existence of an AuxPoW format. Whitepaper §11 already rejects “parameter copy = Bitcoin-class security.”
2. **Miner / pool agency.** Pools can censor aux jobs, mine empty Guld blocks, or withhold. Merge mining historically concentrates child-chain influence in a few large Bitcoin pools.
3. **Activation discipline.** Consensus rule changes need a height-activated rule bundle ([spec 17](../specs/17-protocol-upgrades.md)). Shipping a binary is not activation; production protocol releases remain **signed tags** only.

---

## 7. Recommended path (matches locked research)

| Phase | Deliverable | Avoid |
|-------|-------------|-------|
| GIP draft | AuxPoW wire format, commitment slot, parent = Bitcoin mainnet (chain magic), optional solo still allowed | Silent consensus change; dual SoT difficulty fields |
| Consensus + vectors | Verify path in `guld-consensus`; golden vectors; Simba experiments | Requiring `nBits` as SoT unless Option C fails in practice |
| Mining bridge | getwork/Stratum adapter: `T(d)=2^(256-d)−1` ↔ share difficulty | Assuming stock BTC pool software works unmodified |
| Pilot | One cooperative pool or proxy on Simba, then mainnet height activation | Claiming Bitcoin-class security at first merge block |

**Option D (80-byte PoW tail) — defer.** Splitting a Bitcoin-layout mining header from the Guld state header is the heaviest design ([pow-nbits research Option D](./pow-nbits-vs-leading-bits.md)). Revisit only if pool integration pain dominates AuxPoW + adapter cost.

---

## 8. Rough calendar

| Scenario | Calendar | What you get |
|----------|----------|--------------|
| Spec-only / GIP | 1–3 weeks | Normative design peers can review; no hashrate yet |
| Reference verify + Simba merge blocks | 6–10 weeks | Working AuxPoW on testnet with a custom miner/proxy |
| Production-ready + one pool | 3–6 months | Mainnet activation path + real (likely small) merge hashrate |
| Meaningful security budget | Unknown / social | Depends on pool economics, not just code completeness |

---

## 9. Gaps checklist (pre-GIP)

- [ ] AuxPoW / parent-coinbase commitment format (magic, Merkle size/nonce, chain id)
- [ ] Commitment slot relative to `RewardCommit` / `version` / home leaf
- [ ] AuxPoW verify path in `guld-consensus` + GIP-26-style vectors
- [ ] Solo vs merge policy (optional AuxPoW vs required after activation height)
- [ ] Stratum / merge-mine proxy: `d` ↔ target/share difficulty
- [ ] P2P / wire size for AuxPoW payloads
- [ ] Height-activated rule bundle + Simba pilot plan
- [ ] Pool operator docs and fee-share incentives

---

## 10. References

| Source | Location |
|--------|----------|
| Guld PoW / future merge hook | [spec 06 §2–§2.5](../specs/06-blocks-and-consensus.md) |
| Bits vs `nBits` (Option C locked) | [pow-nbits-vs-leading-bits.md](./pow-nbits-vs-leading-bits.md) |
| Parameter comparison | [bitcoin-guld-comparison.md](./bitcoin-guld-comparison.md) |
| Protocol upgrades | [spec 17](../specs/17-protocol-upgrades.md) |
| Reward commit/claim | [GIP-22](../gips/gip-22.md) |
| Namecoin AuxPoW | Namecoin `auxpow` / historical merge-mine proxy docs |
| Effects analysis | Judmayer et al., *Merged Mining: Analysis of Effects and Implications* (TU Wien) |

---

## 11. Decision log

| Date | Note |
|------|------|
| 2026-09-26 | Leading-zero bits locked for v1; merged mining = tooling/GIP, not `nBits` migration |
| 2026-09-27 | This report: overall effort **medium**; recommend Option C + Namecoin-class AuxPoW GIP; defer Option D |
