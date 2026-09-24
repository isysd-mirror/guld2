# Pairing guld.io with Paymento

This guide covers two roles on the same peer (e.g. **guld.io**):

1. **Bootstrap desk** — the peer’s optional Paymento link for first-time Sign up.
2. **Your OTC desk** — any funded name configures *their own* Paymento store in **Settings**, sells GULD for BTC / ETH / USDT / USDC / … at their own price, and invites friends with a share link.

Configuring a Paymento store in the guld wallet turns that user into a **permissionless exchange point**: they collect off-chain payment via Paymento and spend GULD on-chain as `RegisterUsername` payer (spec 16). Friend sponsorship without Paymento still works.

## Flow (user arrives on guld.io)

```text
1. Sign up → pay peer bootstrap desk (or a friend’s invite link)
2. Receive name + keys in this browser
3. Settings → enable OTC desk → paste your Paymento payment link + fee + webhook secret
4. Publish desk to the peer (HMAC secret stored on the node for multi-merchant webhooks)
5. Copy invite URL → friends register on guld.io but pay YOUR store
6. Gateway → sign when payment received
```

## What you are connecting

| Piece | Role |
|-------|------|
| **guld-node** | Serves PWA + `/api/v1`; stores orders; verifies webhooks against **env secret and/or published desk secrets** |
| **Paymento** | Collects off-chain payment; notifies the peer webhook |
| **Settings (your browser)** | Your payment link, fee (USD), registrar name, optional API key + HMAC secret |
| **Gateway** | Orders you sponsor; sign `RegisterUsername` |

## 1. Node (peer operator)

```bash
export PAYMENTO_WEBHOOK_SECRET='…'   # bootstrap store secret (optional if only OTC desks)
cargo run -p guld-node -- \
  --http 0.0.0.0:8080 \
  --http-static . \
  --registrar-payment-link default \
  …
```

`GET /api/v1/registrar` returns the bootstrap link plus public `desks[]` (no secrets).

## 2. Paymento (each merchant store)

Every OTC desk (including the bootstrap store) should set **both**:

| Channel | URL |
|---------|-----|
| Payment Link webhook | `https://guld.io/api/v1/payment-gateway-webhook` |
| Store IPN (POST) | same |

HMAC of the raw body vs `X-Paymento-Signature` / `X-HMAC-SHA256-SIGNATURE`.
When you **Publish desk** in Settings, your store’s HMAC secret is stored on the peer so signatures verify alongside the env secret.

## 3. Settings — your OTC desk

1. Log in as your funded name.
2. **Settings → Your OTC desk (Paymento)** → enable.
3. Payment link, desk fee (USD), registrar name.
4. Paste webhook HMAC secret; check **Publish desk to this peer**.
5. Save → **Copy invite link**.

Invite URL shape:

```text
/register/?pay=<paymentLink>&sponsor=<yourName>&fee=<usd>
```

Friends use that link so Sign up charges **your** store, not (only) the peer bootstrap desk.

## 4. Order ID (registrant paste)

```regex
^guldreg_[a-z0-9._]+_[0-9a-f]{8}$
```

Same as `GULD_ORDER_ID_RE` in `/src/js/lib/order-id.js`. Paste into Paymento customer **name** (fixed payment-link flow).

## 5. After payment

Toast / Gateway → **Sign registration** with your local key → friend polls until registered → they can open Settings and become the next desk.

## Desk policy

- Paid desks on this peer only sell names with **6+ characters** via the Sign up UI / order API.
- Protocol still allows shorter names via self-run node / friend sponsor.

## Checklist

- [ ] Peer webhook URL set in your Paymento store (link + IPN)
- [ ] Settings: OTC on, fee set, secret published
- [ ] Invite link copied
- [ ] Test pay → Gateway *payment received* → sign

## Further reading

- Intent: [`../intents/bootstrap-gateway-registrar.md`](../intents/bootstrap-gateway-registrar.md)
- Spec 16: [`../specs/16-sponsored-registration.md`](../specs/16-sponsored-registration.md)
- Paymento: [Payment Links](https://docs.paymento.io/payment-links), [IPN](https://docs.paymento.io/api-documentation/payment-callback)
