# Research: Postgres as a blockchain / ledger substrate

Status: research (foil / indexer precedents)  
**L1 preference moved:** [`modern-l1-direction.md`](modern-l1-direction.md) (lean chain DB + master hash; Postgres as indexer only).  
Related: [`gips/gip-14.md`](../gips/gip-14.md), [`UPGRADE_FROM_1.md`](../UPGRADE_FROM_1.md)

## Question

Can PostgreSQL back a **hash-addressable, versioned ledger** (blocks / Merkle trees / balance proofs) as a companion to a **git file tree** — without requiring an external fee-bearing L1?

Short answer: **yes, this pattern has been done many times**, usually as *tamper-evident ledger storage* or *cryptographic audit history*, not as a drop-in replacement for a public PoW/PoS chain. Postgres is excellent at the **storage + query + transactional application of rules** plane. It does **not** by itself provide multi-party consensus or true immutability against a malicious DBA.

## What “blockchain in Postgres” usually means

People use the phrase for at least four different things. Only some matter for Guld.

| Pattern | What it is | Blockchain properties |
|---------|------------|------------------------|
| **A. Index an external chain** | Store serialized blocks/txs from Bitcoin/ETH in Postgres; expression indexes / views for lookups | Consensus lives elsewhere; DB is a cache/index |
| **B. Hash-chained append-only log** | Each row stores `prev_hash` + `row_hash`; verify by recomputing | Tamper-*evident* history; single authority still writes |
| **C. Merkle / Patricia trees in tables** | Blocks, leaves, proofs, account trie nodes as rows; optional digest export | Verifiable state + inclusion proofs; still need consensus policy outside the DB |
| **D. Purpose-built ledger DB** | QLDB-style journal, immudb, etc. (SQL-ish, not vanilla Postgres) | Stronger “ledger product” packaging; different ops story |

Guld’s sketch is closest to **B + C**: a **custom ledger** whose canonical structure is a **hash tree in Postgres**, companion to git — not pattern A (pay an L1), and not “stuff the chain into git.”

## Has this been done?

Yes. Precedents fall into research prototypes, extensions, blog PoCs, cloud ledger products, and production audit patterns.

### Postgres extensions and prototypes

- **[pg_credereum](https://github.com/postgrespro/pg_credereum)** (Postgres Pro) — Merklix (Merkle prefix) tree over audited tables; clients sign changesets; background worker packs Merkle blocks; optional **Ethereum hash anchoring**. Explicitly a prototype, not production-ready. Closest conceptual cousin to “blockchain *of* DB state in Postgres.”
- **[pg_seal](https://github.com/allenvox/pg_seal)** — Logical decoding → append-only `audit_ledger` with **BLAKE3** hash chaining; `pg_seal_verify()` detects silent rewrites.
- **[pg_tamperlog](https://pgext.cloud/ext/pg_tamperlog)** — Educational SHA-256 hash-chain audit log; upstream is clear that a superuser can still defeat verification if they own the DB and the verify function.
- **[pg_blkchain](https://github.com/blkchain/pg_blkchain)** / [Trubetskoy’s write-ups](https://grisha.org/blog/2017/10/20/blockchain-in-postgresql-part-2/) — Pattern **A**: ingest Bitcoin-style binary txs into `bytea`, use `pgcrypto` digests and expression indexes. Useful as “how to hash-address txs in SQL,” not as “run consensus in Postgres.”

### Academic / systems papers

- **“Blockchain Extension for PostgreSQL Data Storage”** (ACM, 2021-era prototype) — Account-based toy currency in Python + Postgres: transactions, balances, per-block Merkle trees, Patricia tree for balance proofs, all as ordinary tables. Authors note it is **not** secure without an added **consensus** mechanism; overhead is acceptable for non-HFT services.

### Cloud / adjacent products

- **Amazon QLDB** — Managed *central* ledger: append-only journal, hash-chained blocks, digests + Merkle proofs. Cryptographically verifiable history under a **single** AWS-controlled authority. **QLDB is deprecated / wind-down**; AWS has published migration paths toward Aurora PostgreSQL for audit-style workloads. That migration wave is itself evidence that “ledger semantics on Postgres-class stores” is an industry direction — not that vanilla Postgres equals QLDB.
- **immudb** — Append-only, cryptographically verifiable store with SQL/Postgres-wire familiarity. Closer to a dedicated ledger engine than to “add a few tables to our existing Postgres.”
- **TigerBeetle** — High-performance double-entry financial DB; strict serializability and transfer semantics, **not** a general Merkle blockchain. Relevant as a *ledger application* design foil, not as a Postgres hash-tree recipe.

### Common production practice (without calling it a blockchain)

Banks, compliance systems, and SaaS apps routinely implement **append-only event tables + hash chains + periodic signed digests** on Postgres. That is pattern **B**: auditability and forensic detection, not a public permissionless network.

**Bottom line:** Using Postgres to *store and prove* a hash-linked ledger is established. Using Postgres *alone* as a multi-node adversarial blockchain is not — consensus, identity, and fork policy remain application / protocol concerns (exactly where Guld already invests: PGP, git write gates, hooks).

## Conceptual model for Guld

Treat two parallel versioned, hash-addressable surfaces:

```
git file tree                          postgres ledger tree
─────────────────                      ────────────────────
blobs / trees / commits                txs / blocks / state roots
content-addressed paths                content-addressed tips
signed commits (policy)                signed txs / block attestations
hooks = write gate                     SQL constraints + app rules
metadata JSON SoT  ──mirror──►         query indexes (+ ledger tables)
```

Postgres already fits as a **metadata mirror**. Extending it to hold the **ledger hash tree** keeps:

- Fast SQL for balances, grants, history, and proofs
- No need to mount a blockchain via FUSE or keep the full chain in git
- Native room for Guld-specific posting rules (unlike shoehorning onto ETH/SOL opcodes)

What Postgres does **not** replace:

- Who may append (identity / ACL / signatures)
- How replicas agree under partition (gossip, tip pull, quorum)
- How tips relate to git commits (same auth story vs separate ledger keys)

**Active consensus sketch:** block time windows where nodes **fetch and validate** new commits under software rules, then seal a Postgres-chained block. **Tip election prefers weighted votes / PoS** (legacy continuity); PoW optional only. See [`block-window-consensus.md`](block-window-consensus.md).

Remaining open items: [ledger-migration intent](../gips/gip-14.md). Scale and “don’t put all users in one git DB”: [`storage-scale-git-postgres.md`](storage-scale-git-postgres.md).

## Pros

**Fit for Guld’s stack**

- Same ops surface as the planned metadata mirror (backups, replication, SQL, connection pooling).
- **No mandatory L1 fees** for nodes to advance or validate native ledger state.
- Transaction logic stays in **application + SQL constraints**, not a foreign VM with mismatched primitives.
- Companion to git: files remain in git; money/state proofs live where query and integrity structures are natural.

**Engineering strengths of Postgres**

- ACID for “apply transfer + update balances + append block leaf” as one DB transaction.
- Mature indexing, partial indexes, `jsonb` for extensible tx payloads, partitioning for history.
- Logical decoding / WAL for streaming replicas and audit materialization (see pg_seal-style designs).
- Expression indexes on digests (pg_blkchain lesson) for hash-addressed lookups without denormalizing every field.
- Extensions (`pgcrypto`, custom C/Rust) if hashing or Merkle maintenance must be hot-path.

**Verifiability without public consensus**

- Hash chains and Merkle roots make silent history rewrite **detectable** when tips/digests are published or cross-checked.
- Optional later: **anchor** occasional roots to an external chain (pg_credereum-style) for third-party timestamping — bridge, not substrate.

**Migration path**

- Deterministic import from `archives/ledger-guld` into balance + rule tables is a SQL/ETL problem, not a smart-contract rewrite.

## Cons

**Not immutable against the operator**

- A superuser (or anyone with `UPDATE`/`DELETE`/DDL) can rewrite rows **and** the verify function. Hash chaining is **tamper-evident**, not **tamper-proof**, unless:
  - writers are locked down (append-only roles),
  - digests are exported / signed / mirrored off-host,
  - and/or independent replicas compare tips.

**Not a consensus engine**

- Concurrent appenders need careful **serialization per stream** (row lock / advisory lock on tip) or you get forks and broken chains.
- Multi-node “who is right?” under split brain is still a protocol problem. Postgres logical replication is not BFT consensus.

**Performance and design pitfalls**

- One **global** hash chain serializes all writes → tip contention.
- Storing full Merkle / Patricia node tables grows storage and write amplification (academic prototype: acceptable for moderate load, not HFT).
- Full-chain verify is O(n); production systems need incremental verify, checkpoints, and streaming proofs.
- Hot-path hashing in PL/pgSQL can be slow; may need compiled extensions (as pg_tamperlog_rust / pg_seal illustrate).

**Ops and threat model**

- Backups restore old tips; need clear policy for “canonical tip” after restore.
- PITR / vacuum / replica promotion must not silently diverge ledger meaning.
- Confusing “we have Merkle roots in Postgres” with “we have Ethereum security” is a product risk — document the trust model explicitly.

**Product complexity**

- You own schema, proof format, sync, and migration forever (the cost of avoiding L1 mismatch).
- Clients that want light proofs need a defined proof API, not ad-hoc SQL.

## Design implications (if Guld proceeds)

1. **Separate tables for journal vs projections** — append-only hashed journal (source of truth); balance / grant tables as derived, rebuildable state (QLDB’s journal vs indexed storage idea).
2. **Stream or shard the chain** — e.g. per-asset or per-realm tips — to avoid a single global lock, while still publishing a periodic **forest root** if a single digest is needed.
3. **Publish signed tips** — PGP-signed tip digests (and/or git notes / signed commits that *reference* ledger roots without embedding the chain).
4. **Lock down DB roles** — ledger writer role: `INSERT` only on journal; no `UPDATE`/`DELETE`; verify runs as read-only.
5. **Keep consensus outside SQL** — block-window protocol (fetch → validate → seal / optional PoW) decides the tip; Postgres stores and proves it.
6. **Do not put the chain in git** — git holds objects and user branches; Postgres holds the block hash tree; blocks *reference* commit OIDs.
7. **Optional external anchor later** — not required for day-one nodes.
8. **Treat validation as eligibility; elect with weights/stake** — useful work alone does not uniquely pick a winner; prefer weighted votes / PoS over PoW.

## Comparison snapshot

| Approach | Fees for nodes | Native rules | Multi-party consensus | Query / proofs | Guld fit |
|----------|----------------|--------------|----------------------|----------------|----------|
| ETH / SOL as required ledger | Yes (gas) | Poor / expensive | Strong public | External tools | Weak for core |
| Blockchain-in-git | No | Possible | Weak / ops-heavy | Painful | Rejected |
| FUSE-mounted chain | No | Possible | N/A | Slow / complex | Rejected |
| Postgres hash tree + git files | No | Full control | App/protocol | Excellent | **Active research** |
| Block window + validate + weighted/PoS election | No (native) | Full control | Votes/stake on valid candidates | Excellent | **Preferred research** |
| Block window + validate + header PoW | No (native) | Full control | Nakamoto-style on valid candidates | Excellent | Optional anti-spam only |
| QLDB / immudb | Vendor | Their model | Central or product-specific | Built-in | Possible foil, not default |

## Open questions (carry into intent)

- Exact schema: linear hash chain vs full Merkle forest vs account trie?
- Tip ↔ signed git write coupling?
- Replica sync: pull tips, gossip blocks, or logical replication of journal only?
- Proof format for light clients / `guld_api`?
- Import: how to freeze 1.0 balances and re-validate historical rules?
- Block window: inclusion policy, clock, conflicts, difficulty, rewards — see [`block-window-consensus.md`](block-window-consensus.md)

## References (starting points)

- [postgrespro/pg_credereum](https://github.com/postgrespro/pg_credereum) — Merklix blocks + optional ETH anchor  
- [allenvox/pg_seal](https://github.com/allenvox/pg_seal) — WAL → BLAKE3 chain  
- [Blockchain in PostgreSQL (Trubetskoy)](https://grisha.org/blog/2017/10/20/blockchain-in-postgresql-part-2/) — indexing external chain data  
- ACM: *Blockchain Extension for PostgreSQL Data Storage* — Merkle + Patricia in SQL tables  
- [Amazon QLDB concepts](https://docs.aws.amazon.com/qldb/latest/developerguide/ledger-structure.html) — journal vs indexed storage (historical product)  
- Industry pattern notes: hash-chained audit trails on Postgres (tamper-evident, role-locked)

## Verdict for Guld 2.0

**Postgres-backed hash trees are a real, precedented approach** for a custom, fee-free, rule-native ledger. Treat them as a **verifiable journal + projection store** companion to git — not as a substitute for identity, write policy, or multi-node agreement.

Consensus research now fills that gap: **block windows of fetched, rule-validated commits**, sealed into the Postgres chain, with **weighted votes / PoS tip election** ([`block-window-consensus.md`](block-window-consensus.md)). That matches the upgrade drivers: leave ledger-cli and L1 shoehorning behind, without repeating blockchain-in-git or FUSE.
