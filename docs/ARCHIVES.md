# Archives

Local, **gitignored** shelves under `archives/`. **`guld-node` MUST NOT serve them** (even under `--http-static`). Never commit large dumps into the umbrella history.

| Shelf | Contents |
|-------|----------|
| `archives/legacy-guld/` | ~2018 Guld **1.0** packages (`guld-cli`, `guld-key-manager`, …) |
| `archives/experiment-Q1-2026/` | Earlier snapshot, including `io-http-guld.io` (legacy site + brand assets) |
| `archives/ledger-guld/` | Guld **1.0** ledger-cli journals (`<user>/<timestamp>.dat` + `.asc`); working concat `guld-ledger-all.dat` + balance dump — import SoT ([`specs/15-ledger-import.md`](specs/15-ledger-import.md)) |

Guld **2.0** is a hard fork of 1.0 software and ledger. These shelves are not the product SoT.

See [`UPGRADE_FROM_1.md`](UPGRADE_FROM_1.md) for upgrade drivers (ledger, FS, UX/nodes).


## Brand extraction

Curated logos, favicon, OG images, and color tokens for **guld.io** come from:

`archives/experiment-Q1-2026/io-http-guld.io/`

Do **not** fork Bootstrap/jQuery markup from that dump into the new PWA.
