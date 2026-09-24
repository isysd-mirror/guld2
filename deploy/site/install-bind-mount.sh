# Install a systemd bind mount: this repo (static site) → /var/www/guld.io
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE="${SOURCE:-${REPO_ROOT}}"
TARGET="${TARGET:-/var/www/guld.io}"
UNIT_NAME="var-www-guld.io.mount"
UNIT_SRC="$(cd "$(dirname "$0")" && pwd)/${UNIT_NAME}"

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

if [[ ! -f "${SOURCE}/index.html" ]]; then
  echo "Missing ${SOURCE}/index.html — set SOURCE= to your guld checkout." >&2
  exit 1
fi

install -d -m 0755 "${TARGET}"

tmp_unit="$(mktemp)"
sed -e "s|^What=.*|What=${SOURCE}|" \
    -e "s|^Where=.*|Where=${TARGET}|" \
    "${UNIT_SRC}" >"${tmp_unit}"
install -m 0644 "${tmp_unit}" "/etc/systemd/system/${UNIT_NAME}"
rm -f "${tmp_unit}"

systemctl daemon-reload
systemctl enable --now "${UNIT_NAME}"

echo "Mounted ${SOURCE} → ${TARGET}"
findmnt "${TARGET}" || true
