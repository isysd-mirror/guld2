# Simba genesis artifacts

Committed height-0 for `--network simba` (`chain_id = 2`).

| File | Role |
|------|------|
| `import-manifest.json` | Locked Guld 1.0 balances (preprocessed; do not re-parse `.dat` at node start) |
| `params.json` | Fixed timestamp, `isysd` post-claim pubkey, master hash |
| `isysd-claim.asc` | PGP clearsign of the ClaimLegacy challenge hex (required) |

## Design

- **`guld`** is a keyless network shell. Miners witnessing header `master_hash` / `guld_rules_hash` attest CAP changes — no `guld.sk`.
- **No alice.** No default `--miner`; seal only with `--miner <name>`.
- **`isysd`** is imported locked, then genesis-claimed via the committed PGP proof so unbound ClaimLegacy attestation works from block 0.

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
6. Verify:

```bash
cargo run -p guld-legacy --bin guld-genesis -- verify-claim \
  --dir data/genesis/simba --keys-pgp archives/keys-pgp

cargo run -p guld-legacy --bin guld-genesis -- build \
  --dir data/genesis/simba --keys-pgp archives/keys-pgp
```

7. Reset Simba datadirs once; start with `--network simba` (no `--miner` unless sealing).

## Refresh manifest (rare)

```bash
cargo run -p guld-legacy --bin guld-genesis -- preprocess \
  --ledger archives/guld-ledger-all.dat \
  --keys-pgp archives/keys-pgp \
  --out data/genesis/simba/import-manifest.json
```

Changing the manifest or claim inputs requires a new Simba height-0 (network reset).
