#!/usr/bin/env bash
# Copy repo nginx snippets to /etc/nginx/snippets/guld/
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${REPO_ROOT}/deploy/snippets"
DEST="/etc/nginx/snippets/guld"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

install -d -m 0755 "${DEST}"
install -m 0644 "${SRC}"/*.conf "${DEST}/"
echo "Installed nginx snippets to ${DEST}"
ls -la "${DEST}"
