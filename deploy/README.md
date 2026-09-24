# Deploy (guld.io operator kit)

**Product server = `guld-node`.** End users never need this folder — they run:

```bash
guld-node --http 0.0.0.0:8080 --http-static .
```

This `deploy/` tree is for the **guld.io** bootstrap host only: TLS and other operator extras in front of that same node.

## Preferred topology

```text
Client → nginx (TLS, HSTS, redirects, rate limits, …)
              → proxy_pass → guld-node --http/--http-static
```

Do **not** add new product routes or git/SPA rules in nginx. Implement them in [`src/guld-node`](../src/guld-node/). See [`docs/HOSTING.md`](../docs/HOSTING.md).

| File | Role |
|------|------|
| `nginx.conf` / `nginx-http-bootstrap.conf` | TLS vhost; HTTPS proxies all traffic to guld-node `:8088` |
| `snippets/` | Headers + catch-all `proxy_pass` (static-locations* are transitional leftovers) |
| `guld-node.service` | **isysd user unit** — `systemctl --user enable --now guld-node` |
| `guld-node-simba.service` | **Simba testnet** (`chain_id` 2) — see [`SIMBA.md`](SIMBA.md) |
| `SOFT_LAUNCH.md` | Operator runbook (prefer this README + HOSTING.md) |
| `SIMBA.md` | Live testnet: guld.io + laptop peers |
| `site/` | Bind-mount this repo → `/var/www/guld.io` (ACME / legacy; not required for site content when proxying) |

**Git software remotes:** served by the node from `repos/*.git` → `/repos/<name>.git`.  
**Content homes:** `/srv/guld` (separate).
