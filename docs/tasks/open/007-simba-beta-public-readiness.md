# Task: Simba beta public — readiness review

Status: open
Priority: high
GIP:
Spec: ../specs/06-blocks-and-consensus.md, ../specs/15-ledger-import.md, ../specs/07-fees-and-tokenomics.md
Runbook: ../../deploy/SIMBA.md
Genesis: ../../data/genesis/simba/

## Purpose

Checklist for **you** (maintainer / protocol owner) before calling Simba a **durable public beta** — i.e. before peers should treat height-0 and consensus rules as “expect no more breaking resets.”

Operational mesh consistency is largely there; **protocol freeze is not**. Work through every section; tick boxes only when decided *and* reflected in specs, genesis artifacts, and code.

**Parameter parity chart:** [`docs/research/bitcoin-guld-comparison.md`](../research/bitcoin-guld-comparison.md) — every magic number vs Bitcoin Core (optional ref clone: `git clone --depth 1 https://github.com/bitcoin/bitcoin.git`).

**PoW target encoding:** [`docs/research/pow-nbits-vs-leading-bits.md`](../research/pow-nbits-vs-leading-bits.md) — why leading-zero bits today vs `nBits` for merged mining.

**Wire codec (A2):** [`docs/research/wire-codec-comparison.md`](../research/wire-codec-comparison.md) — BARE / protobuf / SSZ / JSON tradeoffs.

---

## Snapshot: where we are

### Ready enough to run **one tip** (operational)

Peers that share the **same height-0 artifacts** can already run a consistent Simba mesh:

- [ ] **Verified** — P2P phase C: Hello, tx gossip, block import, tip catch-up ([`deploy/SIMBA.md`](../../deploy/SIMBA.md))
- [ ] **Verified** — Network profile knobs are pinned in repo: `chain_id=2`, bootnode `guld.io`, profile in [`data/networks/simba.json`](../../data/networks/simba.json) (`auto_mine`, initial difficulty, etc.)
- [ ] **Verified** — Committed genesis path exists: [`data/genesis/simba/`](../../data/genesis/simba/) (manifest, params, `isysd-claim.asc`) — empty datadirs load this, not random keys
- [ ] **Verified** — Operators can follow runbook without `--dev` / `--import-ledger` footguns

### Not yet ready to **lock block 0** (implementation)

- [x] Acknowledged — **A1–A11 decisions** recorded in specs + GIPs ([GIP-9](../gips/gip-9.md) Final, [GIP-14](../gips/gip-14.md) Accepted)
- [ ] Acknowledged — **Section C blockers** still open in code (reorg, A10 timestamps, BARE wire, GIP-22)
- [ ] Acknowledged — No committed `blocks/0.json` + matching tip/state bundle in-repo as a single reproducible ceremony output (genesis dir has manifest/params; **G2** refresh pass)
- [ ] Acknowledged — Operators must use artifact genesis only on Simba (no post-hoc `--import-ledger`)
- [ ] Acknowledged — Remaining reset triggers: **G2** ceremony output, BARE `TxId` cutover, GIP-22 activation height

### If locking soon (minimum bar)

Freeze **one reproducible genesis artifact** (fixed keys + timestamp, ledger yes/no decided, rewrite matching `0.json` / tip / state), publish it, and communicate: **“Simba may still reset once before mainnet.”**

---

## A. Must decide before a durable Simba lock

Consensus / genesis — each row needs a **decision**, spec update, and implementation match before public “no more resets” messaging.

| # | Item | Spec(s) | Decision / pin | Spec updated | Code matches | Shipped in genesis |
|---|------|---------|--------------|--------------|--------------|-------------------|
| A1 | PoW algorithm & retarget | [06](../specs/06-blocks-and-consensus.md) | **Locked v1:** SHA256d; **2016-block** retarget (14-day window, 4× clamp); bit-difficulty; merged mining = future GIP (§2.5). Compare: [bitcoin-guld-comparison.md](../research/bitcoin-guld-comparison.md) | [x] | [x] | n/a |
| A2 | Wire codec | [01](../specs/01-cryptography.md), [00](../specs/00-overview.md) | **Locked: BARE** — Rust (`serde_bare`/`bare_proc`), JS/TS (`@bare-ts/tools`), Python (`bare-py`); schemas in [`schemas/`](../../schemas/README.md); HTTP stays JSON | [x] | [ ] | n/a |
| A3 | Exact `AccountId` preimage | [01](../specs/01-cryptography.md), [02](../specs/02-identity-and-accounts.md) §3.1 | **Locked:** keyed `guld/account_id/v1`; keyless `…/network/v1`; legacy `…/legacy/v1` (unchanged after claim) | [x] | [x] | [x] |
| A4 | Account / tx codec freeze | [02](../specs/02-identity-and-accounts.md), [03](../specs/03-transactions.md) | **Locked:** BARE wire (A2); JSON HTTP-only at boundary — implementation [009](./009-bare-wire-implementation.md) | [x] | [ ] | [ ] |
| A5 | `LegacyOwnershipProof` packet profile | [15](../specs/15-ledger-import.md), [03](../specs/03-transactions.md) | **Normative v1:** `pgp_cleartext_v1`, `isysd_attestation_v1`, `dev_unlock_v1` (spec 15 §5.1) | [x] | [x] | [x] |
| A6 | Empty-key locked accounts: `threshold=0` vs explicit flag | [15](../specs/15-ledger-import.md) | **Locked v1:** `keys=[]`, `threshold=0` on import; authoritative lock = `legacy.status=locked` (spec 15 §8) | [x] | [x] | [x] |
| A7 | Final-ish **x** / import manifest hash | [15](../specs/15-ledger-import.md), [07](../specs/07-fees-and-tokenomics.md) | **Locked:** manifest hash `0xd5f12f6df4ab2b802ed6957b08d7c104d9eae0878decb10728f7e20975e2df27`; **x ≈ 959,947.19527052 GULD** (maintainer confirmed) | [x] | [x] | [x] |
| A8 | `L_cap` / premium table | [07](../specs/07-fees-and-tokenomics.md) | **Locked:** `L_cap = 6`; `F_user(L)` letter table; `F_group(L,n) = F_user(L) × (2+n)` (spec 07 §3.1) | [x] | [x] | n/a |
| A9 | Genesis embeds `import_manifest_hash` | [15](../specs/15-ledger-import.md) | Set in artifact genesis build | [x] | [x] | [x] |
| A10 | Timestamp drift bounds | [06](../specs/06-blocks-and-consensus.md) | **Locked:** MTP (11-block median) + max **+2 h** future skew — implement [010](./010-header-timestamp-validation.md) (**Simba blocker**) | [x] | [ ] | n/a |
| A11 | Reserved foreign names at genesis | [13](../specs/13-foreign-chains.md) | **Locked: none.** No `bitcoin`/`ethereum` shells; dapps register names + build leaves. Cross-chain witnessing = **future dapp** capability (informative spec 13) | [x] | [x] | n/a |

### Genesis ceremony (tie to A7, A9, A11)

| # | Item | Done |
|---|------|------|
| G1 | Decide: full 1.0 ledger in Simba genesis or subset — document in [`data/genesis/simba/README.md`](../../data/genesis/simba/README.md) | [x] full ledger (A7 manifest) |
| G2 | Regenerate / commit manifest + `params.json` + claim + **matching** block 0 / state root (no wall-clock drift) | [ ] |
| G3 | Publish ceremony steps; operators never use empty-datadir mint or post-hoc `--import-ledger` on Simba | [ ] |
| G4 | Announce reset policy: “one more reset OK” vs “locked for beta” | [ ] |

---

## B. Can defer past Simba lock (ecosystem / UX / later phases)

Track here so they do not block beta.

| Area | Items | Spec / note | Defer OK? |
|------|--------|-------------|-----------|
| **UI** | Extension login challenge, `guld://` deep links, auto-lock, WASM parity | [14](../specs/14-reference-ui.md) | [ ] yes |
| **P2P polish** | Richer locator, QUIC, DNSaddr | [09](../specs/09-p2p.md) | [ ] yes |
| **RPC** | OpenAPI, SSE completeness, indexer | [12](../specs/12-rpc.md) | [ ] yes (SSE partial — GIP-19) |
| **Leaf-host** | Sandbox / manifest | [11](../specs/11-leaf-host.md) | [ ] yes |
| **Merged mining** | Auxiliary chain hash in coinbase witness | [06](../specs/06-blocks-and-consensus.md) §2.5 | [ ] yes (post-v1 GIP) |
| **DAG-PoW** | Multi-parent headers | research / [LATER.md](../LATER.md) | [ ] yes |
| **Foreign-chain SPV** | Dapp-layer research (not L0 v1) | [13](../specs/13-foreign-chains.md) | [ ] yes |
| **Research** | PQ keys, name deposits, `CloseSubaccount`, … | [LATER.md](../LATER.md) | [ ] yes |

---

## C. Simba beta blockers (must ship — not deferrable gaps)

| Blocker | Impact | Task |
|---------|--------|------|
| Chain **reorg** not implemented | Fork at same height needs manual reset today | [006](./006-chain-lifecycle-tests.md) phase 4 — **Simba requirement** |
| **A10 timestamp rules** not enforced | Bad headers skew retarget / ordering | [010](./010-header-timestamp-validation.md) — **Simba requirement** |
| **A4 BARE wire** not implemented | Unstable `TxId`; JSON on P2P | [009](./009-bare-wire-implementation.md) |
| **GIP-22 miner rewards** not implemented | Spec **Accepted**; code still uses `credit_miner()` | GIP-22 impl + [008](./008-mempool-persistence.md) for pending claims |

## C2. Other gaps (track; do not over-promise)

| Gap | Impact | Task / follow-up |
|-----|--------|------------------|
| **Mempool not persisted** | Pending txs lost on restart | [008](./008-mempool-persistence.md) |
| Specs **draft** banner | Cosmetic until A1–A11 locked | Promote specs as rows complete |
| Node RPC lifecycle tests partial | Register + transfer only on dev smoke | Extend 006 |

---

## D. Beta public launch checklist (operator + comms)

When A-section decisions are **good enough for testnet** (not necessarily mainnet-final):

| # | Action | Done |
|---|--------|------|
| D1 | Post short “Simba beta” page: chain_id, genesis hash, bootnode, reset policy | [ ] |
| D2 | Confirm guld.io runs `--network simba` from pinned umbrella + genesis (not dirty worktree) | [ ] |
| D3 | Faucet key on host only; drip/register tested end-to-end | [ ] |
| D4 | Explorer + wallet point at Simba API; banner shows testnet | [ ] |
| D5 | One-page “how to join” (clone, build, datadir, sync) links to [`deploy/SIMBA.md`](../../deploy/SIMBA.md) | [ ] |
| D6 | Discord / peer list or “dial guld.io only” documented | [ ] |

---

## Done when

- [ ] Every **A1–A11** row has a decision recorded (in spec or genesis README) — decisions done; **A4/A10 code** still open
- [ ] **Section C Simba blockers** closed (reorg, timestamps, BARE wire, GIP-22)
- [ ] **G1–G4** genesis ceremony complete or explicitly waived with published reset policy
- [ ] **D1–D6** comms/ops checklist complete
- [ ] Task moved to `done/YYYY-MM/` with link to announced beta (or closed as “blocked on A_”)

## Notes (review log)

_Use this section as you go — date, decision, link to commit/spec._

```
2026-09-26: A1 locked — SHA256d PoW + **2016-block** retarget + **leading-zero bits** (not `nBits`; see pow-nbits-vs-leading-bits.md). Comparison chart: bitcoin-guld-comparison.md. A10 bounds drafted in spec 06 §3 (enforcement TODO).
2026-09-26: **Coinbase maturity = 100 blocks** locked (spec 06 §4) — same game theory as Bitcoin; implementation deferred with reorg.
2026-09-26: **A2 locked — BARE** wire codec (see wire-codec-comparison.md, schemas/README.md). Implementation + `.bare` files + vectors pending.
2026-09-26: **A3 locked** — `AccountId` preimages promoted from `guld-state` (spec 02 §3.1).
2026-09-26: **A11 locked** — no reserved foreign names at genesis; cross-chain = dapp/leaf research (spec 13 informative).
2026-09-26: **A5 normative** — LegacyOwnershipProof profiles frozen in spec 15 §5.1.
2026-09-26: **A4 implementation** — tracked in [009-bare-wire-implementation.md](./009-bare-wire-implementation.md).
2026-09-26: **A6 locked** — empty keys + threshold 0 on legacy import; lock bit is `legacy.status` (spec 15 §8).
2026-09-26: **A7 locked** — full 1.0 manifest approved; hash 0xd5f12…; x ≈ 959,947.19527052 GULD.
2026-09-26: **A8 locked** — L_cap=6 letter table; F_group = F_user × (2+n).
2026-09-26: **A10 locked** — MTP + 2 h future bound; enforcement = Simba blocker ([010](./010-header-timestamp-validation.md)).
2026-09-26: **Reorg** = Simba blocker (not acceptable gap); [006](./006-chain-lifecycle-tests.md) phase 4.
2026-09-26: Doc sync — GIP-9 Final, GIP-14 Accepted + Simba pin; gip-4/11/12/13; spec 01/06/07 open-params.
```
