# Simba genesis artifacts

Committed height-0 for `--network simba` (`chain_id = 2`).

| File | Role |
|------|------|
| `import-manifest.json` | Locked Guld 1.0 balances (preprocessed; do not re-parse `.dat` at node start) |
| `negatives.json` | Disclosure: 15 negative `*:Assets` roots (import **0**; non-consensus) |
| `omissions.json` | Disclosure: ERC20 + credit subtrees omitted from circulating premine |
| `params.json` | Fixed timestamp, `isysd` post-claim pubkey, master hash |
| `isysd-claim.asc` | PGP clearsign of the ClaimLegacy challenge hex (required) |
| `pins.json` | Committed tip hash, state root (post guld-home), rules hash |
| `blocks/0.json` | Matching height-0 header (empty `txs`; import effects live in state KV) |

## Pins (task 012 / 016 regenesis)

| Field | Value |
|-------|--------|
| `tip_hash` / `block_hash` | `0xadbff5409912ffa96fee913b3775b471eaca58b26323465ec41a400f86a1cd96` |
| `state_root` (post home) | `0x67988785b8f6a3cc9f3e188a00df1e8b51cd1bbb5f48d3ddc0cb8edcb9997ff1` |
| `state_root_pre_home` | `0x09a36d03b28b268170e9e1a39f3a7f7e1fd6778bc9f6f1349ea1df689359c9bd` |
| `import_manifest_hash` | `0x59a39af461d66fa1ef892708f8fa8838684d812cccfbe253816a34f448980e70` |
| `guld_rules_hash` | `0x81bebfee4afa6c3f7d22b659eeeeebdf4d320eb9d95a8fa85b8587b9ee62be50` |
| **x** (`GENESIS_X_QUANTA`) | **960,975.39527052 GULD** (= sum of manifest rows) |
| Manifest rows | **2,217** (accounts at height 0 after `guld` + claim: **2,218**) |

Empty `--network simba` datadirs rebuild height-0 from these artifacts and **fail** if the tip drifts from `pins.json`.

## Design

- **Full 1.0 ledger** in `import-manifest.json` (task 007 **A7**). Supply **x = sum(imported rows)** — ERC20 omitted ([`omissions.json`](./omissions.json)); negatives import **0** ([`negatives.json`](./negatives.json)). Narrative: [`docs/fragments/legacy-distribution.md`](../../../docs/fragments/legacy-distribution.md) ([GIP-24](../../../docs/gips/gip-24.md)).
- **`guld`** is a keyless network shell. Miners witnessing header `master_hash` / `guld_rules_hash` attest CAP changes — no `guld.sk`.
- **No alice.** No default `--miner`; seal only with `--miner <name>`.
- **`isysd`** is imported locked, then genesis-claimed via the committed PGP proof so unbound ClaimLegacy attestation works from block 0.

### Legacy name remap (task 016)

Every positive 1.0 `Assets` name MUST be a valid 2.0 `Name`. Preprocess applies an explicit table (`guld_legacy::LEGACY_NAME_REMAP`) and **fails closed** on any other illegal string (no silent drops).

| 1.0 name | → 2.0 | Balance |
|----------|-------|---------|
| `luk-` | `luk` | 100 |
| `matt-` | `matt` | 100 |
| `page-` | `page` | 100 |
| `qix-` | `qix` | 100 |
| `shade-` | `shade` | 100 |
| `xavi-` | `xavi` | 100 |
| `y--` | `y` | 100 |

Source: `archives/ledger-guld/guld/1496275200.dat` (2016-06-01 pre-founding). ClaimLegacy binds to the **remapped** string.

`gap.json` (100 GULD) remains as imported (parses as a one-dot subaccount form); not part of the hyphen bug.

## Reset policy (G4)

**Simba may reset once before durable beta lock.** After that announcement, treat tip hash above as frozen unless a signed regenesis notice is published.

Operators who already ran the prior tip (`0xc4a017…`) **must wipe** their Simba datadir and resync from these artifacts.

## Ceremony (once)

1. Generate an Ed25519 keypair offline; keep the secret.
2. Put the **public** key hex into `params.json` → `isysd_pubkey`.
3. Print the challenge:

```bash
cargo run -p guld-legacy --bin guld-genesis -- challenge \
  --params data/genesis/simba/params.json
```

4. PGP-cleartext-sign that hex with the isysd 1.0 key from `archives/keys-pgp/isysd/`.
5. Save the armored message as `data/genesis/simba/isysd-claim.asc`.
6. Verify + build state root:

```bash
cargo run -p guld-legacy --bin guld-genesis -- verify-claim \
  --dir data/genesis/simba --keys-pgp archives/keys-pgp

cargo run -p guld-legacy --bin guld-genesis -- build \
  --dir data/genesis/simba --keys-pgp archives/keys-pgp
```

7. Materialize matching block 0 (writes tip under a fresh datadir):

```bash
DD=$(mktemp -d)
cargo run -p guld-node --release -- \
  --network simba --datadir "$DD" --offline \
  --keys-pgp archives/keys-pgp --auto-mine false
# copy $DD/blocks/0.json → data/genesis/simba/blocks/0.json
# update pins.json tip_hash / state_root / guld_rules_hash from the node log + header
```

8. Reset operator datadirs once; start with `--network simba` (no `--miner` unless sealing). Do **not** use `--dev` or `--import-ledger` on Simba.

## Refresh manifest (rare)

```bash
cargo run -p guld-legacy --bin guld-genesis -- preprocess \
  --ledger archives/guld-ledger-all.dat \
  --keys-pgp archives/keys-pgp \
  --out data/genesis/simba/import-manifest.json
```

Then re-run the ceremony from step 6, update `GENESIS_X_QUANTA` / specs if the row sum changed, and publish a reset notice.
