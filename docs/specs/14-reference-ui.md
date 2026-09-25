# Spec 14 — Reference UI (PWA wallet & webapp)

**Status:** draft  
**Related:** [`11-leaf-host.md`](11-leaf-host.md), [`12-rpc.md`](12-rpc.md), [`03-transactions.md`](03-transactions.md), [`04-proofs.md`](04-proofs.md), [`16-sponsored-registration.md`](16-sponsored-registration.md), [`00-overview.md`](00-overview.md), whitepaper §1.4 / §3 / §7  
**GIP:** [`../gips/gip-5.md`](../gips/gip-5.md)

This document is the **normative UI coverage map**: every whitepaper / L0 user capability, how the reference client exposes it, and which node API it consumes. Protocol validity stays in specs 02–04 / 07 / 16; this spec only defines screens, flows, and API wiring.

---

## 1. Goals

- Ship a **reference client** without prioritizing native mobile apps first.  
- **Primary wallet UX:** installable **PWA** — register, send, balance, activity, account management, **groups**, **threshold cosign**.  
- **Target journey** (whitepaper §1.4): hear about Guld → guld.io or install software → name + fee → sponsor → PWA with on-device keys → **browser extension** for site login → many dapps, one identity.  
- **Optional external signing** for users who refuse in-browser keys.  
- **Webapp** also hosts explorer, whitepaper, specs, docs browser, software catalog.

The **browser extension** is **ecosystem software** (not required to validate the chain) but is **in scope for the target user story** as the bridge for “log into this website as my Guld name.”

### 1.1 Implementation status (surfaces)

| Surface | Normative (spec) | Shipped today |
|---------|------------------|---------------|
| **guld.io PWA** | AES-256-GCM keyring + full §8–§10 flows | **Partial** — register (individual + group), send/subs/memo, UpdateMaster/RotateKeys + **cosign workstation**; Transfer still 1-of-1 |
| **Browser extension** | Same keyring schema as PWA; site-login | Encrypted keyring + register/sponsor/send; site-login **Next** |
| `guld-wallet` (Dioxus desktop) | Encrypted file keyring or OS keychain | Deprecated for default path; legacy claim still supported |
| Mobile native | Later | PWA covers cross-platform first |

Living feature matrix: **§3**.

---

## 2. Reference surfaces & stack

| Surface | Path / package | Role |
|---------|----------------|------|
| **Landing** | `/` (`index.html`) | Brand + entry to wallet / register / explorer |
| **Wallet PWA** | `/wallet/` | Daily: lookup, send, activity, account mgmt, contacts |
| **Register** | `/register/` | Individual (and later group) onboarding wizard |
| **Login / settings** | `/login/`, `/settings/` | Unlock keyring; API base; OTC desk prefs; contacts |
| **Gateway** | `/gateway/` | Optional paid registrar desk (spec 16) |
| **Claim** | `/claim/` | `ClaimLegacy` for 1.0 holders |
| **Explorer** | `/explorer/` | Blocks, txs, accounts (hash routes) |
| **Docs / specs / whitepaper** | `/docs/`, `/specs/`, `/whitepaper/` | Markdown browsers |
| **Software** | `/software/` | Package catalog + clone URLs |
| **Browser extension** | `src/guld-extension/` | Same key; dapp site-login |
| **Desktop (optional)** | `src/guld-wallet/` | File keyring, PGP claim, external signer |
| **Node** | `guld-node --http` | Canonical `/api/v1/…`; MUST NOT store keys |

**Reference stack (PWA):** repo-root static tree + local or remote `guld-node --http` (optionally `--http-static .`). **Web stack:** framework-less JS — web components, ES modules, CSS tokens (no React/Vue/bundler). No `guld-api`. No Node.js build for the site.

**API preference:** wallets and dapps SHOULD use **HTTP** `/api/v1/…`. **JSON-RPC** (`guld_*` methods on `--rpc` / same-origin `POST /rpc`) is a **transitional adapter** with the same logical ops ([`12-rpc.md`](12-rpc.md)). The explorer today reads via RPC; new wallet code SHOULD prefer HTTP and MAY fall back to RPC when only `--rpc` is available.

Clients MUST NOT embed consensus validation. The former Python `guld-api` façade was **removed**.

### 2.1 Optional paid registrar

Any funded peer MAY enable **paid registrations** by connecting a supported third-party payment service and fulfilling spec 16 as sponsor. guld.io may ship with this **on**; other clones default **off**. GIP: [`../gips/gip-8.md`](../gips/gip-8.md).

The wallet MUST still support **friend sponsor** (paste/QR registration JSON) without any payment gateway.

### 2.2 Testnet vs mainnet (durable)

Peers expose `mode` (`testnet` | `mainnet`), `network`, and optional `faucet` on `GET /api/v1/chain/status`. The reference UI MUST:

- Show a site-wide banner/footer derived from that peer (not a hard-coded “beta forever” string).
- Keep **settings presets** for both testnet and mainnet API bases after mainnet launch.
- On testnet when `faucet.ready`, offer **faucet register** (`POST /api/v1/faucet/register`) and **10 GULD drip** (`POST /api/v1/faucet/drip`) on register / wallet. Mainnet peers MUST NOT enable faucet routes.

Ops: [`../../deploy/SIMBA.md`](../../deploy/SIMBA.md).

---

## 3. Coverage matrix (protocol → API → UI)

Status: **shipped** | **partial** | **missing** | **out of UI** (node/miner/ops only) | **later** (roadmap, not blocking groups/cosign).

### 3.1 Transaction types ([`03-transactions.md`](03-transactions.md))

| Tx type | User need | Node API | Reference UI | Status |
|---------|-----------|----------|--------------|--------|
| `RegisterUsername` | Claim individual name | Fee estimate + `POST …/transactions` (or `guld_sendTransaction`) | `/register/` + friend JSON + gateway + **testnet faucet** | **shipped** |
| `RegisterGroup` | Multi-key group name; fee `F_group(L,n)` | Same + `kind=group`, `nKeys` | Group create wizard (§8.6) | **shipped** |
| `RegisterSubaccount` | `parent.label` device wallets (max 8) | Fee `kind=subaccount` + broadcast | Wallet account → create sub | **shipped** |
| `Transfer` | Send GULD name→name; optional memo ≤64 B | Broadcast | Wallet Send | **partial** (threshold 1 only) |
| `UpdateMaster` | Advance home tip under threshold | Broadcast + `threshold_cosign_v1` | Account → UpdateMaster + cosign workstation | **shipped** |
| `RotateKeys` | Change keys/threshold (hygiene, not resale) | Broadcast + dual auth | Account → RotateKeys + cosign workstation | **shipped** |
| `SettleRegistration` | Pay-or-release yearly name | Permissionless; miners enqueue | Wallet “Keep name funded” / renew hint (§8.9) | **partial** (expiry display TBD; no user settle button required — miners settle) |
| `ClaimLegacy` | Unlock 1.0 balance with PGP / attestation | Broadcast | `/claim/` | **shipped** |

### 3.2 Identity & proofs (whitepaper §3 / specs 02, 04)

| Capability | Node API | Reference UI | Status |
|------------|----------|--------------|--------|
| Name lookup, balance, keys, threshold, master | `GET …/accounts/{name}` / `guld_getAccount` | Wallet + explorer account | **shipped** |
| Activity feed | `…/activity` / `guld_getAccountActivity` | Wallet Activity; explorer links | **shipped** |
| Exists / fee estimate | `…/exists`; `guld_estimateRegistrationFee` | Register + Send hints | **shipped** |
| Threshold policy display | account JSON `threshold`, `keys[]` | Explorer + wallet | **shipped** |
| **Cosign workstation** (collect ≥`threshold` sigs) | Client-side; broadcast when complete | Shared partial-cosign import/export (§9) | **shipped** |
| Find accounts by pubkey | `guld_findAccountsByPubkey` | Settings / recovery hint | **partial** (RPC shipped; UI missing) |
| Prefix name search | `guld_searchAccounts` | Explorer / contacts typeahead | **partial** (RPC shipped; UI missing) |
| Local contacts / recent / favorites | — (local storage) | Send combobox | **partial** |
| Foreign-chain names (`bitcoin`, …) | Spec 13 | Read-only explorer later | **later** |
| Leaf / CAS put-get in wallet | `guld_putObject` / `getObject` | Not required for L0 wallet; leaf host | **later** / ops |

### 3.3 Chain / explorer / ops

| Capability | Node API | Reference UI | Status |
|------------|----------|--------------|--------|
| Tip, chain id, ready | `GET /chain/status` / RPC | Explorer home; wallet status | **shipped** |
| Block by height | `guld_getBlockByNumber` | `#/block/<h>` | **shipped** |
| Block by hash | `guld_getBlockByHash` | Deep link / search | **partial** (RPC shipped; explorer UI next) |
| Tx by height:index | Block body | `#/tx/<h>/<i>` | **shipped** |
| Tx by id | `guld_getTransaction` | Explorer search | **partial** (RPC shipped; explorer UI next) |
| Mempool fee hints / weight | `guld_getMempoolFeeHints`, `guld_estimateWeight` | Send fee defaults | **partial** (RPC shipped; fee UI next) |
| Rules hash / schedule | `guld_getGuldRulesHash`, `guld_getRulesSchedule` | Ops / about (optional) | **later** |
| Peer count / node info | `guld_peerCount`, `guld_nodeInfo` | Optional status chip | **partial** |
| Force mine (dev) | `guld_mineBlock` | **out of UI** | — |

### 3.4 Site (non-consensus)

| Surface | Status |
|---------|--------|
| Docs / specs / whitepaper browsers | **shipped** |
| Software catalog + tree/blob | **shipped** (MVP) |
| PWA install polish | **partial** |
| Extension site-login | **missing** (Phase 3) |

---

## 4. API consumption map

Logical ops: [`12-rpc.md`](12-rpc.md). Prefer HTTP where a route exists.

| Screen / flow | Prefer (HTTP) | RPC equivalent | Notes |
|---------------|---------------|----------------|-------|
| Status strip | `GET /chain/status` | `guld_blockNumber`, `guld_chainId`, `guld_ready` | Includes `mode` / `network` / `faucet` |
| Account card | `GET /chain/accounts/{name}` | `guld_getAccount` | |
| Activity | `GET …/activity` | `guld_getAccountActivity` | Use `tx_index` for explorer deep links |
| Exists while typing | `GET …/exists` | `guld_accountExists` | Debounce |
| Registration fee | `GET /chain/fees/registration?…` (when present) | `guld_estimateRegistrationFee` | Pass `kind`, `nKeys` for groups |
| Broadcast signed tx | `POST /chain/transactions` | `guld_sendTransaction` | **PWA write path** |
| Paid desk | `GET /registrar`, gateway orders | — | Spec 16; out of consensus |
| Testnet faucet | `GET/POST /faucet…` | — | Drip + free register; testnet only |
| Explorer blocks | — (today) | `guld_getBlockByNumber` | MAY add HTTP later |
| Explorer account | — or HTTP | `guld_getAccount` + activity | |
| CAS (tools) | — | `guld_putObject` / `guld_getObject` | Not default wallet chrome |
| Pubkey reverse lookup | — | `guld_findAccountsByPubkey` | Cosign invite / recovery |

**Signing:** all fee-paying txs are built and signed **in the client** (JS/WASM aligned with `guld-client` message tags). The node MUST NOT receive private keys.

**Memo:** optional UTF-8 ≤64 bytes on fee-paying txs ([`03-transactions.md`](03-transactions.md) §2.1); Transfer UI ships a memo field; other builders SHOULD expose the same optional field where useful (order ids).

---

## 5. Security requirements (reference wallet)

Normative crypto: [`01-cryptography.md`](01-cryptography.md) §3.1.

| Rule | Requirement |
|------|-------------|
| Key storage (browser) | **AES-256-GCM** encrypted keyring; **PBKDF2-SHA256** (≥310k iter) from user passphrase; MUST NOT persist `privHex` in plaintext |
| Unlock / lock | Passphrase unlock loads keys into memory only; lock clears decrypted material |
| Multi-key accounts | Keyring MAY hold several named key slots; UI MUST show which `key_index` the device holds for a group |
| External signing | Unsigned payloads exportable; signed payloads / cosign fragments importable; no key required in browser |
| Confirmations | User confirms sends, registrations, rotations, and broadcasts of completed cosign sets |
| Node trust | Label operator-hosted API as light-client / custodial risk; power users run own node |
| Leaf content | Wallet MUST NOT implement leaf/CAS encryption — opaque bytes only |

---

## 6. Non-goals (reference UI)

- Replacing full node or leaf-host runtimes  
- Browser extension as required protocol surface  
- Native mobile-first roadmap blocking PWA reference  
- QR codes for **routine** sends (names are typed); QR MAY be used for sponsor handoff and contact cards  
- On-chain friend graphs or social feeds  
- Interpreting leaf politics (“why we signed”) — only collect and verify threshold proofs  
- User-facing `SettleRegistration` broadcast as the primary renew UX (miners settle; wallet keeps balance funded)  
- Full foreign-chain light-client UX in Phase 1–2 of this spec  

---

## 7. Information architecture

### 7.1 Primary nav (marketing + app)

| Entry | Lands on |
|-------|----------|
| Wallet | `/wallet/` — requires unlock for writes |
| Get a name | `/register/` |
| Explorer | `/explorer/` |
| Docs / Specs / Whitepaper / Software | respective trees |

### 7.2 Wallet shell (after unlock)

| Tab / panel | Purpose |
|-------------|---------|
| **Home / Account** | Balance, kind, threshold, expiry hint, keys summary, deep links |
| **Send** | Transfer + memo; contacts combobox |
| **Activity** | Local view of `guld_getAccountActivity` |
| **Account tools** | UpdateMaster, RotateKeys, subaccounts, **Cosign**, **Create group** (or link to `/register/?kind=group`) |
| **Settings** | API base URL, contacts, key backup/export, sponsor a name, advanced / claim |

Sponsored friend path remains available from Register and Settings (“Sponsor a name” → paste registration JSON).

### 7.3 Explorer hash routes

| Route | Source | Shows |
|-------|--------|--------|
| `#/` | tip + recent blocks/txs | home |
| `#/block/<height>` | `guld_getBlockByNumber` | header, miner, tx list |
| `#/tx/<height>/<index>` | block body | type, amounts, names, memo, cosign count |
| `#/account/<name>` | account + activity | balance, **kind**, **keys**, **threshold**, expiry, activity |
| Search box | parse query | name → account; digits → block; `h:i` / `h/i` → tx |

Wherever a username, block height, or `height:index` locator is shown, link to the matching route. Prefix browse requires `guld_searchAccounts` — not Phase 1 of explorer.

---

## 8. Wallet flows (normative screens)

### 8.1 First-run wizard (PWA)

Empty keyring opens setup:

| Path | Who | Steps |
|------|-----|--------|
| **New individual name (default)** | Most users | Passphrase → pick name → fee estimate → keygen (encrypted) **or** export unsigned → sponsor (friend JSON/QR **or** paid desk) → poll until registered |
| **New group name** | Orgs / multisig | See §8.6 |
| **Import key** | Returning device | Passphrase + paste secret → encrypt per spec 01 §3.1 |
| **Legacy 1.0 claim** | Import holders | `/claim/` (PGP or attestation) |
| **External signing only** | Paranoid / hardware | Never store key; build requests in browser; sign elsewhere; paste signed JSON / cosign fragments |

Pending registration name + request JSON MUST persist locally so users can leave and return.

### 8.2 Main shell — Send & Activity

**Send:** from unlocked account → `to` name → amount → optional memo → confirm → sign (`threshold==1` spend sig today; n-of-m via §9) → broadcast → append `to` to `recent_recipients`.

**Activity:** list from node; link each item to explorer `#/tx/…` when `tx_index` present.

### 8.3 Contacts & Send UX

Local only — no on-chain friend graph. GIP: [`../gips/gip-20.md`](../gips/gip-20.md).

| Feature | Storage | Chain |
|---------|---------|--------|
| **Recent recipients** | Local `recent_recipients[]` | Names only |
| **Favorites** | Local `contacts[]` with `favorite: true` | — |
| **Aliases** | `contacts[].alias` | Display only; tx uses canonical `name` |
| **Send combobox** | UI | favorites → recent → typed |
| **Exists hint** | API | Debounced lookup |

```json
{
  "contacts": [
    { "name": "bob", "alias": "Bob (meetup)", "favorite": true }
  ],
  "recent_recipients": [
    { "name": "carol", "last_sent_at": "2026-09-23T20:00:00Z" }
  ]
}
```

**QR (optional):** in-person contact exchange MAY use `guld1contact:` + compact JSON — import to local contacts only. Not for routine payment.

### 8.4 UpdateMaster (tip advance)

| Step | UI |
|------|-----|
| 1 | Show current `master_hash`, `nonce`, `threshold`, key list |
| 2 | User pastes or computes `new_master_hash` (leaf tooling / hex) |
| 3 | If this device holds enough keys alone (`threshold==1` or multiple local slots), sign and broadcast |
| 4 | Else open **Cosign workstation** (§9) with message `guld/cosign/v1` over `account_id ‖ prev ‖ new ‖ nonce ‖ chain_id` ([`04-proofs.md`](04-proofs.md)) |
| 5 | On race failure (stale nonce/head), refresh account and restart |

**Shipped today:** step 3 for `key_index: 0` only. **Required next:** steps 4–5 for groups.

### 8.5 RotateKeys

| Step | UI |
|------|-----|
| 1 | Propose `new_keys[]` and `new_threshold` (paste pubkeys or generate) |
| 2 | If **group** and `n_new > n_old`, show **expansion fee** ≈ `F_group(L,n_new) − F_group(L,n_old)` (in addition to inclusion). Shrinking: inclusion only. |
| 3 | Collect **old** threshold cosignatures + `new_keys[0]` intent signature ([`03-transactions.md`](03-transactions.md) §3.3) |
| 4 | Confirm; broadcast; if this device’s key is removed, warn to export/backup first |

Wallet MUST preview the expansion fee before broadcast for groups.

### 8.6 RegisterGroup (create group)

Group registration is first-class in the whitepaper and `RegisterGroup` tx. The reference UI MUST provide a wizard; it MUST NOT force groups through the individual register path with silent `threshold: 1`.

**Entry:** `/register/?kind=group` or Wallet → **Create group**.

| Step | Behavior |
|------|----------|
| 1. Name | Same namespace rules as individuals (no `.`); live exists check |
| 2. Signers | Add `n ≥ 1` pubkeys (generate local key + paste others); show fee preview via `guld_estimateRegistrationFee(name, "group", n)` → `F_group(L,n) = F_user(L)×(2+n)` |
| 3. Threshold | Integer `1…n`; explain “need this many signatures to move tip / spend / rotate” |
| 4. Initial master | Default empty/zero tip or paste; optional |
| 5. Endowment | Optional GULD to fund the group account at create |
| 6. Auth | Build sponsored `RegisterGroup` dual-sig intent (registrant `keys[0]` + payer) like username ([`16-sponsored-registration.md`](16-sponsored-registration.md)) |
| 7. Sponsor | Friend paste/QR **or** paid desk (desk MUST accept `kind=group` and `nKeys`) |
| 8. Done | Poll until account exists; offer to save this device’s key slot as member of `name` |

**Constraints (UI MUST surface):**

- Groups **cannot** open subaccounts (only `individual` parents).  
- Larger `n` raises registration fee **and** ongoing tip weight (`W_sig`) — show a short warning.  
- After create, daily spend/tip for `threshold > 1` goes through §9.

### 8.7 RegisterSubaccount

Shipped under individual account tools: pick `label`, generate/import key, parent pays `F_sub`, dual-sig, create `parent.label`. Cap **8** live; UI MUST disable create when at cap and explain.

### 8.8 ClaimLegacy

`/claim/`: prove 1.0 control (PGP cleartext or `isysd` attestation per spec 15), set new keys/threshold, broadcast `ClaimLegacy`. After claim, normal yearly funding rules apply.

### 8.9 Name funding & expiry

Pay-or-release ([`../gips/gip-11.md`](../gips/gip-11.md)): miners include `SettleRegistration` when overdue. Reference UI SHOULD:

- Show `expires_at_height` (and approximate time) on the account card when the field is present in account JSON.  
- Warn when tip height approaches expiry and balance `<` next `F_*`.  
- Explain: keep the account funded; miners renew or release — **no** required user “Renew” button.  
- Optional advanced: “Request settle” that broadcasts permissionless `SettleRegistration` for an overdue name (power users / tools) — **MAY**.

### 8.10 Sponsor a name (friend path)

Funded user pastes registration request JSON (individual or group), reviews fee + name + keys, confirms, signs as `payer`, broadcasts. MUST remain available even when paid gateway is enabled.

### 8.11 External-signing-only

Settings / first-run opt-in: build unsigned tx or cosign challenge → download/copy → sign offline → paste signature fragment or full signed tx → broadcast. No private key in browser storage.

---

## 9. Cosign workstation

Threshold accounts (`threshold > 1`, or any account where this device holds fewer than `threshold` keys) need a **first-class UI** to assemble `threshold_cosign_v1` (and RotateKeys cosign lists) without inventing leaf politics.

### 9.1 Goals

- Export a **cosign request** (opaque to the chain): account name, message tag, binding fields (`prev_master_hash`, `new_master_hash`, `nonce`, `chain_id`, or rotate commit), and which `key_index` values are still needed.  
- Import **cosign responses**: `{ key_index, signature }` fragments from other devices/members.  
- Show progress: `signed / threshold` with distinct indices.  
- When `signatures.len() >= threshold`, offer **Broadcast** (builds final tx).  
- On stale nonce/head after delay, invalidate the session and force refresh from the node.

### 9.2 Transport (out of consensus)

| Mode | Norm |
|------|------|
| **Copy/paste JSON** | MUST — default, works offline air-gap style |
| **QR** | SHOULD — for in-person cosign of compact requests |
| **File download** | MAY |
| **In-band leaf / chat** | Out of scope for reference UI (leaf concern) |

### 9.2.1 Cosign JSON schema (**frozen** — ecosystem, not consensus)

Version field: **`v: 1`**. Types: `guld1cosignreq` / `guld1cosignres`. Private keys MUST NOT appear. Amounts and nonces are **decimal strings**. Hashes/keys/signatures are `0x` + lowercase hex.

**Request** (`guld1cosignreq`) — initiator builds this; co-signers re-derive the message and sign:

```json
{
  "v": 1,
  "type": "guld1cosignreq",
  "op": "update_master",
  "name": "treasury",
  "account_id": "0x…",
  "nonce": "0",
  "chain_id": 1,
  "threshold": 2,
  "keys": ["0x…", "0x…"],
  "needed": [0, 1],
  "inclusion_fee": "10000",
  "prev_master_hash": "0x…",
  "new_master_hash": "0x…"
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `op` | yes | `update_master` \| `rotate_keys` (`transfer` reserved — L0 spend still 1-of-1) |
| `name`, `account_id`, `nonce`, `chain_id` | yes | Bind to live account; stale nonce ⇒ discard |
| `threshold`, `keys` | yes | Current on-chain policy (snapshot at request time) |
| `needed` | yes | Distinct `key_index` values still unsigned; subset of `0..keys.len()` |
| `inclusion_fee` | yes | Quanta string; covered by signed message where applicable |
| `prev_master_hash`, `new_master_hash` | if `op=update_master` | Exact tip advance |
| `new_keys`, `new_threshold` | if `op=rotate_keys` | Proposed policy |
| `memo` | no | UTF-8 string ≤64 bytes if present |

**Response** (`guld1cosignres`) — one signature fragment; MUST echo binding fields so the collector can verify without trusting the peer:

```json
{
  "v": 1,
  "type": "guld1cosignres",
  "op": "update_master",
  "name": "treasury",
  "account_id": "0x…",
  "nonce": "0",
  "chain_id": 1,
  "inclusion_fee": "10000",
  "prev_master_hash": "0x…",
  "new_master_hash": "0x…",
  "key_index": 1,
  "signature": "0x…"
}
```

| Rule | Norm |
|------|------|
| Verify | Collector re-derives message bytes from echoed fields + `op`, verifies Ed25519 under `keys[key_index]` from the **live** account (or from request `keys` if still matching) |
| Merge | Distinct `key_index` only; duplicates overwritten by latest verified sig |
| Ready | `verified_indices.length >= threshold` ⇒ MAY build tx and broadcast |
| Stale | If node `nonce` / `master_hash` / `account_id` diverge from request → invalidate session |

**Registration request** (spec 16) for groups uses the same portable blob with `"type": "register_group"` (individual remains `"register_username"`). See [`16-sponsored-registration.md`](16-sponsored-registration.md) §4.

### 9.3 Where it appears

| Action | Opens workstation when |
|--------|------------------------|
| UpdateMaster | Local keys `< threshold` |
| Transfer (group spend) | Account `threshold > 1` (or proof required) |
| RotateKeys | Old policy needs multi-sig |
| RegisterGroup setup | Optional: collect co-founder pubkeys only (registration still dual-sig sponsor model); post-create tips use workstation |

### 9.4 Security copy

UI MUST state: cosigners authorize a **specific** statement (tip advance / spend / rotate). The network does not interpret why. A malicious majority of keys can move the account — same as any multisig; mitigation is `RotateKeys` and leaf policy.

---

## 10. Extension & dapp identity

| Phase | Behavior |
|-------|----------|
| Shipped | Shared encrypted keyring schema; register / sponsor / send |
| **Next (§1.4)** | Site-login: dapp presents challenge; extension signs under registered key; dapp verifies via node account lookup |
| Later | Multiple named accounts in extension; group key_index picker |

Extension MUST NOT be required to validate blocks. Challenge format is ecosystem (**TBD** with dapp SDK); document beside this spec when frozen.

---

## 11. Desktop wallet (optional)

`guld-wallet` mirrors PWA flows for users who prefer a file keyring or need **PGP legacy claim**. It MAY serve as the external signer / cosign participant for PWA-exported payloads. Not required for default onboarding.

---

## 12. Implementation order

**Done (dev reference):**

1. Repo-root static PWA, explorer, wallet via `guld-node --http`  
2. Encrypted browser keyring (spec 01 §3.1); individual register/send; letter-based fee estimate  
3. UpdateMaster + RotateKeys (1-of-1) in wallet account view  
4. Subaccounts; optional tx memo on Transfer  
5. Local contacts / recent recipients on send  
6. Paid registrar + friend sponsor (spec 16)  
7. Extension encrypted keyring parity (partial product)  
8. Docs / software browsers  
9. **RegisterGroup** wizard (`/register/?kind=group`) + gateway `register_group`  
10. **Cosign workstation** (`guld1cosignreq` / `guld1cosignres` v1) for UpdateMaster + RotateKeys  
11. Account card: kind, threshold, keys, expiry hint; wallet friend-sponsor form  

**Next:**

1. PWA install polish + **extension site-login**  
2. Contacts polish / exists hint (tasks 002+)  
3. Prefix search when `guld_searchAccounts` ships  
4. Explorer: tx-by-id / block-by-hash when RPC methods land  
5. External-signing-only path without browser key storage  
6. Group `Transfer` when consensus accepts threshold proofs for spend  
7. Mempool visualizer (draft intent) — later  

---

## 13. Open parameters

- Cosign request/response JSON **frozen** at §9.2.1 (`v: 1`)  
- Group spend (`Transfer` with `threshold > 1`) — consensus still 1-of-1; UI MUST refuse and point at funding a 1-of-1 sub or rotating  
- JS/WASM signing crate parity with `guld-client` for all message tags  
- Auto-lock timeout duration  
- Hardware key / PQ key UX later  
- Deep links `guld://` for handoff to desktop signer (**TBD**)  
- Extension site-login challenge format (**TBD**)  
- HTTP resource routes for blocks/CAS parity with RPC (§12)  

---

## 14. Doc maintenance

When a new tx type or logical RPC method is added:

1. Add a row to **§3** (coverage matrix).  
2. Add or extend a flow in **§8–§9**.  
3. Update **§4** API map and **§12** implementation order.  
4. Keep whitepaper §1.4 / §7 in sync at a summary level only — this file remains the UI SoT.
