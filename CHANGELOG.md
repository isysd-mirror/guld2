# Changelog

## [Unreleased]

### Added

- Simba beta readiness task ([007](docs/tasks/open/007-simba-beta-public-readiness.md)); BARE wire ([009](docs/tasks/open/009-bare-wire-implementation.md)), mempool persistence ([008](docs/tasks/open/008-mempool-persistence.md)), timestamp validation ([010](docs/tasks/open/010-header-timestamp-validation.md)) tasks
- Research: [bitcoin-guld-comparison](docs/research/bitcoin-guld-comparison.md), [pow-nbits-vs-leading-bits](docs/research/pow-nbits-vs-leading-bits.md), [wire-codec-comparison](docs/research/wire-codec-comparison.md); [`schemas/README.md`](schemas/README.md)
- **PoW locked v1:** Bitcoin-style double-SHA256 block hash, **leading-zero-bits** difficulty (not compact `nBits` — [research](docs/research/pow-nbits-vs-leading-bits.md)), **2016-block / 14-day** retarget with 4× timespan clamp (spec 06 §2); [`bitcoin-guld-comparison.md`](docs/research/bitcoin-guld-comparison.md) for parameter parity
- **[GIP-22](docs/gips/gip-22.md) Accepted:** deferred miner rewards — `RewardCommit` (tx[0]) + mature `ClaimReward` (mempool-open, inclusion at `h+100`); replaces implicit `credit_miner()` at activation
- **Wire codec locked (A2):** **BARE** for consensus bytes — Rust/JS/Python tooling; [`schemas/README.md`](schemas/README.md); HTTP stays JSON ([`wire-codec-comparison.md`](docs/research/wire-codec-comparison.md))
- Reproducible Simba genesis artifacts (`data/genesis/simba/`) + `guld-genesis` CLI (`preprocess` / `challenge` / `verify-claim` / `build`)
- Keyless `guld` network shell; genesis-claim path for `isysd` via committed PGP clearsign
- Durable **testnet / mainnet** network modes (`data/networks/*.json` `mode` field) exposed on `/chain/status`
- Testnet faucet APIs (`/api/v1/faucet`, drip 10 GULD, free registration sponsorship)
- Explorer mempool snapshot (`GET /api/v1/chain/mempool`, home panel, `#/mempool`, pending tx view)
- `archives/ledger-guld` and `archives/keys-pgp` as git submodules from `github.com/guldcoin/`
- Registration-fee vesting over 8 blocks; height-activated `RulesSchedule` / `activation_height`
- Explorer account lookup (`#/account/<name>`); wallet subaccount create UI

### Changed

- **Simba protocol pins:** A7 import manifest/**x**, A8 letter fees (GIP-9 Final), A11 no foreign genesis names, GIP-14 Accepted, GIP-22 spec acceptance; whitepaper v0.25 trimmed to product narrative with spec links
- **ClaimLegacy:** imported name immutable (no rename on claim)
- `--miner` has no default — required to seal blocks; validating peers omit it
- `--network simba` loads committed genesis (no alice premine; `--import-ledger` ignored)
- Inflation `i(y) = max(0.04, (2/3)^(y-1))` (cooler early years; 4% from year 9)
- Flattened archive import paths (`archives/guld-ledger-all.dat`)

### Removed

- Fake alice genesis premine on shared networks (alice remains `--dev`-only)
- `guld-api` submodule, catalog entries, and `deploy/guld-api.service` — HTTP surface is `guld-node --http` only

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
- Software remotes are in-tree `repos/` served by **guld-node** (not iramillercom `igithost`); `/srv/guld` remains content homes only. nginx on guld.io is optional reverse proxy only.

### Notes

- Snapshot before reorg preserved locally (maintainer).
- Next: `/software/` catalog UI ([`docs/gips/gip-7.md`](docs/gips/gip-7.md)).
