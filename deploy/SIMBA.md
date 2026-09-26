# Simba testnet — operator runbook

**Network name:** `simba` · **`chain_id`:** `2` · **Bootstrap peer:** guld.io  

Config SoT: [`data/networks/simba.json`](../data/networks/simba.json)  
Genesis SoT: [`data/genesis/simba/`](../data/genesis/simba/) (committed manifest + params + `isysd-claim.asc`)

## Testnet vs mainnet (forever)

| Mode | Profile | Notes |
|------|---------|--------|
| **testnet** | `--network simba` (`mode: testnet`) | Public QA net; faucet available when a faucet key is configured |
| **mainnet** | `--network main` (`mode: mainnet`) | Stub until `data/genesis/main/` is locked — no faucet |

The UI reads `mode` / `network` / `faucet` from `GET /api/v1/chain/status` and updates the site banner. Settings can switch API base between peers (testnet and mainnet stay available after launch).

### Faucet (testnet only)

When `mode=testnet` and a signing key is present:

| Endpoint | Effect |
|----------|--------|
| `GET /api/v1/faucet` | Status (`enabled`, drip size, cooldown) |
| `POST /api/v1/faucet/drip` `{ "name": "…" }` | Send **10 GULD** to an existing account |
| `POST /api/v1/faucet/register` `{ "request": {…} }` | Sponsor registration (6+ letter names) |

Configure the key (never commit secrets):

```bash
# Option A — env (recommended on guld.io)
export GULD_FAUCET_KEY=0x…   # Ed25519 secret matching --faucet-name (default isysd)

# Option B — file in datadir
# cp /path/to/isysd.sk ./.guld-data/simba/keys/isysd.sk
```

```bash
cargo run -p guld-node -- \
  --network simba \
  --datadir ./.guld-data/simba \
  --rpc 127.0.0.1:8545 \
  --http 127.0.0.1:8088 \
  --http-static . \
  --miner isysd \
  --mine-cpu-percent 1 \
  --faucet-name isysd
```

The faucet account must exist on-chain with spendable balance (Simba `isysd` after genesis claim). Cooldown default: 1 hour per name. On mainnet the faucet routes stay off.

Faucet txs are **mempool-queued** then included by the continuous miner. Simba uses the **same block-production model as mainnet**: a peer with `--miner` runs unbroken PoW (empty blocks allowed); difficulty retargets toward **600 s**. Initial PoW bits are **1** (see `data/networks/simba.json`; difficulty **0** is genesis-only). With `--mine-cpu-percent 1`, early blocks are cheap and bits climb. The faucet peer **must** run with `--miner <faucet-account>` or grants stay pending until some miner seals them.

Explorer live updates: `GET /api/v1/chain/events` (SSE, GIP-19) on both `--http` and `--rpc` listeners; soft cap 64 subscribers.


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
| **guld.io (this host)** | `/home/isysd/Projects/guld2` | `./.guld-data/simba` | **isysd user unit** [`guld-node-simba.user.service`](guld-node-simba.user.service) → `~/.config/systemd/user/guld-node-simba.service`; HTTP `:8088` (nginx) |
| **guld.io (prod user)** | `/home/guld/guld` | `/home/guld/guld-data/simba` | system unit [`guld-node-simba.service`](guld-node-simba.service) |
| **dev laptop** | checkout path | `./.guld-data/simba` | validating peer; optional `--miner` |

### Enable Simba on this host (isysd)

```bash
cd /home/isysd/Projects/guld2
cargo build -p guld-node
install -m 0644 deploy/guld-node-simba.user.service ~/.config/systemd/user/guld-node-simba.service
systemctl --user daemon-reload
systemctl --user disable --now guld-node.service   # --dev playground; frees ports
systemctl --user enable --now guld-node-simba.service
# P2P (once):
#   sudo ufw allow 4001/tcp comment 'guld-node simba p2p'
```

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

**Mempool is in-memory** (not persisted). After restart a peer re-fetches pending txs from connected peers via `GetMempool` on Hello (guld-p2p ≥ this tree). Until guld.io runs that build, reconnecting laptops may show an empty mempool until new txs are submitted.

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

Add `--miner <name>` only if this process should seal blocks (e.g. `--miner isysd`). On shared bootstrap hosts always pass `--mine-cpu-percent 1`.

`--network simba` sets `chain_id=2`, difficulty, and dials guld.io bootnodes. Do **not** pass `--dev` on shared testnet peers (that soft-caps difficulty for rapid local empty ticks).

Check mesh:

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_peerCount","params":[]}'
```

## 4. Mining policy (simba)

- **Same as mainnet:** `--miner <name>` starts a **continuous PoW loop** (empty blocks OK). Difficulty retargets toward `TARGET_BLOCK_INTERVAL` (**600 s**).
- Validating peers omit `--miner` and never seal.
- Reasonable v1: **only guld.io mines** with `--miner isysd` (after genesis claim); laptops validate.
- **Shared hosts:** always `--mine-cpu-percent 1`. Service units under `deploy/` already set this.
- `auto_mine` may also seal on mempool insert; the miner loop is the source of truth for block time.

Force a block (usually unnecessary once the loop is running):

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_mineBlock","params":[]}'
```## 5. Replace deprecated API unit

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
