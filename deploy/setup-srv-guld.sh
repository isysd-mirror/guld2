#!/usr/bin/env bash
# Create /srv/guld owned by system user guld.
# Run: sudo ./deploy/setup-srv-guld.sh
set -euo pipefail

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

install -d -m 0755 -o guld -g guld /srv/guld
echo "Created /srv/guld owned by guld:guld"
ls -la /srv/guld
