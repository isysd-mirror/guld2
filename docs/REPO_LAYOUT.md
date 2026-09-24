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
├── software/                  # catalog + GitHub-style source browser (web components)
├── data/software.json         # package metadata for /software/
├── src/
│   ├── css/  js/              # site assets (umbrella)
│   └── guld-*/                # submodules → matching repos/*.git
├── repos/                     # bare remotes (gitignored; on disk for --http-static)
│   ├── guld.git/              # umbrella (site + submodules) — clone this first
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
| **umbrella (repo root)** | `repos/guld.git` | `https://guld.io/repos/guld.git` |
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

**Official distribution:** `.gitmodules` points at **`https://guld.io/repos/<name>.git`**. That is the canonical clone URL for humans and CI. Local `repos/*.git` bares on disk are for **serving** on peers that run `guld-node --http-static` — they are gitignored and not shipped in the umbrella commit.

The **umbrella** is published at `repos/guld.git` — the primary clone target (site, docs, workspace, submodule gitlinks). Package bares remain individually clonable for leaf work.

**Bootstrap maintainers** may still push to file:// bares under `repos/` before guld.io mirrors them; consumers fetch from `https://guld.io/repos/…` only.

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

### Bare repo manifest and `--repos` (guld-node)

Expected bare HEADs live in **`data/software-repos.json`** (committed). At startup:

| Flag | Behavior |
|------|----------|
| `--repos verify` | Fail if any bare is missing or HEAD ≠ manifest commit |
| `--repos sync` | Verify; create or repair bares from **local worktrees** when worktree HEAD matches manifest |
| `--repos publish` | Maintainer: push worktree HEAD → bare; then refresh manifest with `scripts/update-software-repos-manifest.sh` |
| `--repos-only` | With any `--repos` mode, exit after bare work (no datadir / no serve) |

**No network download.** Sync only copies objects already present in submodule checkouts at the pinned SHA. Operators who lack worktrees must `git submodule update --init` first (from `https://guld.io/repos/guld.git`), then `--repos sync`.

Regenerate manifest after pinning gitlinks:

```bash
./scripts/update-software-repos-manifest.sh
git add data/software-repos.json && git commit -m "Pin software repo HEADs."
```

## Submodule workflow (maintainers)

Each checkout has two remotes:

| Remote | URL | Use |
|--------|-----|-----|
| `local` | `repos/<name>.git` (bare on disk) | **Push here** after commit — serves dumb HTTP |
| `guld.io` | `https://guld.io/repos/<name>.git` | Official distribution URL (fetch / public clone) |

Do not push to `guld.io` from a dev machine; bootstrap peers mirror bares to that host separately.

```bash
# Edit inside the package (existing tree — never “replace with a fresh clone” to change remotes)
cd src/guld-types
# … edit …
git add -A && git commit -m "…"
git push local HEAD          # → repos/guld-types.git
git -C ../../repos/guld-types.git update-server-info   # if hook missing

# Pin the umbrella
cd ../..
git add src/guld-types       # records new gitlink SHA
./scripts/update-software-repos-manifest.sh
git add data/software-repos.json
git commit -m "…"
git push local HEAD         # → repos/guld.git (umbrella bare)
git -C repos/guld.git update-server-info   # if hook missing
```

**Fresh checkout (any peer):**

```bash
git clone https://guld.io/repos/guld.git
cd guld
git submodule update --init --recursive
```

Seeding a new package: init **in place** under `src/<name>`, `git remote add origin $PWD/../../repos/<name>.git` (or the https URL), push, add `.gitmodules` entry + gitlink. Do not delete the working tree to attach a remote.

**Seeding the umbrella bare** (once per machine):

```bash
git init --bare repos/guld.git
install -m755 repos/guld-node.git/hooks/post-update repos/guld.git/hooks/post-update
git remote add origin "$PWD/repos/guld.git"    # or set-url if exists
git push -u origin guld
git -C repos/guld.git symbolic-ref HEAD refs/heads/guld
git -C repos/guld.git update-server-info
```

## Software UI (`/software/`)

Framework-less JS (web components), same pattern as iramiller.com/software:

- **Catalog** — `/software/` + `<guld-software>` merges `data/software.json` with `GET /api/v1/repos`
- **Repo browser** — `/software/<name>/`, `/tree/<ref>/…`, `/blob/<ref>/…` via `<guld-repo-view>` (SPA shell: `software/_view/index.html`)
- **Clone** — `<origin>/repos/<name>.git` (dumb HTTP from `--http-static`)
- **API** — `guld-node` reads bare repos under `repos/*.git` via git subprocess

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
