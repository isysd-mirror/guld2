# Guld FAQ

Short answers for newcomers. Normative detail: [whitepaper](whitepaper/guld-2.0-draft.md) · [specs](specs/README.md).

## Guld 1.0 and 2.0

### Does Guld 2.0 replace Guld 1.0?

No. **Guld 2.0 is a hard fork** from a Guld 1.0 ledger snapshot. The **1.0 chain continues** — 1.0 software and **1.0 coins still work** there. This repo ships 2.0; staying on 1.0 remains a valid choice.

### How do 1.0 balances appear on 2.0?

Positive 1.0 `Assets` balances import into 2.0 genesis as a disclosed pre-mine. They stay **legacy-locked** until the holder completes a **key upgrade** (`ClaimLegacy`) — prove 1.0 control, register 2.0 keys. See [spec 15](specs/15-ledger-import.md) and the [/claim/](/claim/) flow. Full account / Equity / grant narrative and Simba numbers: [legacy distribution brief](fragments/legacy-distribution.md) ([GIP-24](gips/gip-24.md)).

### How concentrated is the premine?

Very, by design of 1.0 history: top ~10 names hold ~63% of imported Simba supply; ~2,016 flat **100 GULD** Equity / package-manager grants are ~21%. Many reserved names (e.g. `satoshi`) may never claim — users can treat those as effectively out of circulation. Details and unlock-path split (PGP vs `isysd` attestation): [legacy distribution brief](fragments/legacy-distribution.md).

### Why move from 1.0 stake to 2.0 PoW?

Guld 1.0 used **identity- and contribution-weighted proof of stake**. Over time **consensus among stakers broke down** and **trust in the network diminished**. Guld 2.0 keeps identity-first names, groups, and leaves, but anchors **header consensus** in open **PoW** — a conservative, widely understood model — so new users can reason about finality without relying on a degraded stake quorum. See [UPGRADE_FROM_1.md](UPGRADE_FROM_1.md) and whitepaper §1.1a.

## Using the beta

### What is Simba?

**Simba** is the public Guld 2.0 **testnet** (`chain_id` 2). Run `guld-node --network simba` and use the wallet/explorer against your peer’s HTTP API. See [deploy/SIMBA.md](../deploy/SIMBA.md).

### Where is the wallet?

The primary wallet is the **static web UI** in this repo (`/wallet/`), served by `guld-node --http-static`. Keys stay on your device.

## Building dapps

### How do I build a Guld dapp?

Register a name (or group), keep application state in a **leaf** (files hashed into `master_hash`), and advance the tip with **`UpdateMaster`** when the right keys cosign. Validators do **not** run your app logic — they witness authorized heads. Start from:

- Landing: [/#developers](/#developers)
- SDK: [`@guld/js`](../src/guld-js/README.md)
- Pattern: [reference dapp](research/reference-dapp.md) · [spec 11](specs/11-leaf-host.md)

### What is the tic-tac-toe demo?

**[/demo/ttt/](/demo/ttt/)** is the shipped **reference dapp** — a working proof of concept on Simba. Each legal move tips the published `ttt-demo` group account; you can follow tips in the [explorer](/explorer/#/account/ttt-demo). Package: [`guld-tic-tac-toe`](../src/guld-tic-tac-toe/) · write-up: [reference-dapp.md](research/reference-dapp.md).

### How do sites log users in with a Guld name?

The browser extension signs a short challenge (`guld1login` / Spec 14 §10.1). Demo: [/demo/login/](/demo/login/).
