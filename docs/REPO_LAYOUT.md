# Repository layout

**Status:** submodules + in-tree bares seeded (2026-09-24)  
**Vision:** `~/Projects/guld` **is** the open-source project **and** the static website root. The **guld.io** domain is a bootstrap mirror of this tree — not a forge hub, not consensus. Bare remotes under `repos/` make the tree self-replicating over HTTP.

## Roles (three layers)

| Layer | Where | Role |
|-------|--------|------|
| **Umbrella / site** | Repo root (`index.html`, `wallet/`, `docs/`, …) | Static PWA + operator docs; Cargo workspace root; pins submodules |
| **Working trees** | `src/guld-*` | Editable checkouts (git **submodules**); day-to-day `cargo` / poetry / extension work |
| **Bare remotes** | `repos/<name>.git` | Canonical push/fetch targets; **served** from the same web root as the site |

Site CSS/JS (`src/css`, `src/js`) stay in the **umbrella** tree — not submodules.

## Top level (static web root = repo root)

```
guld/                          # ← guld-node --http-static .  (canonical server)
├── index.html                 # landing
├── wallet/ explorer/ whitepaper/ specs/
├── software/                  # (next) human UI: browse / document / deep-link clones
├── src/
│   ├── css/  js/              # site assets (umbrella)
│   └── guld-*/                # submodules → matching repos/*.git
├── repos/                     # bare remotes (gitignored; on disk for --http-static)
│   ├── guld-types.git/
│   ├── guld-node.git/
│   └── …
├── docs/                      # markdown SoT (site fetches /docs/…)
├── vendor/ assets/ data/
├── test/                      # JS site tests
├── deploy/                    # optional guld.io nginx (TLS proxy) + operator kit
├── scripts/
├── archives/                  # gitignored — node MUST NOT serve publicly
├── .gitmodules
├── Cargo.toml                 # Rust workspace (members = src/guld-* crates)
├── package.json               # site tests only
└── .gitignore                 # includes repos/, archives/, target/, .guld-data/
```

## Packages ↔ bares ↔ clone URLs

Each `src/guld-*` directory is a submodule. Its **`origin`** is the bare on disk; the **public** clone URL is the same path under the site origin.

| Working tree | Bare (on disk) | Public clone (target) |
|--------------|----------------|------------------------|
| `src/guld-types` | `repos/guld-types.git` | `https://guld.io/repos/guld-types.git` |
| `src/guld-crypto` | `repos/guld-crypto.git` | `https://guld.io/repos/guld-crypto.git` |
| `src/guld-state` | `repos/guld-state.git` | `https://guld.io/repos/guld-state.git` |
| `src/guld-consensus` | `repos/guld-consensus.git` | `https://guld.io/repos/guld-consensus.git` |
| `src/guld-cas` | `repos/guld-cas.git` | `https://guld.io/repos/guld-cas.git` |
| `src/guld-legacy` | `repos/guld-legacy.git` | `https://guld.io/repos/guld-legacy.git` |
| `src/guld-node` | `repos/guld-node.git` | `https://guld.io/repos/guld-node.git` |
| `src/guld-client` | `repos/guld-client.git` | `https://guld.io/repos/guld-client.git` |
| `src/guld-wallet` | `repos/guld-wallet.git` | `https://guld.io/repos/guld-wallet.git` |
| `src/guld-extension` | `repos/guld-extension.git` | `https://guld.io/repos/guld-extension.git` |
| `src/guld-js` | `repos/guld-js.git` | `https://guld.io/repos/guld-js.git` |
| `src/guld-api` | `repos/guld-api.git` | `https://guld.io/repos/guld-api.git` |

Bootstrap (this machine): `.gitmodules` and each checkout’s `origin` still use absolute paths  
`/home/isysd/Projects/guld/repos/<name>.git`. Switch to same-origin HTTPS  
(`https://guld.io/repos/<name>.git` or `http://127.0.0.1:8080/repos/…`) once the node is the published HTTP front.

The **umbrella** itself may later live at `repos/guld.git` (or stay a working-tree-only publish). Package remotes do not require a bare for the umbrella.

## How git is served (from where)

```text
End user / any peer                         guld.io (optional)
──────────────────                         ──────────────────
guld-node --http --http-static .           nginx (TLS, extras)
  /api/v1/…                                  │
  /wallet/ …  /software/ …                   └── proxy_pass → same guld-node
  /repos/<name>.git/…   ← dumb HTTP (v1)
         ▲
         │ origin push/fetch (file:// or https)
  repos/<name>.git on disk
```

1. **Source of truth** — bare at `<static-root>/repos/<name>.git`.
2. **Who serves it** — **`guld-node`** with `--http-static` pointing at the repo root. Every peer can host the same tree; guld.io is one mirror.
3. **nginx** — only on guld.io (or similar), as a **reverse proxy** for TLS and operator extras. **No product logic in nginx** (not SPA rules for git, not smart HTTP, not API shaping). See [`HOSTING.md`](HOSTING.md).
4. **Protocol (v1)** — dumb HTTP file serve of the bare (`HEAD`, `objects/`, `info/refs`, packs) + `update-server-info` / `hooks/post-update`.
5. **Protocol (later)** — smart HTTP **inside guld-node**; URLs stay `/repos/<name>.git`.
6. **Not** iramillercom `igithost` / `/srv/git`.
7. **Not** user content homes (`/srv/guld/…`).

### Node static rules (required — implement in `guld-node`)

- Serve the `--http-static` tree, including `repos/`
- Missing `/repos/…` (and other missing files) → **404**, never `index.html`
- Do not expose `archives/`, `.guld-data/`, `target/`, secrets under the static root

`repos/` is **gitignored** in the umbrella: the node’s static root is a working tree (or publish checkout) that still contains those bares on disk.

## Submodule workflow (maintainers)

```bash
# Edit inside the package (existing tree — never “replace with a fresh clone” to change remotes)
cd src/guld-types
# … edit …
git add -A && git commit -m "…"
git push origin HEAD          # → repos/guld-types.git
git -C ../../repos/guld-types.git update-server-info   # if hook missing

# Pin the umbrella
cd ../..
git add src/guld-types       # records new gitlink SHA
git commit -m "…"
```

Seeding a new package: init **in place** under `src/<name>`, `git remote add origin $PWD/../../repos/<name>.git` (or the https URL), push, add `.gitmodules` entry + gitlink. Do not delete the working tree to attach a remote.

## Software UI (`/software/`) — next

Human-facing components (framework-less JS, same stack as the rest of the site) will:

- **List** packages from `.gitmodules` / a small manifest
- **Document** each repo (README, clone URL, role from [`PACKAGES.md`](PACKAGES.md))
- **Display** tree / history (read via dumb HTTP or a thin helper)
- **Serve** deep links to `https://guld.io/repos/<name>.git`

Intent: [`intents/software-browser.md`](intents/software-browser.md).

## Serving the rest of the site

- **Canonical:** `guld-node --http … --http-static .` (API + static + `/repos/`)
- **guld.io only:** nginx reverse-proxies to that node (TLS / extras) — [`HOSTING.md`](HOSTING.md)
- Docs: no mirror — `/whitepaper/` and `/specs/` fetch `/docs/…`

## Related

- [`HOSTING.md`](HOSTING.md) — software remotes vs `/srv/guld` content homes  
- [`PACKAGES.md`](PACKAGES.md) · [`SOFTWARE_FLOW.md`](SOFTWARE_FLOW.md)  
- [`intents/repo-layout.md`](intents/repo-layout.md) · [`intents/software-browser.md`](intents/software-browser.md)  
- [`../README.md`](../README.md)
