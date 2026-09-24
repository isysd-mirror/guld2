# Simba testnet — operator runbook

**Network name:** `simba` · **`chain_id`:** `2` · **Bootstrap peer:** guld.io  

Config SoT: [`data/networks/simba.json`](../data/networks/simba.json)

## What works today (P2P phase C)

| Works | Still limited |
|-------|----------------|
| Two peers dial, Hello, `guld_peerCount` | Different genesis keys still cannot sync |
| Gossip txs into each other’s mempool | Rich Bitcoin-style locator |
| Mine on A → B imports block via InvBlock / headers sync | Hole punching / DHT |
| Fresh node with **same genesis** catches tip from guld.io | |
| `GetObjects` / CAS serve after `guld_putObject` | |
| Ban scoring + `datadir/peerstore/peers.json` | |
| `--dev` LAN mDNS (off on simba) | |

**Genesis:** empty datadirs still create different `alice` keys. For a second machine either (a) copy genesis keys/`blocks/0.json` once, or (b) start empty only if you accept a fork. After shared genesis, **block sync replaces full datadir tarballs** for tip catch-up.


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

Peers must share **height-0** (same keys / `blocks/0.json`). Easiest: copy from guld.io after first start, then let **P2P block sync** pull the tip.

```bash
# on guld.io — copy only genesis materials (or full datadir once)
sudo systemctl stop guld-node-simba
tar -C /home/guld/guld-data -czf /tmp/simba-genesis.tgz \
  simba/keys simba/blocks/0.json simba/blocks/tip.json simba/state simba/cas
sudo systemctl start guld-node-simba
```

On the laptop, extract into `./.guld-data/simba` (or copy full datadir). If you only plant genesis and your tip is behind, start the node — it will Hello guld.io and sync headers/blocks.


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
  --p2p 0.0.0.0:4001 \
  --miner alice
```

`--network simba` sets `chain_id=2`, difficulty, `auto_mine=false`, and dials guld.io bootnodes. Do **not** pass `--dev` (that skips default bootnodes and enables empty-block mining).

Check mesh:

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_peerCount","params":[]}'
```

## 4. Mining policy (simba)

- Default on simba: **`auto_mine=false`** — txs sit in mempool until someone calls `guld_mineBlock` or you turn auto-mine on for a designated miner.
- Reasonable v1: **only guld.io mines**; laptop is a validating peer for gossip. After phase B, any peer can catch up.

Force a block on the miner:

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_mineBlock","params":[]}'
```

## 5. Optional ledger / PGP (height 0 only)

Only on **first** empty datadir create (before height advances):

```bash
# add to ExecStart / laptop command — once at genesis
--keys-pgp archives/keys-pgp \
--import-ledger archives/ledger-guld/ledger-guld/guld-ledger-all.dat
```

If the datadir already exists, those flags are ignored for import (height ≠ 0).

## 6. Replace deprecated API unit

guld.io still has [`guld-api.service`](guld-api.service) (Python). Prefer:

```bash
sudo systemctl disable --now guld-api   # when ready
sudo systemctl enable --now guld-node-simba
```

Point nginx `proxy_pass` at **`127.0.0.1:8080`** (node `--http`), not `:8004`. See [`HOSTING.md`](../docs/HOSTING.md).

## Next engineering

- **Phase C** — CAS GetObjects, DoS / ban scoring  
- Stable bootnode multiaddr with `/p2p/<peer-id>` once guld.io identity is fixed under `guld-data/simba/keys/p2p.key`  
- Optional: commit simba genesis key material for testnet-only reproducible starts
