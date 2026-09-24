# Guld software flow

Guld is a **standalone** platform. This document is guld’s own loop. It does **not** depend on iramillercom CD, `igithost`, or `apps.conf`.

**Canonical HTTP server:** `guld-node --http` + `--http-static .` (API, site, `/repos/`). nginx is optional and only for guld.io TLS/extras — see [`HOSTING.md`](HOSTING.md).

Software remotes: [`REPO_LAYOUT.md`](REPO_LAYOUT.md).

## Loop

1. **Intent / task** — `docs/intents/`; tickets under [`docs/tasks/`](tasks/README.md).
2. **Implement** — edit `src/<component>/` (submodule). Site/CSS/JS and docs in the umbrella. New HTTP behavior → **guld-node**, not nginx.
3. **Commit (leaf)** — inside `src/<component>/`, `git push origin` → `repos/<component>.git`, `update-server-info` on the bare.
4. **Commit (umbrella)** — pin gitlink + site/docs; hooks on; no agent tags.
5. **Dev** — `guld-node --http … --http-static .`. Confirm `/repos/<name>.git/HEAD` and `/wallet/`.
6. **QA + docs** — verify against the node; update docs.
7. **Release prep** — bump version + changelog in the leaf that ships.
8. **Release** — **maintainer only**: PGP-signed annotated tag.
9. **Prod (any peer)** — run node on the published tree. **guld.io** may add nginx as reverse proxy only.

## Consumers

- `git clone <peer>/repos/<name>.git`
- depend on crates / future `guld-js`
- call `guld-node --http` (`/api/v1/…`)

GitHub, if used, is a mirror only.
