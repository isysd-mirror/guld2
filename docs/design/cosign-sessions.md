# Cosign sessions — current UX & redesign

**Status:** design draft (documents shipped UI; proposes P2 citizen path)  
**Normative wire:** [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md) §9 (`guld1cosignreq` / `guld1cosignres` v1)  
**Protocol:** [`../specs/03-transactions.md`](../specs/03-transactions.md) §3.6, [`../specs/04-proofs.md`](../specs/04-proofs.md) (`threshold_cosign_v1`)  
**Parent plan:** [`human-first-ux.md`](human-first-ux.md) §4.7 · task [`005`](../tasks/open/005-human-first-ux.md) P2  
**Functional Transfer cosign:** [`028`](../tasks/done/2026-09/028-threshold-transfer-cosign.md) done (operator workstation, not citizen polish)

This doc answers two questions:

1. **How is multi-party authorization supposed to work in the UI today** (especially a **2-of-2 group Transfer**)?
2. **How should it feel** once share-first sessions replace JSON paste as the primary path?

---

## 0. What “cosign” is (one sentence)

For a group (or any account with `threshold > 1`), the chain will not accept a tip update, key rotate, or spend until **at least `threshold` distinct controlling keys** sign the **same** bound statement. The UI’s job is to propose that statement, collect signatures off-chain, then broadcast one completed transaction.

Registration of the group is a **different** flow (sponsor dual-sig). Cosign starts **after** the group exists on-chain and members have local keys that match `account.keys[]`.

---

## 1. Prerequisites (assume already done)

For a concrete **2-of-2** group named `treasury`:

| Who | Device state |
|-----|----------------|
| **Alice** | Keyring unlocked; holds `treasury` as `keys[0]` (she registered or imported that slot) |
| **Bob** | Keyring unlocked; holds `treasury` as `keys[1]` (same on-chain pubkey he contributed at register) |
| **Chain** | `treasury` is kind `group`, `threshold: 2`, funded enough for amount + inclusion fee |

If either person only has a 1-of-1 personal name, or their local pubkey no longer matches the group’s `keys[]` (e.g. after a rotate that did not update the keyring), cosign cannot complete on that device.

---

## 2. As-shipped UX — Transfer (2-of-2)

Surfaces involved:

| Surface | Role |
|---------|------|
| `/wallet/#/account/treasury` | Propose spend (“Start cosign (Transfer)”) |
| `/keys/?cosign=…#cosign` | Cosign **workstation** (collect / sign / broadcast) |
| Clipboard / chat | Out-of-band transport (JSON blobs or the deep-link URL) |

Wire blobs stay `guld1cosignreq` / `guld1cosignres` (Spec 14 §9.2.1). They are ecosystem formats, not consensus.

### 2.1 Intended happy path (what the code aims for)

```text
Alice (wallet)          Alice (keys)           Bob (keys)            Chain
     |                       |                      |                   |
     | Fill To / Amount      |                      |                   |
     | "Start cosign…"       |                      |                   |
     | passphrase confirm    |                      |                   |
     | sign as key_index 0   |                      |                   |
     |---- redirect -------->|                      |                   |
     |                       | session: req +       |                   |
     |                       | Alice sig (1/2)      |                   |
     |                       | share request or URL |                   |
     |                       |--------------------->|                   |
     |                       |                      | Load request      |
     |                       |                      | Sign key_index 1  |
     |                       |                      | (2/2 if URL had   |
     |                       |                      |  Alice’s sig)     |
     |                       |                      | Broadcast -------->|
     |                       |                      |                   | accept
```

**Step-by-step (Alice initiates):**

1. Open **Wallet**, select group `treasury` (hash `#/account/treasury`).
2. Under **Send**, enter recipient name, amount, optional memo / fee.
3. Button label is **Start cosign (Transfer)** (not “Send”) because `threshold > 1`.
4. Confirm keyring passphrase.
5. App builds a Transfer cosign request, signs with Alice’s local key, and **navigates** to  
   `/keys/?cosign=<packed bag>#cosign`  
   where the bag is `{ req, sigs }` (request + Alice’s signature already counted).
6. Cosign workstation opens under **Cosign workstation** (`<details id="cosign">`).
7. Meta line should show something like: account `treasury` · op `transfer` · progress **1 / 2** · needed `[1]`.
8. Alice must get Bob’s approval. The UI’s explicit control is **Copy request** (copies `guld1cosignreq` JSON only — **without** signatures).
9. Alice sends that JSON (or, if she knows to, the **full browser URL** including `?cosign=…`) to Bob over any private channel.
10. Bob opens **Keys**, unlocks, pastes into **Import / paste cosign request** → **Load request** (or opens Alice’s deep link).
11. Bob clicks **Sign with key_index N**, confirms passphrase.
12. When verified signatures ≥ threshold, **Broadcast** enables; whoever holds the full set clicks it.
13. Wallet / explorer show the Transfer as submitted.

**Who broadcasts?** Either party who can assemble ≥2 verified sigs. Typical pattern if the deep-link bag still carries Alice’s sig: **Bob** signs and broadcasts. If only the request JSON was shared: Alice must later **Import cosign response** from Bob, then broadcast.

### 2.2 Same pattern for tip / rotate

| Action | Where Alice starts | Button | Lands on workstation with |
|--------|--------------------|--------|---------------------------|
| Tip (`UpdateMaster`) | Wallet → Advanced → Update master hash | Start cosign (UpdateMaster) | `op=update_master` + her sig |
| Rotate keys | Keys → account → Rotate keys | Start cosign (RotateKeys) | `op=rotate_keys` + old-key sig + `new_key_signature` in the bag |

Afterwards: same share → co-signer signs → broadcast loop. Rotate also needs the **new** `keys[0]` intent signature (already packed into the deep-link bag when Alice started from the rotate form).

### 2.3 What the workstation actually shows today

Primary controls (operator chrome):

1. Textarea: paste / view **cosign request** JSON → Load request  
2. **Copy request**  
3. **Sign with key_index N** (only if this device’s pubkey is in `keys[]` and the keyring is unlocked)  
4. Textarea: paste **cosign response** JSON → Add signature  
5. Optional `new_key_signature` field when `op=rotate_keys`  
6. **Broadcast** when `sigs.size >= threshold`

There is **no** first-class Share, QR, or “Copy my signature / response” button. Progress is a technical meta line (`key_index`, `needed[]`), not a people-facing session.

### 2.4 Why this often fails in practice

These are product/UX gaps in the **shipped** path — protocol Transfer cosign itself is covered by tests ([028](../tasks/done/2026-09/028-threshold-transfer-cosign.md), [035](../tasks/done/2026-09/035-group-multisig-lifecycle-e2e.md)).

| # | Friction | Effect |
|---|----------|--------|
| **A** | Deep link uses hash `#cosign` (list toolbox), not `#/treasury` | Workstation mounts in **standalone** mode with `canSign: false` until the user re-submits **Load request**. Easy to land on a session that looks loaded but will not sign. |
| **B** | **Copy request** drops Alice’s already-collected signatures | Bob who only gets the JSON starts at **0 / 2** (or 1 after he signs). He cannot finish alone; Alice needs his **response**. |
| **C** | **No “Copy response”** after Sign | Bob has nowhere obvious to export `guld1cosignres` to send back. The Import response box is collector-oriented only. |
| **D** | Working alternate (share full `?cosign=` URL) is undocumented | Long base64 URLs break in some messengers; no Share / QR affordance. |
| **E** | Two pages (Wallet → Keys) with no session story | Feels like a dump into Advanced tooling mid-send. |
| **F** | Stale `nonce` | Any intervening tx on `treasury` invalidates the request; UI errors (“Stale nonce”) without a guided “rebuild from wallet.” |
| **G** | Copy still centers hex / JSON | Matches Spec 14 “MUST copy/paste” but fights human-first principles. |

So: users who “registered a group and set up keys” can still be **unable to complete a spend** because the handoff between Alice and Bob is incomplete or non-obvious — not because threshold Transfer is unimplemented on the wire.

### 2.5 Minimal checklist that *can* work today (operator path)

Until P2 lands, use this exact sequence for 2-of-2 Transfer:

1. **Alice** — Wallet → Send → Start cosign → passphrase → wait for Keys page.  
2. **Alice** — Copy the **entire address bar** URL (`/keys/?cosign=…#cosign`), not only “Copy request”.  
3. **Bob** — Open that URL on a device that already has `treasury`’s key unlocked.  
4. **Bob** — If Sign is disabled: paste the request from the textarea into itself (or re-Copy request / paste) → **Load request** once (forces account resolve).  
5. **Bob** — **Sign with key_index …** → confirm passphrase → progress **2 / 2**.  
6. **Bob** — **Broadcast**.  
7. Confirm in Wallet activity / explorer.

If Bob only received **request JSON** (no URL bag):

1. Bob Loads request → Signs.  
2. Bob must somehow obtain a `guld1cosignres` (today: not offered in UI — **blocked** without DevTools / SDK). Prefer the URL-bag path above.

---

## 3. Reimagined UX — cosign as a **session**

Align with [`human-first-ux.md`](human-first-ux.md): **share objects, not blobs**; JSON behind “Can’t scan? / Paste instead.”

### 3.1 Product principles

1. **One journey from intent** — Send / Update tip / Rotate never dump the user into a generic paste desk mid-flow.  
2. **People, not indices** — “Waiting on Bob” beats `needed: [1]`. Fall back to key slot only in Details.  
3. **Share the turn** — Primary CTA is Share link / QR / Web Share of a **session**, including signatures already collected.  
4. **Approve screen for cosigners** — Open link → see plain-language statement → Unlock → Approve / Reject.  
5. **Either side may finish** — When threshold is met on any honest device, Broadcast is obvious.  
6. **Rebuild, don’t debug** — Stale nonce → “This proposal expired — recreate from Wallet” with one tap.  
7. **Operator escape hatch** — Advanced keeps raw `guld1cosignreq` / `guld1cosignres` import/export (Spec 14 MUST).

### 3.2 Information architecture

| Route / UI | Job |
|------------|-----|
| `/wallet/…` Send (threshold account) | Propose → confirm → **enter session** (same tab, not a surprise Keys dump) |
| `/wallet/…` or `/keys/…` **Session sheet** | Progress, Share, Approve, Broadcast |
| Deep link `/keys/?cosign=…` or future `/cosign/?s=…` | Open session for co-signer (hash SHOULD include `#/<name>` so the account-scoped keyring binds) |
| Manage → Cosign | Resume / paste fallback for air-gap operators |

Citizen mode: hide API/RPC; show session chrome only.

### 3.3 Transfer session — target happy path (2-of-2)

**Alice**

1. Wallet → Send → to / amount → **Continue**.  
2. Confirm: “Send **5 GULD** to **bob** from **treasury** (needs **2 of 2** signatures).”  
3. Passphrase → “You’re 1 of 2. Share with the other signer.”  
4. Primary: **Share** (Web Share / Copy link / Show QR). Secondary: “Copy technical request.”  
5. Status: Waiting on 1 more signature. Stay on this sheet (or dismiss with “Session saved on this device”).

**Bob**

1. Opens shared link (or scans QR).  
2. Sees: “**treasury** wants to send **5 GULD** to **bob**. Fee ≈ … Approve with your key?”  
3. Unlock / passphrase → **Approve**.  
4. “Both signatures ready.” Primary: **Submit to network**.  
5. Done → activity story: “treasury sent 5 GULD to bob.”

Alice’s device, if still open, can poll or refresh and offer the same Submit if Bob shared a return link / response — but **Bob submitting is the default** when he holds the completed set.

### 3.4 Session object (UI layer; still packs Spec 14 blobs)

Conceptual session (local + URL):

```text
session_id (client)
op: transfer | update_master | rotate_keys
account name
human summary (to, amount, tip hash short, …)
req: guld1cosignreq
sigs: map key_index → signature   // always travel with the share
new_key_signature?: …            // rotate only
expires_hint: nonce + account_id // invalidate when chain moves
```

Share payload = deep link encoding of that bag (already roughly what `keysCosignHref` builds). Fix hash to `#/<name>` (or dedicated `/cosign/`) and always include collected `sigs`.

### 3.5 Screen map

```text
[Propose] → [Confirm] → [Waiting / Share] ←→ [Cosigner Approve]
                              ↓ threshold met
                         [Submit] → [Done]
                              ↓ stale
                         [Expired → Recreate]
```

| Screen | Citizen copy | Advanced disclosure |
|--------|--------------|---------------------|
| Confirm | Amount, to, “needs 2 signatures” | fee quanta, nonce |
| Waiting | Avatars / “You · Alice ✓ · Bob …” + Share | raw request JSON |
| Approve | Plain statement + Approve / Reject | key_index, message tag |
| Submit | “Submit to network” | tx JSON preview |
| Done | Activity link | tx id |

### 3.6 RotateKeys & UpdateMaster

Same session shell; only the Confirm / Approve copy changes:

- Tip: “Update **treasury**’s leaf tip to `0xabcd…`?”  
- Rotate: “Change **treasury** keys to N keys, threshold M?” (+ warn that old keys stop controlling spend)

Do not require a separate mental model per op.

### 3.7 Edge cases

| Case | Behavior |
|------|----------|
| Alice holds enough keys alone (e.g. 2 local slots for 2-of-2) | Confirm → sign all local → Submit immediately (no Share) |
| 2-of-3; one signer offline | Share to either remaining; progress 1/2 or 2/2 as sigs arrive; any collector may Submit |
| Reject | Cosigner returns nothing; Alice’s session stays Waiting; she may Cancel |
| Air-gap | Approve shows “Export signature file / Copy response”; Waiting has “Paste response” (fixes gap **C**) |
| Wrong device (no matching key) | “This device is not a signer for treasury. Open on a device that holds a group key, or import that key.” |
| URL too long for SMS | Prefer QR in person; or “Copy response” round-trip with short request id stored on initiator (optional later — local-only session store) |

### 3.8 Implementation sketch (P2)

Non-normative; keeps Spec 14 wire frozen:

1. **Fix deep-link landing** — `keysCosignHref` → `#/<name>` (or mount standalone with `resolveCosignAccount` **before** first paint so `canSign` is correct).  
2. **Add Copy / Share response** after local Sign; include `sigs` in every Share.  
3. **Session sheet component** used from Wallet Send and Keys rotate/tip — wraps existing `cosign.js` helpers.  
4. **QR + Web Share** for session URL (same pattern as contacts invite).  
5. **Plain-language Approve** view when `?cosign=` opens and local key matches.  
6. Keep paste textareas under **Advanced** on the session sheet.  
7. Spec 14 amend: JSON/hex MUST NOT be the sole primary path for cosign (already called out in human-first plan §7).

### 3.9 Out of scope

- In-band leaf chat / on-chain cosign mailbox  
- Threshold politics (“why we signed”)  
- Changing `guld1cosignreq` v1 fields  
- Attestation cosigners for ClaimLegacy ([GIP-25](../gips/gip-25.md) / task [045](../tasks/open/045-gip-25-attestation-cosigners.md)) — different product surface

---

## 4. Relation to other docs

| Doc | Role |
|-----|------|
| Spec 14 §9 | Normative workstation capabilities + frozen JSON |
| human-first-ux §4.7 | Short product intent; this file is the detailed journey |
| Task 005 P2 | Delivery vehicle for session UX |
| Task 028 | Functional Transfer cosign (done) — explicitly deferred citizen polish here |

---

## 5. Acceptance sketch (when P2 ships)

- [ ] Alice can complete a 2-of-2 Transfer with Bob using **only** Share link or QR — no manual JSON.  
- [ ] Bob’s Approve screen states amount and recipient in plain language before passphrase.  
- [ ] “Copy request” / paste remains available under Advanced.  
- [ ] Stale nonce offers Recreate, not a dead workstation.  
- [ ] Deep link opens with signing enabled when the local key matches.  
- [ ] Air-gap: Copy response exists and Alice can Import response → Submit.
