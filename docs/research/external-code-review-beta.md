# Code review: Guld 2.0 (outside blockchain developer)

**Status:** living research note — extend as the stack evolves  
**Perspective:** external protocol / L1 engineer reviewing a **beta testnet** stack  
**Network under review:** Simba (`chain_id=2`) — [SIMBA_BETA.md](../SIMBA_BETA.md)  
**Date:** 2026-09-29  
**Scope:** architecture, consensus correctness, crypto, node surfaces, testing, maturity — not style nits  

Related: [whitepaper §11](../whitepaper/guld-2.0.md#11-security-notes-and-risks), [specs README](../specs/README.md), [merged-mining-bitcoin.md](./merged-mining-bitcoin.md), [l0-leaf-trust-boundary.md](./l0-leaf-trust-boundary.md), [SOFTWARE_FLOW.md](../SOFTWARE_FLOW.md).

---

## Verdict

| Lens | Score |
|------|------:|
| **Overall (public beta / Simba fitness)** | **79 / 100** |
| **Mainnet readiness (durable economic history)** | **58 / 100** |

Scores are from an external L0/protocol engineer’s bar for a **named public testnet that intends mainnet**, not a comparison to Bitcoin/Ethereum maturity. **79** means: ship Simba widely, invite validating peers, treat tip history as real. **58** means: do not market mainnet yet — encodings, upgrades e2e, attestation cosigners, and ops hardening are still open (tasks [042](../tasks/open/042-rule-bundle-upgrade-e2e.md)–[054](../tasks/open/054-faucet-registrar-hardening.md); tip≠DA is **not** on that list).

### Section scores

| § | Area | /100 | One-line read |
|---|------|-----:|---------------|
| 1 | Positioning / L0 boundary | **88** | Clear witness substrate; thesis and doc hierarchy are strong |
| 2 | Repo / stack / hosting | **82** | Peer-served tree + Rust workspace cohere; forge-as-mirror is intentional |
| 3 | Consensus | **78** | Serious import path + GIP-22/23; interim roots + partial spec 17 hold it back |
| 4 | Crypto / authorization | **80** | Domain separation + dual-language goldens; unbound attestation still concentrated |
| 5 | State / CAS boundary | **86** | Tip≠DA is intentional L0 design; not a missing DA layer |
| 6 | Node / P2P / HTTP | **72** | End-to-end works; static deny/CORS and mesh bootstrap need hardening |
| 7 | Testing | **76** | Reorg/sync/genesis pre-commit is above average for beta; fuzz + hosted CI thin |
| 8 | Maturity / ops honesty | **84** | Locked tip, candid risks, whitepaper current — rare and valuable |
| — | Security ops (HTTP/faucet) | **68** | Operator surfaces (static deny, faucet/registrar) need hardening — not CAS/DA |

**How the overall 76 is weighted (beta lens):** consensus 20% · crypto 12% · testing 15% · node/P2P/HTTP 12% · state/CAS boundary 10% · positioning 10% · repo 8% · maturity/honesty 8% · security ops 5%. Mainnet score applies a heavier penalty for open P0 encoding/upgrade/attestation work and unproven rule-bundle e2e.

Guld 2.0 is a **credible L0 witness substrate** on a **locked public beta tip**: fixed transaction vocabulary, name-native accounts, Bitcoin-**parameter** SHA256d PoW, deferred miner mint (GIP-22), and import-time difficulty/timestamp enforcement (GIP-23). The reference Rust node runs end-to-end on Simba with real reorg/sync gates in pre-commit. The [whitepaper](../whitepaper/guld-2.0.md) is **current** (implemented and edited — not a draft); numbered specs remain the normative detail layer and still carry draft banners where open.

It is **not** ready to be described as durable **mainnet** or as Bitcoin-class rewrite resistance. Specs are still labeled draft in places; `tx_root` / `receipt_root` are explicitly interim; ClaimLegacy for unbound names still concentrates attestation. **Tip ≠ CAS availability is intentional** (leaf concern — not an L0 TODO). **Simba will not reset again** — incompatible protocol changes require a **new** named testnet (natural as community feedback lands). **Merged mining (AuxPoW) is out of scope for mainnet launch** — optional later miner bonus, not a launch requirement.

**Grade for beta testnet:** ship and invite external validating peers; treat Simba history as durable for this network (**~79**).  
**Grade for durable mainnet economic history:** freeze encodings (Merkle roots via height activation), diversify attestation, grow organic solo hashrate with honest security-budget messaging, complete rule-bundle activation, run a mainnet ceremony (**~58** until those land).

---

## 1. What this is (positioning)

Thesis (whitepaper): *Address by name. Commit by hash. Authorize by proof.*

Guld is **not** a general VM L1. Validators enforce:

- Named accounts (UTF-8 NFC) and balances  
- Tip / `master_hash` advances under Ed25519 and `threshold_cosign_v1`  
- A fixed tx set (register, transfer, tip update, claim legacy, miner commit/claim, …)  
- PoW headers + state / tx / receipt roots  

Unbounded app logic lives in **leaves** (CAS homes). That boundary is the right call for reducing consensus surface area — closer to a name/witness hub than to EVM/SVM.

Doc hierarchy is clear and healthy for an early chain: **whitepaper wins disputes → numbered specs → GIPs → code** ([specs/README.md](../specs/README.md)).

---

## 2. Repo and stack

| Layer | Path | Role |
|-------|------|------|
| Umbrella / site | repo root | PWA, docs, Cargo workspace, submodule pins |
| Working trees | `src/guld-*` | Editable git submodules |
| Bare remotes | `repos/<name>.git` | Canonical peer host (via `guld-node`) |

**Rust workspace (protocol):** `guld-types`, `guld-wire`, `guld-crypto`, `guld-state`, `guld-consensus`, `guld-cas`, `guld-legacy`, `guld-p2p`, `guld-node`, `guld-client`, `guld-cli`, `guld-wallet`.

**Client / leaf satellites:** `guld-js`, `guld-extension`, `guld-web-ui`, `guld-discord`, reference dapps. Wire schemas: `schemas/guld/v1/` (BARE).

**Hosting model:** peers serve site + `/repos/` + `/api/v1` from the published tree; GitHub is a mirror ([HOSTING.md](../HOSTING.md)). Unusual and coherent for a protocol that treats software distribution as first-class.

---

## 3. Consensus review

### 3.1 Strengths

1. **Import path is serious.** `import_block` / `check_header` in `src/guld-consensus` re-check parent link, scheduled difficulty, PoW, `guld_rules_hash`, MTP + future drift, `RewardCommit` layout, then apply txs and verify `state_root`, `tx_root`, `receipt_root`, inclusion fees. Difficulty is not seal-only theater (GIP-23).

2. **Deferred mint (GIP-22).** Seal commits the reward; spendable mint is `ClaimReward` after 100 blocks. Better alignment with reorgs than immediately spendable coinbase.

3. **Familiar PoW parameters.** SHA256d, ~600 s target, 2016-block / 4× clamp retarget, MTP(11), ~4M weight — easy for Bitcoin-fluent reviewers to audit. Docs correctly refuse “Bitcoin-class security budget” claims.

4. **Fork choice.** Cumulative work, then height, then hash (`choose_tip`). Dual-miner reorg integration tests exist and gate commits.

5. **Height-activated rules story (spec 17).** Headers carry `guld_rules_hash`; software binary ≠ consensus activation. Implementation is still **partial**, but the model is the right one — and it is the correct path for changes that must not wipe Simba.

### 3.2 Gaps / freeze items

| Item | Why it matters | Status |
|------|----------------|--------|
| **Interim `tx_root` / `receipt_root`** | Tagged hash of concatenated JSON leaves (`guld/tx_root/interim/v1`) — consensus-critical but not a classic Merkle tree | **Decided:** replace via **height activation on Simba** — [GIP-35](../gips/gip-35.md) ([043](../tasks/done/2026-09/043-merkle-tx-receipt-roots-gip.md) done) + [044](../tasks/open/044-merkle-roots-implement-simba-activate.md) (goldens + activate); dry-run [042](../tasks/done/2026-09/042-rule-bundle-upgrade-e2e.md) |
| **Leading-zero bit difficulty** | Coarse 2× steps vs Bitcoin `nBits`; fine for solo | Locked research Option C; Stratum/`nBits` adapter only if AuxPoW is pursued later |
| **AuxPoW / merged mining** | Optional miner convenience / hashrate pathway | **Out of scope for mainnet launch** — research only ([merged-mining-bitcoin.md](./merged-mining-bitcoin.md)); solo SHA256d is the launch PoW |
| **Simba genesis timestamp skew** | Distorts first 0→2016 retarget window | Known; **no Simba regenesis**; mainnet must use real ceremony UTC ([task 040](../tasks/open/040-simba-genesis-timestamp-retarget.md)) |
| **Spec 17 code** | Rule-bundle activation must be complete and tested before mainnet rule changes | Partial in matrix |

**Reviewer note:** Simba tip is **not** disposable. Interim roots will cut over at a scheduled height (spec 17); historical blocks below `H` keep the interim algorithm.

---

## 4. Crypto and authorization

| Primitive | Use | Notes |
|-----------|-----|--------|
| SHA-256 tagged (`tag ‖ 0x00 ‖ payload`) | AccountId, tips, cosign messages, TxId domain | Good domain separation |
| SHA256d | Block hash | Bitcoin-aligned search |
| Ed25519 | Account / transfer / register / claim bind | Standard choice |
| `threshold_cosign_v1` | Tip advances; threshold Transfer (GIP-29) | Enumerated, reviewable |
| BARE | Canonical TxId preimage | Right direction for multi-impl |
| OpenPGP clearsign | `ClaimLegacy` vs `archives/keys-pgp` | Migration path from 1.0 |
| AES-GCM + PBKDF2 | Wallet keyring only | Off consensus |

**Positives:** GIP-26 golden vectors for TxId + header/diff/time in Rust **and** `@guld/js` — unusual discipline this early.

**Concerns:**

- Unbound legacy unlocks still lean on **`isysd` attestation** on Simba until GIP-25 activates. **Direction:** multi-attestor **cosigners**; roster is a **community process** during 2.0 digestion; **mainnet commitment:** at least some cosigners ([045](../tasks/open/045-gip-25-attestation-cosigners.md)).
- PQ / hybrid proof kinds are future-only — fine for beta; call out in threat model if marketing longevity.

---

## 5. State, CAS, and the tip≠DA boundary

- Account map + SMT `state_root` (`guld-state`); fjall KV in node.  
- CAS homes commit via tips; validators do **not** re-execute leaf interpreters.  
- **Tip ≠ data availability is by design** ([spec 08](../specs/08-cas-and-homes.md) §5, whitepaper §9.4 / glossary). L0 stores tips; home **bytes** are a **leaf / host / operator** concern (self-host, forge, reference dapp materialize). Reviewers who treat this as a missing “DA layer,” pin market, or **stake/slash-for-availability** TODO are applying the wrong mental model — Guld is a witness hub, not a content CDN. (Stake/slash language elsewhere is almost always **1.0 PoS history** or **superseded research**, not a CAS roadmap.)  
- Optional demo UX (e.g. tic-tac-toe materialize) MAY surface “content not on this peer”; that stays in **leaf** apps, not L0 consensus or wallet SoT requirements.

**Do not** add L0 pin markets, Celestia-style DA, mandatory full-CAS retention, or protocol specs that pretend tip finality implies content permanence. Deeper trust-model write-up: [l0-leaf-trust-boundary.md](./l0-leaf-trust-boundary.md).

---

## 6. Node, P2P, and HTTP

**Binary:** `guld-node` — consensus + state + CAS + libp2p (TCP+Noise+Yamux) + HTTP `/api/v1` + optional static tree + transitional JSON-RPC.

**Client surface strengths:** health, chain status, accounts/blocks/txs/mempool, SSE, faucet (testnet), registrar webhook, `/api/v1/repos/*`, SPA + static site. Wallet PWA colocated with the protocol node is a strong demo story.

**Security-sensitive ops notes (beta):**

1. Module docs say refuse `archives/`, `.guld-data/`, `target/` under `--http-static` — **enforced** in `guld-node` (`is_denied_static_path` + middleware; task [046](../tasks/done/2026-09/046-http-static-deny-cors-audit.md)). **CORS** remains permissive by design for wallet peer API bases — document / optionally tighten at nginx ([HOSTING.md](../HOSTING.md)).  
2. Faucet / registrar / Paymento HMAC are **operator** surfaces — misconfig is an ops incident, not consensus failure, but public beta hosts will get probed.  
3. P2P Hello rejects bad `chain_id` / rules hash; bootnodes (guld.io) are availability, not consensus authority — good framing. DHT / hole-punch / multi-bootnode richness still limited (spec 09 Phase B polish open).

---

## 7. Testing posture

**CI = local pre-commit**, not a hosted pipeline ([chain-lifecycle README](../../scripts/chain-lifecycle/README.md)):

| Phase | Coverage |
|-------|----------|
| 1 / 1b | State lifecycle matrix + group multisig |
| 2 / 2b | Node `dev_smoke` + group e2e |
| 3 | Two-node P2P sync |
| 4 / 4b | Dual-miner reorg + reorg catch-up no-ban |
| 5 | Simba catch-up sync |
| Genesis | Simba pin smoke |
| Vectors | GIP-26 wire + consensus (+ JS) |

**Strong for beta:** reorg, difficulty schedule, golden vectors, genesis pin, multi-node sync — these are the tests that catch real consensus bugs.

**Thin / missing for “production L1” expectations:**

- Second validating implementation (JS is vectors/SDK, not a full consensus node)  
- Systematic fuzzing / property tests on apply + import  
- Adversarial P2P DoS beyond ban scoring  
- Hosted CI visible to outsiders (trust-me-local-hooks is a culture fit for peers; forge badges are optional UX — see [`SOURCE_AND_RELEASE.md`](../SOURCE_AND_RELEASE.md), not a missing proof)

---

## 8. Maturity checklist (Simba)

| Signal | Reading |
|--------|---------|
| Public testnet docs | Clear — [SIMBA_BETA.md](../SIMBA_BETA.md), [deploy/SIMBA.md](../../deploy/SIMBA.md) |
| Reset policy | **Locked** — no further Simba resets; breaks → new testnet |
| Whitepaper | **Current** ([guld-2.0.md](../whitepaper/guld-2.0.md)) — not a draft |
| Specs banner | Still **draft** in places; A1–A11 normative detail largely locked in matrix |
| Mainnet genesis | Open ([031](../tasks/open/031-mainnet-genesis-ceremony.md)) |
| Merged mining | **Out of scope for mainnet** — optional post-launch miner bonus (research only) |
| Codec freeze | TxId BARE yes; **Merkle roots** → [GIP-35](../gips/gip-35.md)/[044](../tasks/open/044-merkle-roots-implement-simba-activate.md); account leaf freeze-as-is or rewrite → [051](../tasks/open/051-account-leaf-datadir-bare.md) (rewrite → [Mufasa](../MUFASA.md)) |
| Honest risk table | Whitepaper §11.2 — unusually candid; keep it |

---

## 9. Findings (priority for beta → mainnet)

### P0 — treat as blockers for durable mainnet

1. **Replace interim `tx_root` / `receipt_root`** with specified Merkle + goldens via height activation — [GIP-35](../gips/gip-35.md) / [044](../tasks/open/044-merkle-roots-implement-simba-activate.md) / [055](../tasks/open/055-simba-single-rule-bundle.md).  
2. **Complete height-activated rule-bundle path** (spec 17) with tests that reject wrong `guld_rules_hash` across activation height — [042](../tasks/open/042-rule-bundle-upgrade-e2e.md).  
3. **Mainnet genesis ceremony** with real UTC timestamp — [031](../tasks/open/031-mainnet-genesis-ceremony.md) / [040](../tasks/open/040-simba-genesis-timestamp-retarget.md).  
4. **Diversify ClaimLegacy attestation** — [GIP-25](../gips/gip-25.md) / [045](../tasks/open/045-gip-25-attestation-cosigners.md): cosigners yes; community selects roster; mainnet launches with ≥ some cosigners.

### P1 — security budget / ops

5. ~~**Hashrate expectations / messaging**~~ — **done** ([053](../tasks/done/2026-09/053-mainnet-security-budget-messaging.md)); blurb [`fragments/security-budget.md`](../fragments/security-budget.md).  
6. **HTTP static deny-list + CORS audit** — [046](../tasks/done/2026-09/046-http-static-deny-cors-audit.md) **done**.  
7. ~~CAS availability UX~~ — **cancelled** ([047](../tasks/open/047-cas-tip-da-ux.md)): tip≠DA is intentional L0 boundary; leaf concern only.  
8. **P2P bootstrap diversification** — [032](../tasks/open/032-p2p-mesh-robustness-phase-b.md).

### P2 — engineering hygiene

9. ~~**Reproducible CI artifact**~~ — **cancelled** ([050](../tasks/done/2026-09/050-reproducible-lifecycle-ci.md)); signed tags + local/re-runnable CI are the trust model; forge Actions optional — [`SOURCE_AND_RELEASE.md`](../SOURCE_AND_RELEASE.md).  
10. **Fuzz apply/import** — [049](../tasks/done/2026-09/049-fuzz-apply-import.md) **done** (`proptest` smoke).  
11. **Second validating client** — deferred to [`LATER.md`](../LATER.md) (goldens remain the bridge).  
12. **Lift draft banners** on locked specs — [048](../tasks/open/048-lift-locked-spec-draft-banners.md).  
13. **Account-leaf / datadir BARE** — [051](../tasks/open/051-account-leaf-datadir-bare.md).  
14. ~~**Faucet / registrar hardening**~~ — **done** ([054](../tasks/done/2026-09/054-faucet-registrar-hardening.md)); checklist [`fragments/faucet-registrar-hardening.md`](../fragments/faucet-registrar-hardening.md).  
15. **Next-testnet checklist** — [052](../tasks/open/052-next-testnet-checklist.md); successor name **Mufasa** ([MUFASA.md](../MUFASA.md), planned `chain_id` 3; not launched).

---

## 10. What an outside engineer should respect

- Clear L0 vs leaf boundary — validators do not run app VMs.  
- Bitcoin-parameter PoW with **honest** security-budget disclaimer.  
- Deferred miner mint + import-enforced difficulty/timestamps.  
- Domain-separated hashing, BARE TxId, dual-language goldens.  
- Self-hosting software plane (`/repos/`, site, API on the same peer).  
- Pre-commit lifecycle that actually exercises sync and reorg.  
- Documented premine / attestation risks; tip≠DA stated as **design** (leaf concern), not as unfinished L0 work.  
- Explicit **locked Simba** + new-testnet policy for breaking changes (healthier than infinite tip wipes).

---

## 11. Suggested review entry points

1. [specs/README.md](../specs/README.md) implementation matrix → `src/guld-consensus` (`import_block`, `pow`, `retarget`)  
2. `src/guld-state` apply path + lifecycle tests  
3. `schemas/guld/v1/` + GIP-26 vectors  
4. [SIMBA_BETA.md](../SIMBA_BETA.md) + `data/genesis/simba/` + [deploy/SIMBA.md](../../deploy/SIMBA.md)  
5. [Whitepaper](../whitepaper/guld-2.0.md) §11 + [merged-mining-bitcoin.md](./merged-mining-bitcoin.md)  
6. `src/guld-node/src/http_api.rs` + `src/guld-p2p` threat model  
7. [GIP-22](../gips/gip-22.md) / [GIP-23](../gips/gip-23.md) / [GIP-14](../gips/gip-14.md) / [GIP-25](../gips/gip-25.md)

---

## 12. Open questions for maintainers (extend this section)

_Use this section when iterating on the review._

- [x] Simba reset policy — **locked**; breaks → new testnet (2026-09-29)  
- [x] Interim tx/receipt roots — **height-activate Merkle on Simba** inside **single Core catch-up bundle** ([055](../tasks/open/055-simba-single-rule-bundle.md); [GIP-35](../gips/gip-35.md) Accepted — [043](../tasks/done/2026-09/043-merkle-tx-receipt-roots-gip.md) done; implement/activate [044](../tasks/open/044-merkle-roots-implement-simba-activate.md); dry-run [042](../tasks/done/2026-09/042-rule-bundle-upgrade-e2e.md)) (2026-09-29)  
- [x] Merged mining / AuxPoW — **out of scope for mainnet launch**; optional later miner bonus (2026-09-29)  
- [x] GIP-25 — **Accepted**; cosigners TBD for mainnet; wire may land empty-roster in [055](../tasks/open/055-simba-single-rule-bundle.md) ([045](../tasks/open/045-gip-25-attestation-cosigners.md)) (2026-09-29)  
- [x] Remaining review findings tasked — [046](../tasks/open/046-http-static-deny-cors-audit.md)–[054](../tasks/open/054-faucet-registrar-hardening.md) (2026-09-29)  
- [x] Whitepaper/specs = **mainnet SoT**; Simba catches up via one rule bundle; GIP-25/31–34 Accepted (2026-09-29) 

---

## Changelog

| Date | Change |
|------|--------|
| 2026-09-29 | Initial external beta code review |
| 2026-09-29 | Simba tip locked (no more resets); whitepaper no longer draft |
| 2026-09-29 | Decision: Merkle roots via Simba height activation (tasks 043/044; e2e 042) |
| 2026-09-29 | Merged mining out of scope for mainnet launch (optional later miner bonus) |
| 2026-09-29 | GIP-25: cosigners + community roster process; mainnet ≥ some (task 045) |
| 2026-09-29 | Filed review follow-up tasks 046–054 |
| 2026-09-29 | Added overall + section scores (beta 76 / mainnet 58) |
| 2026-09-29 | Tip≠DA reframed as intentional leaf boundary; cancelled task 047; CAS section score → 86; beta overall → 79 |
| 2026-09-29 | Cleared residual L0-DA / Celestia / “mandatory guld clone” / slash-for-availability implications |
| 2026-09-29 | Whitepaper/specs mainnet SoT; GIP-25/31–34 Accepted; single Simba Core bundle plan (task 055) |
