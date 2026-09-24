# Research: Scale — Postgres vs blockchain DBs vs git-as-DB

Status: research  
**Note:** CAS + “don’t put everyone in one git” still stands; **consensus SoT** is no longer “Postgres primary” — see [`modern-l1-direction.md`](modern-l1-direction.md). Postgres remains the preferred *indexer* shape.  
Related: [`postgres-blockchain.md`](postgres-blockchain.md), [`block-window-consensus.md`](block-window-consensus.md), [`../ARCHIVES.md`](../ARCHIVES.md)

## Questions

1. How does Postgres scale vs specialized blockchain storage?
2. Is “Postgres for the ledger / consensus journal” a wise choice for Guld?
3. Will a **git** store explode if it holds all users (legacy already strained at a few thousand)?
4. Should votes, signatures, and consensus state move **out of git into Postgres**?
5. Have people meaningfully backed git with Postgres? Must git remain the only data structure?

## Short answers

| Question | Answer |
|----------|--------|
| Postgres vs chain DBs | Different jobs. RocksDB/LevelDB win at **hot KV append + prune** for public L1 full nodes. Postgres wins at **relational query, ACID rules, projections, ops**. For Guld’s custom ledger + weights + proofs, Postgres is a **wise primary journal** — not a drop-in Ethereum archival engine. |
| Git holding everyone | **Risky as the SoT for votes/consensus/ledger.** Legacy-shaped trees already ballooned. Keep git (or another CAS) for **user content**; do not use one mega-repo as the network database. |
| Extract to Postgres? | **Yes.** Votes, signature indexes, tips, balances, block journal, and consensus state belong in Postgres (or equivalent). That shrinks what every node must clone. |
| Git-in-Postgres? | Exists as research/production-adjacent (`gitgres`, `omni_git`); forges normally keep **objects on disk**, **metadata in Postgres**. Full objects-in-Postgres trades packfile density for query/ops unity — optional later, not required. |
| Married to git? | **No.** Need a **content-addressed object plane** + a **queryable consensus/ledger plane**. Git is one CAS implementation with great tooling; it is not mandatory for votes or tip election. |

## Evidence from local archives

Under `archives/` (gitignored shelves — indicative of 1.0 / experiment bulk, not a clean product tree):

| Path | Approx size | Note |
|------|-------------|------|
| `experiment-Q1-2026/` | **~18 G** | Nested `.git` trees; `group/` ~8.9 G, `guld/` ~5.9 G, `git/` ~1.6 G, `user/` ~444 M |
| `ledger-guld/` | ~7 M | ~130 user dirs of ledger-cli journals — small vs FS experiments |
| `legacy-guld/` | ~5 M | SDK/CLI source shelves |

So: **ledger journals stayed tiny; the wide multi-repo / nested-git “everyone’s files in git” shape did not.** Scaling users by cloning more of that shape will not work. That matches the upgrade rejection of blockchain-in-git and FUSE mounts.

## How blockchain nodes usually store data

| Store | Used by | Strengths | Weaknesses for Guld |
|-------|---------|-----------|---------------------|
| **LevelDB / RocksDB** | Bitcoin Core (historical), Geth, many L1 clients | High write throughput, compact KV, pruning, tuned for tip sync | Poor ad-hoc SQL; you build indexes yourself; ops ≠ `pg_dump` story |
| **Custom page/trie engines** | Newer EL experiments (e.g. purpose-built MPT stores) | Lower write amp than naive MPT-on-RocksDB | Specialized; no free relational layer |
| **Postgres (indexers)** | Explorers, ZKsync Era indexers, app backends | Query, joins, analytics | **Larger** than KV for the same raw chain; fine for *indexed* subsets, costly as *sole* archive of a public L1 |
| **QLDB / immudb** | Ledger products | Hash-chained journals, proofs | Product lock-in / different ops; QLDB wind-down |

Public L1 full nodes are often **~1 TB+** and growing; archive modes are multi‑TB. Indexing that same history **into Postgres** typically costs **more** disk than the native RocksDB (seen in Era-style deployments where Postgres dwarfs the node DB). That is not an argument against Postgres for Guld — it is an argument against expecting Postgres to replace a global permissionless archive cheaply.

**Guld is not Ethereum.** Expected write rate is “human + signed commits + ledger posts,” not global DeFi TPS. At that scale, **Postgres multi‑TB with partitioning is routine**; the binding constraint is **what you put in the hot set**, not “Postgres can’t do blockchains.”

## Is Postgres wise for Guld’s ledger / consensus?

**Yes, as the consensus + ledger + projection plane**, if you keep the hot set bounded:

**Put in Postgres**

- Block journal (headers, roots, prev hashes)
- Attestations / weighted votes / stake bonds / slash records
- Signature → subject index (who signed what oid / ballot)
- Balances, grants, rule-version ids
- Canonical tip, window state, inclusion sets (commit oid lists)
- Metadata mirror (already planned)

**Do not put in Postgres (at first)**

- Every historical blob of every user’s file tree (unless you deliberately adopt objects-in-Postgres later)
- Full packfile-equivalent history of all content

**Why wise**

- Same engine as metadata mirror and stake/balances → one ACID story for “apply block”
- SQL for tallies, quorums, “who attested this tip,” proof joins
- Role lockdown, logical replication, familiar backups
- Matches “extract votes/consensus out of git”

**Why not the only store forever**

- Full uncompressed object history in row storage loses git packfile delta density ([gitgres notes](https://nesbitt.io/2026/02/26/git-in-postgres.html): many versions of a large file cost far more in Postgres than in packs)
- Hot tip + cold object archive may eventually want object storage (S3/MinIO) or filesystem packs beside Postgres

## The git size problem (your concern is valid)

Git scales well for **software collaboration**. It scales poorly as a **global multi-tenant database** when:

- Many users’ histories live in one clone path (or a forest every full node must fetch)
- Votes, ledgers, and “truth” are files that rewrite or fan out per user
- Nested repos / mirrors / backups accumulate (legacy experiment shape)

Package ecosystems that used git as a DB (Homebrew taps, etc.) eventually **stopped** making every client clone the whole history for “current state” queries — they moved indexes to HTTP/JSON/DB while keeping git for *collaboration on content*.

**Implication for Guld:** full nodes should not need a complete multi-user git universe to validate consensus. They need:

1. Objects referenced by the block window (fetch on demand / by oid)
2. Postgres (or equivalent) tip + vote + ledger state
3. Optional deeper clones for users who care about specific trees

## Extract functionality from git → Postgres

**Recommended split**

```
┌─────────────────────────────────────────────────────────┐
│  Postgres (network SoT for consensus & money)           │
│  blocks · votes · weights/stake · sig index · balances  │
│  tips · window state · ACL projections · metadata       │
└─────────────────────────────────────────────────────────┘
                         ▲
                         │ references oids / content hashes
                         ▼
┌─────────────────────────────────────────────────────────┐
│  Content-addressed object plane (git *or* successor)    │
│  blobs/trees for documents, code, user file trees       │
│  per-user or per-project repos — not one mega-ledger    │
└─────────────────────────────────────────────────────────┘
```

| Concern | Keep in git (or CAS) | Move to Postgres |
|---------|----------------------|------------------|
| User documents / project files | Yes | Paths/indexes optional |
| Commit objects as content versions | Yes | Inclusion lists by oid |
| Vote counting / tallies | No | **Yes** |
| Signature verification results / key bindings | Raw sig may sit on commit; **index** in DB | **Yes** |
| Overall consensus tip / window | Tip *refs* may mirror | **Authoritative in DB** |
| Balances / stake / slash | No | **Yes** |
| Merge approval thresholds | Policy code | Evaluated against DB weights |

This directly shrinks what “include all users” means: **all users’ balances and votes** live as rows; **all users’ file histories** stay sharded and lazily fetched.

## Have people backed git with Postgres?

**Yes — in two different senses:**

### 1. Metadata in Postgres, objects on disk (production norm)

- **GitLab**, **Gitea/Forgejo**: Postgres holds users, issues, permissions, mirrored branch metadata; **bare repos remain on filesystem** (GitLab adds Gitaly RPC in front of git).
- This is the battle-tested pattern: DB for queryable forge state, git for packs.

### 2. Objects + refs in Postgres (emerging / research)

- **[gitgres](https://github.com/andrew/gitgres)** — libgit2 ODB/RefDB backends → `objects` / `refs` tables; normal push/clone via remote helper.
- **[omni_git](https://github.com/andrew/omni_git)** — smart HTTP + pack unpack into Postgres (builds on gitgres).
- Write-up: [Git in Postgres (Nesbitt, 2026)](https://nesbitt.io/2026/02/26/git-in-postgres.html) — argues forges already duplicate branch metadata into SQL; unifying storage simplifies ops but **hurts delta compression** unless you add repack/LFS-to-object-storage.

**Meaningful for Guld?** As a research option for small/medium node unity (`pg_dump` backs up everything). **Not required** to solve the scale problem — extracting consensus out of git already does the heavy lift. Objects-in-Postgres is a later optimization/ops choice, not the election/ledger design.

## Comparison: design choices for Guld storage

| Design | Consensus/votes scale | Content scale | Ops | Verdict |
|--------|----------------------|---------------|-----|---------|
| Everything in one git mega-repo | Poor | Poor (legacy proof) | Familiar git, bad full-node story | **Reject** |
| Git for all + thin Postgres mirror | Medium | Still heavy if nodes clone all | Split brain | Weak |
| **Postgres consensus/ledger + sharded CAS (git)** | **Good** | **Good** if lazy/oid fetch | Two systems, clear roles | **Preferred** |
| Objects also in Postgres (`gitgres`-style) | Good | OK until history density hurts | One backup story | Optional later |
| RocksDB-only like Geth | Good for KV tip | DIY relational | Alien to guld stack | Poor fit |
| External L1 as DB | Their scale | Poor rule fit + fees | Outsourced | Rejected for core |

## Is the overall design wise?

**Wise if:**

- Postgres = block journal, votes/stake, balances, tips, sig indexes, metadata
- Content CAS = git **or** successor, **sharded** (per user / per project), referenced by hash from blocks
- Full nodes validate windows by fetching **needed oids**, not mirroring every user’s entire history
- Prune / archive cold blocks and cold objects deliberately

**Unwise if:**

- “Postgres blockchain” means stuffing all file history into unpartitioned tables with no object strategy
- “Git network” means every node clones the union of all users (legacy trajectory)
- Consensus tallies remain files that must be merged across a giant tree

## Open research follow-ups

- [ ] Bound expected rows/year (blocks, votes, balance updates) → Postgres capacity plan
- [ ] Object fetch protocol: git pack by oid list vs custom HTTP CAS
- [ ] Whether user repos stay git long-term or move to generic CAS + optional git gateway
- [ ] Pack density vs objects-in-Postgres if a single-node `pg_dump` story becomes a product goal
- [ ] Light node: Postgres tip proofs only, no content clone

## Verdict

Postgres is a **wise choice for Guld’s ledger and election plane**, and compares favorably to “git as the blockchain” or “pay an L1.” It is **not** trying to beat Geth’s RocksDB at global DeFi archive density — and should not.

Your size fear about git is justified by the ~18 G experiment shelf and by industry retreats from git-as-DB. **Extract votes, signature indexes, and consensus state into Postgres**; keep content-addressed storage for files, sharded and lazy. People *have* backed git with Postgres (forge metadata everywhere; full object stores in gitgres/omni_git). You do **not** need git as the only data structure — only a clear split between **consensus/query** and **content**.
