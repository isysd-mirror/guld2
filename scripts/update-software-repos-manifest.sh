#!/usr/bin/env bash
# Regenerate data/software-repos.json from the current umbrella + submodule HEADs.
# Run from repo root after pinning gitlinks; commit the manifest with the umbrella.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/data/software-repos.json"
DIST="${GULD_REPO_DISTRIBUTION:-https://guld.io/repos}"

umbrella_branch="$(git -C "$ROOT" rev-parse --abbrev-ref HEAD)"
umbrella_commit="$(git -C "$ROOT" rev-parse HEAD)"

repos_json=""
first=1
append_repo() {
  local name="$1" path="$2" branch="$3" commit="$4"
  [[ $first -eq 1 ]] || repos_json+=","
  first=0
  repos_json+=$(cat <<EOF

    {
      "name": "$name",
      "path": "$path",
      "branch": "$branch",
      "commit": "$commit"
    }
EOF
)
}

append_repo "guld" "." "$umbrella_branch" "$umbrella_commit"

for wt in "$ROOT"/src/guld-*; do
  [[ -d "$wt/.git" || -f "$wt/.git" ]] || continue
  name="$(basename "$wt")"
  branch="$(git -C "$wt" rev-parse --abbrev-ref HEAD)"
  commit="$(git -C "$wt" rev-parse HEAD)"
  append_repo "$name" "src/$name" "$branch" "$commit"
done

cat >"$OUT" <<EOF
{
  "version": 1,
  "distribution": "$DIST",
  "repos": [$repos_json
  ]
}
EOF

echo "Wrote $OUT ($(git -C "$ROOT" submodule status 2>/dev/null | wc -l) submodules + umbrella)"
