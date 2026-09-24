# Intent: Optional paid registrar (any peer + third-party gateway)

Status: accepted  
**Related:** [`../specs/16-sponsored-registration.md`](../specs/16-sponsored-registration.md), [`pwa-reference-wallet.md`](pwa-reference-wallet.md), [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md)

## Decision

**Any funded account** MAY run a **paid name registrar**: accept off-chain payment (BTC, ETH, SOL, USDT, fiat, …) via a **supported third-party payment service**, then submit a normal **spec 16** `RegisterUsername` as payer.

guld.io / **isysd** is only the **first** convenient instance during bootstrap — not a privileged role. An everyday user running the reference wallet against their own `guld-node` can turn the same feature on if they wire a supported gateway and have GULD to sell/sponsor.

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
  → pay via registrar’s published gateway (Stripe, BTCPay, …)
  → registrar’s automation sees payment
  → RegisterUsername as payer (registrar’s name)
  → registrant polls until name exists
```

Friend-sponsor (no payment) remains first-class and MUST work without any gateway.

## Product shape (reference software)

- **Optional feature** in the reference wallet / node tooling: “Accept paid registrations.”  
- User connects **credentials / webhook** for a **supported** third-party provider (allowlist, not every processor on earth day one).  
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

## Implementation notes (later)

- Provider adapters behind a small interface (webhook verify → enqueue sponsor tx).  
- Clear UI: “This peer sells sponsorships; any other sponsor also works.”  
- Price in foreign units is off-chain policy; on-chain fee remains `F_*` + inclusion.
