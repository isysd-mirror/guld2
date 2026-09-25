---
gip: 8
title: Optional paid registrar
description: Any funded account MAY run a paid name registrar via third-party payment gateways.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Interface
created: 2026-09-25
---

## Abstract

Any funded account MAY run a paid name registrar via third-party payment gateways.

## Decision

**Any funded account** MAY run a **paid name registrar**: accept off-chain payment (BTC, ETH, SOL, USDT, fiat, …) via a **supported third-party payment service**, then submit a normal **spec 16** `RegisterUsername` as payer.

guld.io / **isysd** is only the **first** convenient instance during bootstrap — not a privileged role. An everyday user on **guld.io** (or any peer) opens **Settings**, links **their own** Paymento store, and sells sponsorships to friends — a permissionless OTC rail for GULD ↔ BTC/ETH/USDT/…. Friend-sponsor without Paymento remains first-class.

This is **convenience for onboarding**, not protocol authority.

## Why this is not network centralization

| Claim | Reality |
|-------|---------|
| “You must use guld.io to join” | **False.** Friend sponsor, self-build from git, or any peer’s paid desk. |
| “Only isysd can sell names” | **False.** Any funded name can enable the desk; competition is open. |
| “Payment gateway is consensus” | **False.** Third-party rails + local fulfill script are **out of protocol**; turn-offable. |
| “guld.io is the mint” | **False.** Same dual-sig register tx everyone already uses. |

## Flow

```text
Registrant (any wallet copy)
  → pick name, keys, sign intent (spec 16 JSON)
  → pay via registrar’s published gateway (Paymento link, …)
  → registrar’s automation sees payment (webhook)
  → RegisterUsername as payer (registrar’s name)
  → registrant polls until name exists
```

Friend-sponsor (no payment) remains first-class and MUST work without any gateway.

## First supported provider: Paymento

Non-custodial crypto payments ([API overview](https://docs.paymento.io/api-documentation/api-overview), [Payment Links](https://docs.paymento.io/payment-links), [Payment Callback / IPN](https://docs.paymento.io/api-documentation/payment-callback)). Funds settle to the merchant wallet; the gateway only notifies.

Paymento has **two** notification channels. Use the **same** URL for both:

| Channel | When | Config |
|---------|------|--------|
| **Payment Link webhook** | Fixed pay links | Per-link Advanced → Webhook |
| **Store IPN** | Gateway API (`/v1/payment/…` token flow) | Store settings / [Set Payment Settings](https://docs.paymento.io/api-documentation/additional-apis/manage-payment-settings) |

| Item | guld.io bootstrap |
|------|-------------------|
| Payment link | `https://app.paymento.io/payment-link/f1b2b2d170344105b0464c0944db2e21` |
| Webhook **and** IPN URL | `https://guld.io/api/v1/payment-gateway-webhook` |
| IPN method | HTTP POST (`IPN_Method = 1`) |
| Verify | HMAC-SHA256 of **raw** body vs `X-Paymento-Signature` (links) or `X-HMAC-SHA256-SIGNATURE` (IPN, often uppercase hex) |
| Secret env | `PAYMENTO_WEBHOOK_SECRET` (never commit) |

IPN body (gateway) looks like `{ "Token", "PaymentId", "OrderId", "OrderStatus", "AdditionalData" }` — status **7 = Paid**, **8 = Approve**. Payment Link bodies use `{ "event": { "id", "type" }, … }`. The node accepts both on one route.

Dashboard warning “IPN URL Not Configured” means set the **store** IPN to that URL (in addition to the payment-link webhook you already set). Without IPN, gateway API / plugin payments will not notify `guld-node`.

### Node flags

```bash
export PAYMENTO_WEBHOOK_SECRET='…'   # from Paymento settings
cargo run -p guld-node -- \
  --http 0.0.0.0:8080 \
  --http-static . \
  --registrar-payment-link default \
  …
```

- `--registrar-payment-link default` → published guld.io Paymento link  
- Or `--registrar-payment-link https://…` / env `GULD_REGISTRAR_PAYMENT_LINK`  
- `GET /api/v1/registrar` → `{ enabled, provider, paymentLink, … }` for the PWA  

Webhook events are persisted under `.guld-data/registrar/webhooks/<event.id>.json` (idempotent). **Auto sponsor fulfill** (sign + mempool) waits on wiring registrar payer keys — until then ops can fulfill manually from the queued event + registration request.

## Product shape (reference software)

- **Optional feature** in the reference wallet / node tooling: “Accept paid registrations.”  
- User connects **credentials / webhook** for a **supported** third-party provider (allowlist).  
- Fulfillment reuses the same registration-request JSON as friend-sponsor.  
- Off by default; no GULD → feature useless until funded.

guld.io may ship with the feature **on** for isysd during bootstrap; clones default **off**.

## Exit / evolution

- Bootstrap host turns its desk **off** when inventory or policy says so.  
- Or moves to a dedicated registrar name that self-funds (sell GULD, later buy back on a market).  
- Everyday registrars come and go freely — no hard fork.

## Non-goals

- Encoding payment rails in consensus or requiring them in `guld-node` validation  
- Mandating a single payment vendor  
- Requiring payment to claim legacy 1.0 balances  
- Custodial holding of the registrant’s spend keys  

## Implementation checklist

- [x] Document Paymento as provider #1 + guld.io link/webhook **and IPN**  
- [x] `POST /api/v1/payment-gateway-webhook` (HMAC verify; payment-link + IPN; idempotent store)  
- [x] `GET /api/v1/registrar` public desk config  
- [x] Wallet UI: show pay link when registrar enabled; attach registration request metadata  
- [x] Help: `/help/paymento/` pairing guide + Order ID regex  
- [ ] Auto `RegisterUsername` as payer after paid / OrderStatus 7–8  
- [ ] Optional: call Paymento Verify Payment API before fulfill  
- [ ] Clear UI: “This peer sells sponsorships; any other sponsor also works.”

## History

Supersedes: `docs/intents/bootstrap-gateway-registrar.md`
