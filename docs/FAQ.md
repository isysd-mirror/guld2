# Guld FAQ

**Address people by name.** Short answers for newcomers. Normative detail: [whitepaper](whitepaper/guld-2.0.md) · [specs](specs/README.md).

## Guld 1.0 and 2.0

### Does Guld 2.0 replace Guld 1.0?

No. **Guld 2.0 is a hard fork** from a Guld 1.0 ledger snapshot. The **1.0 chain continues** — 1.0 software and **1.0 coins still work** there. This repo ships 2.0; staying on 1.0 remains a valid choice.

### How do 1.0 balances appear on 2.0?

Positive 1.0 `Assets` balances import into 2.0 genesis as a disclosed pre-mine. They stay **legacy-locked** until the holder completes a **key upgrade** (`ClaimLegacy`) — prove 1.0 control, register 2.0 keys. See [spec 15](specs/15-ledger-import.md) and the [/claim/](/claim/) flow. Full account / Equity / grant narrative and Simba numbers: [legacy distribution brief](fragments/legacy-distribution.md) ([GIP-24](gips/gip-24.md)).

### How concentrated is the premine?

Very, by design of 1.0 history: top ~10 names hold ~63% of imported Simba supply; ~2,016 flat **100 GULD** Equity / package-manager grants are ~21%. Many reserved names (e.g. `satoshi`) may never claim — users can treat those as effectively out of circulation. Details and unlock-path split (PGP vs `isysd` attestation): [legacy distribution brief](fragments/legacy-distribution.md).

### Why move from 1.0 stake to 2.0 PoW?

Guld 1.0 used **identity- and contribution-weighted proof of stake**. Over time **consensus among stakers broke down** and **trust in the network diminished**. Guld 2.0 keeps identity-first names, groups, and leaves, but anchors **header consensus** in open **PoW** — Bitcoin-**parameter** SHA256d timing (≈10 min / 2016-block retarget), a conservative and widely understood **parameter class**. That is **not** a Bitcoin-class **security budget** claim: rewrite cost tracks empirical hashrate. Early nets will be low-hash. See [UPGRADE_FROM_1.md](UPGRADE_FROM_1.md), whitepaper [§11](whitepaper/guld-2.0.md#11-security-notes-and-risks), and the [security-budget blurb](fragments/security-budget.md).

### Is Guld “as secure as Bitcoin”?

**No.** Same *kinds* of PoW parameters (algorithm family, block interval, retarget shape) ≠ peer-class hashrate or rewrite cost. Launch is **solo SHA256d**; merged mining is **not** a launch requirement. Full wording: [security-budget blurb](fragments/security-budget.md).

## Using the beta

### What is Simba?

**Simba** is the public Guld 2.0 **testnet** (`chain_id` 2). Run `guld-node --network simba` and use the wallet/explorer against your peer’s HTTP API. See [deploy/SIMBA.md](../deploy/SIMBA.md) and [SIMBA_BETA.md](SIMBA_BETA.md). **Simba will not reset again** — tip-incompatible changes ship as **[Mufasa](MUFASA.md)** (named next testnet; not launched yet). Height-activated Core catch-up stays on Simba ([055](tasks/open/055-simba-single-rule-bundle.md)).

### What is Mufasa?

**Mufasa** is the **planned** successor testnet name (`mufasa`, planned `chain_id` 3) for breaks that cannot height-activate on Simba’s locked tip. Not live — no genesis or `--network mufasa` profile yet. Planning: [MUFASA.md](MUFASA.md); launch checklist: [052](tasks/open/052-next-testnet-checklist.md).

### Where is the wallet?

The primary wallet is the **static web UI** in this repo (`/wallet/`), served by `guld-node --http-static`. Keys stay on your device.

### How do I invite a friend?

Use **Contacts** (planned `/contacts/` — [GIP-31](gips/gip-31.md)): keep an address book, then share a **private** message with a register link. The invite does **not** reserve a name. Optionally check **Offer to sponsor** so they come back to you for friend-sponsor ([Spec 16](specs/16-sponsored-registration.md)); otherwise the link can steer them to a payment desk on your peer. Design: [contacts-and-private-invite](design/contacts-and-private-invite.md).

Until that UI ships, you can still sponsor someone who pastes a registration request into Wallet → Sponsor a name, or share your OTC invite URL from Settings if you run a desk.

## Source and releases

### Where do I clone from? Is GitHub the source of truth?

**No.** Clone from **`https://guld.io/repos/guld.git`** (and package remotes under `/repos/`). Peers in the mesh may host the same tree. GitHub, when present, is an **optional mirror** for discoverability and contributor UX. CI is local pre-commit; releases are maintainer **PGP-signed tags**. Detail: [SOURCE_AND_RELEASE.md](SOURCE_AND_RELEASE.md).

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
