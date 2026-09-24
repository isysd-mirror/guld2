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

| Surface | Normative (spec) | Shipped today |
|---------|------------------|---------------|
| **guld.io PWA** | AES-256-GCM keyring + register/send/account mgmt | **Done** — encrypted keyring, letter fees, send, UpdateMaster, RotateKeys |
| **Browser extension** | Same keyring schema as PWA | Encrypted keyring + passphrase unlock; register/sponsor/send |
| `guld-wallet` (Dioxus desktop) | Encrypted file keyring or OS keychain | Deprecated for default path; legacy claim still supported |
| Mobile native | Later | PWA covers cross-platform first |

## 2. Reference surfaces

| Surface | Role |
|---------|------|
| **Webapp / PWA** (`guld.io` tree) | **Daily wallet:** register, send, balance, activity, explorer, docs |
| **Browser extension** | Link same key; **log into Guld dapps** in the browser |
| **`guld-wallet` (desktop)** | Optional: file keyring, legacy claim, external signing |
| **`guld-node --http`** | HTTP API `/api/v1/…` — canonical chain surface |

**Reference stack (PWA):** **repo root** static tree + local or remote `guld-node --http` (optionally `--http-static .`). **Web stack:** framework-less JS — web components, ES modules, CSS tokens (no React/Vue/bundler). No `guld-api`. No Node.js build.

**Reference stack (web identity):** PWA keyring **+** extension for cross-origin dapp login (challenge signing). Extension MUST NOT replace consensus; dapps verify signatures under the user’s registered keys / name lookup via HTTP API.
## 3. Components

| Component | Role |
|-----------|------|
| guld.io | Static PWA at **repo root** — primary human wallet + explorer + docs |
| `guld-node --http` | HTTP API for wallet reads/writes; MUST NOT store keys |
| `guld-wallet` | Optional Dioxus desktop — legacy claim, external signing |
| `guld-client` | Rust RPC/HTTP client, keyring, signing (desktop + tooling) |

Clients MUST NOT embed consensus validation; they talk to a node via the **HTTP API** (JSON-RPC remains a transitional adapter on `--rpc`).

The former Python `guld-api` façade was **removed**; the reference wallet uses `guld-node --http` only.

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

Normative crypto: [`01-cryptography.md`](01-cryptography.md) §3.1.

| Rule | Requirement |
|------|-------------|
| Key storage (browser) | **AES-256-GCM** encrypted keyring; **PBKDF2-SHA256** (≥310k iter) from user passphrase; MUST NOT persist `privHex` in plaintext |
| Unlock / lock | Passphrase unlock loads keys into memory only; lock clears decrypted material |
| External signing | Unsigned payloads exportable; signed payloads importable; no key required in browser |
| Confirmations | User confirms sends and registration before broadcast |
| Node trust | Label operator-hosted RPC as light-client / custodial risk; power users run own node |
| Leaf content | Wallet MUST NOT implement leaf/CAS encryption — opaque bytes only |

## 6. Non-goals (reference UI)

- Replacing full node  
- Browser extension as required protocol surface  
- Native mobile-first roadmap blocking PWA reference  
- QR codes for routine sends (names are typed)  

## 7. Open parameters

- JS/WASM signing crate parity with `guld-client`  
- Auto-lock timeout duration  
- Hardware key / PQ key UX later  
- Deep links `guld://` for handoff to desktop signer (**TBD**)  

## 8. Wallet flows

### 8.1 First-run wizard (PWA)

Empty keyring opens setup:

| Path | Who | Steps |
|------|-----|--------|
| **New name (default)** | Most users | Set passphrase → pick name → generate key in browser (encrypted at rest) **or** export unsigned request for external sign → sponsor QR/JSON → poll until registered |
| **Import key** | Returning device | Passphrase + paste secret → encrypt to local keyring per spec 01 §3.1 |
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

1. Repo-root static PWA, explorer, wallet via `guld-node --http`  
2. Encrypted browser keyring (spec 01 §3.1), register/send, letter-based fee estimate  
3. UpdateMaster + RotateKeys in wallet account view  
4. Local contacts / recent recipients on send  
5. Paid registrar + friend sponsor (spec 16)  
6. Extension encrypted keyring parity  

**Next:**

1. PWA install polish + **browser extension** site-login (§1.4 steps 6–7)  
2. Prefix account search / indexer (`guld_searchAccounts`)  
3. P2P sync + leaf host (specs 09 / 11)  
