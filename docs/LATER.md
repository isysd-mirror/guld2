# Later work

Tracked here so Phase 0–4 stay focused. Not blocking the umbrella frame.

Strategic drivers from 1.0: [`UPGRADE_FROM_1.md`](UPGRADE_FROM_1.md).

## Ledger (replace ledger-cli) — research

- **Custom** ledger preferred over external L1s as *required* substrate (native rules + **native gas**)
- **Active sketch:** lean L1 — usernames, master hash, cosign, gas VM, CAS trees; git/PGP/Postgres off consensus path — [`research/modern-l1-direction.md`](research/modern-l1-direction.md)
- **Draft whitepaper:** [`whitepaper/guld-2.0-draft.md`](whitepaper/guld-2.0-draft.md) (identity DeFi, tokenomics/gas, scale, game theory)
- **Specs (normative drafts):** [`specs/README.md`](specs/README.md) — components, txs, proofs, node/leaf-host/RPC APIs
- Snapshot rules/balances from `archives/ledger-guld`
- Not: blockchain-in-git, FUSE mounts, or ETH/SOL as required substrate
- Intent: [`intents/ledger-migration.md`](intents/ledger-migration.md)
- Earlier foils (indexer / leaf / election alternatives): [`research/postgres-blockchain.md`](research/postgres-blockchain.md), [`research/block-window-consensus.md`](research/block-window-consensus.md), [`research/storage-scale-git-postgres.md`](research/storage-scale-git-postgres.md)
- Drivers: [`UPGRADE_FROM_1.md`](UPGRADE_FROM_1.md)

## guld-js

- Package under `src/guld-js/`
- Validate with Ajv against `src/guld-python/schemas/`
- Web Crypto SHA-256; read ACL + identity ref resolve in pure JS
- Browser read path via `fetch` / static host / `guld_api`

## Full-node UX + AI assists (strict tools)

The real 1.0 gap: running full nodes was possible but not automated enough.

- Packaged node install/update (`guld` + `/srv/guld` + systemd + hooks)
- `guld commit-msg` — draft HEREDOC-ready messages (publish-commit style); redact secrets
- `guld meta suggest <path>` — propose Schema.org `about`; write only on confirm
- Later: AI proposals for permitted merges / branch updates; hooks still enforce
- Env: `GEMINI_API_KEY`, `GEMINI_MODEL` (placeholders in `src/guld-python/env.example`)

## Hard signature enforcement

- `update` / `pre-receive` in enforce mode: require signed commits; group weight thresholds
- Optional metadata-completeness gate on touched paths

## Consumers (e.g. iramillercom)

Integrate guld by depending on `guld-python` / `guld-js`, pointing remotes at a guld host (`/srv/guld` + hooks), and/or calling `guld_api`. Do **not** fold guld into ira CD as the product architecture.
