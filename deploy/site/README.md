# Deploy — static site bind mount

Optional for **guld.io** when nginx still reads files from disk. Prefer reverse-proxying **everything** to `guld-node --http-static` ([`../../docs/HOSTING.md`](../../docs/HOSTING.md)); then this mount is unnecessary for product behavior.

| File | Role |
|------|------|
| `var-www-guld.io.mount` | systemd mount unit template |
| `install-bind-mount.sh` | Install mount (`SOURCE=` defaults to repo root) |

```bash
sudo ./deploy/site/install-bind-mount.sh
# or: sudo SOURCE=/path/to/guld ./deploy/site/install-bind-mount.sh
```

End users: no bind mount — run `guld-node --http-static .` from the checkout.
