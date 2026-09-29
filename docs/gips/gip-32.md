---
gip: 32
title: Shared web UI leaf and extension pairing
description: Extract guld-web-ui for PWA and extension hosts; confirmed keyring pairing.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Application
created: 2026-09-28
requires: 5, 17
---

## Abstract

Extract the reference wallet surface into a shared leaf **`guld-web-ui`** (`@guld/web-ui`), hosted by both the static PWA and **guld-extension**. Introduce a **host runtime** (storage, paths, chrome) and a **confirmed pairing** protocol so the PWA can detect the extension, offer install/pair, and prefer it for signing when available — without silent key sync.

## Motivation

The whitepaper §1.4 journey ends in “PWA → extension → many dapps, one identity,” but today the extension maintains a parallel popup wallet and Spec 14 marks automatic PWA↔extension key sync as a non-goal. Users must manually export/import keys. Product surfaces drift (CSS, crypto copies, incomplete feature parity). A single UI leaf plus an explicit pair flow closes that gap while keeping the PWA usable alone.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

Normative UI: [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md) §10 (including §10.2). Creative SoT: [`../design/pwa-extension-shared-ui.md`](../design/pwa-extension-shared-ui.md).

1. **Leaf** — Wallet product UI (register, wallet, keys, contacts, settings, claim, gateway, login) MUST live in **`guld-web-ui`** (`src/guld-web-ui/` ↔ `repos/guld-web-ui.git`). Landing, explorer, docs browser, and software catalog MUST remain umbrella-only.
2. **Hosts** — The umbrella site MUST host `guld-web-ui` as the PWA (service worker, installability). **guld-extension** MUST host the same leaf in a full tab and MAY keep a thin popup launcher. The extension MUST NOT maintain a parallel full wallet product surface once this GIP is implemented.
3. **Host runtime** — Shared modules MUST access persistence and assets only through a host API (`kind`: `pwa` | `extension`; storage facades; asset base; SW register no-op on extension).
4. **Pairing** — Reference UI SHOULD offer install or pair after registration, on login, and in Settings. Pairing MUST require user confirmation in the extension. Payload MAY include encrypted keyring export (same AES schema as Spec 01 §3.1) plus local contacts/settings. Silent/background key sync without confirm MUST NOT be implemented. After pair, the PWA SHOULD prefer `window.guld` for signing when the extension is unlocked; the PWA MUST remain usable without the extension.
5. **Provider** — Extension MUST expose pair status/offer/accept methods per Spec 14 §10.2. Site-login (§10.1) is unchanged.
6. **SDK boundary** — `guld-web-ui` MUST NOT be folded into `@guld/js`. It MAY later import `@guld/js` for digests/tx helpers.

**No consensus changes.**

## Rationale

- One leaf avoids copy-sync drift between umbrella and extension submodule.
- Host adapter keeps page modules portable without forking trees.
- Confirmed pair revises the old “no automatic sync” non-goal into a safe, intentional handoff — not continuous two-way sync.

## Backwards Compatibility

- Existing `localStorage` keyring / contacts keys remain valid on the PWA host.
- Extension migrates `guld_keyring_v1` into the shared schema when adopting the leaf store.
- Manual `guld1key:` export/import remains supported.
- Site-login `v: 1` remains frozen.

## Security Considerations

- Pair payloads carry secrets — only same-origin peer pages plus extension confirm UI; never silent postMessage of privkeys to arbitrary origins.
- Contacts in pair payloads are PII — local only; never uploaded to the node by default.
- Extension confirm MUST show account names being imported before accept.

## Reference Implementation

- Design: [`../design/pwa-extension-shared-ui.md`](../design/pwa-extension-shared-ui.md)
- Task: [`../tasks/open/039-guld-web-ui-extension-pair.md`](../tasks/open/039-guld-web-ui-extension-pair.md)
- Code: `src/guld-web-ui/`, `src/guld-extension/` (full-tab host + pair), umbrella thin route shells

## History

- Advances Spec 14 §10 “PWA session via extension.” Extends [GIP-5](gip-5.md) and [GIP-17](gip-17.md).
- 2026-09-29: **Accepted** — Application; no consensus change.
