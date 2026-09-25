# Research: Modern L0 direction — lean accounts, custom CAS, PoW-capable chain

Status: research (active sketch)  
**Note:** filename kept for link stability; Guld is **L0** (witness substrate below foreign L1s such as Ethereum and Solana).  
Supersedes as **L0 SoT preference**: treating Postgres + PGP-signed git votes as the network consensus path. Those remain valid for **indexers**, **leaf git hosting**, and **2.0 meta-FS packages** — not for what every block producer must run.

Related: [`postgres-blockchain.md`](postgres-blockchain.md), [`block-window-consensus.md`](block-window-consensus.md), [`storage-scale-git-postgres.md`](storage-scale-git-postgres.md), [`../intents/ledger-migration.md`](../intents/ledger-migration.md), [`../UPGRADE_FROM_1.md`](../UPGRADE_FROM_1.md), **draft whitepaper:** [`../whitepaper/guld-2.0-draft.md`](../whitepaper/guld-2.0-draft.md), **specs:** [`../specs/README.md`](../specs/README.md)

## Goal bar

Compete with **Bitcoin / Ethereum / Solana-class** security and fee-metering fundamentals while sitting **below** those networks as an L0 witness hub. Differentiator is product shape — **registered usernames, signed personal / group hash trees, witnessed leaf consensus, foreign-chain tips** — not PayPal TPS or “git as the blockchain.”

## Direction (captured)

### What nodes do

Block producers stay **lean**:

| In consensus path | Out of consensus path |
|-------------------|------------------------|
| Username → account id | Email / PGP UIDs / social identity sprawl |
| Account **master hash** (+ prior as needed) | Full personal file bytes |
| Bound verification key set + **cosign threshold** | “Which of Alice’s many keys/emails…” ad hoc |
| Tx: new master hash + **externally verifiable** cosign / leaf-consensus proof + gas | Git author/committer headers |
| SHA-256 state roots / PoW headers | Postgres query indexes |
| Reject over-gas / bad cosign / invalid proof shape | Optional user/server metadata mirrors |
| Witness that a leaf **achieved** consensus | *Why* they signed; leaf dispute resolution; leaf languages |

Indexed DB for browse/search is something a **user runs locally** or a **server runs on their behalf**. Nodes do not need it to seal blocks.

### Leaf witness model (groups / private rules)

Leaves (personal homes, private groups, guilds) may run **whatever languages and local rules** their directory allows. Dispute resolution and “why we signed” stay **inside the leaf**.

The network only cares about:

1. The **head** (tip / master hash) of that account or group  
2. An **externally verifiable** proof that the leaf’s own consensus policy was satisfied (threshold cosignatures over a committed message, or another proof scheme Guld enumerates at L0)  
3. Weight-priced fee paid to record that witness on-chain  

The node is a **witness**, not an interpreter of leaf politics. It does not execute group scripts, does not learn member emails, and does not adjudicate internal disputes — only that *this tip* was authorized under the *currently registered* on-chain key/threshold (or successor proof type).

### Account + master hash

```
username  (registered; paid F_user(L) or F_group(L, n))
  └── keys[] + threshold     # cosign policy for tip / spend / recover
  └── master_hash = SHA256(
        home_tree_root,      # network-level home = SHA-256 hash tree (not git)
        account_meta_root,   # key set, optional remote hints, …
        …                    # frozen account schema fields
      )
```

- The **identity record** (name, keys, tip, balance) lives on the network. That is the primary identity file.
- Home **content** is CAS under SHA-256 roots—more efficient than git as the network home format.
- **Leaf formats** under the home (git, games, HTTP apps, …) are optional and opaque—including for primary accounts. Git is a leaf/forge UX, not the L0 home encoding.
- Advancing the account = `UpdateMaster` with **threshold cosignatures** and a weight-priced miner fee.
- Leaf/CAS bytes are opaque; encryption (if any) is **leaf owner choice** — not a consensus primitive. **AES-256** is reserved for **wallet key encryption at rest** in reference clients.

**Registration fees:** letter-based **`F_user(L)`**; **`F_group(L, n) = F_user(L) × (2 + n)`** because signer count drives proof complexity. **`F_*` vest to miners over 8 blocks** (anti-spam lottery without same-block self-deal). Inclusion fees remain weight-priced to miners.

**Supply:** genesis pre-mine **x ≈ 9.60×10⁵ GULD** from 1.0 member `*:Assets` (**ERC20 omitted**); **10** decimals; balances locked until **key upgrade**. Block time **10 minutes**. Issuance: `i(y) = max(0.04, (2/3)^(y-1))` (year 1 **100%**, cools fast, **4%** from year 9). See whitepaper §8.6 and [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md).

**Reserved `guld`:** network-owned account; leaves hold node/core/libs/clients/rules. Every full node **must fully clone** the current `guld` home. The open-source git tree at `guld.io/repos/guld.git` is operator-maintained software — not a consensus clone obligation. See whitepaper §3.5.

### Git and PGP — leaf only (including free forges)

| Layer | Tool |
|-------|------|
| On-chain / validators | Custom hash trees, account keys, cosign txs, chain DB, PoW/DAG headers |
| Leaf remotes | **Any git host** (GitHub, Forgejo, self-host, …) for free/cheap push-pull of user/group trees |
| Leaf host | Full node service (or hosted peer) that materializes trees and may run leaf runtimes for clients |
| Those leaves | PGP-signed branches / hooks — fine **inside** the leaf |
| Query / profiles | Optional indexer (user or hosted) |

**Why leave git as the global plane:** extra metadata (e.g. emails), weak first-class **cosign**, and legacy attempts to solve network problems *inside* git got bloated. Cosigning / leaf-consensus proofs belong in the **tx format**, not commit trailers.

**Why keep git as a leaf UX superpower:** users already know `git push`; forges give free hosting and CDN-like clone distribution; clients and leaf hosts fetch bytes while the chain only stores the head. See whitepaper §4.4.

### Storage planes

```
Consensus / state DB     →  tips, balances, gas, key sets, headers, fork choice
Object CAS               →  personal tree nodes (opaque bytes; encryption optional, leaf-local)
Git (optional leaf)      →  user-chosen encoding inside CAS
Indexer Postgres/SQLite  →  off-node; user or app-server only
```

**No L0 pin market:** nodes retain subsets of CAS by operator/leaf choice; the rest is hash-only. Chain tracks account master hashes, not every blob. Retention contracts live in leaves.

### Fees and network validation (not a VM)

Guld at **L0** has a **fixed tx vocabulary**. It validates schemas, checks hashes/signatures/enumerated proofs, and applies built-in state updates. It does **not** run custom functions—those live in leaves.

Fees are **Bitcoin-style**: weight (vB) from size + signature surcharge (+ create/write adders); users bid **fee rate** (GULD/vB); miners take fees; blocks have a weight cap. No EVM gas ISA or base-fee burn required in the active draft (see whitepaper §8).

### Consensus election (preference shift)

Open research, but the active lean-L0 sketch favors:

- **PoW or DAG-PoW** (or PoW as propose gate) for open membership / header security
- **Weight-priced tx fees** (Bitcoin-style) for inclusion
- **Cosign (or enumerated leaf-consensus proofs)** for tip authority

Weighted PGP git votes / bonded PoS remain documented alternatives in [`block-window-consensus.md`](block-window-consensus.md); they are no longer the default story for a from-scratch modern L0.

---

## Crypto: hashing, encryption, keys

### Keep

| Primitive | Role | Notes |
|-----------|------|--------|
| **SHA-256** | Trees, master hash, PoW/input hashing | Fine for commitments; PQ mainly hits **signatures**, not “replace SHA tomorrow.” Grover → effective ~128-bit; enlarge later if policy demands. |
| **AES-256** | Reference wallet keyring at rest | Private keys encrypted locally; **not** used for leaf/CAS content at protocol level |

### Account / tx signatures (choose deliberately)

| Option | Pros | Cons | Fit |
|--------|------|------|-----|
| **Ed25519** | Fast, small, ubiquitous, Solana-proven at scale | Not PQ-safe (Shor) | Excellent for **v1 shipping**; plan PQ migration path |
| **secp256k1 + ECDSA/Schnorr** | BTC/ETH ecosystem tooling, hardware wallets | Same PQ issue; heavier than Ed25519 for our non-UTXO-primary model | Only if wallet interop is a hard requirement |
| **ML-DSA (Dilithium)** | NIST PQ, stateless | Larger keys/sigs; younger ops ecosystem | Strong **PQ-native genesis** candidate |
| **SLH-DSA (SPHINCS+)** | Conservative hash-based PQ | Much larger sigs; slower | High-value / cold / governance keys |
| **Hybrid (Ed25519 + ML-DSA)** | Migrate-friendly; defense in depth | Complexity, size | Sensible if genesis must be PQ-*ready* without abandoning today’s UX |

**Recommendation (research):** freeze an **account key scheme** that supports **multisig/threshold cosign** natively. Ship with Ed25519 *or* hybrid; do **not** build L0 consensus on OpenPGP packets or email-bearing UIDs. Map 1.0 PGP identities in at import as “legacy binding,” not as the hot verify path.

**Cosign:** account stores `keys[]` + `threshold` (+ optional roles: tip / spend / recover). Tx carries `sigs[]` meeting threshold. Group policies compose thresholds over account ids — not git merges.

---

## Blockchain / state database

Nodes need a **hot authenticated store**, not a general application SQL engine.

| Store | Pros | Cons | Role |
|-------|------|------|------|
| **RocksDB / fjall / similar LSM-KV** | Battle-tested for chain tip, high write throughput, prune-friendly | Poor ad-hoc SQL; you build indexes | **Primary** state + block body storage |
| **Sparse Merkle / Jellyfish / similar** | Account tip proofs, light clients | Write amp if naive; design carefully | Authenticated **state root** in headers |
| **MMR / hash-chain headers** | Simple inclusion / historical proofs | Less expressive than full SMT for accounts | Header/log commitments |
| **Postgres** | Superb query, ACID app logic, familiar ops | Heavy as sole public L1 archive; not BFT | **Indexer / API / user server only** |
| **Git ODB as chain DB** | Familiar | Bloated at network scale; no cosign; wrong metadata | **Reject** for consensus |

**Recommendation:** KV (+ SMT) for validators; optional Postgres projector for browse/search products. Aligns with [`storage-scale-git-postgres.md`](storage-scale-git-postgres.md) on “don’t put all users in one git DB,” while **demoting** Postgres from consensus SoT.

### Capacity sketch (keys + SHA-256 only)

Assume ~1 verification key / user (32 B), ~10 tracked SHA-256 values (320 B), account meta (~64 B), plus LSM/SMT overhead (~2.5–4×):

| Population | Cold (key + 10 hashes) mid store | +10 tip history on *all* users |
|------------|----------------------------------|--------------------------------|
| 10 M | ~10 GiB | ~17 GiB |
| 100 M | ~100 GiB | ~170 GiB |
| 1 B | ~1 TiB | ~1.7 TiB |

Keeping **10 historical tips only for recently active** users barely moves the total (history is cheap next to “one row per human”). Full nodes at **100 M users** are commodity-disk territory; **1 B** is large but still in the same league as modern L1 state sets — *because* you are not storing file bytes on validators.

CPU: tip updates are dominated by signature verify, not SHA-256. Thousands of single-sig tip updates per second are plausible on modest hardware if proofs stay threshold-small.

**Not in this budget:** CAS object bytes or indexer Postgres — those scale with content and product UX, not with “key + hashes.” Retention is leaf/self-host/forge; **no L0 pin market.**

---

## Implementation language

Under the **witness** model, the validator hot path is mostly: verify signatures/proofs, apply tip/balance updates, maintain KV+SMT, gossip, PoW/DAG. That is **much smaller** than “re-execute everyone’s directory scripts.” Language choice is therefore about **engineering quality of a consensus client**, not about hosting leaf runtimes.

| Language | Pros | Cons | Fit for *this* node |
|----------|------|------|---------------------|
| **Rust** | Memory safety without GC; strong crypto/KV ecosystem; hard to shoot foot in concurrent networking; used by many modern chain clients | Slower to prototype; steeper hiring/learning | **Strong default** if you want long-lived adversarial-network code |
| **Go** | Geth proved Go can run a major L1; fast to ship networking/RPCs; simple static binaries | GC; easier to introduce subtle concurrency bugs; slightly weaker “fearless” refactors | **Equally serious** alternative for a witness-heavy node |
| **C++** | BTC Core precedent; max control | Memory safety tax; slower product iteration | Only with a Core-like culture |
| **Zig / other** | Interesting systems niche | Thin chain ecosystem | Research, not default |
| **Python** | Fast research; current `guld-python` leaves | GIL, packaging, not ideal for multi-peer consensus under load | **Leaves, tools, importers** — not the public validator |
| **TypeScript** | Clients, light verify in browser | Not for full nodes | Wallets / index UIs |

**Why Rust was suggested (aside from priming):** safety + performance + crypto/KV crates for software that must not corrupt state or panic-stop the network under malformed P2P input. **Not** because leaves need Rust — leaves can be any language.

**Why another language can be better:** if the node stays a thin witness, **Go** is a very credible primary (Ethereum’s history). Pick Rust when you prioritize memory-safety and a Substrate/Solana-adjacent crate world; pick Go when you prioritize shipping speed and ops familiarity. Either beats Python for the consensus daemon.

**Recommendation:** choose **Rust** for the validator (safety + Cargo/git-native deps fit this ecosystem; Go remains a credible alternative). Keep Python/JS for leaf hosts and SDKs. Revisit only if the network VM grows far beyond witness+ledger (it shouldn’t under this model).

Cargo integrates cleanly with git: path deps, git URL deps, and crates.io alike — same “content in git, build from manifests” habit as the rest of the stack.

---

## What to import from Bitcoin, Ethereum, Solana

### Bitcoin

| Learn / import | Skip / adapt |
|----------------|--------------|
| UTXO *discipline* for value that must not be double-spent; simple script lessons | Email-era identity; assuming SHA-256d + ECDSA forever |
| Difficulty / header chain / (or DAG-PoW evolution) for open Sybil cost | One global serial ~7 TPS as a product ceiling |
| SPV-style “headers + proofs” mindset for light clients | Treating the whole social graph as consensus input |
| Conservative crypto change culture | PGP as wallet |

**Graft:** headers commit to **state root of account master hashes**, not only a UTXO set — but keep BTC’s “validators re-check, don’t trust,” and fee pressure against spam (via gas).

### Ethereum

| Learn / import | Skip / adapt |
|----------------|--------------|
| **Gas** accounting; block gas limit; base-fee style markets | EVM opcodes as our userspace model |
| Account model + nonces; contract-like rule bundles versioned by hash (`rules_id`) | Mandatory EC crypto; JSON-RPC as the only UX |
| Receipts / state roots / receipts trie ideas | “Everything is a smart contract” — our primary object is a **personal tree tip** |
| EIP culture: explicit metering of every costly op | L1 fee token complexity before the VM is tight |

**Graft:** a **thin** metered preamble — sig/proof verify, nonce, tip update, transfers — so block validity is “under gas + valid leaf-consensus proof.” Do **not** import EVM as the place private groups run their politics.

### Solana

| Learn / import | Skip / adapt |
|----------------|--------------|
| Parallelism when accounts don’t overlap (Alice tip ∥ Bob tip) | Requiring every node to hold all history the same way |
| Ed25519 + performance engineering; deliberate runtime budgets | Their specific VM/loader as ours |
| Leader schedule / pipelining ideas (even under PoW/DAG variants) | Equating “fast” with “skip verification” |

**Graft:** declare **conflict sets** (which account ids a tx touches). Non-overlapping master-hash updates execute in parallel inside a block.

### Others (short)

- **Kaspa-class DAG-PoW** — if staying PoW but wanting higher block parallelism than Nakamoto single-lane.
- **Celestia-style DA** — later research only; v1 does **not** put pin/slash on L0 (leaf retention + mandatory `guld` clone).

---

## Network validation vs leaf runtimes

### Split

| Layer | Runs where | Priced by L0 fee? |
|-------|------------|-------------------|
| **Leaf rules** (scripts, guild law, languages, disputes) | Inside the group / home | **No** |
| **Leaf consensus proof** (threshold sigs, etc.) | Produced by leaf members | Verified on L0 — cost in **tx weight** |
| **Network witness + ledger** | Every validator | **Yes** (fee rate × weight) |

Private groups invent their own meaning of “we agreed.” The chain only checks that the registered authorization policy for that head is satisfied and records the new tip.

### Network surface (fixed; not a VM)

1. **Deterministic verify** — same proof bytes → same accept/reject on every node.  
2. **Schema-valid txs only** — no user-defined operations at L0.  
3. **Weight + fee rate** — size + sig surcharges; block weight limit.  
4. **Enumerated proof kinds** — e.g. `threshold_cosign_v1`; richer proofs only via upgrades.  
5. **Opaque leaves** — node never executes leaf interpreters.

### Sketch txs

- `register_username` / `register_group` / `rotate_keys` / `update_master`  
- `transfer` / grant / optional bond/slash for **roles** (not CAS pins)  
- Genesis: reserved account **`guld`** (not user-registrable); full nodes sync its full home

### What not to do

- Require validators to run group Python/JS/WASM to accept a tip  
- Build an EVM-like gas ISA “just in case”  
- Treat “why they signed” as consensus input  

---

## Pros and cons of this overall direction

### Pros

- **Lean validators** — witness tips + proofs; competitive operationally  
- **Leaf sovereignty** — groups keep languages, rules, and disputes off-chain  
- **Real cosign / proof** — externally verifiable authorization without interpreting politics  
- **Git/PGP where they shine** — leaf tooling, not the world computer bus  
- **Simple fees** — Bitcoin-style weight / fee rate, not an opcode meter  
- **Language flexibility** — Rust validator; leaves stay polyglot  
- **PQ path** — redesigning keys now avoids OpenPGP+git lock-in  
- **Indexer freedom** — apps stay app-tier  

### Cons

- **Greenfield cost** — still a real L0 chain (headers, state, P2P), even without a fat VM  
- **Proof enumeration** — only listed proof kinds are network-valid; exotic leaf governance must compile down to them  
- **Breaks continuity** — 2.0 meta-FS PGP/git becomes leaf path; migration map required  
- **PoW politics / energy** — if PoW is primary election  
- **CAS availability** — tips without pins can become unavailable data  
- **Larger PQ sigs** — if genesis is PQ-native  
- **Two stacks** — consensus daemon + polyglot leaf tooling  

---

## Comparison to prior research sketches

| Topic | Prior preferred sketch | This sketch |
|-------|------------------------|-------------|
| Consensus store | Postgres journal | KV + SMT; Postgres indexer only |
| Identity | PGP subjects / git votes | Username + on-chain key set + cosign |
| Files | Git as network file plane | CAS personal tree; git optional leaf |
| Election | Weighted votes → PoS; PoW anti-spam | PoW/DAG-PoW; Bitcoin-style weight fees |
| Node duty | Validate commits + mirror metadata | Witness tip + leaf-consensus proof; no leaf interpreters |
| Throughput bar | Explicitly not DeFi/PayPal | BTC/ETH/SOL-class security, feature-led |

Older docs remain useful for precedents and for **non-consensus** Postgres/git hosting. Where they conflict on L0 SoT, **this document wins** until superseded.

---

## Open decisions

1. Genesis sig scheme: Ed25519 vs hybrid vs ML-DSA-only  
2. PoW algorithm + whether DAG-PoW from day one  
3. Exact account schema fields inside `master_hash`  
4. Enumerated leaf-consensus proof kinds (threshold cosign first; what else?)  
5. ~~Pin/availability market~~ → **locked: no L0 pins**; leaf retention only  
6. How 1.0 `ledger-guld` + PGP usernames map into register + balances (`ClaimLegacy`; spec 15)  
7. Relationship of Rust validator to today’s `guld-python` leaf hosts  

## Verdict

Build a **modern, lean L0** that **witnesses** account/group heads: SHA-256 trees, opaque CAS leaves (encryption optional, off-protocol), externally verifiable **cosign/proofs**, **Bitcoin-style weight fees**, CAS with optional git inside. Leaves keep their own languages, rules, and disputes. No general network VM. Push PGP/git and Postgres **off the consensus path**. Implement the validator in **Rust**; keep leaf tooling polyglot. Key+hash state at global user counts is realistic; content retention stays in **leaves** (mandatory full clone only for `guld`).
