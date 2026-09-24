# Spec 14 — Reference UI (PWA wallet & webapp)

**Status:** draft  
**Related:** [`11-leaf-host.md`](11-leaf-host.md), [`12-rpc.md`](12-rpc.md), [`16-sponsored-registration.md`](16-sponsored-registration.md), [`00-overview.md`](00-overview.md)

## 1. Goals

- Ship a **reference client** without prioritizing native mobile apps first.  
- **Primary wallet UX:** installable **PWA** — register, send, balance, activity.  
- **Target journey** (whitepaper §1.4): hear about Guld → guld.io or install software → name + fee → sponsor → PWA with on-device keys → **browser extension** for site login → many dapps, one identity.  
- **Optional external signing** for users who refuse in-browser keys.  
- **Webapp** also hosts explorer, whitepaper, and specs.

The **browser extension** is **ecosystem software** (not required to validate the chain) but is **in scope for the target user story** as the bridge for “log into this website as my Guld name.”

Intent: [`../intents/pwa-reference-wallet.md`](../intents/pwa-reference-wallet.md).

### 1.1 Implementation status

| Surface | Target | Shipped today |
|---------|--------|---------------|
| **guld.io PWA** | **Primary** reference wallet | Read-only `/wallet/` (status, lookup, activity); send/register not yet |
| **Browser extension** | Site login + key link for dapps | Separate repo / later phase |
| `guld-wallet` (Dioxus desktop) | Power users, legacy PGP claim, external signing | First-run wizard, Send, Activity, Settings |
| Mobile native | Later | PWA covers cross-platform first |

## 2. Reference surfaces

| Surface | Role |
|---------|------|
| **Webapp / PWA** (`guld.io` tree) | **Daily wallet:** register, send, balance, activity, explorer, docs |
| **Browser extension** | Link same key; **log into Guld dapps** in the browser |
| **`guld-wallet` (desktop)** | Optional: file keyring, legacy claim, external signing |
| **`guld-node --http`** | HTTP API `/api/v1/…` — canonical chain surface |

**Reference stack (PWA):** **repo root** static tree + local or remote `guld-node --http` (optionally `--http-static .`). **Web stack:** framework-less JS matching `iramillercom/public` (no React/Vue/bundler). No `guld-api`. No Node.js build.

**Reference stack (web identity):** PWA keyring **+** extension for cross-origin dapp login (challenge signing). Extension MUST NOT replace consensus; dapps verify signatures under the user’s registered keys / name lookup via HTTP API.
## 3. Components

| Component | Role |
|-----------|------|
| guld.io | Static PWA at **repo root** — primary human wallet + explorer + docs |
| `guld-node --http` | HTTP API for wallet reads/writes; MUST NOT store keys |
| `guld-wallet` | Optional Dioxus desktop — legacy claim, external signing |
| `guld-client` | Rust RPC/HTTP client, keyring, signing (desktop + tooling) |

Clients MUST NOT embed consensus validation; they talk to a node via the **HTTP API** (JSON-RPC remains a transitional adapter on `--rpc`).

`guld-api` (Python) is **deprecated** for the reference wallet — superseded by `guld-node --http`.

## 4. Reference webapp (guld.io tree)

The static webapp SHOULD provide:

- **Wallet:** first-run onboarding, send, balance, activity, settings (contacts)  
- **Explorer:** account lookup by name, blocks, legacy import browse  
- **Docs:** whitepaper, specs, how to run a node  
- **PWA:** manifest, service worker, installable shell  

Read paths use the node HTTP API (`GET /api/v1/chain/…`). Write paths build signed txs client-side and `POST /api/v1/chain/transactions` for broadcast.

It MUST work read-only against any reachable node HTTP API without keys. Full wallet flows SHOULD work with browser-stored keys or external signing.

### 4.1 Optional paid registrar

Any funded peer MAY enable **paid registrations** in the reference software by connecting a **supported third-party payment service** and fulfilling spec 16 requests as sponsor. guld.io may ship with this **on** for bootstrap; other clones default **off**. Intent: [`../intents/bootstrap-gateway-registrar.md`](../intents/bootstrap-gateway-registrar.md).

The wallet MUST still support **friend sponsor** (paste/QR registration JSON) without any payment gateway.

## 5. Security requirements (reference wallet)

| Rule | Requirement |
|------|-------------|
| Key storage (browser) | Encrypted IndexedDB; passphrase local-only; MUST NOT upload secrets to API |
| External signing | Unsigned payloads exportable; signed payloads importable; no key required in browser |
| Confirmations | User confirms sends and registration before broadcast |
| Node trust | Label operator-hosted RPC as light-client / custodial risk; power users run own node |

## 6. Non-goals (reference UI)

- Replacing full node  
- Browser extension as required protocol surface  
- Native mobile-first roadmap blocking PWA reference  
- QR codes for routine sends (names are typed)  

## 7. Open parameters

- JS/WASM signing crate parity with `guld-client`  
- Passphrase KDF and keyring schema in browser  
- Hardware key / PQ key UX later  
- Deep links `guld://` for handoff to desktop signer (**TBD**)  

## 8. Wallet flows

### 8.1 First-run wizard (PWA)

Empty keyring opens setup:

| Path | Who | Steps |
|------|-----|--------|
| **New name (default)** | Most users | Pick name → generate key in browser **or** export unsigned request for external sign → show sponsor QR/JSON → poll until registered |
| **Import key** | Returning device | Paste secret; encrypt to local keyring |
| **Legacy 1.0 claim** | ~2,217 import holders | Link to desktop wallet or dedicated claim flow (PGP) |
| **External signing only** | Paranoid / hardware | Never store key; build requests in browser, sign elsewhere, paste signed JSON |

Pending registration name + request JSON persist locally so users can leave and return.

### 8.2 Main shell

**Send**, **Activity**, **Settings** (contacts, API base, key backup/export). Legacy claim under Settings → Advanced or desktop wallet.

Funded users sponsor newcomers via **Sponsor a name** (paste registration request JSON).

### 8.3 Wallet contacts & Send UX (draft)

The reference wallet SHOULD feel social for **local** use — without on-chain “friend” graphs.

| Feature | Storage | Chain |
|---------|---------|--------|
| **Recent recipients** | Local `recent_recipients[]` | Names only; updated on send + optional activity backfill |
| **Favorites** | Local `contacts[]` with `favorite: true` | — |
| **Aliases** | `contacts[].alias` | Display only; tx always uses canonical `name` |
| **Send combobox** | UI | Order: favorites → recent → typed name |
| **Exists hint** | API/RPC | Debounced lookup while typing |

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

**QR (optional, Phase 2):** in-person contact exchange uses `guld1contact:` + compact JSON — import to local contacts only.

Intent: [`../intents/wallet-contacts-and-account-lookup.md`](../intents/wallet-contacts-and-account-lookup.md).

### 8.4 Explorer account lookup

The webapp explorer SHOULD support **exact** name lookup:

| Route | Source | Shows |
|-------|--------|--------|
| `#/account/<name>` | `guld_getAccount` | balance, kind, keys, legacy, expiry |
| Search box (home) | same | navigate to account route |

Prefix browse requires [`guld_searchAccounts`](12-rpc.md) or an indexer — not Phase 1.

### 8.5 Desktop wallet (optional)

`guld-wallet` mirrors PWA flows for users who prefer a file keyring or need **PGP legacy claim**. It MAY serve as the external signer for PWA-exported payloads. Not required for default onboarding.

## 9. Implementation order

**Done (dev reference):**

1. Repo-root static PWA, explorer, read-only `/wallet/` via `guld-node --http`  
2. `guld-node --http` — chain read endpoints (`/api/v1/…`); optional `--http-static .`  
3. `guld-client` + `guld-wallet` — desktop reference  

**Next (PWA wallet):**

1. Browser keyring + signing (register intent, transfer) + fee estimate in first-run  
2. POST tx broadcast via `guld-node --http`  
3. First-run wizard + friend/paid sponsor (§1.4 steps 3–5)  
4. PWA install + **browser extension** site-login (§1.4 steps 6–7)  
5. Send + contacts/recent  
6. Desktop wallet as optional signer + legacy claim only  
