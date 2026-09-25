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
| `guld-node.service` | **isysd --dev** playground (optional; disable when running Simba) |
| `guld-node-simba.user.service` | **isysd Simba testnet** — `systemctl --user enable --now guld-node-simba` |
| `guld-node-simba.service` | System unit template (`User=guld`) — see [`SIMBA.md`](SIMBA.md) |
| `../scripts/install-bare-hooks.sh` | Symlink `repos/*.git` `post-receive` → auto-pull `guld` + restart Simba |
| `SOFT_LAUNCH.md` | Operator runbook (prefer this README + HOSTING.md) |
| `SIMBA.md` | Live testnet: guld.io + laptop peers |
| `site/` | Bind-mount this repo → `/var/www/guld.io` (ACME / legacy; not required for site content when proxying) |

**Git software remotes:** served by the node from `repos/*.git` → `/repos/<name>.git`.  
**Content homes:** `/srv/guld` (separate).
