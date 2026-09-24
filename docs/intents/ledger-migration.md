# Intent: ledger beyond ledger-cli (research)

Status: draft / research — **import numbers + claim path drafted in** [`../specs/15-ledger-import.md`](../specs/15-ledger-import.md)

## Goal

Replace Guld 1.0 ledger-cli journals with a **custom** ledger suited to full nodes — native rules and **native weight fees**, without requiring external L1 fees or foreign VM semantics. Preserve historical **balances** from `archives/ledger-guld` **1:1**, and let each user **port** spend authority via a **key upgrade** (`ClaimLegacy`).

## Preferred research direction

**Active L0 sketch (2026-03):** lean witness substrate — username + **master hash**, first-class **cosign**, weight-priced txs (not an EVM gas ISA), CAS personal trees (git optional leaf), validators on KV+SMT; Postgres/PGP/git **off** the consensus path. SoT: [`../research/modern-l1-direction.md`](../research/modern-l1-direction.md). Whitepaper: [`../whitepaper/guld-2.0-draft.md`](../whitepaper/guld-2.0-draft.md) §8.6.

### Still useful (non-consensus / transitional)

- **Postgres** as metadata mirror / **user or app-server indexer** (not required for block production)
- **Git + PGP** for select leaves and today’s `guld-python` meta-FS hosts; **PGP also** as the 1.0 ownership proof for `ClaimLegacy`
- Precedents: [`../research/postgres-blockchain.md`](../research/postgres-blockchain.md), scale split [`../research/storage-scale-git-postgres.md`](../research/storage-scale-git-postgres.md), window/election foil [`../research/block-window-consensus.md`](../research/block-window-consensus.md)

### Prior consensus sketch (superseded as L1 default)

- Nodes: Postgres + guld git hosts; block window over commits; weighted git votes → PoS; PoW anti-spam only  
- Retained as an alternative / bridge narrative; not the from-scratch modern L1 preference

## Not preferred (for core ledger)

- Ethereum / Solana / other fee-bearing L1s as the **required** ledger for every node
- Embedding the full ledger chain in git
- FUSE / OS-level mounts as the primary operator path

Optional later: bridges to external tokens for settlement, after the native ledger is solid.

## Snapshot findings (working, from `ledger-guld`)

| Item | Value |
|------|--------|
| Journal period | 2016-06-01 → 2018-12-09 |
| Member circulating (`*:Assets` roots) = **x** | ≈ **959,947.20** GULD |
| ERC20 / protocol mirrors | **omitted** from import |
| Positive holders | ≈ 2,217 |
| Max decimal places in amounts | **10** → freeze 2.0 decimals at 10 |
| Block time | **10 minutes** |
| Inflation | geometric **100% → 4%** over 20 years, then **4%** |

## Open research questions

- [x] Deterministic import rule: `ledger-guld` → per-name `Assets` + manifest hash (drafted in spec 15)
- [x] Decimals: **10**
- [ ] Canonical import manifest encoding + audited pin before mainnet
- [x] PGP binding-set format for `ClaimLegacy` (`archives/keys-pgp/<name>/<FP>.asc`)
- [ ] Account schema: `master_hash` preimage fields; key set + cosign threshold / roles
- [ ] Genesis sig scheme (Ed25519 vs hybrid vs ML-DSA); weight schedule
- [ ] Chain DB: KV + SMT layout; header / PoW or DAG-PoW choice
- [ ] CAS pin/prune contracts; what validators must fetch per tx
- [ ] Role of current `guld-python` hooks host vs future Rust validator
- [ ] (Alt path) Postgres journal + weighted git votes — only if modern L1 sketch is deferred

## Out of scope for now

- Reimplementing 1.0 FS layouts
- Replaying every 1.0 journal tx as 2.0 consensus history (balances only at genesis)
- Shipping a production token before the research above converges

## Sample 1.0 journal (archive only)

```
2018/02/15 * transfer
    isysd:Assets   -40 GULD
    isysd:Expenses   40 GULD
    joestang:Assets   40 GULD
    joestang:Income   -40 GULD
```
