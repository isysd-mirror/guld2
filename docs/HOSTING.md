# Hosting

## Default: everything is `guld-node`

End users run the open-source tree with:

```bash
cargo run -p guld-node -- \
  --http 127.0.0.1:8080 \
  --http-static . \
  …
```

That process is the **canonical HTTP server** for:

- Chain API — `/api/v1/…`
- Static site — `/`, `/wallet/`, `/docs/`, `/software/`, …
- Software git remotes — `/repos/<name>.git/…` (dumb HTTP v1; smart HTTP later **in node**)

**Do not put product behavior in nginx.** While writing code, assume nginx is absent or is only a dumb reverse proxy to `--http`. Features (deny lists, `/repos/` without SPA fallback, future smart git, software browser APIs) belong in **`guld-node`**.

### guld.io production (optional nginx)

Only the bootstrap **guld.io** deployment uses nginx, and only for **extra** operator features: TLS termination, HSTS, rate limits, logging, www→apex redirects, ACME. Preferred shape:

```text
Internet → nginx (TLS + extras) → proxy_pass → guld-node --http/--http-static
```

nginx MUST NOT be the place where `/repos/` semantics, SPA rules, or API routes are invented. If a rule is needed for correct clones or wallets, implement it in node first; nginx may mirror a deny/header only if useful as defense in depth.

Legacy deploy snippets that serve files from `/var/www/guld.io` directly are transitional; migrate toward **proxy everything** to node.

---

## Two different “git on disk” stories

| Concern | Path | Served how | Audience |
|---------|------|------------|----------|
| **Software remotes** | `repos/<name>.git` under the site root | **`guld-node`** (`--http-static`); same origin as the wallet | Devs cloning **`guld.git`** (umbrella) or individual packages |
| **Content / meta-FS homes** | `/srv/guld/<owner>/<repo>.git` | Leaf-host / guld hooks (not the marketing site) | End-user account data |

Layout / clone URLs: [`REPO_LAYOUT.md`](REPO_LAYOUT.md).

---

## 1. Software remotes (`repos/`)

### Where

- **Any peer:** `<repo-root>/repos/<name>.git` next to `index.html`
- **Clone URL (same origin as that peer’s HTTP):**  
  `http://127.0.0.1:8080/repos/<name>.git` locally, or `https://guld.io/repos/<name>.git` when that host proxies to a node with `--http-static` on this tree

`repos/` is **gitignored** in the umbrella (no packfiles in git history) but **must exist on disk** wherever the node’s `--http-static` root points.

### How clients fetch

**v1 — dumb HTTP** (node serves bare files via `ServeDir` / equivalent):

1. **Manifest** — `data/software-repos.json` lists expected bare HEADs (committed in umbrella).
2. **Materialize** — `guld-node --repos sync --http-static .` builds `repos/*.git` from local submodule checkouts at pinned SHAs (no trusting network download).
3. **Publish (maintainer)** — `--repos publish` pushes worktree HEAD → bare; refresh manifest with `./scripts/update-software-repos-manifest.sh`.
4. **`guld-node`** serves `repos/<name>.git/**` as ordinary files (missing paths **404** — never fall back to `index.html`).
5. `git clone https://guld.io/repos/<name>.git` (official distribution URL in `.gitmodules`).

**Later — smart HTTP:** implement in **`guld-node`** (or a helper it owns) in front of the same `repos/*.git` paths. Keep URL `/repos/<name>.git`. Not `git-http-backend` in nginx; not iramillercom `igithost`.

### Node responsibilities (implement here)

- Serve `--http-static` root including `repos/`
- No SPA fallback for missing `/repos/…` (or any missing static object)
- Deny or refuse to serve `archives/`, `.guld-data/`, `target/`, `.env` even if present under the static root
- Optional later: smart git, READMEs for `/software/`, etc.

### Operator checklist

- [ ] Node runs with `--http` + `--http-static <repo-root>` and `repos/*.git` present
- [ ] Smoke: `curl -sI http://127.0.0.1:8080/repos/guld-types.git/HEAD` and `git ls-remote …`
- [ ] After each push to a bare: `update-server-info`
- [ ] guld.io (if used): nginx only proxies to that node; TLS/extras only
- [ ] `.gitmodules` public URLs match the peer’s HTTP origin (bootstrap may still use absolute file paths)

---

## 2. Content homes (`/srv/guld`)

### Maintainer setup (requires sudo)

```bash
sudo mkdir -p /srv/guld
sudo chown guld:guld /srv/guld
```

```text
/srv/guld/
├── <owner>/
│   └── <repo>.git/
└── identity/
```

Not published under `/repos/`. Separate from software remotes.

---

## Related

- [`REPO_LAYOUT.md`](REPO_LAYOUT.md) · [`SOFTWARE_FLOW.md`](SOFTWARE_FLOW.md)  
- [`../deploy/README.md`](../deploy/README.md) — optional nginx for guld.io only  
- Node HTTP: `src/guld-node/src/http_api.rs`
