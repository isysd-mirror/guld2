# Guld 2.0 — upgrade drivers (from 1.0)

Guld 2.0 is a **hard fork** of Guld 1.0 software and ledger. These notes capture why 2.0 exists and what it changes, without re-importing 1.0 FS or OS-integration designs. **1.0 coins still work on 1.0** — see [FAQ.md](FAQ.md).

## 0. Guld 1.0 consensus (context)

Guld 1.0 was **identity- and contribution-weighted proof of stake**: registered names, ledger-cli accounting, git-backed leaves, and staker-weighted agreement over tips. Ultimately **consensus among stakers broke down** and **trust in the network diminished**. Guld 2.0 keeps the identity-first shape but moves **header consensus** to open **PoW** — the most stable, conservative, widely understood model — so new users and operators can trust tip finality without relying on a degraded stake quorum.

Historical ledger dump: [`archives/ledger-guld/`](../archives/ledger-guld/) (per-user dirs of signed `*.dat` + `*.dat.asc`, ledger-cli journal format). Import rules and working totals (**x ≈ 9.60×10⁵ GULD**, ERC20 omitted, 10 decimals, key-upgrade unlock; inflation `(2/3)^(y−1)` floored at 4% @ 10-min blocks): [`specs/15-ledger-import.md`](specs/15-ledger-import.md), [`specs/07-fees-and-tokenomics.md`](specs/07-fees-and-tokenomics.md), whitepaper §8.6.

## 1. Ledger format and handler

**1.0 problem:** Accounting lived in **ledger-cli** journals. Validation and tooling were tied to that stack.

**2.0 direction (research — not locked):** Prefer a **custom ledger**, not an external chain as required substrate.

### Why not (yet) Ethereum / Solana / similar

- Nodes should not be forced to pay **network fees** to validate or advance guld state
- Mapping guld transaction / grant / balance **rules** onto foreign VMs is a poor fit when native support is missing
- External chains optimize for their own consensus and fee markets, not for “git + identity + meta-FS companions”

External tokens may still be useful later as **bridges or optional settlement**, not as the required ledger substrate for every full node.

### Active sketch: lean modern L0 + optional git leaves

| Surface | Role |
|---------|------|
| **Chain state (KV + authenticated tree)** | Usernames, key sets, **master hashes**, balances, gas, headers |
| **Object CAS** | Personal hash trees (may contain git; nodes do not care) |
| **Git + PGP** | Select leaves / today’s meta-FS packages — **not** global consensus bus |
| **Postgres (or similar)** | User or app-server **indexer** only — not required to produce blocks |

Goals:

- Lean validators (no multi-identity / email archaeology per block)
- First-class **cosign** + **gas-metered** rules VM
- Preserve **historical balances** 1:1 via import from `ledger-guld`; unlock spend with **key upgrade** (`ClaimLegacy`)
- BTC/ETH/SOL-class security bar; differentiate on signed personal trees and foreign-chain witness

SoT research: [`research/modern-l1-direction.md`](research/modern-l1-direction.md). GIP: [`gips/gip-14.md`](gips/gip-14.md).

### Explicitly rejected from 1.0-era design paths (for 2.0)

- Stuffing a whole blockchain **into git** (impractical size/history)
- Low-level OS integration as the primary path (**FUSE**, deep SSH gating, etc.): too complex and too slow for operators
- “Mount the ledger” as UX
- Solving network cosign / identity sprawl **inside** git + PGP (legacy bloat)

Earlier Postgres-journal + weighted git-vote sketches remain as foils: [`research/postgres-blockchain.md`](research/postgres-blockchain.md), [`research/block-window-consensus.md`](research/block-window-consensus.md).

## 2. Filesystem structure and implementation

**1.0 problem:** FS layout and implementation were too complex; hard to reason about and run.

**2.0 direction:** Continue the **current** `.guld/` + JSON Schema + identity refs + hooks work. Do **not** revive old guldfs trees as the product model. Archives are history, not design SoT.

## 3. UX and full nodes

**1.0 problem:** Too hard to use (copy/paste-heavy). Almost nobody ran a full node because **node validation was not automated enough**. Capability existed; operational friction killed it.

**2.0 missing key:** Make **running a full `guld` node** the default easy path:

- Automated validation (hooks + policy as code; Postgres companions for query/ledger research)
- Install/update as a packaged service (`guld` CLI + `/srv/guld` + systemd)
- AI-assisted ops **behind strict tools** (not free-form agent writes): commit messages, permitted merges, metadata with confirm-before-write
- Signature and ACL gates remain authoritative; AI drafts, humans/keys approve

## Sequencing (suggested)

1. Ship usable meta-FS node (CLI + hooks + API + metadata Postgres mirror) — in progress  
2. **Research** custom ledger + Postgres hash-tree companion; snapshot rules/balances from `ledger-guld`  
3. AI assist extras on top of strict hooks (`guld commit-msg`, merge helpers)
