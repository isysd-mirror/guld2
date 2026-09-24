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
| `nginx.conf` / `nginx-http-bootstrap.conf` | Optional vhost (migrate toward full reverse proxy to node) |
| `snippets/` | Headers / transitional static locations / API proxy |
| `guld-api.service` | Deprecated Python API — prefer node `--http` |
| `SOFT_LAUNCH.md` | Operator runbook |
| `site/` | Bind-mount this repo → `/var/www/guld.io` (only if nginx still serves files; less needed when proxying all to node) |

**Git software remotes:** served by the node from `repos/*.git` → `/repos/<name>.git`.  
**Content homes:** `/srv/guld` (separate).
