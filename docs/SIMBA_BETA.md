# Simba beta

**Public testnet** for Guld 2.0. Not mainnet — balances and tip may reset once more before durable lock.

| | |
|--|--|
| **Network** | `simba` |
| **`chain_id`** | `2` |
| **Genesis tip** | `0xf4cdc0172082485ae7b77879aedb1706d9bd7fe3da972409a15e415a3638beb4` |
| **Bootstrap peer** | [guld.io](https://guld.io/) — HTTP/API + P2P |
| **P2P listen** | TCP `4001` (`/dns4/guld.io/tcp/4001`) |
| **Bootnode list** | [`data/p2p-bootnodes.json`](../data/p2p-bootnodes.json) → `https://guld.io/data/p2p-bootnodes.json` |
| **Reset policy** | **One more reset OK** before durable beta lock (G4) |

Genesis artifacts: [`data/genesis/simba/`](../data/genesis/simba/). Operator runbook: [`deploy/SIMBA.md`](../deploy/SIMBA.md).

**GIP-27 (2026-09-27):** legacy-locked imports share the yearly pay-or-release clock. Wipe any pre-`0xf4cdc017…` datadir. During beta, claim / attestation outreach aims to prepare holders before mainnet.

Site chrome shows **Simba testnet** via `GET /api/v1/chain/status` (`mode=testnet`, `network=simba`). Wallet / explorer / register use the same peer API.

---

## How to join

1. Clone this umbrella (and submodules), build `guld-node`.
2. Start a validating peer with an empty datadir — it loads committed genesis, then syncs the tip over P2P:

```bash
cargo build -p guld-node --release
./target/release/guld-node \
  --network simba \
  --datadir ./.guld-data/simba \
  --rpc 127.0.0.1:8545 \
  --http 127.0.0.1:8080 \
  --http-static . \
  --p2p 0.0.0.0:4001
```

3. Confirm mesh: `guld_peerCount` / `guld_chainId` → `2`. Full flags, faucet, and mining policy: [`deploy/SIMBA.md`](../deploy/SIMBA.md).

Do **not** pass `--dev` or `--import-ledger` on Simba.

---

## Peers / Discord

There is **no** required Discord for mesh membership. v1 expectation:

- Dial **guld.io** (default bootnodes) — enough for catch-up and gossip.
- Optional extra multiaddrs in [`data/p2p-bootnodes.json`](../data/p2p-bootnodes.json) (not consensus authority).
- Informal community chat: [discord.gg/PMCEGjGCQ](https://discord.gg/PMCEGjGCQ) (also linked from the site footer and landing page). Protocol SoT stays this repo + guld.io.
- Optional **guld-discord** bot (read-only explorer slash commands): [`src/guld-discord`](../src/guld-discord/README.md).

---

## Faucet (testnet)

On guld.io when enabled: `GET /api/v1/faucet`, `POST /api/v1/faucet/drip`, `POST /api/v1/faucet/register`. Key lives on the host only (`GULD_FAUCET_KEY` or datadir key file) — never in git. Details: [`deploy/SIMBA.md`](../deploy/SIMBA.md) § Faucet.
