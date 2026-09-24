# Intent: guld.io in the `guld` leaf + scoped miner governance

Status: draft  
**Related:** [`bootstrap-gateway-registrar.md`](bootstrap-gateway-registrar.md), [`software-browser.md`](software-browser.md), [`repo-layout.md`](repo-layout.md), [`pwa-reference-wallet.md`](pwa-reference-wallet.md), [`../specs/02-identity-and-accounts.md`](../specs/02-identity-and-accounts.md), [`../specs/08-cas-and-homes.md`](../specs/08-cas-and-homes.md), [`../specs/06-blocks-and-consensus.md`](../specs/06-blocks-and-consensus.md)

## Goal

Host the **guld.io reference surface** inside the **`guld` name’s leaf / home**, and give **miners**—not a privileged founder or domain owner—**programmatically scoped** governance over **enumerated critical choices**.

**Primary critical choice:** the **payment gateway roster** offered on the bootstrap site. That list decides who receives off-chain money and who spends GULD as registrar—a **financial transaction with identifiable beneficiaries**. It MUST be decentralized once bootstrap inventory rotates.

Any fork MAY deploy the same pattern on an alternate domain. **guld.io is a convenience mirror, not protocol privilege.**

## Decision (proposed)

### 1. Site lives in the `guld` leaf

- The open-source tree that *is* the reference wallet/site is committed under the **`guld` account home** (CAS / master hash), not only as an off-chain nginx host.
- Serving guld.io (or any peer’s `--http-static`) SHOULD be able to materialize from that leaf tip (or a signed pin of it)—same bytes users clone from git / `/repos/`.
- DNS for `guld.io` remains ordinary DNS; the **authoritative product bytes** are the leaf.

### 2. Programmatic scope: miners control only what we encode

Miner-facing contracts / messages (schema TBD) govern **named objects**, not “whatever is in the git tree.”

| Miners **do** govern | Miners **do not** govern |
|----------------------|---------------------------|
| **Payment gateway roster** (who may be offered as a paid desk on the bootstrap site) | CSS, layout, copy, marketing pages |
| Optional: other **enumerated** critical params we deliberately add later (rare) | Day-to-day content, blog posts, docs wording |
| | Ordinary feature/UI PRs that do not change governed objects |

We **can and should** define exactly what miners control and how (quorum, challenge window, object hash). Coupling miners to **beneficiary selection** is intentional; coupling them to **paint color** is not.

**Caution:** Bitcoin keeps miners far from application release politics for good reason. Guld’s tighter option is safe **only because scope is narrow and explicit**. Expanding the governed set is a new intent each time—not an accident of “the whole HEAD hash.”

If a future slice endorses a **reference tip**, that endorsement MUST hash **only governed artifacts** (e.g. `gateways.json`), not the entire marketing tree—so a CSS PR cannot become a miner vote.

### 3. Miner-managed payment gateway roster (critical path)

Bootstrap problem: **isysd** (or whoever) may be the **first** gateway backer on guld.io and will eventually **run out of GULD willing to sell**. Then:

- Who backs the next desk on the *bootstrap site*?  
- Who decides? → **Miners**, from an evolving candidate list—not a permanent founder privilege.

Why this object specifically: each accepted desk is a **financial intermediary**—Paymento (or peer) rails in, GULD sponsorship out. Beneficiaries are the desk operator (and indirectly miners who include related txs). Leaving that list to a single domain owner recreates a privileged mint UX; leaving it to miners (with exits) matches the network’s power.

**Sketch:**

```text
Operators publish desk offers → (link, fee USD, registrar name, inventory hints, …)
     → miners select / weight / accept into the site’s offered roster
     → site UI sorts candidates (e.g. lowest fee first)
     → registrants pick or get auto-routed to an accepted desk
```

**Price honesty:** sorting by “lowest price offered” invites lying. A later slice SHOULD verify or bond offers somehow (examples, non-normative): posted bond in GULD, attested recent fulfill count, challenge period, or off-chain oracle with miner-attested snapshots. Not required for v0 of the roster; required before auto-routing on price alone.

**Personal OTC / invite links** (any funded name’s own Paymento store) remain **outside** this roster: miners curate the *bootstrap site’s default offer list*; friend desks stay permissionless.

**Founder stance (isysd):** first desk only; no special governance over guld.io. Willing to **transfer/sell the domain** if asked—**terms TBD**.

### 4. Forks and domains

Any fork of Guld MAY:

- Stand up `example-fork.example` (or IP/onion)  
- Point that host at *its* leaf tip and *its* miner-endorsed **gateway roster**  
- Bootstrap with the same OTC / Paymento / friend-sponsor patterns  

So **guld.io itself does not occupy a special place in the network**—only an early, convenient DNS name.

## Why this fits existing product

| Already true | This intent adds |
|--------------|------------------|
| Repo root = static PWA; any peer serves it | Pin / serve from `guld` leaf |
| Any funded name runs a Paymento OTC desk | Miner-curated **bootstrap roster** when inventory rotates |
| Friend sponsor works without gateways | Remains mandatory exit |
| Spec 16 dual-sig registration | Unchanged |

## Out of scope (for now)

- Miner votes on CSS, marketing, or day-to-day content  
- Encoding Paymento, DNS, or TLS into L0 block validation  
- Automatic on-chain fulfillment of every registration (still Gateway / ops)  
- Binding name registration success to miner approval of UI PRs  
- Final domain sale terms for guld.io  
- Exact miner-contract opcodes / weight formula (follow-up spec)

## Open questions

1. **Contract shape:** roster accept as miner coinbase tag, separate tx type, or leaf object miners co-sign?  
2. **Quorum:** majority hashrate over *N* blocks? Sticky roster until challenged?  
3. **Roster storage:** in `guld` leaf JSON vs chain state vs both?  
4. **Price verification:** minimum viable check before sorting by fee?  
5. **Domain:** who holds guld.io keys during transition; escrow / multi-sig with miners?  
6. **Governed-object registry:** how does the leaf declare “these paths/hashes are miner-scoped”?  

## Acceptance (when this graduates from draft)

- [ ] Spec sketch: `guld` leaf layout + **governed object** list (starts with gateway roster only)  
- [ ] Spec sketch: gateway roster object + miner accept/reject (or weight)  
- [ ] Explicit: miners have **no** say over non-governed site content  
- [ ] UX: bootstrap Sign up can show miner-accepted desks; personal OTC invites unchanged  
- [ ] Documented exits (friend sponsor, self-host, fork domain)  
- [ ] Domain / founder privilege: no protocol role for isysd; sale path noted as social TBD  

## Non-goals

- Making guld.io a consensus-critical host  
- Replacing PoW fork choice with website or CSS votes  
- Miner micromanagement of the reference UI  
- Preventing alternate UIs, forks, or friend sponsorship
