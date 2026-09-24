# Intent: Repository & submodule layout

Status: accepted (Phase A–B mostly done; public HTTPS URLs + `/software/` UI next)

## Goal

Umbrella **`~/Projects/guld`** is both the open-source project and the static website. Implementation packages live under **`src/<component>/`** as **git submodules**. Canonical bare remotes live under **`repos/<name>.git`** in this same tree and are **served over HTTP with the site** (self-replicating). Human UI for that farm: [`software-browser.md`](software-browser.md).

SoT map: [`../REPO_LAYOUT.md`](../REPO_LAYOUT.md) · serving: [`../HOSTING.md`](../HOSTING.md).

## Done (Phase A — directory split)

- [x] Flatten crates/apps into **`src/`**
- [x] Static site at **repo root** (not a sibling guld.io repo)
- [x] Docs at `docs/`; site fetches `/docs/` (sync-docs is a noop)
- [x] Document layout in [`../REPO_LAYOUT.md`](../REPO_LAYOUT.md)

## Done (Phase B — remotes + submodules)

- [x] Create `repos/` and seed each `src/guld-*` into `repos/<name>.git`
- [x] Set each working tree’s `origin` → matching bare (**do not** replace `src/` trees)
- [x] Register submodules in `.gitmodules` + gitlinks
- [x] Bare umbrella at `repos/guld.git`; umbrella `origin` → that bare; relative submodule URLs
- [ ] First umbrella commit on branch `isysd` (site + docs + `.gitmodules`; no `archives/`, venvs, `repos/` objects)
- [ ] Harden `guld-node` static (`/repos/` + denylist); smoke `git ls-remote` against `--http`
- [x] `.gitmodules` → `https://guld.io/repos/<name>.git` (official distribution)
- [x] `guld-node --repos verify|sync|publish` + `data/software-repos.json`

## Next

- [`software-browser.md`](software-browser.md) — `/software/` catalog + clone UX

## Out of scope

- GitHub as canonical host (mirror only)
- On-chain attestation of guld.io HTML
- Treating the browser extension as consensus-required
- iramillercom `igithost` as the software remote farm
