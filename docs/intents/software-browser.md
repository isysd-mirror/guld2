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
| Not used | iramillercom `igithost`, GitHub as canonical host |

Details: [`../HOSTING.md`](../HOSTING.md), [`../REPO_LAYOUT.md`](../REPO_LAYOUT.md).

## Implementation slices

### A — Docs + node static (prerequisite)

- [x] Document layout, remotes, clone URLs; node-first hosting
- [ ] Harden `guld-node` static serve: `/repos/` OK; deny `archives/`, `.guld-data/`, `target/`; no SPA fallback on missing files
- [ ] Smoke: `git ls-remote http://127.0.0.1:8080/repos/guld-types.git`

### B — Catalog UI

- [ ] `software/index.html` — list packages from a manifest or `.gitmodules` parse
- [ ] Per-package page: role (from [`../PACKAGES.md`](../PACKAGES.md)), README render, clone box
- [ ] Shared CSS tokens; match existing site language

### C — Read-only git display

- [ ] Show default branch HEAD, shortlog, and/or file tree via dumb HTTP and/or **guld-node** helper routes
- [ ] Deep link “View source” ↔ paths under `src/<name>/`

### D — Polish

- [ ] Switch `.gitmodules` URLs to same-origin `/repos/…` (or `https://guld.io/repos/…` for the bootstrap mirror)
- [ ] Optional smart HTTP in node

## Non-goals

- Issues / PRs / CI UI
- Hosting arbitrary third-party repos on guld.io
- Replacing `/srv/guld` content homes
- Implementing git semantics in nginx

## Acceptance

- [ ] `/software/` lists all current `repos/*.git` packages with correct clone URLs
- [ ] At least one package page renders README + clone instructions
- [ ] `git clone` against a peer’s `guld-node` `/repos/<name>.git` works from a clean machine
- [ ] Docs stay consistent with node-first hosting
