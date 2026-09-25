# Simba testnet — operator runbook

**Network name:** `simba` · **`chain_id`:** `2` · **Bootstrap peer:** guld.io  

Config SoT: [`data/networks/simba.json`](../data/networks/simba.json)  
Genesis SoT: [`data/genesis/simba/`](../data/genesis/simba/) (committed manifest + params + `isysd-claim.asc`)

## Genesis (locked artifacts)

Empty `--network simba` datadirs load height-0 from `data/genesis/simba/`:

| Piece | Behavior |
|-------|----------|
| `guld` | Keyless network shell (no `guld.sk`). CAP / rules tips are witnessed by miners via header commitments. |
| Import | All positive 1.0 `Assets` rows from `import-manifest.json` (legacy-locked) |
| `isysd` | Genesis-claimed via committed PGP clearsign (attestation authority from block 0) |
| alice | **Gone** — never created on Simba |
| `--miner` | **No default.** Required only to seal blocks; omit for validating peers |

Ceremony / refresh: see [`data/genesis/simba/README.md`](../data/genesis/simba/README.md). Until `isysd-claim.asc` and a real `isysd_pubkey` are committed, empty Simba datadirs will refuse to start.

Do **not** pass `--import-ledger` on Simba — the manifest is already in artifacts.

## What works today (P2P phase C)

| Works | Still limited |
|-------|----------------|
| Two peers dial, Hello, `guld_peerCount` | Different genesis artifacts still cannot sync |
| Gossip txs into each other’s mempool | Rich Bitcoin-style locator |
| Mine on A → B imports block via InvBlock / headers sync | Hole punching / DHT |
| Fresh node with **same genesis** catches tip from guld.io | |
| `GetObjects` / CAS serve after `guld_putObject` | |
| Ban scoring + `datadir/peerstore/peers.json` | |
| `--dev` LAN mDNS (off on simba) | |

**`--dev` (not Simba):** keyless `guld` + local `alice` premine for smoke tests only. Pass `--miner alice` if sealing.


## Paths (conventions)

| Host | Checkout | Datadir | Notes |
|------|----------|---------|-------|
| **guld.io** | `/home/guld/guld` | `/home/guld/guld-data/simba` | systemd user `guld` |
| **dev laptop** | `/home/isysd/Projects/guld` | `./.guld-data/simba` | you |

## 1. Bootstrap on guld.io (first)

Build and install the unit (once):

```bash
# as guld (or deploy as you usually do)
cd /home/guld/guld
git pull && git submodule update --init --recursive
cargo build -p guld-node --release

sudo mkdir -p /home/guld/guld-data/simba
sudo chown -R guld:guld /home/guld/guld-data

sudo cp deploy/guld-node-simba.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now guld-node-simba
sudo journalctl -u guld-node-simba -f
```

Confirm:

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_chainId","params":[]}'
# → 2

curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_nodeInfo","params":[]}'
# note peer_id from journal: "p2p mesh enabled peer_id=12D3…"
```

**Firewall:** allow **TCP 4001** to the host (P2P is not through nginx). HTTP/HTTPS stay on nginx → `127.0.0.1:8080`.

Optional: after first start, put the peer id into [`data/p2p-bootnodes.json`](../data/p2p-bootnodes.json):

```json
"/dns4/guld.io/tcp/4001/p2p/12D3KooW…"
```

## 2. Share genesis (once)

Peers that check out the same repo already share `data/genesis/simba/`. Empty datadir + `--network simba` rebuilds the same height-0. After that, **P2P block sync** pulls the tip — no full-datadir tarball required for catch-up.

(Legacy note: copying `blocks/0.json` + state from guld.io still works if you already forked an older genesis; prefer resetting to artifact genesis.)

## 3. Laptop peer (live, not `--dev`)

```bash
cd /home/isysd/Projects/guld
cargo build -p guld-node --release

./target/release/guld-node \
  --network simba \
  --datadir ./.guld-data/simba \
  --rpc 127.0.0.1:8545 \
  --http 127.0.0.1:8080 \
  --http-static . \
  --p2p 0.0.0.0:4001
```

Add `--miner <name>` only if this process should seal blocks (e.g. `--miner isysd`).

`--network simba` sets `chain_id=2`, difficulty, `auto_mine=false`, and dials guld.io bootnodes. Do **not** pass `--dev` (that skips default bootnodes and enables empty-block mining).

Check mesh:

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_peerCount","params":[]}'
```

## 4. Mining policy (simba)

- Default on simba: **`auto_mine=false`** — txs sit in mempool until someone calls `guld_mineBlock` or turns auto-mine on for a designated miner.
- **`--miner <name>` is required to seal.** No default miner.
- Reasonable v1: **only guld.io mines** with an explicit `--miner isysd` (after genesis claim); laptop is a validating peer.

Force a block on the miner:

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_mineBlock","params":[]}'
```

## 5. Replace deprecated API unit

guld.io still has [`guld-api.service`](guld-api.service) (Python). Prefer:

```bash
sudo systemctl disable --now guld-api   # when ready
sudo systemctl enable --now guld-node-simba
```

Point nginx `proxy_pass` at **`127.0.0.1:8080`** (node `--http`), not `:8004`. See [`HOSTING.md`](../docs/HOSTING.md).

## Next engineering

- Commit `isysd-claim.asc` + real `isysd_pubkey` (ceremony above)  
- Stable bootnode multiaddr with `/p2p/<peer-id>` once guld.io identity is fixed under `guld-data/simba/keys/p2p.key`  
- Reset existing Simba datadirs once after artifact lock
