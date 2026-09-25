# Research: Block windows, useful validation, and optional PoW

Status: research (election / window foil)  
**L1 preference moved:** [`modern-l1-direction.md`](modern-l1-direction.md) (cosign + gas + PoW-capable lean nodes; git/PGP leaf-only). Weighted git votes / PoS below remain a documented alternative.  
Related: [`postgres-blockchain.md`](postgres-blockchain.md), [`../gips/gip-14.md`](../gips/gip-14.md), [`../UPGRADE_FROM_1.md`](../UPGRADE_FROM_1.md)

## Sketch

Full nodes run:

- **Postgres** — ledger hash tree, metadata mirror, block journal / projections
- **guld-style git hosts + clones** — per-user/owner branches, signed commits, hook write gates

The work that actually matters each interval is:

1. **Fetch** new commits (and related objects) from peers / user remotes in a **block time window**
2. **Validate** them under **software rules**: who may push which branch, signatures, merge / approval thresholds, ACL, and any ledger transformations those commits encode
3. **Seal** a block that commits to that validated set (Merkle / hash tree in Postgres), chained to the previous block
4. **Elect** which valid candidate becomes the tip — prefer **weighted votes / stake** (legacy Guld shape); PoW only if needed as a bootstrap or anti-spam aid

For each accepted block, the network can assert: *these transformations followed the rules, signatures checked, and this tip won consensus for that window.*

```
                    block window T
    ┌──────────────────────────────────────────────┐
    │  fetch commits from user remotes / peers     │
    │  check sigs, branch ACL, merge approvals      │
    │  apply / check ledger effects (deterministic)│
    │  build candidate: merkle(commits) + state    │
    │  elect tip: weighted votes / stake (preferred)│
    └──────────────────────────────────────────────┘
                         │
                         ▼
              postgres block journal
           (prev_hash → header → body)
                         │
                         ▼
         projections: balances, tips, proofs
         git: only refs that survived validation
```

## Why this fits Guld better than “mine empty hashes” or “pay an L1”

| Concern | This sketch | Classic PoW-only | External L1 |
|---------|-------------|------------------|-------------|
| Useful work | Fetch + validate commits is mandatory network labor | Mostly unused hash grinding | Validators secure *their* chain, not guld git rules |
| Rules | Software + hooks native to guld | Must encode rules in scripts / social layer | Foreign VM / fee market |
| Node cost | Postgres + git host (already desired) | Same + miner, or separate miner class | Gas for every economically meaningful write |
| Consensus object | Ordered set of **validated git transformations** | Ordered txs in a generic mempool | Ordered L1 txs (poor mapping) |

The insight: **validation is not optional decoration on top of mining — it *is* the block body.** PoW, if used, is a **tie-break / Sybil / reorg-cost** layer on headers that already embed useful validation.

## Node roles (same machine can do all)

1. **Host** — accept pushes that pass local hooks (owner branch, signed commit, etc.)
2. **Gossip / fetch** — pull peers’ user remotes and candidate objects for the current window
3. **Validate** — deterministic checks shared by all honest nodes (same rules → same accept/reject)
4. **Propose** — assemble a candidate block from the validated set for window *T*
5. **Seal** — either (a) attest / sign the candidate under a policy, and/or (b) find a PoW nonce meeting difficulty
6. **Apply** — append block to Postgres journal; update projections; advance or reject local git refs to match the sealed set

Clients still push to their branches as today; **inclusion in the canonical tip** is what the block window decides.

## What goes in a block (draft)

Minimum header fields (illustrative):

- `prev_block_hash`
- `window_start` / `window_end` (or height + fixed interval)
- `commits_root` — Merkle root over included commit OIDs (and maybe tree OIDs)
- `state_root` — ledger / ACL projection root after applying effects
- `rules_id` — hash of the rule bundle version used to validate
- `miner` / attester identity (PGP subject)
- `nonce` + `difficulty` (if PoW enabled)
- `header_hash`

Body (stored in Postgres, not stuffed into git history as the chain):

- Ordered list of included commits (oid, author, branch/ref, parents)
- Rejects summary optional (or keep rejects out-of-band — research)
- Ledger ops derived from those commits (if any)
- Proof material as needed for light verify

Git remains the **object store for file trees**. Postgres remains the **hash-linked journal of which objects were canonical in which window**.

## Useful work vs PoW — keep them layered

### Layer 1 — Useful validation (required)

Every honest node must be able to:

- Reproduce fetch set for the window (or verify a proposed set against objects it can obtain)
- Re-run signature and rule checks
- Recompute `commits_root` and `state_root`

If a proposed block includes an illegal merge, bad signature, or wrong state root, **peers reject it** regardless of PoW.

This layer answers: *was the transformation legal?*

### Layer 2 — Consensus / tip election (choose policy)

Candidates that pass Layer 1 may still fork (two proposers, different inclusion sets, network lag). Election picks one tip. **PoW is not the best default for Guld** — the legacy system already had a closer fit: **weighted git votes**.

#### Preferred: weighted votes → stake-backed election

| Mechanism | What weight is | Fit for Guld |
|-----------|----------------|--------------|
| **Weighted git votes (legacy)** | Signed observations / approvals; community or group weight | Native: PGP identity, git as ballot transport, merge/approval thresholds already in the product story |
| **Group-weight quorum** | `members[].weight` in group metadata (already in 2.0 schema) | Same mechanism for merge gates *and* block attestation |
| **Proof of stake (ledger)** | Bonded GULD (or similar) from the Postgres ledger | Economic skin in the game; slashable; maps cleanly onto the custom ledger |
| **Hybrid weight** | `f(group_weight, bonded_stake, reputation)` | Smooth migration from 1.0 social weights → explicit stake |

**How a window seal could work (sketch):**

1. Proposers publish rule-valid candidate headers (commits root + state root).
2. Eligible voters / validators cast **signed attestations** for at most one candidate per window (git commit, API message, or both — research).
3. Tip = candidate with **weighted support ≥ threshold** (absolute quorum or plurality among valid candidates).
4. Attestations and the winning header are recorded in the Postgres block journal.
5. Optional: **bonded stake** required to propose or to have vote weight count; equivocation → slash or burn weight.

This reuses one mental model: *signatures + weights decide merges; signatures + weights decide tips.*

#### PoS variants (be precise)

“Proof of stake” is not one algorithm. For Guld, useful flavors:

| Flavor | Election rule | Pros | Cons |
|--------|---------------|------|------|
| **Quorum PoS / weighted BFT-ish** | Bonded validators attest; tip needs ≥⅔ (or policy) weight | Fast finality possible; aligns with group approvals | Needs known/bonded set; liveness if many offline |
| **Stake-weighted lottery** | VRF / deterministic draw ∝ stake among valid proposers | One winner without vote rounds; Sybil-resistant if stake scarce | Weaker finality until depth; stake concentration |
| **Delegated / liquid** | Users delegate weight to operators who run full nodes | Matches “few full nodes, many users” | Cartels / lazy delegation |

Legacy **weighted git votes** sit closest to **quorum / attestation** with weights that may start as social/group weights and harden into bonded ledger stake over time.

#### PoW — demoted to optional aid

| Mechanism | Role | When it still helps |
|-----------|------|---------------------|
| **PoW on header** | Cost to spam candidates / cheap Sybil proposers | Open membership before stake is scarce; bootstrap genesis era |
| **Hybrid** | PoW *or* min-stake to propose; election still by weight | Anti-spam without making energy the source of truth |

PoW does not reuse Guld’s identity/weight machinery and fights the “no fee, useful work” story if it becomes the main election cost. Prefer **not** to make Nakamoto hashpower the primary tip authority.

**Caution (unchanged):** useful validation alone is **eligibility**, not election — it is not progress-free. Election needs votes, stake-weighted lottery, or (worse default here) PoW.

## Software rules as consensus preconditions

Examples of checks inside the window (same spirit as hooks, but network-wide and replayable):

- Push only to refs the identity owns (owner-scoped branches)
- Commits must be signed; signer matches declared author / key binding
- Merge to shared refs only with sufficient approval weight / required reviewers
- Metadata / ledger commits satisfy schema and balance invariants
- No inclusion of objects that fail ACL for the claimed path

Local hooks remain a **fast path** so bad pushes die early on a host. Block validation is the **canonical** gate for what the network accepts as history.

## Consensus properties (honest reading)

**What this can give you**

- Shared, ordered history of **rule-valid** git transformations
- Deterministic replay: new nodes fetch blocks from Postgres journal + git objects, re-validate, recompute roots
- Tip election that **reuses PGP + weights** (legacy continuity) and can harden into **bonded stake**
- Economic hardness via stake / slash rather than electricity (if PoS is adopted)
- No per-tx L1 fees for native guld activity

**What it does not magically give you**

- Instant finality unless the attestation protocol is designed for it (quorum finalize vs lottery depth)
- Fair inclusion if a stake cartel censors (need inclusion rules + diverse attestors)
- Identical mempools (window fetch sets differ → need clear rules for *what must be included* vs proposer discretion)
- Protection if majority weight/stake colludes — same class of problem as majority hashpower, different resource

## Election layer comparison (summary)

| Election layer | Sybil resistance | Finality style | Reuses guld identity/weight | Energy / hardware | Legacy continuity |
|----------------|------------------|----------------|------------------------------|-------------------|-------------------|
| Weighted git votes | Via identity + admitted weight | Quorum / social | **Yes** | Low | **Strong** |
| Group-weight quorum | Via group membership | Quorum | **Yes** (`weight` in schema) | Low | Strong |
| Ledger PoS (bonded) | Via scarce stake + slash | Quorum or lottery | Yes (balances in Postgres) | Low | Medium (new bonding) |
| Header PoW | Via hashpower cost | Probabilistic depth | Weak | High | Weak |
| Useful-validation-only | Weak alone | None | N/A | Medium (IO) | N/A — not an election |

**Research preference:** weighted attestations first (legacy + group weights), evolve weight source toward **bonded ledger stake** (PoS). Keep PoW optional for propose-spam only, not as the main election story.

## Open design choices

1. **Inclusion policy** — Must a block include *all* valid commits seen in the window, or may proposers select a subset?
2. **Window clock** — Wall-clock vs height-only; how nodes agree the window closed.
3. **Object availability** — Block names commit OIDs; peers must still obtain blobs/trees (git pack protocol, mirrors).
4. **Conflict** — Two valid commits that touch the same ref: first-parent rules, merge-commit requirements, or reject both until resolved?
5. **Election algorithm** — Quorum attestations vs stake lottery (VRF) vs delegated stake; threshold and timeout.
6. **Weight source** — Group metadata only, bonded GULD, imported 1.0 reputation, or a defined mix; slash conditions.
7. **Ballot transport** — Signed git commits (legacy-shaped) vs messages in Postgres/API; how light nodes verify tallies.
8. **Reward / penalty** — Sealer reward, attestor share, slash for equivocation; or reputation-only (research; do not lock tokenomics yet).
9. **Bootstrap** — Genesis = imported `ledger-guld` balances + initial voter set / weights; empty or snapshot git roots.

## Relation to Postgres research

[`postgres-blockchain.md`](postgres-blockchain.md) covers *storing* hash-linked history. This note covers *who appends next* and *what must be true before append*.

Together:

- **Git** — content-addressed file/identity trees; hosts enforce local policy
- **Postgres** — block journal, Merkle/state roots, query projections
- **Block window protocol** — fetch, validate, elect (weights/stake), seal, gossip tips

## Precedents / analogues (not clones)

- **Guld 1.0 / presentations** — PGP observers, weighted community voice, git DAG as blocktree; truth as accepted observation (social + cryptographic), not hashpower
- **GitGuild** — PGP governance + ledger actions over git (adjacent lineage)
- Nakamoto consensus — PoW elects block author; txs are payload (foil, not default)
- Bonded PoS / Tendermint-style quorum — stake + attestation finality (algorithmic foil for Layer 2)
- Permissioned ledgers — validation rules first; consensus second
- “Useful work” literature — progress-freeness problem; Guld keeps validation as eligibility
- Git-native voting protocols — ballots as signed commits; tally deterministic from a clone (ballot transport ideas)

## Verdict

**Block body = useful validation** of a window of commits remains the right core.

**Election layer:** prefer **weighted git votes / group weights**, hardened over time into **proof of stake** (bonded ledger balances + slash), not header PoW. That matches legacy Guld, the 2.0 `weight` field, and a custom Postgres ledger — one weight story for merges and for tips. PoW stays an optional anti-spam tool, not the source of consensus authority.
