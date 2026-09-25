# One peer, whole stack

Most blockchains ship a consensus client and hope the rest of the ecosystem appears: someone builds an explorer, someone else a wallet, docs live on a forge, and source clones come from yet another host. That split works at scale. It also means a “node” is only one slice of what users actually need.

Guld takes the opposite packaging bet.

## The loop

Clone the tree. Run `guld-node`. That process is:

- the chain API,
- the static site (landing, wallet, explorer, docs),
- and the software remotes under `/repos/`.

`guld.io` is a bootstrap mirror of the same tree — not a consensus hub, not the only forge. Any peer with `--http-static` can serve the same surface. Prefer your own node’s API when you can; the domain is convenience, not authority.

That is the product loop: **get the software from a peer → run the peer → serve the software again.**

## Why that is unusual

Typical L1 stacks look like this:

| Concern | Usual home |
|---------|------------|
| Consensus binary | Project repo / releases |
| Block explorer | Separate product (often SaaS) |
| Wallet | Separate app / extension |
| Docs | GitBook, Docusaurus, or a forge wiki |
| Source clones | GitHub / GitLab as canonical |

Guld collapses distribution into one deployable artifact. The reference explorer and wallet are not orphan clients chasing RPC quirks; they are first-class consumers of the same HTTP surface the protocol already defines. Package clones (`guld.git`, `guld-types.git`, …) share origin with the wallet you open in the browser.

Plenty of projects ship a “suite.” Almost none make **source hosting, site, explorer, and wallet** the same thing as the node.

## It matches the L0 shape

The packaging is not a marketing stunt on top of a generic chain. It mirrors the architecture.

Validators stay lean: names, proofs, balances, PoW headers, and a small CAS obligation for the `guld` rule bundle. Unbounded leaf work — personal homes, group politics, dapp runtimes — stays **off** the consensus path. The full node is the witness; the rich edge (UI, git remotes, optional leaf host) rides with it without becoming consensus.

So the “all in one package” story and the “L0 witness substrate” story are the same idea at two layers: keep the middle thin, put the product where operators and users already are.

## What you get day one

From one checkout and one binary:

1. **Install** — `cargo run -p guld-node -- … --http-static .`
2. **Use** — open `/wallet/`, browse `/explorer/`, read `/docs/`
3. **Distribute** — `git clone https://<that-peer>/repos/guld.git`

No waiting for a third party to stand up an explorer before the network is usable. No requirement that GitHub remain the canonical mirror.

## What this is not

- **Not** “guld.io is the chain.” Domains bootstrap; peers validate.
- **Not** a claim that every leaf dapp ships in-tree. Leaves are unbounded by design; the reference UI covers L0 journeys.
- **Not** a substitute for optional indexers or third-party wallets. Those MAY exist. The point is that the open-source peer is already complete enough to run, browse, and redistribute without them.

## Where to go next

| Want | Start here |
|------|------------|
| Run a peer | [Hosting](../HOSTING.md), [README](/README.md) |
| Layout of the tree | [Repo layout](../REPO_LAYOUT.md), [Packages](../PACKAGES.md) |
| Protocol planes | [Spec 00 — overview](../specs/00-overview.md) |
| UI map | [Spec 14 — reference UI](../specs/14-reference-ui.md) |
| Design draft | [Whitepaper](../whitepaper/guld-2.0-draft.md) |

The neat packaging is a feature. The protocol is why it fits.
