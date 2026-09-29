# Soft-launch — Guld (guld.io)

**Stack:** `guld-node` (`--http` + `--http-static`) behind nginx TLS · No Docker · **Not** iramillercom CD

Run these from your **umbrella checkout** (user units default to `~/guld` via systemd `%h/guld`). You run all `sudo` lines.

## 0. Meta-FS content root

```bash
sudo mkdir -p /srv/guld
sudo chown guld:guld /srv/guld
```

## 1. Bind mount + nginx snippets

```bash
cd ~/guld   # or your umbrella checkout
sudo ./deploy/install-nginx-snippets.sh
sudo ./deploy/site/install-bind-mount.sh
```

Edit `deploy/site/var-www-guld.io.mount` `What=` to your checkout (or `/srv/guld/checkout`) before enabling the mount — do not commit machine-local paths.

## 2. HTTP bootstrap (before Certbot)

```bash
sudo cp deploy/nginx-http-bootstrap.conf /etc/nginx/sites-available/guld.io
sudo ln -sf ../sites-available/guld.io /etc/nginx/sites-enabled/guld.io
sudo nginx -t && sudo systemctl reload nginx
```

## 3. guld-node (user unit)

```bash
install -m 0644 deploy/guld-node.service ~/.config/systemd/user/guld-node.service
systemctl --user daemon-reload
systemctl --user enable --now guld-node.service
```

See `deploy/guld-node.service` and [`docs/HOSTING.md`](../docs/HOSTING.md).

## 4. TLS

### First time (no cert yet)

```bash
# HTTP vhost so Certbot can find server_name guld.io
sudo cp deploy/nginx-http-bootstrap.conf /etc/nginx/sites-available/guld.io
sudo ln -sf ../sites-available/guld.io /etc/nginx/sites-enabled/guld.io
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d guld.io -d www.guld.io
```

### Certs already issued (Certbot saved PEM but installer failed)

Certbot failed with “Could not automatically find a matching server block” when no vhost existed.
Certs are already at `/etc/letsencrypt/live/guld.io/`. Install the full HTTPS site:

```bash
cd ~/guld   # or your umbrella checkout
sudo ./deploy/install-nginx-snippets.sh
sudo ./deploy/site/install-bind-mount.sh
sudo ./deploy/install-nginx-site.sh
```

No need to re-run `certbot --nginx` unless renewing. Optional check: `sudo certbot certificates`.
