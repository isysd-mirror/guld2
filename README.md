# Guld

**Guld 2.0** — identity-focused **L0** witness substrate: names, PoW anchoring, unbounded leaf dapps, and a static reference wallet.

This repository **is** the open-source project **and** the static website (framework-less JS, same stack as iramillercom/`public`). The **guld.io** domain is a bootstrap mirror of this tree — not a GitHub host, not a consensus hub.

Design SoT: [`docs/whitepaper/guld-2.0-draft.md`](docs/whitepaper/guld-2.0-draft.md) · [`docs/specs/`](docs/specs/README.md) · [`docs/REPO_LAYOUT.md`](docs/REPO_LAYOUT.md)

## Layout

| Path | Role |
|------|------|
| `/` (`index.html`, `wallet/`, …) | Static PWA — wallet, explorer, docs UI |
| `software/` | (next) package catalog / clone UI |
| `src/css`, `src/js` | Site assets (umbrella) |
| `src/guld-*` | Package **submodules** (node, client, wallet, …) |
| `repos/*.git` | Bare remotes — clone via `https://guld.io/repos/<name>.git` |
| `docs/` | Specs, whitepaper, intents (markdown SoT; site fetches these paths) |
| `deploy/` | Operator nginx / bind-mount / publish |
| `test/` | JS site tests (`node --test`) |

Full map: [`docs/REPO_LAYOUT.md`](docs/REPO_LAYOUT.md) · serving git: [`docs/HOSTING.md`](docs/HOSTING.md).

## Develop

```bash
# Protocol tests
cargo test

# Node HTTP API + this tree as static site
# → http://127.0.0.1:8080/wallet/
# Do not expose archives/, target/, .guld-data/ in production publishes.
# Do publish repos/*.git (dumb HTTP clone at /repos/<name>.git).
cargo run -p guld-node -- \
  --datadir ./.guld-data \
  --rpc 127.0.0.1:8545 \
  --http 127.0.0.1:8080 \
  --http-static . \
  --dev \
  --keys-pgp archives/keys-pgp \
  --import-ledger archives/ledger-guld/ledger-guld/guld-ledger-all.dat \
  --miner isysd

# Desktop wallet (optional)
cargo run -p guld-wallet

# Site JS tests (optional)
node --test test/*.test.js

# Clone a package (once the site is serving repos/)
# git clone https://guld.io/repos/guld-types.git
# git clone http://127.0.0.1:8080/repos/guld-types.git
```

Legacy accounts JSON for the explorer:

```bash
cargo run -p guld-legacy --bin guld-legacy-export -- \
  --ledger archives/ledger-guld/ledger-guld/guld-ledger-all.dat \
  --keys-pgp archives/keys-pgp \
  --out data/legacy-accounts.json
```

**Extension:** [`src/guld-extension/`](src/guld-extension/) (optional ecosystem).

## Host model

- **Canonical server:** `guld-node --http` + `--http-static .` (site, API, `/repos/`) — [`docs/HOSTING.md`](docs/HOSTING.md)
- **Software remotes:** `repos/*.git` served by that node
- **Content / meta-FS homes:** `/srv/guld` ([`docs/HOSTING.md`](docs/HOSTING.md) §2)
- **guld.io only:** optional nginx reverse proxy (TLS/extras) — [`deploy/`](deploy/)
