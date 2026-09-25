#!/usr/bin/env bash
# post-receive for repos/*.git — dumb-HTTP refresh, sync local worktree on `guld`,
# rebuild/restart isysd's guld-node user unit when needed.
#
# Installed as: repos/<name>.git/hooks/post-receive → symlink to this file
# (see scripts/install-bare-hooks.sh). Do not put logic only under repos/ (gitignored).
set -euo pipefail

# Git sets GIT_DIR to the bare for hooks — prefer that.
if [[ -n "${GIT_DIR:-}" ]]; then
  BARE=$(cd "$GIT_DIR" && pwd)
else
  # Invoked via symlink at <bare>/hooks/post-receive ($0 is the symlink path).
  BARE=$(cd "$(dirname "$0")/.." && pwd)
fi

NAME=$(basename "$BARE" .git)
UMBRELLA=$(cd "$BARE/../.." && pwd)

if [[ "$NAME" == "guld" ]]; then
  WORKTREE="$UMBRELLA"
else
  WORKTREE="$UMBRELLA/src/$NAME"
fi

log() { printf 'post-receive[%s]: %s\n' "$NAME" "$*" >&2; }

# Always refresh dumb-HTTP refs after any push.
git --git-dir="$BARE" update-server-info

updated_guld=0
NEWREV=
# `read` returns 1 at EOF — must not trip `set -e`
while read -r _oldrev newrev refname || [[ -n "${refname:-}" ]]; do
  [[ -z "${refname:-}" ]] && break
  [[ "$refname" == "refs/heads/guld" ]] || continue
  # branch deleted
  [[ "$newrev" =~ ^0+$ ]] && continue
  updated_guld=1
  NEWREV=$newrev
done

if [[ "$updated_guld" -ne 1 ]]; then
  exit 0
fi

if [[ ! -e "$WORKTREE/.git" ]]; then
  log "no usable worktree at $WORKTREE — skip sync"
  exit 0
fi

git_wt() {
  env -u GIT_DIR -u GIT_WORK_TREE -u GIT_INDEX_FILE -u GIT_QUARANTINE_PATH \
    -u GIT_OBJECT_DIRECTORY -u GIT_ALTERNATE_OBJECT_DIRECTORIES \
    git -c protocol.file.allow=always -C "$WORKTREE" "$@"
}

if ! git_wt diff --quiet HEAD 2>/dev/null || ! git_wt diff --cached --quiet 2>/dev/null; then
  log "dirty worktree at $WORKTREE — skip checkout (push still accepted)"
  exit 0
fi

log "sync $WORKTREE → guld ${NEWREV:0:12}"
git_wt fetch "$BARE" "+refs/heads/guld:refs/remotes/bare-hook/guld"
git_wt checkout -B guld "$NEWREV"

if [[ "$NAME" == "guld" ]]; then
  git_wt submodule update --init --recursive || log "submodule update failed (non-fatal)"
fi

need_build=0
need_restart=0
case "$NAME" in
  guld)
    # Umbrella tip moves once per publish wave — rebuild + single restart here.
    need_build=1
    need_restart=1
    ;;
  guld-node | guld-types | guld-crypto | guld-state | guld-consensus | guld-cas | guld-legacy | guld-client | guld-p2p | guld-wallet)
    # Leaf crates: sync worktree only. Restart waits for the umbrella push.
    need_build=0
    need_restart=0
    ;;
esac

if [[ "$need_build" -eq 1 ]]; then
  log "cargo build -p guld-node (in $UMBRELLA)"
  if ! (cd "$UMBRELLA" && cargo build -p guld-node); then
    log "cargo build failed — not restarting guld-node"
    exit 0
  fi
fi

if [[ "$need_restart" -ne 1 ]]; then
  exit 0
fi

export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"
export DBUS_SESSION_BUS_ADDRESS="${DBUS_SESSION_BUS_ADDRESS:-unix:path=${XDG_RUNTIME_DIR}/bus}"

if systemctl --user try-restart guld-node-simba.service; then
  log "restarted guld-node-simba.service"
else
  log "systemctl --user try-restart guld-node-simba.service failed (is linger/session up?)"
fi

# Legacy --dev unit (if still enabled on this host).
if systemctl --user is-enabled guld-node.service &>/dev/null; then
  systemctl --user try-restart guld-node.service 2>/dev/null || true
fi

exit 0
