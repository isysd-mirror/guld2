# Feedback: reference UI is too technical

**Date:** 2026-09-26  
**Source:** External friend review + maintainer agreement  
**Surfaces:** Landing → register → login → wallet → send / account tools → (secondary) explorer  
**Related:** [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md), [GIP-5](../gips/gip-5.md), [GIP-17](../gips/gip-17.md), [GIP-20](../gips/gip-20.md)

## Verdict

The reference PWA **covers** L0 transaction types and account ops. It does **not** yet deliver a smooth human product. The interface reads as protocol tooling: fields and panels arranged to expose wire shapes, not to guide intent.

This is not a CSS tweak or a component reshuffle. It needs a **creative interaction redesign** with progressive disclosure: crypto stays under the hood; people deal in names, invites, and confirmations.

## What the feedback named

| Observation | Translation |
|-------------|-------------|
| Too technical | Jargon and operator controls (API base, RPC, hex, JSON schemas) sit above the fold |
| Ugly | Utilitarian forms on paper; landing has atmosphere, app surfaces do not |
| Shoved together | Coverage matrix drove layout — every capability visible, few journeys choreographed |
| Copy-paste crypto | Sponsor JSON, cosign request/response blobs, private-key hex, PGP clearsign are primary paths |

## Root cause

**GIP-17 / Spec 14 succeeded at completeness.** The open work that followed (contacts, QR handshake) chips at symptoms but does not redefine the interaction model.

Guld 1.0 was already called out as copy/paste-heavy ([`UPGRADE_FROM_1.md`](../UPGRADE_FROM_1.md)). 2.0 reduced some of that for daily send-to-name, then reintroduced protocol paste for sponsor, cosign, claim, and cold login.

## Non-goals for the redesign

- Dropping protocol coverage (power paths stay; they move behind Advanced / share fallbacks)
- Replacing the framework-less PWA stack (GIP-5)
- Making explorer the primary product (it stays read-only companion)
- Fake “simplicity” that hides irreversible key/backup moments

## Success criteria (product)

A new user who has never seen a blockchain explorer can:

1. Understand what Guld is from the first viewport (names, not keys).
2. Pick a name, set a passphrase, and get sponsored **without** pasting JSON or hex as the default path.
3. Unlock, see balance, send to a contact or typed name, and read activity as a story.
4. Only meet hex / raw payloads when they choose **Advanced**, **Restore**, or a broken-share fallback.

Operators and multi-sig power users still reach every tx type — after the citizen path is calm.

## Next

Creative plan: [`human-first-ux.md`](human-first-ux.md).  
Track work: [`../tasks/open/005-human-first-ux.md`](../tasks/open/005-human-first-ux.md).  
Promote to a numbered GIP when the plan is accepted for implementation.
