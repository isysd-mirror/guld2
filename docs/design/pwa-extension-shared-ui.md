# Shared web UI (PWA + extension) & pairing

**Status:** design draft  
**GIP:** [`../gips/gip-32.md`](../gips/gip-32.md) (Draft)  
**Normative UI:** [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md) §10 / §10.2  
**Task:** [`../tasks/open/039-guld-web-ui-extension-pair.md`](../tasks/open/039-guld-web-ui-extension-pair.md)

## 1. North star

One reference wallet UI. Two hosts. The extension is how you log into other sites — and optionally how the PWA keeps keys ready — not a second, thinner product.

**Address people by name** on the same screens whether you opened `/wallet/` on a peer or **Open wallet** from the extension.

## 2. Product decisions (locked)

| Decision | Rule |
|----------|------|
| **`guld-web-ui` leaf** | Shared modules/CSS/page logic live in `src/guld-web-ui/` (`@guld/web-ui`). Not inside `@guld/js`. |
| **Thin hosts** | Umbrella = PWA routes + SW + marketing. Extension = MV3 provider + full-tab host + thin popup. |
| **Confirmed pair only** | No silent key sync. User unlocks and confirms in the extension. |
| **PWA works alone** | Extension never required for register/send. |
| **Prefer extension when paired** | If `window.guld` is present and paired/unlocked, PWA SHOULD route signing through the provider. |
| **Contacts in pair payload** | Optional local address-book handoff; never uploaded to the node. |
| **No continuous sync (v1)** | Re-pair or explicit push/pull later. |

## 3. Information architecture

### 3.1 In `guld-web-ui`

Register, wallet, keys, contacts, settings, claim, gateway, login — page modules, wallet libs, tokens/wallet CSS, host runtime, parameterized chrome.

### 3.2 Umbrella-only

Landing, explorer, docs, software catalog, `sw.js`, `manifest.webmanifest`, site marketing chrome.

### 3.3 Extension-only

`manifest.json`, background service worker, `content.js` / `inject.js` (`window.guld`), confirm window (connect / login / pair), origin grants, thin popup (status + **Open wallet**).

### 3.4 Full tab vs popup

| Surface | Role |
|---------|------|
| **Full tab** | Primary extension wallet — same `guld-web-ui` pages as the PWA |
| **Popup** | Launcher: unlock hint, active name, open full-tab wallet, link to grants |
| **Confirm window** | Connect, site-login, pair accept — focused, origin-bound |

## 4. Host runtime

```text
host.kind          "pwa" | "extension"
host.storage       persistent key/value (localStorage or chrome.storage facade)
host.session       tab/session key/value
host.assetUrl(p)   resolve logo/CSS/module bases
host.registerSW()  PWA only; no-op in extension
```

Storage-touching libs (keyring, contacts, session, api/rpc URLs, gateway prefs, claim draft) MUST use `host.storage` / `host.session` only.

## 5. Pairing UX

### 5.1 When to offer

1. After successful registration (success step card).
2. Login / empty keyring when extension missing or unpaired.
3. Settings → **Browser extension**.

### 5.2 Copy (default)

**Extension detected, not paired**

> Pair with the Guld extension to use the same keys when logging into websites. Your keys stay on this device; you will confirm in the extension.

**Extension not installed**

> Install the Guld browser extension to log into websites with your name. You can keep using this wallet without it.

**Paired**

> Extension paired. Signing prefers the extension when it is unlocked.

### 5.3 Flow

1. PWA detects `window.guld` (`guld#initialized`).
2. User chooses **Pair**.
3. PWA calls provider pair offer with encrypted keyring blob (+ optional contacts JSON).
4. Extension confirm UI lists account names → user unlocks / accepts.
5. Extension writes into shared `chrome.storage` keyring.
6. PWA records local pair marker (`guld.extensionPair.v1`).

### 5.4 Install path

Until Chrome Web Store publish: Settings + help link to load-unpacked `src/guld-extension` and software shelf `/software/guld-extension/`. After publish: store URL.

## 6. Non-goals (v1)

- Silent/background key sync
- Continuous two-way contacts sync
- Folding DOM into `@guld/js`
- Moving explorer/docs/landing into `guld-web-ui`
- Requiring extension for PWA use
- Firefox/Safari packaging

## 7. Implementation phases

Tracked in task [039](../tasks/open/039-guld-web-ui-extension-pair.md):

1. Docs (GIP / design / Spec 14)  
2. Scaffold `guld-web-ui` leaf  
3. Host adapter + storage migration  
4. Move wallet UI into leaf; thin umbrella shells  
5. Extension full-tab host + thin popup  
6. Pairing provider + offer surfaces  
7. CSS parity (retire parallel popup product chrome)
