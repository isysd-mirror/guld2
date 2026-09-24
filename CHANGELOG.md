# Changelog

## [0.1.0] - 2026-09-24

### Added

- Rust L0 workspace under `src/guld-*`: types, crypto, state, consensus, CAS, legacy import, node, client, desktop wallet
- `guld-p2p` libp2p mesh (Hello, tx/block sync, CAS objects, ban scoring, `--dev` mDNS) + simba testnet deploy notes
- Optional signed tx `memo` (≤64 bytes) for fee-paying txs; height-activated upgrade spec (docs)
- `/docs/` markdown browser + docs tree; PWA wallet memo/contacts/QR helpers
- `guld-node --http` (`/api/v1` chain reads) + optional `--http-static`
- Static PWA at repo root: landing, wallet, explorer, whitepaper/specs HTML shells (framework-less JS)
- `repos/*.git` bare remotes + `src/guld-*` submodules; dumb HTTP via **`guld-node --http-static`** at `/repos/<name>.git`
- Optional paid registrar desk: Paymento webhook `POST /api/v1/payment-gateway-webhook` + `GET /api/v1/registrar`
- Normative `docs/` (specs, whitepaper, intents, tasks) including node-first hosting
- Operator `deploy/` for optional guld.io nginx (TLS reverse proxy / transitional static)

### Changed

- **Repo root is the static website** (former `src/guld.io/` lifted). Site CSS/JS live at `src/css`, `src/js` beside Rust crates.
- Docs are served from `/docs/` directly — no mirror/`sync-docs` copy step.
- `guld-api` deprecated for the reference wallet path (prefer node `--http`).
- Software remotes are in-tree `repos/` served by **guld-node**; `/srv/guld` remains content homes only. nginx on guld.io is optional reverse proxy only.

### Notes

- Snapshot before reorg preserved locally (maintainer).
- Next: `/software/` catalog UI ([`docs/intents/software-browser.md`](docs/intents/software-browser.md)).
