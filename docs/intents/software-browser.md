# Intent: Software browser (document, display, serve git)

Status: accepted  
**Related:** [`../REPO_LAYOUT.md`](../REPO_LAYOUT.md), [`../HOSTING.md`](../HOSTING.md), [`../PACKAGES.md`](../PACKAGES.md), [`repo-layout.md`](repo-layout.md)

## Goal

Ship **`/software/`** on the static site: framework-less JS (same stack as wallet/explorer) so humans can **discover**, **read about**, and **clone** every package whose bare lives under `repos/`.

Served by **`guld-node --http --http-static`** on every peer. guld.io may put nginx in front for TLS/extras only — product behavior stays in the node + static tree.

## User stories

1. Land on `/software/` → see the package list (name, one-line role, language).
2. Open `/software/<name>/` → README (or short blurb), clone URL, link into `src/<name>/` when browsing the tree is enough, link to specs/docs when relevant.
3. Copy `git clone <origin>/repos/<name>.git` (same origin as the node HTTP).
4. Optional: browse refs / recent commits / file tree by reading the bare over HTTP or a thin **node** helper — no GitHub dependency.

## Serving (normative)

| What | Where |
|------|--------|
| Bare objects | `repos/<name>.git` under `--http-static` root |
| Clone URL | `<http-origin>/repos/<name>.git` |
| Transport v1 | Dumb HTTP from **guld-node** + `update-server-info` |
| Transport later | Smart HTTP **in guld-node** (same paths) |
| UI | Static `/software/` + `src/js/` |
| nginx | Optional reverse proxy on guld.io only — no git/API logic |
| Not used | Third-party git host farms; GitHub as canonical host |

Details: [`../HOSTING.md`](../HOSTING.md), [`../REPO_LAYOUT.md`](../REPO_LAYOUT.md).

## Implementation slices

### A — Docs + node static (prerequisite)

- [x] Document layout, remotes, clone URLs; node-first hosting
- [ ] Harden `guld-node` static serve: `/repos/` OK; deny `archives/`, `.guld-data/`, `target/`; no SPA fallback on missing files
- [ ] Smoke: `git ls-remote http://127.0.0.1:8080/repos/guld-types.git`

### B — Catalog UI

- [x] `software/index.html` — list packages from `data/software.json`
- [x] Per-package page: role, README render, clone box (`guld-repo-view` web component)
- [x] Shared CSS tokens; match existing site language

### C — Read-only git display

- [x] Show default branch HEAD and file tree via **guld-node** `/api/v1/repos/*` (git subprocess on bare repos)
- [x] GitHub-style URLs: `/software/<name>/tree/<ref>/…` and `/blob/…`

### D — Polish

- [x] `.gitmodules` URLs → `https://guld.io/repos/…`
- [x] `data/software-repos.json` manifest + `guld-node --repos verify|sync|publish`
- [ ] Optional smart HTTP in node

## Non-goals

- Issues / PRs / CI UI
- Hosting arbitrary third-party repos on guld.io
- Treating guld.io DNS as protocol authority (see [`guld-leaf-site-and-miner-governance.md`](guld-leaf-site-and-miner-governance.md))
- Replacing `/srv/guld` content homes
- Implementing git semantics in nginx

## Acceptance

- [x] `/software/` lists all current `repos/*.git` packages with correct clone URLs
- [x] At least one package page renders README + clone instructions
- [ ] `git clone` against a peer’s `guld-node` `/repos/<name>.git` works from a clean machine
- [ ] Docs stay consistent with node-first hosting
