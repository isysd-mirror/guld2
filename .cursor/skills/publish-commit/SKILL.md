---
name: publish-commit
description: >-
  Review, secure-check, stage, commit, and optionally push this git repo
  (leaf-to-trunk through submodules). Use only when the user explicitly
  invokes /publish-commit or asks to run the publish-commit workflow.
disable-model-invocation: true
---

# Publish commit

Explicit human-authorized commit workflow. Overrides the workspace
commit/push caution **for this invocation only**.

Fits the **Commit** and **Release prep** steps of
[`docs/SOFTWARE_FLOW.md`](../../../docs/SOFTWARE_FLOW.md).
Does **not** create tags or ship production — maintainer PGP-signed tags only.

## Invocation

Parse the user message for:

| Flag / phrase | Meaning |
|---|---|
| repo path (or cwd) | Target repo; default = this workspace root (umbrella) or a focused `src/<component>/` leaf |
| `push` / `--push` | After a successful commit, `git push` current branch to `origin` |
| `submodules` / `leaf-to-trunk` / `recursive` | Commit dirty nested repos leaf → parent before the target |
| no push / no recursive | Defaults: commit only; single repo unless recursive asked |

If the target repo is unclear, ask once, then proceed.

## Hard rules

- **Never** `--no-verify`, `--no-gpg-sign`, or other hook bypasses. Only the human may bypass hooks.
- **Never** `git commit --amend` unless the user explicitly asked to amend **in this message**.
- **Never** force-push.
- Do **not** commit secrets, credentials, `.env`, private keys, or machine-local files.
- If pre-commit fails and you cannot fix it in the working tree, **stop** and report. Do not retry-commit blindly in a loop; fix once, then one more commit attempt.
- Pass commit messages via HEREDOC (see below).

## Guld layout notes

- Protocol packages live under `src/<name>/` as **git submodules**; bare remotes under `repos/<name>.git`.
- When both a leaf and the umbrella changed: commit **leaf first**, push leaf `origin`, then commit umbrella gitlink pin + docs/site, push `repos/guld.git`.
- After pushing bares, remind that peers may need `update-server-info` on the bare (or the project’s usual publish path) so dumb HTTP clones work.

## Per-repo procedure (steps 1–6)

Run for **one** git root at a time. Working directory = that repo root.

### 1. Scan and understand

In parallel:

```bash
git status
git diff
git diff --cached
git log -8 --oneline
git submodule status 2>/dev/null || true
```

Read the diffs. Summarize intent in one or two sentences (for yourself; keep the user-facing report short).

If there are **no** changes (and no submodule pointer updates needed), skip this repo and say so.

### 2. Ready for commit?

Check, as applicable:

- **Interim commit:** docs that the diff clearly stale-ifies; optional `[Unreleased]` changelog bullet if the file already exists.
- **Release-prep commit:** user asked for version/changelog — bump the project’s existing version field, move/update changelog, ensure docs match. Do not invent a versioning scheme the repo does not use.
- Never create git tags here.

**Stop** if not ready (missing changelog when doing release-prep, broken docs, WIP markers you cannot resolve). Tell the user what is missing. Do not commit.

### 3. Security review

Inspect every staged-candidate path and diff hunk:

- Secrets, API keys, tokens, private keys, connection strings, `.env*`, credential JSON
- Accidental local paths, machine names, or internal URLs that should not be public
- Files that should be gitignored

If a leak is present: **stop**, unstage nothing destructive — report the file/hunk and recommended `.gitignore` / removal. Do not commit.

### 4. Stage

```bash
git add -A
```

Then unstage anything that must not ship (secrets, local-only, unrelated junk):

```bash
git restore --staged -- <path>
```

Prefer staging the full intentional change set; do not leave related fixes half-staged.

### 5. Commit

Draft a concise message focused on **why** (1–2 sentences). Match recent `git log` style for that repo.

```bash
git commit -m "$(cat <<'EOF'
<message>

EOF
)"
```

On hook failure:

1. Read the hook output.
2. Fix the underlying issue in files if you can.
3. Re-stage and **one** more `git commit` (same HEREDOC style).
4. If it still fails or you cannot fix it: **stop** and report the failure. Do not bypass hooks.

### 6. Push (optional)

Only if the user requested push for this run:

```bash
git push -u origin HEAD
```

Use the **current branch**. On failure, stop and report (auth, rejected non-fast-forward, etc.). No force-push.

## 7. Leaf → trunk (optional)

When recursive / submodules requested:

1. Discover nested checkouts with changes, deepest first:

```bash
git submodule foreach --recursive 'git status --porcelain'
```

Also respect nested repos that are submodules of the target even if `foreach` is quiet — walk `git submodule status` and dirty paths from `git status`.

2. Order: **leaves first**, then parents, ending at the specified parent/target repo (usually the guld umbrella last).
3. For each dirty repo in that order, run steps 1–6.
4. Parent commits that only bump submodule SHAs should say so clearly, e.g. `Update <submodule> pointer` plus why if known.
5. If a leaf fails readiness, security, or hooks: **stop the chain** at that repo; do not commit parents with partial/unpublished leaf state unless the user explicitly says to continue.

## User-facing report

After the run (or on stop), briefly list:

- Repos visited (leaf → trunk order)
- Commit hash + subject per repo (or “skipped — clean”)
- Pushed or not
- Anything blocked (readiness, secrets, hooks) with the exact next human action

## Anti-patterns

- Committing because the agent “finished a feature” without `/publish-commit`
- `--no-verify` “just this once”
- Pushing when the user did not ask
- Committing parent before submodule
- Amending, rebasing, or rewriting history
- Creating or pushing tags (signed or not) — that is the maintainer’s release step
