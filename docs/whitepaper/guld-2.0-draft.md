# Guld 2.0 Whitepaper

**Version:** 0.17  
**Date:** 2026-09-24  
**Token:** GULD (native)  
**Specifications:** [`../specs/README.md`](../specs/README.md)

---

## Abstract

Guld 2.0 is a **global, identity-focused DeFi layer-0**: a **PoW-anchored namespace and witness substrate** where people, groups, **other blockchains**, and unbounded dapps share one address space of **usernames**, **content hashes**, and **enumerated proofs**. The chain records that an account achieved consensus on a new **head** (master hash). It does not interpret why they signed, run their private scripts, or adjudicate their disputes.

Other networks (e.g. **`ethereum`**, **`solana`**, **`bitcoin`**) MAY appear as names whose tips advance under **those chains’ consensus proofs**. Dapps such as a hypothetical **guldex** can build further proofs over those witnessed states; “lightning”-style or personal chains can settle periodically by committing hashes to Guld. The network is **not a general VM**: it validates fixed transaction schemas, checks hashes and signatures, and applies a small set of built-in state updates. **Everything else**—games, exchanges, rollups-as-leaves, agents—lives in **leaves**, on custom domains, talking to peer nodes over HTTP. Validators stay lean on keys, tips, and balances. Optional git and PGP remain **leaf** tools, not the consensus bus.

Fees follow a **Bitcoin-style weight market** (GULD per virtual byte), not an EVM gas ISA. Emission and PoW (or DAG-PoW) align open membership with scarce block space. Each account is responsible for what it **witnesses** and **cowitnesses**.

---

## 1. Motivation

### 1.1 The gap

Ethereum proved programmable settlement and fee markets. Bitcoin proved open Sybil-resistant consensus. Solana proved that non-conflicting account updates can proceed in parallel. None of them treat **human-meaningful identity** and **sovereign group process** as the primary object:

- Addresses are opaque key hashes, not names.
- “Multisig” and governance are applications, not the native tip model.
- Putting social process on a general VM forces every validator to re-execute politics—or forces that politics into custodial apps.

Guld 1.0 explored identity, git, and weighted observation. Solving network consensus **inside** git and PGP proved too bloated for global scale (emails and UIDs as metadata, weak first-class cosign, mega-repo growth).

### 1.2 Thesis

**Address by name. Commit by hash. Authorize by proof. Pay a tx fee. Leave leaf law to the leaf — including dapps with no ceiling. Witness other chains the same way.**

Guld is an **L0 witness hub**: identities and foreign networks share one namespace; settlement of fast paths and personal chains is “just another hash tip.” It is a hard fork of the 1.0 software and ledger: preserve historical balances and rules where possible; do not preserve blockchain-in-git or FUSE as the product model.

### 1.3 Design bar

| Goal | Meaning |
|------|---------|
| **L0 substrate** | Names + proofs + PoW anchoring under people, groups, **and other chains** |
| Identity-first DeFi | Transfers, bonds, grants, and permissions bind to **usernames / groups** |
| Flexible leaves / dapps | **No app ceiling** — leaves run any stack; Guld only witnesses heads |
| Foreign-chain proofs | Tips for `ethereum` / `solana` / … under **their** consensus proofs ([`../specs/13-foreign-chains.md`](../specs/13-foreign-chains.md)) |
| Network as witness | Verifies external proofs and records heads — does not re-execute app logic |
| PoW security class | Open membership and scarce block space in the BTC/ETH/SOL security conversation |
| Lean validators | No requirement to index social graphs or execute leaf interpreters |

### 1.4 Target user story

This is the product journey the reference stack optimizes for:

1. **Hear about Guld** — word of mouth, dapp, docs, or press.  
2. **Arrive** — open **guld.io** (bootstrap mirror) **or** install/run Guld software from source (`guld-node` + static wallet).  
3. **Create identity** — generate a key on-device, pick an **available name**, see the **estimated GULD registration fee** (`F_user(L)` + inclusion).  
4. **Get sponsored** — **guld.io** (or any paid registrar) takes off-chain payment, **or** someone they know sponsors on-chain (spec 16). Dual signatures; user keeps the private key.  
5. **Live in the PWA wallet** — installable on device; keys stay local (encrypted); user can **transact** (send to names) and **build their own dapp** under their home tip.  
6. **Link ecosystem tools** — especially a **browser extension** that holds/uses the same identity so the user can **log into websites** with their Guld name/key (challenge–response / signed auth — leaf/app convention, not a consensus opcode).  
7. **Browse the ecosystem** — visit many **Guld dapps** on many domains with **one key, one passphrase habit, one name** — no per-site hex wallets.

Steps 6–7 are **ecosystem UX** (extension and dapp conventions). They are not required for consensus validation; they are required for the intended everyday experience. Friend-only sponsorship and “build from git, never visit guld.io” remain fully valid.

---

## 2. Architecture overview

```
┌─────────────────────────────────────────────────────────────┐
│  Consensus plane                                            │
│  PoW / DAG-PoW headers · fork choice · coinbase · fees      │
└────────────────────────────┬────────────────────────────────┘
                             │ commits to state_root
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  State plane (KV + sparse Merkle / authenticated tree)      │
│  username → account · keys · threshold · master_hash        │
│  balances · nonces · receipts                               │
└────────────────────────────┬────────────────────────────────┘
                             │ references content hashes
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Object plane (CAS + optional git remotes)                   │
│  personal / group trees · forge clones · encrypted blobs    │
│  local/optional retention · leaf hosts materialize clients  │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Clients (unknown) + optional indexers                      │
│  Browser / game / CLI ↔ node HTTP API · leaf host · explorers│
└─────────────────────────────────────────────────────────────┘
```

**Stack:** Rust validator; polyglot leaf tooling (including Python/JS meta-FS packages as leaf hosts). Users may push leaf git to GitHub or any forge for free distribution. SHA-256 for commitments; AES-256 for private leaf encryption when needed; account signatures Ed25519 at genesis with a documented PQ migration path (hybrid / ML-DSA).

**Node surfaces:** wallets and dapps talk to a full node over an **HTTP API** (resource routes under `/api/v1/…`). **P2P** carries blocks, txs, and CAS among peers. JSON-RPC MAY remain as a transitional adapter. The reference static wallet is the **guld git tree itself** (served via `--http-static` or any static host) and may be mirrored on a domain such as guld.io — that domain is a **bootstrap URL**, not a consensus hub.

---

## 3. Identity model

### 3.1 Names and hashes

| Concept | Role |
|---------|------|
| **Username / group name** | Human-addressable primary handle on the network |
| **Account id** | Stable internal id (hash of registration commitment) |
| **Master hash** | Single SHA-256 committing to the account’s defined tree + meta |
| **Content hashes** | SHA-256 (or tree roots) referencing CAS objects |

People say: *pay `alice`*, *bond to `guild/traders`*, *follow tip of `bob`*. Machines settle against the registered mapping and the current master hash.

### 3.2 Account structure and network-level home

```
name
├── keys[]              # verification keys
├── threshold           # cosign policy for tip / spend / recover (roles optional)
├── nonce
├── master_hash         # SHA-256 head of the account home
├── balance (GULD)
└── optional bond / remote-hint fields   # bonds = roles/deposits only; no L1 CAS pins
```

```
master_hash = SHA256(
  home_tree_root ‖          # SHA-256 Merkle (or equivalent) of defined home objects
  account_meta_root ‖
  … schema-frozen fields …
)
```

**Primary homes are hash trees at the network layer**, not git objects. The chain stores the **identity record** (name, keys, threshold, `master_hash`, balances)—that is the network’s primary identity file. Home **bytes** live in CAS addressed by SHA-256. Validators need only the tip for validation; **content retention is a leaf concern** (self-host, forge mirrors, leaf contracts)—not an L1 pin market, including account **`guld`** (§3.5).

**Leaf formats under the home** (git repos, game data, HTTP app trees, encrypted blobs, …) are optional and opaque. Git is a fine leaf encoding for free forge hosting; it is **not** the network home format. Other leaf formats—including as the bulk of a personal or group home—are first-class as long as the committed root is SHA-256.

Validators never open leaf formats; they only check that proofs authorize a new `master_hash`.

### 3.3 Registration (priced; anti-spam)

Registering a name consumes **global namespace** and creates durable validator state. It must be **painful to spam**, continuing the Guld 1.0 idea of explicit registration fees for individuals and groups.

| Kind | Who pays | Fee (consensus) |
|------|----------|-----------------|
| **Individual** | Payer account | **`F_user(L)`/year** — letter-based; 1-letter names premium, ≥6 letters = **1 GULD** floor **plus** inclusion fee |
| **Group** | Payer account | **`F_group(n) = 2 + n` GULD**/year (`n` = initial signer count) **plus** inclusion fee |
| **Subaccount** | Parent individual | **`F_sub = 0.1 GULD`/year** fixed **plus** inclusion fee — `parent.label` device / hot-cold wallets |

**Why scale group fees with signer count:** each additional key enlarges proofs the network must verify for the life of that account (registration now; every threshold tip later). Charging upfront for `n` aligns payment with **proof complexity** the validators will perform.

**Length pricing:** count **letters only** in the root label (`x` = 1, `jorge-luise-gonzalez` = 17 → capped). Short names are scarce and expensive; names with **≥ 6 letters** pay the **1 GULD**/year floor (1.0 continuity for ordinary names). Subaccounts stay cheap so one human can hold multiple custody zones without burning another top-level name. Fees buy **DNS-style pay-or-release** control ([`../intents/name-expiry.md`](../intents/name-expiry.md)); keep the wallet funded or the name is released. Legacy claims stay open (PGP or isysd attestation). No resale market. See §8.7 and [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md).

**Miner lottery:** `F_user`, `F_group(n)`, `F_sub`, and settle renewals/releases go to the **block miner** who includes the tx (same coinbase as inclusion fees). Whoever mines that block wins the full protocol fee—no burn, no vesting split. Optional **name deposits** may lock separately (returnable/slashable under policy).

**Bootstrap (no name yet):** registration requires a **sponsor** with GULD. The future name holder signs a **registration intent** (`guld/register/intent/v1`); the sponsor signs the spend (`guld/register/v1`). Both signatures are required on-chain — see [`../specs/16-sponsored-registration.md`](../specs/16-sponsored-registration.md).

A sponsor is usually a **friend** (or any funded account). Anyone with GULD MAY also run an **optional paid registrar**: the newcomer pays via a **third-party payment service** (BTC/ETH/SOL/USDT/fiat); after payment, automation submits the **same** sponsor tx. Early on, guld.io / **isysd** may be a convenient first desk — not a privileged one. Everyday users can turn the same feature on against their own node. The desk is **not** consensus authority, **not** required to join, and **turn-offable**. The first user can still build from git and never visit guld.io. See [`../intents/bootstrap-gateway-registrar.md`](../intents/bootstrap-gateway-registrar.md).

```
RegisterUsername / RegisterGroup(
  name, keys[1..n], threshold, initial_master_hash
)  requires  balance ≥ F_*(n) + endowment + inclusion_fee
           F_*(n) + inclusion_fee → coinbase miner
```

Legacy Guld 1.0 usernames and balances are imported as **claimable pre-mine accounts** (§8.6, [`../specs/15-ledger-import.md`](../specs/15-ledger-import.md)). Spend and tip authority activate only after a **key upgrade**: the holder proves control of the 1.0 identity (PGP / legacy binding) and registers Ed25519 (or hybrid) keys. Until then, balances are respected on-chain but **locked**. OpenPGP is not the hot verify path after claim.

### 3.4 Addressing, referencing, and L0 foreign chains

- **Address by name** in UX and high-level txs (`Transfer { to: "alice", amount }`).
- **Reference by hash** for tips, trees, and proofs (`master_hash`, CAS oids).
- Resolvers and indexers may cache name→id; consensus stores the authoritative map.

**Foreign chains in the namespace.** Names such as **`bitcoin`**, **`ethereum`**, **`solana`**, … MAY be reserved (or later gated) as **`foreign_chain`** accounts. Their `master_hash` tips advance only with **enumerated proofs that invoke that chain’s consensus rules** (SPV / light-client style)—not Guld cosign alone. Guld nodes verify those proofs at bounded weight cost; they **MUST NOT** be required to run full foreign nodes.

That is the L0 move: **one identity and tip layer that can witness many networks’ outcomes**. It is **not** automatically a token bridge (lock/mint is a separate product). Full rules: [`../specs/13-foreign-chains.md`](../specs/13-foreign-chains.md).

**Dapps on top of witnessed foreign state.** A third-party leaf such as a hypothetical **guldex** MAY read those tips (and related home documents), build **application proofs** about foreign balances or events, and settle its own state by advancing **its** name’s tip—or by posting ordinary Guld txs. Guld does not need a special “exchange opcode”; guldex is a dapp with keys, a home tree, and whatever off-chain indexing it needs.

**Fast paths and personal chains are trivial in this toolset.** Identities, keys, threshold cosign, and PoW-anchored tips already give you:

| Pattern | How it maps |
|---------|-------------|
| **Personal / app chain** | A name (or group) whose leaf is a ledger; periodic `UpdateMaster` commits the latest state root to Guld |
| **“Lightning”-style channels** | A dapp keeps off-Guld updates among parties; periodically settles a hash (and optional proofs) to Guld — and MAY interact with guldex or foreign-chain tips for multi-asset stories |
| **Side systems / rollups-as-leaves** | Same: fast execution off the witness hub; hash commitment on Guld when you need global finality under PoW |

The main Guld chain stays a **scarce, weight-priced settlement and naming plane**. Speed and experimentation live in leaves that **checkpoint** here.
### 3.5 Reserved name: `guld` (network identity)

The username / account **`guld`** is **reserved for the network itself**. It is not available for public registration.

Its on-chain home tip commits to a compact **rule bundle**—schemas, genesis params, weight tables, proof-kind definitions—that honest nodes enforce. That is the network’s normative **parameter set**, not a mirror of developer source repositories.

**Node software** (full node, wallet, leaf SDKs) ships from **ordinary git repos** maintained by operators (e.g. `~/Projects/guld`, `guld.io`). Full nodes **do not** need to clone or materialize protocol **source code** from the `guld` CAS tree to validate blocks. Block headers carry **`guld_rules_hash`** (digest of the active rule bundle); the node’s built-in rule set must match.

```
on-chain account "guld"
  └── master_hash  →  rule params, schemas, fee tables (small normative bundle)
        └── NOT required: full node / wallet / website source trees
```

Consensus cares about the committed rule digest and registered keys under `guld`, not where engineers keep their checkouts.

**Implications**

| Topic | Rule |
|-------|------|
| Namespace | `guld` cannot be registered by users; genesis-created |
| Rules | Headers include `guld_rules_hash`; must match the node’s configured rule set |
| Source code | Off-chain git — **not** consensus data availability |
| Upgrades | New node releases + agreed `guld` tip when rule params change (hard/soft fork policy) |
| Light clients | Trust headers / proofs; need not fetch `guld` home bytes |

---

## 4. Leaves, witnessing, and cowitnessing

### 4.1 Leaf sovereignty

A **leaf** is a personal home or group realm: its members may use any languages, scripts, and local rules. Disputes (“why we signed”) are resolved **inside** the leaf.

```mermaid
flowchart LR
  subgraph leafPlane [Leaf plane — opaque to validators]
    aliceHome["Individual alice: private docs, encrypted blobs, executables, local rules"]
    guildHome["Group guild: bylaws, shared tools, member policy, disputes"]
  end
  subgraph hashPlane [Commit]
    tree["Hash home tree — SHA-256 digests"]
    tip["master_hash"]
  end
  subgraph chainPlane [On-chain]
    acct["Account: name, keys, balance, master_hash only"]
  end
  aliceHome --> tree
  guildHome --> tree
  tree --> tip
  tip -->|"UpdateMaster + threshold proof"| acct
```

Individuals and groups may keep **private files**—including encrypted blobs and **executables**—under whatever leaf policy they choose (bylaws, scripts, runtimes). The network does not open those bytes. What enters consensus is only a **content-addressed tip**: hash the home tree → `master_hash`, then authorize `UpdateMaster` with an enumerated proof (usually threshold cosign). Any leaf format is valid so long as the committed head is a SHA-256 (or equivalent) hash.

The network accepts a tip update only if it carries an **enumerated, externally verifiable** leaf-consensus proof under the account’s current on-chain policy—for genesis, primarily:

**`threshold_cosign_v1`:** at least `threshold` signatures over

```
SHA256( account_id ‖ prev_master_hash ‖ new_master_hash ‖ nonce ‖ chain_id )
```

Additional proof kinds require explicit protocol upgrades.

### 4.1b Dapps: you can literally do anything

On most L1s, a “dapp” is trapped inside a **shared VM**: gas meters, opcode sets, and every validator re-executing your logic. That caps ambition—and taxes the whole network for your creativity.

**Guld inverts that.** A dapp is a **leaf** (or a composition of leaves) under one or more names. The chain only asks: *did the right keys authorize this new head, and was the fee paid?* It does **not** ask what the bytes mean.

So a Guld dapp MAY be:

- a static site or full **web app** on a **custom domain**, talking to that peer’s `guld-node` HTTP API  
- a **native game**, engine, or desktop binary loaded from the home tree  
- an **agent**, bot, notebook, or long-running service the leaf host starts  
- encrypted personal vaults, guild tooling, markets, social graphs, DAOs-as-process, research labs, art — **whatever the builders ship**  
- cross-dapp flows over **HTTPS between peer domains** (plus ordinary sponsored/paid registration and transfers for identity and money)  
- **foreign-chain witnesses** and settlement dapps (guldex, lightning-style channels, personal chains) that commit hashes to Guld (§3.4)

There is **no on-chain language whitelist**, **no gas ISA for app logic**, and **no requirement** that every validator understand your stack. Unsupported leaf types are still valid on-chain; clients that care materialize them; others ignore them.

**Expectation:** dapps on Guld should be **extreme**—far beyond “another Solidity CRUD front-end.” The protocol’s job is identity, money, and witnessed tips. The dapp’s job is the rest of the universe. If it can run on a computer and commit a hash under your keys, it can be a Guld dapp.

Web-native shape: users run (or trust) a node; the reference wallet is static files; dapps live on **their** domains; peers call each other over HTTP when they need app-level coordination; settlement stays proof-bearing txs on the mesh.

### 4.2 Witness and cowitness responsibility

| Actor | Responsibility |
|-------|----------------|
| **Account / key holder** | Whatever they sign: they **witness** that `new_master_hash` is the authorized head |
| **Cosigners** | Jointly **cowitness** the same statement; threshold failure ⇒ tip rejected |
| **Validators / miners** | Witness that the proof verifies and the fee is paid; they do **not** endorse leaf politics |
| **Leaf hosts / remotes** | Hold bytes clients need; availability is **off** the consensus path (leaf contracts, self-host, forges) |

Signing is **attributable**. Social or legal meaning of a cowitness remains a leaf concern; cryptographically, cowitnesses are jointly necessary for the tip to enter global history.

### 4.3 What the node does *not* do

- Run leaf interpreters as a consensus requirement (Python, WASM guild scripts, games, …)
- Read emails, PGP UIDs, or git commit headers as consensus input
- Decide internal group disputes
- Require a global metadata index to produce blocks

### 4.4 Clients, leaf hosts, and free git remotes (UX)

The **ultimate client is undefined**: a browser UI over HTTP, a native game binary, a CLI, a mobile app, an agent. The L1 only knows names and heads. To *use* files and code, a client must talk to something that holds **leaf material**—not merely the on-chain `master_hash`.

```
  unknown client (browser / game / CLI / …)
           │
           ▼
  leaf host  ←── full node software can provide this as a local/remote service
  (clone, serve files, run optional leaf runtime)
           │  push / fetch git or CAS
           ▼
  leaf remotes (often free): GitHub, Forgejo, self-host, …
           │  announce new tip
           ▼
  network validators  (verify proof + fee; store master_hash only)
```

**Git as empowerment, not consensus bus**

- Individuals or groups can get **free git hosting** (e.g. GitHub) for their home or group branch.
- Whatever client they use can **push** there; peers and leaf hosts **clone/fetch** to distribute updates and to recompute or verify tree hashes that become the next `master_hash`.
- The network may **read** public remotes when helping users sync, but consensus does **not** require GitHub uptime, git commit metadata, or a particular forge—only a valid proof over the new head.
- Optional: account meta may list **hint URLs** (`remotes[]`) so clients know where to fetch; hints are convenience, not consensus truth.

**Runtime is leaf-defined — and unbounded**

A leaf might expose an HTTP server + browser UI, load a game binary, run notebooks, or stay static files — or invent something nobody has shipped yet. The full node package **may** start such services for supported leaf types; it is not obligated to understand every leaf. Unsupported leaves are still valid on-chain as long as heads and proofs verify. See **§4.1b**.

**“Connected to a node that supports their leaves”**

- Wallet-only clients can transfer GULD and read heads from any full node’s **HTTP API** (local or a peer they choose to trust for reads).
- **Contentful** clients need a **leaf host** (often the user’s own full node, or a hosted node they trust) that:
  - tracks network tip for their name/group  
  - materializes the matching tree (clone from remotes / CAS / pins)  
  - optionally runs the leaf’s chosen runtime  
- Full node software is the default way to get that host locally; third parties may offer “node-as-a-service” for specific leaf kinds without becoming consensus validators.

**Availability:** relying solely on a commercial forge is a **UX bootstrap**, not protocol DA. Serious leaves should mirror or self-host (or contract retention in-leaf); on-chain head can outlive a deleted GitHub repo.

### 4.5 Reference UI and guld.io

Reference clients ([`../specs/14-reference-ui.md`](../specs/14-reference-ui.md); intent [`../intents/pwa-reference-wallet.md`](../intents/pwa-reference-wallet.md)):

| Surface | Role |
|---------|------|
| **Static webapp / PWA** (repo root) | **Primary** reference wallet — register, send, balance, activity, explorer, docs; installable cross-platform |
| **`guld-wallet` (desktop)** | Optional — file keyring, legacy PGP claim, external signing for users who keep keys off the browser |

**How it runs:** the wallet is **open-source static files in this repository** (no Node.js build). Each user SHOULD run it against **their own** `guld-node --http` (optionally `--http-static .`). The **guld.io** domain is a convenient **bootstrap URL** and one mirror of that software — not the only place wallets may live, and not a required peer for consensus.

**API:** the PWA speaks the node **HTTP API** (`/api/v1/…`). Writes are proof-bearing (signed txs); the API MUST NOT store user keys. JSON-RPC on the node is transitional for tools.

**Target journey:** §1.4 — hear about Guld → wallet → name + fee → sponsor → installable PWA → extension login → many dapps, one identity. Rust **`guld-client`** backs the desktop signer; the PWA uses JS/WASM signing aligned to the same message formats. A **browser extension** is the preferred bridge for “log into this website as `alice`”; it is ecosystem software (not consensus), but it is part of the **target** everyday path alongside the PWA.

### 4.6 Optional paid registrar (any peer)

The bottleneck for a newcomer is finding someone with GULD to sponsor a name. **Any funded account** MAY enable a **paid registrar** in the reference software: connect a **supported third-party payment gateway**, publish a pay link, and on webhook fulfillment submit the portable registration request as payer — identical to friend-sponsor on-chain ([`../intents/bootstrap-gateway-registrar.md`](../intents/bootstrap-gateway-registrar.md)).

guld.io / **isysd** may run this **first** during bootstrap. That does **not** reserve the role:

- Everyday users can turn the same feature on for their own name and domain or localhost mirror.  
- Friend-sponsor without payment remains fully supported.  
- Consensus peers are full nodes over P2P, not payment vendors.  
- Anyone can turn their desk **off**, or use a dedicated self-funding registrar account — no protocol change.

Payment rails and gateway UI are **out of protocol**. They MUST NOT be required by `guld-node` validation.

---

## 5. Network validation (not a VM)

The Guld chain is intentionally **not** a programmable machine for app logic. It may:

- validate fixed **schemas** for a closed set of tx types  
- check **hashes**, **signatures**, and enumerated **leaf-consensus proofs** (including **foreign-chain** proof kinds)  
- apply **built-in** balance/tip/key updates  

It does **not** host user-defined functions, loops, or leaf languages. Those run only in leaves — which is exactly why dapps are unbounded (§4.1b) and why other chains / fast paths settle as **tips** (§3.4). That is why Bitcoin-style tx fees fit and an EVM gas ISA does not.

---

## 6. Transaction types (network surface)

| Tx | Effect |
|----|--------|
| `RegisterUsername` | Bind individual name; pay `F_user` + inclusion fee |
| `RegisterGroup` | Bind group name with `n` signers; pay `F_group(n)` + miner fee |
| `RegisterSubaccount` | Bind `parent.label`; pay `F_sub` + inclusion fee |
| `RotateKeys` | Change keys/threshold (own key hygiene — not resale); dual auth old+new |
| `SettleRegistration` | Pay-or-release at expiry: auto-debit `F_*` or delete name (miner) |
| `UpdateMaster` | Advance `master_hash` with leaf-consensus proof |
| `Transfer` | Move GULD between named accounts |
| `ClaimLegacy` | Unlock a 1.0-imported name under new keys |
| `Bond` / `Unbond` / `Slash` | Optional stake for **roles / name deposits**—**not** CAS storage |

All txs pay a **weight-based fee**. Conflict sets are account ids touched; non-overlapping updates may execute in parallel within a block.

---

## 7. Consensus

### 7.1 Role of PoW

Open membership for block proposal uses **PoW or DAG-PoW** on headers that commit to:

- `prev` / DAG parents  
- `state_root`  
- `tx_root`  
- `receipt_root`  
- `difficulty` / `nonce`  
- `coinbase` (PQ-ready reward address)  
- `fee_total` / block weight used  

Useful validation (schema + proof verify + state transition) is **eligibility**. PoW elects among valid candidates and prices Sybil proposal spam. DAG-PoW variants may raise parallel block throughput without abandoning PoW’s open-entry property.

```mermaid
flowchart TD
  mempool["Mempool: fee-rate select under weight cap"]
  due["Due names: SettleRegistration prepend"]
  ordered["Ordered txs: settles then user txs"]
  apply["Apply each tx: state deltas and receipts"]
  coinbase["Coinbase: subsidy + inclusion + F_star / dust"]
  header["Header: state_root, tx_root, receipt_root"]
  pow["PoW: search nonce to difficulty"]
  block["Sealed block: header + txs"]
  mempool --> due --> ordered --> apply
  apply --> coinbase
  apply --> header --> pow --> block
```

**Block construction (miner path):** select mempool txs by fee rate under the weight cap; prepend permissionless `SettleRegistration` for names due at this height (pay-or-release); apply every tx to produce receipts and fee totals; credit **coinbase** = subsidy + inclusion fees + registration / settle fees; fill header roots; search a PoW nonce. Peers re-apply the same txs—they never execute leaf code inside the block.

### 7.2 Finality

Probabilistic depth (Nakamoto / GHOSTDAG-class). Optional later checkpoints are a separate discussion.

### 7.3 Relation to stake

Bonded GULD may gate name deposits or future attestor roles. **CAS retention is not bonded on L1.** Tip election is **not** PoS; weights live at the **account cosign** layer and optional bonds, not as a replacement for header PoW.

---

## 8. Tokenomics and fees

The network has a **fixed transaction vocabulary**. There is no user-defined opcode meter and no general-purpose on-chain VM. Validation is: parse schema → check hashes/sigs/proofs → apply built-in delta. That matches a **Bitcoin-style fee market** better than Ethereum gas.

### 8.1 Native asset: GULD

| Use | Description |
|-----|-------------|
| **Transaction fees** | Weight-priced inclusion fees → **miners** |
| **Registration fees** | `F_user` / `F_group(n)` / `F_sub` → **block miner** (§8.7; anti-spam lottery) |
| **Name deposits** | Optional extra lock on top of registration |
| **Transfers / DeFi** | Settlements between named identities |
| **Miner rewards** | Block subsidy (PoW issuance) + inclusion fees + registration fees |

Hard fork from 1.0: import every positive `*:Assets` balance from `archives/ledger-guld` as genesis pre-mine **x**, then unlock per name via **key upgrade** (spec: [`../specs/15-ledger-import.md`](../specs/15-ledger-import.md); intent: [`../intents/ledger-migration.md`](../intents/ledger-migration.md)). See §8.6.

### 8.2 Why not an EVM-style gas ISA

| EVM gas | Guld network |
|---------|----------------|
| Meters arbitrary script steps | No custom functions on L1 |
| `gas_limit` / opcode schedule | Fixed tx kinds; cost ≈ size + sigs |
| Complex refunds / metering bugs | Simple weight policy |

Leaf runtimes may invent their own internal metering; the L1 never sees it.

### 8.3 Weight (virtual size)

Each tx has a **weight** in virtual bytes (vB), in the spirit of Bitcoin:

```
weight(tx) = size_bytes(tx)
           + W_sig × n_signatures
           + W_extra_account_write × max(0, n_writes - 1)
```

Registration also charges a separate **protocol fee** in GULD (`F_user` or `F_group(n)`), not only weight—see §3.3. Weight still grows with `n_signatures` so ongoing tips from large groups stay costly to include.

**Weight constants** (genesis / soft-fork adjustable):

| Term | Value | Rationale |
|------|-------|-----------|
| Serialized bytes | 1 weight unit / byte | Bandwidth + storage in block |
| `W_sig` | 64 vB per signature | Dominant verify cost |
| `W_extra_account_write` | 50 vB | Extra state leaves (e.g. transfer touches 2) |

**Registration protocol fees** (locked structure; see §8.7 and [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md)):

| Fee | Formula (per year) |
|-----|---------|
| `F_user(L)` | **1k / 100 / 10 / 5 / 2 / 1 GULD** for L = 1..5, **≥6** (see spec 07) |
| `F_sub` | **0.1 GULD** (fixed) |
| `F_group(n)` | **2 + n** GULD |

Signatures in the tx body already add `size_bytes`; `W_sig` is an **additional** CPU surcharge so large cosign sets remain expensive every tip—not only at registration.

**Examples**

| Tx | Approx size | Sigs | Writes | Weight | Protocol fee |
|----|-------------|------|--------|--------|--------------|
| `UpdateMaster` (1-of-1) | 200 B | 1 | 1 | ≈ **264 vB** | — |
| `UpdateMaster` (3-of-5) | 400 B | 3 | 1 | ≈ **592 vB** | — |
| `Transfer` | 150 B | 1 | 2 | ≈ **264 vB** | — |
| `RegisterUsername` | 250 B | 1 | 1 | ≈ **314 vB** | **`F_user`** |
| `RegisterGroup` (n=5) | 400 B | 5 | 1 | ≈ **720 vB** | **`F_group(5)`** |

### 8.4 Fee market (Bitcoin-style)

Users attach `fee` in GULD (or `fee_rate` × weight):

```
inclusion_fee ≥ fee_rate_min × weight(tx)     # policy / relay floor
inclusion_fee → miner who includes the tx

registration_protocol_fee F_*(n) → miner     # full fee to block proposer
```

- **Registration protocol fees** and **inclusion fees** both go to the miner (Bitcoin-like weight market for inclusion; lottery for `F_*`).  
- Mempool orders by **fee rate** (GULD / vB), same intuition as sat/vB.  
- Blocks have a **weight limit** (**4_000_000** weight units / block—BTC-order).  
- Miners maximize total revenue (inclusion + registration protocol fees) under the weight cap among valid txs.

Congestion ⇒ users raise `fee_rate`. No opcode schedule to maintain.

### 8.5 Block capacity (order of magnitude)

If average tip update ≈ 300 vB and block weight limit = 4 M:

| Effective blocks/sec | Tip updates/sec (order) |
|----------------------|-------------------------|
| 0.1 | ~1 300 |
| 1 | ~13 000 |
| (DAG parallel blocks) | higher; specify in client |

Sig-heavy tips consume more weight → self-limit. Target remains **L1-class**, not Visa.

### 8.6 Supply, pre-mine, and issuance

#### Pre-existing GULD as genesis pre-mine

**Snapshot source:** `archives/ledger-guld` — per-user ledger-cli journals (`*.dat`), concatenated in timestamp order into a single journal (also archived as `guld-ledger-all.dat` alongside a flat balance dump). Period covered: **2016-06-01 → 2018-12-09**.

**Amount precision:** the 1.0 journal uses at most **10 decimal places** in any `GULD` amount. Freeze: **10** decimals (1 GULD = 10¹⁰ quanta).

Let **x** = total GULD imported at genesis = sum of positive member `name:Assets` roots:

| Quantity | GULD (working) |
|----------|----------------|
| **x** = member circulating / claimable | **≈ 959,947.19527052** |

**Not imported:** `guld:Assets:ERC20` and other protocol-side ERC20 mirror buckets (barely used in 1.0; omitted from the pre-mine).

Notes from the same pass:

- **≈ 2,217** names with positive `Assets`; ~15 names with negative `Assets` summing to ≈ **−1,028** GULD (import as **0**; list in the genesis anomaly appendix).
- Top holders (share of **x**): mizim ≈ 37%, isysd ≈ 9%, cz ≈ 4%, raadyx ≈ 3%, tigoctm ≈ 3%, then betatown, zimmi, aehaynes, torvalds, minotaur (~1% each). Top 10 ≈ **63%** of **x**.

```
circulating_supply(0) = x ≈ 959_947.20 GULD   // claimable by 1.0 names; legacy-locked until key upgrade
```

#### Respect balances; unlock via key upgrade

**Invariant:** every positive 1.0 `Assets` balance is imported 1:1. No haircut, no silent consolidation, no reassignment of names.

Import creates **legacy-locked** accounts: balance is on-chain, but `Transfer`, tip spend, and ordinary `RotateKeys` are disabled until the owner completes a **key upgrade** (`ClaimLegacy` — [`../specs/15-ledger-import.md`](../specs/15-ledger-import.md)):

1. Prove control of the 1.0 identity: **PGP** if `keys-pgp` has a binding, else **`isysd` attestation** for unbound names/groups.
2. Record Ed25519 (or hybrid) keys + threshold; clear the legacy lock; start a normal 1y registration period.
3. Thereafter the account is a normal 2.0 individual with yearly settle; further rotations use `RotateKeys`. Claims stay open indefinitely for never-claimed locked names.

Unclaimed balances remain in the owner's name; they count toward **x** but do not move without a valid claim. From genesis forward, **new** GULD enters only via the **block subsidy**.

#### Block time

**Target block interval: 10 minutes** (600 s) — Bitcoin-class. Comfortable for identity tips and weight-priced inclusion; keeps header/PoW overhead modest.

```
TARGET_BLOCK_INTERVAL = 600        // seconds
BLOCKS_PER_YEAR       = 52_560     // 365 × 144
```

Retarget keeps mean interval near target (see [`../specs/06-blocks-and-consensus.md`](../specs/06-blocks-and-consensus.md)).

#### Inflation schedule

Annual inflation rate **i(y)** (fraction of supply at the start of year **y**, y = 1 at genesis) decays **geometrically** from **100%** in year 1 to **4%** in year 20, then stays at **4%** forever:

```
i(y) = 0.04 ** ((y - 1) / 19)     // y = 1..20   →  1.00 … 0.04
i(y) = 0.04                        // y >= 21
```

```
S(0) = x
annual_issuance(y) = S(y - 1) * i(y)
S(y) = S(y - 1) + annual_issuance(y)
subsidy(height) = annual_issuance(year(height)) / BLOCKS_PER_YEAR
```

`year(height) = floor((height - 1) / BLOCKS_PER_YEAR) + 1`. Within a year the per-block subsidy is **constant** (deterministic from genesis `x`). Consensus MUST embed the precomputed yearly per-block table (or an equivalent pure function of `height` and `x`).

**Why geometric ΔS/S:** a linear drop of the inflation *rate* while compounding would stay near 100% for many years and mint thousands× **x**. Geometric decay opens hot (year 1 doubles supply), reaches the 4% tail on schedule, and has **no reward cliff** at year 21.

##### Rewards schedule (from genesis **x**; gross subsidy)

The following charts use the genesis pre-mine **x** from the 1.0 ledger import (ERC20 omitted). Exact values are pinned by the genesis manifest.

| Year | Inflation i(y) | Annual issuance (GULD) | Subsidy / block (GULD) | Supply end (GULD) | Supply / x |
|------|----------------|------------------------|------------------------|-------------------|------------|
| 1 | 100.00% | 959,947.20 | 18.263836 | 1,919,894.39 | 2.000× |
| 2 | 84.42% | 1,620,695.96 | 30.835159 | 3,540,590.35 | 3.688× |
| 3 | 71.26% | 2,523,039.80 | 48.003040 | 6,063,630.15 | 6.317× |
| 4 | 60.16% | 3,647,584.27 | 69.398483 | 9,711,214.42 | 10.116× |
| 5 | 50.78% | 4,931,401.74 | 93.824234 | 14,642,616.16 | 15.254× |
| 6 | 42.87% | 6,276,820.78 | 119.422009 | 20,919,436.93 | 21.792× |
| 7 | 36.19% | 7,569,989.05 | 144.025667 | 28,489,425.99 | 29.678× |
| 8 | 30.55% | 8,702,683.10 | 165.576163 | 37,192,109.09 | 38.744× |
| 9 | 25.79% | 9,590,571.50 | 182.469016 | 46,782,680.59 | 48.735× |
| 10 | 21.77% | 10,183,638.95 | 193.752644 | 56,966,319.54 | 59.343× |
| 11 | 18.38% | 10,467,916.80 | 199.161279 | 67,434,236.34 | 70.248× |
| 12 | 15.51% | 10,460,362.97 | 199.017560 | 77,894,599.31 | 81.145× |
| 13 | 13.09% | 10,199,945.90 | 194.062898 | 88,094,545.21 | 91.770× |
| 14 | 11.05% | 9,737,864.98 | 185.271404 | 97,832,410.19 | 101.914× |
| 15 | 9.33% | 9,128,968.19 | 173.686609 | 106,961,378.39 | 111.424× |
| 16 | 7.88% | 8,425,392.50 | 160.300466 | 115,386,770.89 | 120.201× |
| 17 | 6.65% | 7,672,614.55 | 145.978207 | 123,059,385.44 | 128.194× |
| 18 | 5.61% | 6,907,586.20 | 131.422873 | 129,966,971.64 | 135.390× |
| 19 | 4.74% | 6,158,412.58 | 117.169189 | 136,125,384.21 | 141.805× |
| 20 | 4.00% | 5,445,015.37 | 103.596183 | 141,570,399.58 | 147.477× |
| 21+ | 4.00% | 0.04 · S(y−1) | recomputed each year | +4%/yr | — |

Peak **per-block** subsidy is around years **11–12** (~199 GULD/block) as `S·i(y)` maximizes; thereafter block rewards decline toward the 4% tail even while supply rises.

##### Supply and inflation graphs

```mermaid
xychart-beta
    title Inflation rate i(y) — 100% to 4% over 20 years
    x-axis [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    y-axis "i(y) %" 0 --> 100
    line [100, 84.4, 71.3, 60.2, 50.8, 42.9, 36.2, 30.6, 25.8, 21.8, 18.4, 15.5, 13.1, 11.1, 9.3, 7.9, 6.7, 5.6, 4.7, 4.0]
```

```mermaid
xychart-beta
    title Circulating supply / x (gross subsidy; burns omitted)
    x-axis [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    y-axis "S/x" 0 --> 150
    line [2.0, 3.7, 6.3, 10.1, 15.3, 21.8, 29.7, 38.7, 48.7, 59.3, 70.2, 81.1, 91.8, 101.9, 111.4, 120.2, 128.2, 135.4, 141.8, 147.5]
```

```mermaid
xychart-beta
    title Block subsidy (GULD per 10-minute block)
    x-axis [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
    y-axis "GULD/block" 0 --> 200
    line [18.3, 30.8, 48.0, 69.4, 93.8, 119.4, 144.0, 165.6, 182.5, 193.8, 199.2, 199.0, 194.1, 185.3, 173.7, 160.3, 146.0, 131.4, 117.2, 103.6]
```

Subsidy is paid in the **coinbase** to the miner. **Inclusion fees** and **registration protocol fees** add to miner revenue in the same coinbase. Fee schedule: §8.7.

#### Why not zero long-run inflation?

New humans and new named identities continually join. Registration fees fund miners alongside issuance; perpetual **4%** tail funds security and leaves room for newcomers.

| Flow | Direction | Rationale |
|------|-----------|-----------|
| 1.0 `*:Assets` → genesis | Pre-mine **x** (locked until key upgrade) | Continuity; respect every balance |
| Key upgrade (`ClaimLegacy`) | Unlock spend/tip under new keys | Port 1.0 → 2.0 without moving coins |
| Block subsidy | Mint → miner | PoW security + distribution |
| Inclusion (weight) fee | User → miner | Pay for block space |
| Registration `F_*` | User → **miner** | Anti-spam + miner lottery |
| Name deposit | Lock / unlock | Optional squat policy |

**Invariant:** no hidden inflation beyond the issuance schedule; **x** and the per-name import manifest are disclosed at genesis; registration fees are consensus-enforced and paid to miners; no imported balance spends until key upgrade.

### 8.7 Registration fees (miner lottery)

Registration charges a **protocol fee** separate from the weight-priced inclusion fee. The full `F_*` amount is credited to the **block miner** in the coinbase—whoever includes the registration tx wins it. No burn, no split across future blocks.

#### 8.7.1 What charges `F_*`

| Source | Amount | When |
|--------|--------|------|
| `RegisterUsername` | **1 GULD**/yr (`F_user`) | Each new individual name |
| `RegisterGroup` | **2 + n** GULD/yr (`F_group`) | Each new group (`n` = initial keys) |
| `RegisterSubaccount` | **0.1 GULD**/yr (`F_sub`) | Each new `parent.label` (max 8 live per individual) |
| `SettleRegistration` | `F_*` (renew) or leftover dust (release) | Yearly pay-or-release |

`ClaimLegacy`, transfers, and tip updates **do not** charge registration protocol fees (only weight-priced inclusion to miner). Keep balances ≥ `F_*` before expiry or the name is released.

#### 8.7.2 Fee formula (fixed, per year)

```
F_user       = 1 GULD / year
F_sub        = 0.1 GULD / year
F_group(n)   = 2 + n GULD / year
REGISTRATION_PERIOD = BLOCKS_PER_YEAR   # 52_560
```

Examples: 1-of-1 group = **3 GULD**/yr; 5-key group = **7 GULD**/yr. Issuance (§8.6) is independent of these fixed fees.

#### 8.7.3 Miner revenue from registrations

Per block:

```
coinbase(h) = subsidy(h) + Σ inclusion_fee(tx) + Σ F_*(tx)
```

Registration fees are **transfers** from payer to miner (via coinbase accounting), not minted or burned. Heavy registration activity directly increases miner revenue in that block.

#### 8.7.4 Game theory

| Threat | Mechanism |
|--------|-----------|
| Squat millions of names | Fixed **1 GULD** / **2+n** pain; live-cap on subaccounts |
| Device-wallet spam | **0.1 GULD** per sub + max **8** live |
| Miners ignore registrations | Full `F_*` to proposer incentivizes inclusion |
| Groups cheap vs proof cost | `F_group = 2 + n` GULD |

Normative detail: [`../specs/07-fees-and-tokenomics.md`](../specs/07-fees-and-tokenomics.md) §3.

### 8.8 Content retention (leaf, not L1)

**Locked:** there is **no** network-level `PinClaim` / bonded pin / slash-for-missing-data market in consensus.

- **All accounts (including `guld`):** the chain stores the tip (`master_hash`) only. Bytes live in CAS / remotes / leaf hosts when someone chooses to fetch them. **Tip ≠ data availability.** Rule params under `guld` are small; protocol **source code** is not an L1 retention obligation.
- **Who keeps bytes:** self-host, forge mirrors, BitTorrent-class sharing, or **private leaf contracts** (cosign, escrow `Transfer`s, group policy). Parties who care arrange retention off the consensus path.
- **Why not L1 pins:** slash-for-missing-data needs a hard DA protocol; it bloats fixed-tx surface and fights leaf sovereignty. Optional storage markets MAY appear later as **apps/leaves**, not as required L1 txs.

---
## 9. Scalability analysis

### 9.1 State growth (keys + hashes)

Validators store per account roughly: 1 key (32 B) + ~10 SHA-256 fields (320 B) + meta, with LSM/SMT overhead (~2.5–4×).

| Accounts | Cold state (≈ mid overhead) |
|----------|-----------------------------|
| 10 M | ~10 GiB |
| 100 M | ~100 GiB |
| 1 B | ~1 TiB |

Retaining **10 historical tips for recently active** accounts only adds marginally. This is realistic for global identity **because file bytes are not in the consensus DB**.

### 9.2 Bandwidth and CPU

- Bottleneck: **signature verification** ∝ signatures per tip, not SHA-256.  
- 1 000 single-sig tip updates/s ≈ order **0.1** core-s/s at ~100 µs/verify (parallelizable).  
- Large thresholds (e.g. 100-of-150) raise **weight and CPU** linearly—**priced in**, self-limiting.

### 9.3 Execution parallelism

Conflict graph = accounts touched. Alice’s `UpdateMaster` ∥ Bob’s `UpdateMaster`. Contended names/accounts serialize. This matches Solana-style account parallelism without adopting the SVM.

### 9.4 Data availability

Scalability of **content** is orthogonal: tips scale with accounts; blobs scale with **leaf hosting and mirrors**. Full nodes fetch CAS bytes only when a client/leaf-host chooses—no mandatory clone of any account home, including **`guld`**. Light clients verify state proofs against headers. **No L1 pin market.**

### 9.5 Comparison

| Approach | Validator state | Per-tx work |
|----------|-----------------|-------------|
| General L1 VM re-executing group logic | Large + unbounded | High, variable |
| Guld witness L1 (fixed txs) | Keys + tips + balances | Schema + proof verify + writes |
| Git mega-repo consensus | Explodes with history | Merge/social metadata |

**Conclusion:** identity-scale state is feasible; throughput is gated by **block weight**, **proof size**, and **PoW/DAG rate**—Bitcoin-class levers—not by leaf language choice.

---

## 10. Game theory analysis

### 10.1 Players

| Player | Action | Payoff drivers |
|--------|--------|----------------|
| Users / groups | Register, tip, transfer, cosign | Utility of settlement + reputation of name |
| Cosigners | Sign or withhold | Shared control vs liability of cowitness |
| Miners | Which valid txs to include; PoW | Rewards − energy − orphan risk |
| Leaf hosts | Retain or drop bytes | Leaf contracts / reputation / fees (off L1) |
| Attackers | Spam, squat, forge, reorg | Theft / griefing vs cost |

### 10.2 Leaf cosign as a game

- **Threshold policy** is on-chain; internal preference aggregation is off-chain.  
- Rational cosigners sign when the leaf process they accept says so; the chain cannot force “honest politics,” only **attributable authorization**.  
- **Griefing:** a minority below threshold cannot advance the tip; a malicious majority *of keys* can—same as any multisig. Mitigations: key rotation, role separation (tip vs spend), social recovery schemes as leaf policy compiling to `RotateKeys`.  
- **Cowitness liability:** cryptographic responsibility is clear; expanding legal meaning is out of protocol scope but supported by auditable signed messages.

### 10.3 Fee market

- Under congestion, users raise **inclusion fee rate** (GULD/vB); low-fee tips wait.  
- Miners maximize **inclusion + registration protocol** fees under the weight limit (Bitcoin-like).  
- **Registration lottery** (§8.7): full `F_*` to the block proposer incentivizes including registrations without spam side-payments.  
- High early **subsidy** pulls hashpower and redistributes away from pure pre-mine dominance; long-run **4%** keeps a security budget as identity demand grows.

### 10.4 PoW security

- Cost of rewrite ≈ energy × depth; same family as Bitcoin.  
- DAG-PoW changes throughput and topology, not the “work is scarce” principle.  
- **Nothing-at-stake** is primarily a PoS issue; pure PoW proposers still risk orphaned work (wasted energy).

### 10.5 Username scarcity and registration cost

- Free names ⇒ squatters and spam identities. **`F_user` / `F_group(n)` / `F_sub`** (§8.7) make bulk registration painful: **1 GULD**/yr per individual, **2+n**/yr per group, **0.1 GULD**/yr per subaccount (max 8), with miner `SettleRegistration` pay-or-release.  
- No resale market: lose the keys and the name is eventually released when settle finds an empty wallet.  
- Scaling `F_group` with signer count prices the **proof burden** groups impose on every full node.  
- Impersonation remains a social problem; cryptographic binding is name→keys on-chain. Apps may add secondary attestations (leaf or indexer)—not consensus-critical.

### 10.6 Validator laziness (Verifier’s Dilemma)

- Verification is **cheap and fixed-shape** (schema + sigs + hash checks), so skipping verify is less tempting than for heavy smart-contract re-exec—but still possible.  
- Invalid blocks are rejected by honest majority hashpower; light clients use state proofs against headers.  
- Keep proofs small and weight-priced so honest full nodes stay common.

### 10.7 Content availability (leaf)

- L1 does **not** bond or slash for CAS retention.  
- Tips can outlive missing blobs—**users who care self-host, mirror, or contract in a leaf**.  
- Altruistic / forge / BitTorrent-class availability is acceptable for public content; private groups use leaf terms.

### 10.8 Incentive compatibility summary

| Desired behavior | Mechanism |
|------------------|-----------|
| Keep protocol rules available | Node software + `guld_rules_hash` in headers (source repos off-chain) |
| Don’t spam tips | Weight-priced inclusion fees |
| Don’t spam identities | `F_user` / `F_group(n)` / `F_sub` to miner (§8.7) |
| Don’t forge tips | Unforgeable sigs under registered keys |
| Provide security | PoW subsidy + inclusion + registration fees |
| Dilute pre-mine fairly | Geometric inflation 100% → 4% over 20 years, then 4% |
| Keep important bytes | Self-host / forge mirrors / **leaf** retention contracts |
| Don’t underpay large multisig | `W_sig × n` ongoing + higher group registration |
| Own your governance | Leaf process; chain only checks proofs |

---

## 11. Security notes

- **Cryptography:** SHA-256 commitments; AES-256 confidential leaves; Ed25519 (or hybrid PQ) account sigs.  
- **Quantum:** signature migration plan required; PoW hash enlargement optional.  
- **Privacy:** names are public; tree contents may be encrypted; tip timing can leak graph metadata.  
- **Upgrades:** new proof kinds and weight policy via soft/hard fork—not silent leaf reinterpretation.

---

## 12. Roadmap

1. Freeze account schema + `threshold_cosign_v1` + weight fee policy + **10 decimals**  
2. Rust validator MVP: state DB, fixed txs, headers, single-lane PoW — **in progress**  
3. Pin genesis import manifest from `ledger-guld`; ship `ClaimLegacy` key upgrade — **partial**  
4. **Node HTTP API** + static reference wallet (**repo root**) — **read path shipped**; register/send next  
5. Sponsored registration UX (friend + optional paid desk on bootstrap host)  
6. Leaf SDKs + leaf host in full node; optional git remotes  
7. P2P mesh (spec 09); indexers; leaf-host retention tooling  
8. DAG-PoW / parallelism; PQ migration  

---

## 13. Conclusion

Guld 2.0 is an **L0** where **identity is the product** and **leaves are unlimited**: a PoW-anchored namespace for people, groups, **and other blockchains**, with **dapps that can literally do anything**—including guldex-style proofs over foreign tips and lightning-/personal-chain settlement by hash—while the network remains a **witness**, not a VM that re-executes their politics. DeFi settles between names under a **Bitcoin-style weight fee** market. Legacy supply **x ≈ 9.6×10⁵ GULD** is a disclosed pre-mine from the 1.0 ledger (ERC20 bucket omitted), unlocked per user by **key upgrade**; PoW issuance follows a **100% → 4% over 20 years** schedule at **10-minute** blocks; **registration fees** (§8.7: letter-based / group / sub) go to the block miner. Scalability follows from keeping validators on keys and hashes; content retention and app logic stay in **leaves**; incentives follow from attributable cosign, fee-rate bidding, registration lottery, and PoW security.

Users join via **sponsored registration**; any funded peer can onboard the next — free (friend) or paid (third-party gateway). The everyday path is whitepaper **§1.4**: PWA wallet on device → extension → many dapps, one name.

Invariants: **name-addressable accounts**, **hash-referenced tips**, **foreign chains as names**, **leaf-sovereign process (unbounded dapps)**, **lean witness nodes**, **fixed tx vocabulary**, **priced inclusion**, **respected 1.0 balances**, and **tip ≠ DA** (CAS retention off the witness hub except mandatory `guld` rule bytes when fetched).
