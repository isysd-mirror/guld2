# Archives

Historical Guld **1.0** data lives under `archives/`.

| Path | Kind | Contents |
|------|------|----------|
| `archives/ledger-guld/` | **git submodule** → [guldcoin/ledger-guld](https://github.com/guldcoin/ledger-guld) | 1.0 ledger-cli journals (`<user>/<timestamp>.dat` + `.asc`) — import SoT ([`specs/15-ledger-import.md`](specs/15-ledger-import.md)) |
| `archives/keys-pgp/` | **git submodule** → [guldcoin/keys-pgp](https://github.com/guldcoin/keys-pgp) | OpenPGP binding set `\<name\>/\<FP\>.asc` for `ClaimLegacy` |
| `archives/guld-ledger-all.dat` | local generated (gitignored) | Working concat of journals + optional `guld-account-status.txt` balance dump |
| `archives/legacy-guld/` | local shelf (gitignored) | ~2018 Guld **1.0** packages |
| `archives/experiment-Q1-2026/` | local shelf (gitignored) | Earlier snapshot, including `io-http-guld.io` (legacy site + brand assets) |

`guld-node` MUST NOT serve `archives/` (even under `--http-static`). Generated dump files (`archives/guld-ledger-all.dat`, `archives/guld-account-status.txt`) stay local and are gitignored.

Guld **2.0** is a hard fork of 1.0 software and ledger. These shelves are not the product SoT.

See [`UPGRADE_FROM_1.md`](UPGRADE_FROM_1.md) for upgrade drivers (ledger, FS, UX/nodes).

## Brand extraction

Curated logos, favicon, OG images, and color tokens for **guld.io** come from:

`archives/experiment-Q1-2026/io-http-guld.io/`

Do **not** fork Bootstrap/jQuery markup from that dump into the new PWA.
