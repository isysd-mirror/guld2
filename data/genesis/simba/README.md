# Simba genesis artifacts

Committed height-0 for `--network simba` (`chain_id = 2`).

| File | Role |
|------|------|
| `import-manifest.json` | Locked Guld 1.0 balances (preprocessed; do not re-parse `.dat` at node start) |
| `params.json` | Fixed timestamp, `isysd` post-claim pubkey, master hash |
| `isysd-claim.asc` | PGP clearsign of the ClaimLegacy challenge hex (required) |
| `pins.json` | Committed tip hash, state root (post guld-home), rules hash |
| `blocks/0.json` | Matching height-0 header (empty `txs`; import effects live in state KV) |

## Pins (task 012)

| Field | Value |
|-------|--------|
| `tip_hash` / `block_hash` | `0xc4a0171e5afd7ecd425b0ef8a7e57cc737226e4a992aecaa05324257c6adb3f0` |
| `state_root` (post home) | `0xcd380447a4513c7736a178ab83c506f956552e239dd9c25c56699f1ae7b6064d` |
| `state_root_pre_home` | `0xecb43a2cce19fb60b0f82cf7a7f31b36c93ccc5d253428ca1ec51b94f7c82d37` |
| `import_manifest_hash` | `0xd5f12f6df4ab2b802ed6957b08d7c104d9eae0878decb10728f7e20975e2df27` |
| `guld_rules_hash` | `0x81bebfee4afa6c3f7d22b659eeeeebdf4d320eb9d95a8fa85b8587b9ee62be50` |

Empty `--network simba` datadirs rebuild height-0 from these artifacts and **fail** if the tip drifts from `pins.json`.

## Design

- **Full 1.0 ledger** in `import-manifest.json` (task 007 **A7** locked). Supply **x ≈ 959,947.19527052 GULD** (ERC20 omitted).
- **`guld`** is a keyless network shell. Miners witnessing header `master_hash` / `guld_rules_hash` attest CAP changes — no `guld.sk`.
- **No alice.** No default `--miner`; seal only with `--miner <name>`.
- **`isysd`** is imported locked, then genesis-claimed via the committed PGP proof so unbound ClaimLegacy attestation works from block 0.

## Reset policy (G4)

**Simba may reset once before durable beta lock.** After that announcement, treat tip hash above as frozen unless a signed regenesis notice is published.

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

Then re-run the ceremony from step 6 and publish a reset notice.
