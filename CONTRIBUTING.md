# Contributing to Guld

Guld is a decentralized protocol. This repository is both the open-source tree and the static reference site. Canonical remotes are served from peers via `guld-node --http` (`/repos/…`); GitHub, if used, is a mirror only.

## Propose a change

| Kind of work | Where |
|--------------|--------|
| Substantial protocol, API, process, or reference-product change | **[Guld Improvement Proposal](docs/gips/)** — start with [GIP-1](docs/gips/gip-1.md) and the [template](docs/gips/gip-template.md) |
| Small bug, polish, or single-PR ticket | [`docs/tasks/`](docs/tasks/) |
| Normative behavior once agreed | [`docs/specs/`](docs/specs/) (whitepaper wins disputes) |

Do **not** invent a parallel personal “intent” track — that series was migrated into GIPs.

## Ship software (after acceptance)

Follow [`docs/SOFTWARE_FLOW.md`](docs/SOFTWARE_FLOW.md): implement in the right leaf submodule → push bare remotes → pin the umbrella → QA on `guld-node --http` → maintainer **PGP-signed** annotated tag for releases. Agents never create tags.

Consensus rule changes also need a height-activated rule bundle — see [spec 17](docs/specs/17-protocol-upgrades.md).

## Hosting and layout

- [`docs/HOSTING.md`](docs/HOSTING.md) — node-first HTTP
- [`docs/REPO_LAYOUT.md`](docs/REPO_LAYOUT.md) — umbrella, `src/` submodules, `repos/`

## Agent tooling (Cursor)

Rules and skills for AI assistants ship **in this repo** under [`.cursor/`](.cursor/):

- Rules: [`.cursor/rules/`](.cursor/rules/) (software flow, commit policy, no-sudo installs)
- Skills: [`.cursor/skills/publish-commit/`](.cursor/skills/publish-commit/) — invoke with `/publish-commit`

Peers do not need a personal copy under `~/.cursor/skills/` for Guld workflows.

## License

Contributions are under the same license as this repository unless a document says otherwise.
