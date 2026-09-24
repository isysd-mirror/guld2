# Components

See [`REPO_LAYOUT.md`](REPO_LAYOUT.md). This repo root is also the static website, served by **`guld-node --http-static`**. Each `src/guld-*` package is a **submodule** whose bare remote is `repos/<name>.git` at `<http-origin>/repos/<name>.git` ([`HOSTING.md`](HOSTING.md)).

## Umbrella (`repos/guld.git`)

The **whole project** — static site, docs, Cargo workspace, submodule pins. Clone this first:

```bash
git clone https://guld.io/repos/guld.git
cd guld && git submodule update --init --recursive
```

Bare on disk: `repos/guld.git` (gitignored; materialize with `--repos sync`) · working tree: repo root · branch: `guld`.

Submodule URLs in `.gitmodules` point at **`https://guld.io/repos/<name>.git`**. Pinned bare HEADs: `data/software-repos.json`.

## Site (umbrella working tree)

| Path | Role |
|------|------|
| `index.html`, `wallet/`, `explorer/`, … | Static PWA routes |
| `software/` | Package catalog + source browser — [`intents/software-browser.md`](intents/software-browser.md) |
| `data/software.json` | Catalog metadata merged with live `/api/v1/repos` |
| `src/css`, `src/js` | Framework-less site assets |
| `docs/` | Specs / whitepaper markdown (fetched as `/docs/…`) |
| `repos/*.git` | Bare remotes (on disk; gitignored; HTTP clone) |
| `test/` | JS tests |

## Packages (`src/guld-*` ↔ `repos/*.git`)

| Component | Working tree | Bare / clone | Language | Role |
|-----------|--------------|--------------|----------|------|
| guld-types | `src/guld-types/` | `repos/guld-types.git` | Rust | Names, hashes, amounts |
| guld-crypto | `src/guld-crypto/` | `repos/guld-crypto.git` | Rust | SHA-256, Ed25519, threshold cosign |
| guld-state | `src/guld-state/` | `repos/guld-state.git` | Rust | Apply, SMT, economy |
| guld-consensus | `src/guld-consensus/` | `repos/guld-consensus.git` | Rust | Blocks, PoW, mempool |
| guld-cas | `src/guld-cas/` | `repos/guld-cas.git` | Rust | Content-addressed object store |
| guld-legacy | `src/guld-legacy/` | `repos/guld-legacy.git` | Rust | 1.0 import, PGP claim |
| guld-p2p | `src/guld-p2p/` | `repos/guld-p2p.git` | Rust | Libp2p mesh (Hello + tx gossip) |
| guld-node | `src/guld-node/` | `repos/guld-node.git` | Rust | Full node + HTTP API + JSON-RPC |
| guld-client | `src/guld-client/` | `repos/guld-client.git` | Rust | Wallet library |
| guld-wallet | `src/guld-wallet/` | `repos/guld-wallet.git` | Rust | Dioxus desktop wallet |
| guld-extension | `src/guld-extension/` | `repos/guld-extension.git` | JS | Browser provider — **not protocol** |
| guld-js | `src/guld-js/` | `repos/guld-js.git` | JS | Later |
| guld-api | `src/guld-api/` | `repos/guld-api.git` | Python | **Deprecated** — use `guld-node --http` |

Clone example:

```bash
git clone http://127.0.0.1:8080/repos/guld-types.git
# or, against a public peer / guld.io mirror:
# git clone https://guld.io/repos/guld-types.git
```

Rust workspace root: `Cargo.toml` (members are the submodule paths). Specs: [`specs/README.md`](specs/README.md).

## Schema SoT (meta-FS)

JSON Schema in `src/guld-python/schemas/` when that package returns. Python validates with `jsonschema`; JS will use Ajv.
