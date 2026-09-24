#!/usr/bin/env bash
# Install/enable guld.io nginx site (HTTPS template). Requires snippets + bind mount first.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${REPO_ROOT}/deploy/nginx.conf"
DEST_AVAIL="/etc/nginx/sites-available/guld.io"
DEST_ENABLED="/etc/nginx/sites-enabled/guld.io"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if [[ ! -f "${SRC}" ]]; then
  echo "Missing ${SRC}" >&2
  exit 1
fi

if [[ ! -d /etc/nginx/snippets/guld ]]; then
  echo "Missing /etc/nginx/snippets/guld — run: sudo ${REPO_ROOT}/deploy/install-nginx-snippets.sh" >&2
  exit 1
fi

if [[ ! -f /var/www/guld.io/index.html ]]; then
  echo "Missing /var/www/guld.io/index.html — run: sudo ${REPO_ROOT}/deploy/install-bind-mount.sh" >&2
  exit 1
fi

if [[ ! -f /etc/letsencrypt/live/guld.io/fullchain.pem ]]; then
  echo "Missing Let's Encrypt cert for guld.io — obtain with certbot first." >&2
  exit 1
fi

install -m 0644 "${SRC}" "${DEST_AVAIL}"
ln -sfn "${DEST_AVAIL}" "${DEST_ENABLED}"
nginx -t
systemctl reload nginx
echo "Enabled ${DEST_ENABLED} and reloaded nginx."
curl -sS -o /dev/null -w "https://guld.io/ → HTTP %{http_code}\n" https://guld.io/ || true
