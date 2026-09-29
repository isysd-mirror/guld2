# Run a Guld peer on a Mac (Simba testnet)

**For friends who are not full-time developers.** Sets up a **Simba peer** with a local wallet UI. Mining is **optional** (capped CPU). Network account names (e.g. `isysd`) are unrelated to the Mac login.

Full operator notes: [`deploy/SIMBA.md`](../../deploy/SIMBA.md) · beta pins: [`SIMBA_BETA.md`](../SIMBA_BETA.md).

## Today (with a friend at the keyboard)

### 0. One-time: Homebrew

If Terminal says `brew: command not found`:

1. Open [https://brew.sh](https://brew.sh)
2. Paste their install line into **Terminal**, Enter, wait
3. Close Terminal and open a **new** window

### 1. Install

**Validate-only** (sync + wallet):

```bash
curl -fsSL https://guld.io/scripts/peer/bootstrap-mac.sh | bash
```

**With mining** (pick his on-chain name — lowercase letters):

```bash
curl -fsSL https://guld.io/scripts/peer/bootstrap-mac.sh | bash -s -- --mine hisname
```

First run downloads `~/guld`, installs Rust if needed, builds (several minutes), and starts in the background. With `--mine`, it also creates a miner key and enables PoW at **1% of one core** (laptop-friendly).

When it finishes:

- Wallet: [http://127.0.0.1:8081/wallet/](http://127.0.0.1:8081/wallet/)
- Or: `~/guld/scripts/peer/guld-peer open`

### 2. If he mines — register the name

Mining only seals after the name exists on Simba **with the same key**.

1. Note the **pubkey** printed by `mine-setup` / install.
2. Open the wallet → register that name (Simba faucet on [guld.io](https://guld.io/) can sponsor free names).
3. Import the secret into the browser wallet if he wants UI control:

```bash
~/guld/target/release/guld-cli privkey hisname
```

Paste that hex into the key manager. Keep it private.

Already installed without mining? Turn it on later:

```bash
~/guld/scripts/peer/guld-peer mine-setup hisname
~/guld/scripts/peer/guld-peer mine on hisname
```

Turn mining off anytime: `~/guld/scripts/peer/guld-peer mine off`

### 3. Everyday commands

```bash
~/guld/scripts/peer/guld-peer status       # up? mining?
~/guld/scripts/peer/guld-peer update       # pull + rebuild + restart
~/guld/scripts/peer/guld-peer stop|start
~/guld/scripts/peer/guld-peer logs
~/guld/scripts/peer/guld-peer open
~/guld/scripts/peer/guld-peer mine status
```

Optional alias: `alias guld-peer='~/guld/scripts/peer/guld-peer'`.

## What gets installed

| Piece | Where |
|-------|--------|
| Source tree | `~/guld` (override with `GULD_HOME=…`) |
| Binary | `~/guld/target/release/guld-node` |
| Chain data | `~/guld/.guld-data/simba` |
| Miner key (if mining) | `~/guld/.guld-data/simba/keys/<name>.sk` |
| Local config | `~/guld/.guld-peer.conf` |
| Background service | `~/Library/LaunchAgents/com.guld.simba-peer.plist` |
| Logs | `~/Library/Logs/guld/simba-peer.*.log` |

Ports: HTTP **8081**, JSON-RPC **8546**, P2P **4001**. Allow incoming P2P if macOS asks.

Mining uses `--mine-cpu-percent 1` by default (override with `GULD_MINE_CPU_PERCENT=5` before `mine on`).

## If something fails

| Symptom | Try |
|---------|-----|
| `brew` missing | Step 0 |
| Build / Xcode | `xcode-select --install` then `guld-peer update` |
| Wallet blank | Wait for sync; `status` / `logs` |
| Mining but no blocks | Name not registered, or key mismatch — re-run `mine-setup` and register that pubkey |
| Clean resync | `stop` → delete `~/guld/.guld-data/simba` → keep `keys/` if mining → `start` |

## Security notes

- Public **Simba** mesh (bootstrap [guld.io](https://guld.io/)).
- Miner / wallet secrets stay on **this Mac** — never share seed or `.sk` files.
- Low early hashrate is normal ([security-budget blurb](../fragments/security-budget.md)).

## Helper source

- [`scripts/peer/bootstrap-mac.sh`](../../scripts/peer/bootstrap-mac.sh)
- [`scripts/peer/guld-peer`](../../scripts/peer/guld-peer)
- [`deploy/macos/com.guld.simba-peer.plist`](../../deploy/macos/com.guld.simba-peer.plist) (reference; live plist is generated)
