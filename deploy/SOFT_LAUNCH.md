# Soft-launch — Guld (guld.io)

**Stack:** static **guld.io** repo + FastAPI on **127.0.0.1:8004** · user **`guld`** · No Docker · **Not** iramillercom CD

Two checkouts: `/home/isysd/Projects/guld` (protocol) and `/home/isysd/Projects/guld.io` (website). You run all `sudo` lines.

## 0. Meta-FS content root

```bash
sudo mkdir -p /srv/guld
sudo chown guld:guld /srv/guld
```

## 1. Bind mount + nginx snippets

```bash
cd /home/isysd/Projects/guld
sudo ./deploy/install-nginx-snippets.sh
sudo ./deploy/install-bind-mount.sh
```

## 2. HTTP bootstrap (before Certbot)

```bash
sudo cp deploy/nginx-http-bootstrap.conf /etc/nginx/sites-available/guld.io
sudo ln -sf ../sites-available/guld.io /etc/nginx/sites-enabled/guld.io
sudo nginx -t && sudo systemctl reload nginx
```

## 3. API (dev as isysd or prod as guld)

```bash
cd /home/isysd/Projects/guld/src/guld-api
poetry install
cp .env.example .env
# set DATABASE_* and GULD_REPO_ROOT=/srv/guld
poetry run uvicorn guld_api.main:app --host 127.0.0.1 --port 8004
```

Prod unit template: `deploy/guld-api.service` → install under user `guld` or system unit with `User=guld`.

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
cd /home/isysd/Projects/guld
sudo ./deploy/install-nginx-snippets.sh
sudo ./deploy/install-bind-mount.sh
sudo ./deploy/install-nginx-site.sh
```

No need to re-run `certbot --nginx` unless renewing. Optional check: `sudo certbot certificates`.
