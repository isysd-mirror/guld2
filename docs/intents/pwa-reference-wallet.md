# Intent: PWA reference wallet on guld.io

Status: accepted  
**Related:** [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md), [`../specs/16-sponsored-registration.md`](../specs/16-sponsored-registration.md), [`bootstrap-gateway-registrar.md`](bootstrap-gateway-registrar.md), [`../../README.md`](../../README.md), whitepaper §1.4

## Decision

The **reference wallet** is the installable **static PWA at the guld repo root**, bootstrap-mirrored at guld.io — not a desktop app as the default path.

**Web stack (locked):** framework-less JS, no bundler, multi-page HTML, ES modules, CSS tokens, PWA SW, npm for tests only. Site assets: `src/css`, `src/js`. New wallet features MUST stay in that stack.

## Target user story (normative for UX)

1. User hears about Guld.  
2. User goes to **guld.io** or installs Guld software (node + static wallet).  
3. User generates a key, picks an **available name**, sees **estimated GULD fee**.  
4. **guld.io** (paid registrar) **or someone they know** pays for registration (spec 16).  
5. User lives in an **installable PWA wallet** — keys on device; can **transact** and **develop their own dapp**.  
6. User links ecosystem tools to that key — **especially the browser extension** — and can **log into websites** with their Guld identity.  
7. User visits many **Guld dapps** with **one key, one passphrase habit, one name**.

Extension / web-login conventions are **ecosystem** (not consensus opcodes) but are **in-scope for the target experience**. Protocol MUST NOT require the extension to validate blocks.

## Onboarding detail

| Step | In-browser (default) | External signing (opt-in) |
|------|----------------------|---------------------------|
| Pick name + fee estimate | HTTP API availability + `F_user(L)` estimate | Same |
| Keys | Generate in browser; **AES-256-GCM** keyring + passphrase ([`../specs/01-cryptography.md`](../specs/01-cryptography.md) §3.1) | Export unsigned registration request only |
| Register | Friend QR/JSON **or** paid registrar gateway | Sign offline; paste signed JSON |
| Daily use | Send to names; activity; build leaf/dapp | Sign txs externally |

## Why PWA-first

- **One link** — Add to Home Screen when desired  
- **Cross-platform** without blocking on native apps  
- **Same static tree** everywhere (git clone or guld.io)  
- Names typed by humans; QR optional for sponsor / contacts  

## Security tiers

| Mode | Keys | Best for |
|------|------|----------|
| **Browser / PWA wallet** | Encrypted local; never uploaded | Everyday users |
| **+ Browser extension** | Same identity for site login | Web dapp SSO-style UX |
| **External signing** | Keys off-site | Paranoid / hardware later |
| **Remote HTTP API** | Trust that node for reads/broadcast | Label light-client risk |

## Implementation phases

### Phase 1 — Read (shipped)

- [x] `/wallet/` status, lookup, activity via `guld-node --http`  
- [x] Static site at **repo root** + `--http` / `--http-static .`

### Phase 2 — Register + send (shipped)

- [x] JS signing (register intent, transfer, cosign, rotate)  
- [x] First-run: name + letter-based fee estimate + keygen + confirm step  
- [x] Encrypted keyring; `Transfer` + `POST /api/v1/chain/transactions`  
- [x] Sponsored registration (friend + optional paid registrar)  
- [x] UpdateMaster + RotateKeys on account page  

### Phase 3 — Install + identity on the web

- [ ] PWA service worker / install prompt polish  
- [ ] **Browser extension**: site-login challenges for Guld dapps  
- [x] Contacts / recent recipients on send combobox  

### Phase 4 — Optional surfaces

- [ ] Desktop `guld-wallet` (legacy claim, external signer) — **deprecated** as default  
- [ ] External-signing-only flows without browser key storage  

## Non-goals

- Replacing full node or leaf-host  
- Consensus-mandated extension (validation works without it)  
- Native mobile app before PWA + extension story works  
