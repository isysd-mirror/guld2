# Browser extension pairing

The reference PWA and **guld-extension** share wallet UI via [`guld-web-ui`](/software/guld-web-ui/) ([GIP-32](../gips/gip-32.md), Spec 14 §10.2).

## Install (development)

1. From the umbrella checkout, link the UI into the extension:

```bash
bash src/guld-extension/scripts/link-web-ui.sh
```

2. Chrome → `chrome://extensions` → Developer mode → **Load unpacked** → `src/guld-extension`.

3. Open the popup → **Open wallet** (full-tab `guld-web-ui`).

## Pair with the website

1. Register or log in on a peer (`/register/`, `/login/`, or `/settings/`).
2. When the extension is detected, choose **Pair extension**.
3. Confirm in the extension window (same keyring passphrase). Encrypted keys (+ optional contacts) copy into the extension store — no silent sync.

Site-login demo: [/demo/login/](/demo/login/).

## Notes

- The PWA works without the extension.
- After pairing, prefer the extension when logging into other sites (`window.guld`).
- Re-pair from Settings anytime; continuous sync is out of scope for v1.
