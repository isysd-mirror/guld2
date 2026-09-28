# Human-first reference UX

**Status:** design draft (pre-GIP)  
**Feedback:** [`feedback-ux-2026-09.md`](feedback-ux-2026-09.md)  
**Amends (when accepted):** Spec 14 § goals / §8 flows; GIP-5 phases. Contacts/search shipped ([GIP-20](../gips/gip-20.md) Accepted).

## 1. North star

> **Address people by name.** The chain witnesses **proof**. The UI never asks a citizen to be a protocol engineer.

Locked marketing tagline (see [`brand-concepts.md`](../brand-concepts.md)): **Address people by name.** — hero, OG, and other marketing surfaces. Protocol thesis remains “Address by name. Commit by hash. Authorize by proof.”; only the people-by-name line belongs on the glass by default. Hash and proof are infrastructure — shown on confirm when useful, editable only in Advanced.

## 2. Two modes, one product

| Mode | Who | Default chrome |
|------|-----|----------------|
| **Citizen** | New users, daily send/receive, friend sponsor | Name, balance, Send, Activity, Invite, Manage |
| **Operator** | Peer runners, registrars, claim, cosign sessions | Settings → Node & desk; wallet → Advanced |

Switching modes is explicit (Settings toggle or “Show advanced”). Citizen mode MUST NOT show API base, RPC URL, raw `0x` keys, or pretty-printed protocol JSON as primary controls.

Protocol coverage from Spec 14 remains **complete** in Operator / Advanced paths.

## 3. Interaction principles

1. **Intent screens, not field dumps** — One job, one headline, one primary action per step.
2. **Share objects, not blobs** — Invites, cosign turns, and contact cards travel as QR + Web Share + deep links. JSON/hex are **fallback** behind “Can’t scan?” / “Paste instead.”
3. **Keys are invisible until backup** — Generate on device; user sets a passphrase. Export is “Backup this device” with a clear threat model — not a password-field labeled `Private key (hex…)`.
4. **Human confirmations** — “Send **5 GULD** to **alice**?” with fee in GULD. Tx type enums and weight live in a Details disclosure.
5. **Calm waiting** — Registration and mempool waits use plain status (“Waiting for your sponsor…”), not endpoint or SSE jargon.
6. **Atmosphere matches the landing** — App surfaces inherit brand hierarchy, motion, and space; they must not feel like a second, drab product bolted on.

## 4. Journey redesign

### 4.1 Landing (`/`)

**First viewport only:** brand, headline **Address people by name.**, one lede, Sign up / Log in.  
**Not in first viewport:** cargo install, hard-fork thesis, leaf-law pillars, node flags.

Quiet text links under the CTAs MAY point to `#developers` / `#operators` / explorer — they must not compete with Sign up / Log in.

Below fold:

- Short “what is a name” story (`#start`)
- **Developers** (`#developers`): build a leaf dapp; call out live `/demo/ttt/` PoC + `@guld/js`  
- **Operators** (`#operators`): install / run a peer  
- Explorer link  
- Docs / whitepaper / thesis / FAQ

Rewrite thesis copy for humans. Protocol poetry can live in whitepaper; landing sells the feeling of being addressable. Early beta still courts **developers** as a primary demographic — the dapp section is below the fold but not buried.

### 4.2 Register (`/register/`)

| Step | Citizen sees | Hidden / Advanced |
|------|--------------|-------------------|
| **Name** | Big name field, live available/taken, fee as “About *n* GULD to register” | Fee formula `F_user(L)` |
| **Protect** | Passphrase + confirm; short trust copy (“keys stay on this device”) | Raw pubkey hex |
| **Get on-chain** | Three **cards**: Invite a friend · Pay · Testnet faucet (if peer offers) | — |
| **Friend** | QR + Share invite + “Waiting…” | Registration JSON textarea |
| **Pay / faucet** | Existing desk/faucet flows, human labels | Order ids as secondary |
| **Done** | “You’re **name**. Open wallet.” | Tx id disclosure |

Group registration is a separate entry (“Create a group”) with the same share-first cosign later — not pubkey paste as step zero.

### 4.3 Login (`/login/`)

| Case | Primary UI |
|------|------------|
| Keyring present | Pick name (if multiple) → passphrase → wallet |
| Empty device | **Restore backup** (file / QR payload) or **Import advanced key** (hex) behind disclosure |
| Pending registration | “Finish signup” resume — not raw pending JSON |

### 4.4 Wallet home (`/wallet/`)

Composition (not a dashboard of every capability):

1. **Identity** — name as hero; kind/threshold as quiet meta  
2. **Balance** — GULD, large  
3. **Primary CTA** — Send  
4. **Secondary** — Activity · Invite friend · Manage account  

Remove **API base** from the wallet shell. Node target lives in Settings (Operator).

**Manage account** (drill-in, not home): subaccounts, renew/funding hint, Update tip, Rotate keys, Cosign session, Export backup. Each is a guided flow, not a stack of forms on one scroll.

### 4.5 Send

1. **To** — contacts typeahead + recent ([GIP-20](../gips/gip-20.md) Accepted); plain name always allowed  
2. **Amount** — keypad-like clarity; optional memo (human “note”, 64-byte hint in Advanced)  
3. **Confirm** — plain language + fee  
4. **Submitted** — “Sent — waiting in network” with link to activity / explorer  

No fee-weight engineering UI on the citizen path.

### 4.6 Activity / transactions

Feed of **stories**: “You sent 2 GULD to bob”, “alice sent you 1 GULD”, “Name registered”.  
Tap → detail with explorer deep link. Raw tx type / hex id in Details.

### 4.7 Multi-party (sponsor already covered; cosign)

Replace “paste `guld1cosignreq` JSON” as primary with a **session**:

- Initiator: “Needs 2 of 3 signatures” → Share link/QR per remaining signer  
- Signer: opens link → Unlock → Approve / Reject  
- Fallback: paste payload  

Same pattern as friend registration invites.

### 4.8 Explorer (out of scope for “soften”)

Explorers are **supposed** to drill into technical detail — hex, heights, mempool, SSE, RPC. That is appropriate here; do not citizen-wash it.

Optional later (only if chrome feels noisy): shorten the page lede, default RPC to Settings when a peer is same-origin. Not a redesign phase and **not** blocking human-first wallet/landing work.

### 4.9 Claim / Gateway

Remain Operator-adjacent. Claim keeps PGP reality but leads with steps in plain language; hex message copy is one labeled step, not the page identity. Gateway stays desk queue with human payment states.

## 5. Visual system (creative direction)

Preserve brand tokens (navy / ink / paper) — this is elevation, not a new brand.

| Axis | Direction |
|------|-----------|
| **Hierarchy** | Name and balance dominate; meta whispers |
| **Space** | One composition per step; refuse multi-card dumps on home |
| **Type** | Keep Avenir family for continuity; tighten scale (display vs body vs meta) |
| **Atmosphere** | Carry hero mist/gradient language into app shells lightly — not flat grey forms |
| **Motion** | Name availability, unlock success, send confirm, invite QR appear — 2–3 intentional motions, not noise |
| **Cards** | Only when they are the interaction (sponsor method cards, contact rows) — not decorative wrappers for every field |

Avoid default AI looks (purple glow, cream+terracotta, broadsheet). Stay Guld: ink, navy, black theme, mist.

## 6. Technical enablers (not the product)

These make share-first real; they are plumbing:

| Enabler | Role |
|---------|------|
| Deep links / `#` routes for invite + cosign session | Open share targets in PWA |
| QR encode/decode (already partial) | Primary share medium |
| Web Share API where available | “Share invite” |
| Encrypted backup file / QR | Replace hex-as-login |
| Contacts + search APIs (GIP-20, `guld_searchAccounts`) | Send without retyping |
| Settings: Citizen / Operator | Hide node chrome |

Wire formats (registration request JSON, cosign bundles) stay. They cease to be the **UI**.

## 7. Spec / GIP impact

When this plan is accepted:

1. **Spec 14** — Add § “Default path vs Advanced”; mark JSON/hex paste as MUST NOT be the sole primary path for register-friend and cosign; redefine §8 screens to match journeys above.  
2. **GIP-5** — New implementation phase: Human-first shell (before or beside extension Phase).  
3. **GIP-17** — Remains “coverage”; this plan is “interaction quality.”  
4. **GIP-20** — Contacts / typeahead / `guld1contact:` **shipped** (Accepted). Address book + private invite: **[GIP-31](../gips/gip-31.md)** Draft. Remaining human-first chrome is P0/P2/P3 under task [005](../tasks/open/005-human-first-ux.md).  
5. **Numbered GIP** — Editors assign when ready (`draft` → Accepted).

## 8. Phased delivery

| Phase | Scope | Exit criteria |
|-------|--------|----------------|
| **P0 — Shell & IA** | Citizen/Operator split; strip API/RPC from wallet/register chrome; landing first-viewport diet | Friend can open site and not see cargo/hex on happy path entry |
| **P1 — Onboard & invite** | Contacts address book + **private non-binding invite** ([GIP-31](../gips/gip-31.md), [design](contacts-and-private-invite.md), task [038](../tasks/open/038-contacts-private-invite.md)); register method cards / wallet-home polish as follow-ons | Friend can invite over a private channel without a public name-claim URL; Send contacts already shipped (GIP-20) |
| **P2 — Manage & multi-party** | Manage drill-ins; cosign sessions; backup export | Threshold flows usable via Share/QR |
| **P3 — Visual system** | Tokens/type/motion pass across PWA | App feels same family as landing |
| **P4 — Explorer soften** | **Out of scope** — explorers should stay technical; no citizen-wash pass. | — |

Do **not** ship P3 cosmetics before P0 journeys. **P1** invite path is **Contacts private invite** (GIP-31) — not a public claim URL. **P4** cancelled: technical explorer chrome is correct.

## 9. Open decisions (need maintainer call)

1. **Backup format** for citizens: encrypted file only, QR, or both? (Hex remains Advanced.)  
2. **Invite URL host:** always current peer origin for private invite links (GIP-31) vs `guld.io` only as desk fallback when inviter has no OTC.  
3. **Group create** in P1 or P2?  
4. **Extension** site-login: parallel track or after P1?

## 10. What “done” feels like

A friend who called the UI ugly and technical can be handed a phone, told “pick a name,” and complete signup + a send **without** the maintainer explaining what JSON, RPC, or a pubkey is.
