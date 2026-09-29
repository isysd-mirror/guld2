# Task: guld-web-ui leaf + extension pairing

Status: open (ops pin only)  
Priority: high  
GIP: ../gips/gip-32.md (**Accepted**)  
Design: ../design/pwa-extension-shared-ui.md  
Spec: ../specs/14-reference-ui.md §10 / §10.2  

## Problem

PWA and guld-extension duplicate wallet UI/crypto; users manually copy keys; Spec 14 “PWA session via extension” was later-only. We need one shared leaf, two hosts, and confirmed pairing.

## Work

### Docs

- [x] Design SoT: [`../design/pwa-extension-shared-ui.md`](../design/pwa-extension-shared-ui.md)
- [x] Spec 14 §10.0 / §10.2 + non-goal revision
- [x] GIP-32 Draft → **Accepted**
- [x] GIP index row
- [x] Help: [`../help/extension-pairing.md`](../help/extension-pairing.md)

### Implementation

- [x] Scaffold `src/guld-web-ui/` (`@guld/web-ui`); PACKAGES / REPO_LAYOUT / software.json
- [x] Local bare `repos/guld-web-ui.git` + `data/software-repos.json` pin (peer `--repos sync` / guld.io publish still maintainer)
- [x] Host runtime + storage adapter; route keyring/contacts/settings through it
- [x] Migrate wallet page modules, libs, CSS into leaf; umbrella re-exports / thin shells
- [x] Extension: `link-web-ui.sh`; full-tab host; shared chrome.storage; thin popup
- [x] Provider `guld_pairStatus` / `guld_pairOffer` / `guld_pairPull`; confirm UI
- [x] Register / login / Settings pair offers; help copy
- [x] CSS: popup uses tokens + launcher; full-tab uses wallet CSS from leaf

## Out of scope

- Consensus changes  
- Silent key sync  
- Continuous contacts sync  
- Folding UI into `@guld/js`  
- Firefox/Safari packaging  

## Notes

```
2026-09-29: Product work complete. Local bare + manifest pin added.
           Remaining: maintainer push to https://guld.io/repos/guld-web-ui.git
           (and refresh pin after leaf commits for unregister/bio UI).
```
