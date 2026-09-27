# Simba testnet — operator runbook

**Network name:** `simba` · **`chain_id`:** `2` · **Bootstrap peer:** guld.io  

**Public beta page:** [`docs/SIMBA_BETA.md`](../docs/SIMBA_BETA.md) (pins, how to join, peers).

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
| Tip pin | `pins.json` + `blocks/0.json` — node refuses to start if rebuilt tip drifts |

**Genesis tip (pinned):** `0xadbff5409912ffa96fee913b3775b471eaca58b26323465ec41a400f86a1cd96`  
Ceremony / refresh: [`data/genesis/simba/README.md`](../data/genesis/simba/README.md). Prior tip `0xc4a017…` is obsolete — wipe datadir on upgrade.

Do **not** pass `--import-ledger` or `--dev` on Simba — the manifest and block 0 are already in artifacts.

### Reset policy (G4)

**Simba may reset once before durable beta lock.** Peers should expect at most one breaking regenesis notice before tip hash is treated as frozen.

### Wire codec (task 009)

**Dual wire:** P2P accepts JSON `/guld/tx|block/1.0.0` and BARE `/guld/tx|block/2.0.0`; `TxId` always from BARE. Prefer v2.

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


## GIP-23 difficulty schedule (activation)

**Rule:** every imported header with `height ≥ 1` MUST claim `difficulty == next_difficulty(...)` ([GIP-23](../gips/gip-23.md), spec 06 §3).

**Activation on Simba:** prefer **regenesis** at the next ceremony ([task 012](../tasks/done/2026-09/012-simba-genesis-ceremony.md)) so historical tips mined under soft policy do not need a height-activated soft fork. Until that reset, peers running this binary will **reject** off-schedule headers — wipe datadir and resync from artifact genesis if the public tip was mined off-schedule.

**`--dev` / `--difficulty`:** seal always follows `next_difficulty` (post-genesis starts at **1** from a difficulty-0 genesis). The CLI `--difficulty` flag is status/legacy only and MUST NOT under-claim the schedule. Rapid `--dev-empty-blocks` may raise bits at retarget boundaries (Bitcoin-class); that is consensus-correct.

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

**Mempool persistence** (`{datadir}/mempool.jsonl`): pending txs (including immature `ClaimReward`) are restored and re-validated on restart, then re-gossiped. Peer `GetMempool` on Hello remains a backup when the local file is empty. On reorg the mempool is wiped on disk and in RAM — re-submit or wait for peer relay.

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

Add `--miner <name>` only if this process should seal blocks (e.g. `--miner isysd`). **Sealing requires** `datadir/keys/<name>.sk` (Ed25519 secret matching the on-chain account keys) — otherwise `RewardCommit.claim_signature` is empty and peers reject the block with `coinbase mismatch`. On shared bootstrap hosts always pass `--mine-cpu-percent 1`.

`--network simba` sets `chain_id=2`, difficulty, and dials guld.io bootnodes. Do **not** pass `--dev` on shared testnet peers (that soft-caps difficulty for rapid local empty ticks).

Check mesh:

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_peerCount","params":[]}'
```

## 4. Mining policy (simba)

- **Same as mainnet:** `--miner <name>` starts a **continuous PoW loop** (empty blocks OK). Difficulty retargets toward `TARGET_BLOCK_INTERVAL` (**600 s**).
- Validating peers omit `--miner` and never seal.
- Reasonable v1: **only guld.io mines** with `--miner isysd` **and** `keys/isysd.sk` present (after genesis claim); laptops validate.
- **Shared hosts:** always `--mine-cpu-percent 1`. Service units under `deploy/` already set this.
- `auto_mine` may also seal on mempool insert; the miner loop is the source of truth for block time.

Force a block (usually unnecessary once the loop is running):

```bash
curl -s http://127.0.0.1:8545/ -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"guld_mineBlock","params":[]}'
```

## Fork recovery / reorg

Simba peers follow the **heavier valid tip** (cumulative work → height → hash). On a competing fork:

1. The losing tip is abandoned; state is rebuilt by **replaying from the genesis snapshot** through the common ancestor, then applying the winning fork segment (`guld-node` `chain_reorg`, max depth **2016**).
2. The **mempool is wiped** on reorg (RAM + `mempool.jsonl`) — pending txs must be re-submitted or re-gossiped.
3. Deeper than `MAX_REORG_DEPTH` is rejected cleanly (`ReorgTooDeep`); wipe + resync from a trusted peer if that ever happens.
4. Orphaned `RewardCommit` blocks are **not** claimable: `ClaimReward.ref_hash` must match the canonical block at `ref_height` (GIP-22).

**Ops expectation:** shallow reorgs are cheap; deep ones pay full genesis-replay cost. Prefer staying near the public tip.

**Automated tests** (also gated by pre-commit hooks — `./scripts/install-dev-hooks.sh`):
- Genesis pins: `cargo test -p guld-node --test simba_genesis_smoke` (task 012) or `./scripts/chain-lifecycle/simba-genesis-smoke.sh`.
- Reorg: `cargo test -p guld-node --test dual_miner_reorg` (task 019 / lifecycle phase 4). Unit: `cargo test -p guld-node chain_reorg`.
- Tall-tip catch-up (miner + late peer, no bootnode ban): `cargo test -p guld-node --test simba_catchup_sync` (lifecycle phase 5) or `./scripts/chain-lifecycle/simba-catchup-sync.sh`.

## 5. Replace deprecated API unit

guld.io still has [`guld-api.service`](guld-api.service) (Python). Prefer:

```bash
sudo systemctl disable --now guld-api   # when ready
sudo systemctl enable --now guld-node-simba
```

Point nginx `proxy_pass` at **`127.0.0.1:8080`** (node `--http`), not `:8004`. See [`HOSTING.md`](../docs/HOSTING.md).

## Peers / Discord (D6)

No Discord (or other chat) is required to join the mesh. Default: dial **guld.io** via compiled / published bootnodes. Extra multiaddrs in [`data/p2p-bootnodes.json`](../data/p2p-bootnodes.json) are optional fallbacks, not consensus authority. Short public pins + join steps: [`docs/SIMBA_BETA.md`](../docs/SIMBA_BETA.md).

## Next engineering

- Stable bootnode multiaddr with `/p2p/<peer-id>` once guld.io identity is fixed under `guld-data/simba/keys/p2p.key`  
- Optional: one more regenesis before durable beta lock (G4)
