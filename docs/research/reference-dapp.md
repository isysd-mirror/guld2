# Reference dapp sketch

**Status:** **live proof of concept** on Simba — play [/demo/ttt/](/demo/ttt/); tips under [`ttt-demo`](/explorer/#/account/ttt-demo). Packages: [037](../tasks/done/2026-09/037-guld-tic-tac-toe.md); materialize [033](../tasks/done/2026-09/033-leaf-host-materialize.md) (**done**).  
**Landing:** [/#developers](/#developers) · **Related:** [`polyglot-sdk-packages.md`](polyglot-sdk-packages.md) (**Accepted**), [036](../tasks/done/2026-09/036-guld-js-sdk.md), [spec 11](../specs/11-leaf-host.md), [whitepaper §4](../whitepaper/guld-2.0-draft.md), `/demo/login/` (extension auth).

## Goal

Ship one **small, real dapp** that:

1. Lives under a **registered name** (group preferred).
2. Keeps application state in a **home tree** (git remote OK for distribution).
3. Ships **software inside the leaf** that mutates that state (not “docs only”).
4. Advances the tip with **`UpdateMaster` + threshold cosign** so the proof story is visible on explorers.
5. Is built primarily on the imagined **JS/Python packages** ([polyglot sketch](polyglot-sdk-packages.md)), not hand-rolled BARE.

It is a **teaching product**, not a growth product. If a newcomer can finish one session and explain “the chain witnessed that we agreed on this head,” it succeeded.

`/demo/login/` already shows **identity**. This dapp should show **leaf law + witnessed tips**.

---

## Candidates

| Idea | Proof story | State machine | Risk as *reference* |
|------|-------------|---------------|---------------------|
| **A. Turn game (recommended)** | Each legal move → new tip; both players cosign | Tiny board file + turn counter | Low — finite states, easy UI |
| **B. On-record minutes / chat** | Each utterance (or batch) → tip; parties cosign “we said this” | Append-only log | Medium — UX sprawl, retention, spam |
| **C. Notary pad (chat’s little sibling)** | Signed statements in `log.jsonl` | Append-only, no threads | Low–medium — less fun than a game |
| **D. Escrow / IOU** | Release conditions in leaf | Balances off L0 | High — money drama, support load |
| **E. Personal chain / rollup toy** | Batch many leaf txs → one tip | Mini ledger | High — teaches wrong layer first |

### Recommendation: **A — witnessed turn game**

A two-player game (tic-tac-toe is enough; RPS or “guess the hash bit” also fine) maps cleanly onto Guld:

- **Ordered turns** ≈ account `nonce` / successor tips: you cannot apply move *n+1* without agreeing on move *n*’s head.
- **State in files** — e.g. `state.json` — hashed into `master_hash`; anyone who materializes the tip can audit the board.
- **Software in the repo** — `game/` (static JS or a tiny Python CLI) enforces legal moves *as leaf policy*. Validators never run it; under **1-of-2**, either seat’s key can tip (winner or batch submit).
- **Git remote** — optional forge mirror for free clone; ObjectIds still verified against the tip.
- **Proof story a human can repeat:**  
  *“We registered `ttt-demo`. Every move is an `UpdateMaster`. One of us signed. Look up the name → tips → materialize `state.json` → see the game. The chain does not know tic-tac-toe; it knows we authorized those hashes.”*  
  On Simba, `ttt-demo` is auto-created by the isysd faucet (testnet only) with published throwaway keys.

Chat (B) is the stronger *rhetoric* (“on record conversation”) but a worse *first* reference: threading, moderation, encryption, and unbounded growth distract from the tip/cosign lesson. Keep it as **v2 recipe** or a second example once the leaf SDK is real.

**Notary pad (C)** is the right fallback if a game UI feels too cute — same mechanics, duller demo.

---

## Use-case story (turn game)

### Cast

- **Alice** and **Bob** each have individual Guld names and keys (Simba faucet OK).
- They register a **group** name, e.g. `ttt-alice-bob`, with **threshold 1** and both pubkeys (**1-of-2**) — or use the published Simba `ttt-demo` group.
- The group’s home is the game leaf.

### Leaf layout (illustrative)

```text
home/
  leaf.json          # runtime: http-static, root: game/
  README.md          # human rules + how to verify tips
  state.json         # { "board": [...], "turn": "X", "move": 4, "winner": null }
  moves/             # optional: one file per move for prettier history
    0001.json
    0002.json
  game/              # the dapp software (static)
    index.html
    app.js           # load tip → show board → propose move
  .git/ or remotes[] # forge mirror of the same tree (optional DA)
```

`leaf.json` points a leaf host at `game/` so `https://…` can serve the UI from materialised bytes. The **authoritative** head is still `master_hash` on L0.

### Move loop (happy path)

```text
1. Client: GET account tip for ttt-alice-bob
2. Leaf toolkit: materialize tree (CAS / remotes / local git)
3. game/app.js: read state.json; if not my turn, wait / poll
4. Player picks a legal cell; app writes candidate state.json (+ moves/N.json)
5. Leaf toolkit: hash new tree → new_master_hash
6. Cosign workstation / SDK: active seat’s key signs threshold_cosign_v1
     (prev_master, new_master, nonce, chain_id) — 1-of-2, so one sig suffices
7. POST UpdateMaster via /api/v1
8. Explorer shows new tip; loser of a race re-reads nonce and retries
```

Illegal moves never reach L0 if leaf policy is honest and the tip signer refuses corrupt boards. A malicious holder of either key could force a corrupt tip — same trust model as any 1-of-n — which is an honest teaching point, not a bug.

### What a third party verifies

| Layer | Check |
|-------|--------|
| L0 | Name exists; tip history of `master_hash`; each advance had valid cosignatures and fees |
| Leaf | Materialize tip *H*; `state.json` parses; optional: re-run `game/` transition check from previous tip |
| Git | If using a forge remote: fetched objects match CAS ObjectIds for that tip |

No validator learned tic-tac-toe. The **proof** is authorization of heads; the **story** is the files.

---

## Why include a git repo

Git is not consensus — it is the **distribution and developer UX** layer the whitepaper already blesses:

- Clone the dapp software + current state without inventing a new forge.
- CI can propose moves or verify that `state.json` transitions are legal before humans cosign.
- `remotes[]` on the account advertises where leaf hosts may fetch missing objects.
- The reference narrative stays honest: “git for leaves, hash tips for L0.”

The SDK should still hash the **network home tree**, not “whatever `git rev-parse HEAD` says,” unless the leaf convention explicitly defines git commits as the tree encoding.

---

## Packages this dapp should force into existence

Minimal set from the [polyglot sketch](polyglot-sdk-packages.md):

| Need in the dapp | Package layer |
|------------------|---------------|
| Read tip / broadcast tx | `@guld/client` / `guld-client` |
| Cosign + UpdateMaster | `@guld/crypto` + `@guld/tx` |
| Build tree / materialize / remotes | `@guld/leaf` / `guld-leaf` |
| Optional: vector sanity in CI | `@guld/wire` (task 032) |

JS owns the in-browser board. Python is optional for a `guld-ttt verify` CLI that walks two tips and checks the transition — great for demos and CI.

Extension **site-login** (`/demo/login/` pattern) can gate “play as Alice” without a second keystore.

---

## Scope cuts (keep the demo small)

**In v1 demo**

- One game only (tic-tac-toe).
- 1-of-2 group account (either key tips; Simba `ttt-demo` faucet-ensured).
- Static web UI + forge remote.
- Manual or workstation cosign (no chat, no matchmaking server as consensus).
- Simba-only; faucet for fees.

**Out of v1 demo**

- Ranked matchmaking, spectators, NFTs, wagering in GULD (tempting; teach Transfer separately).
- Encrypting the board (opaque leaves can wait).
- On-chain move validation.
- General chat product.

**Nice stretch**

- Stake a tiny Transfer into a scratch account that the winner’s leaf policy “claims” off-chain — only if it does not confuse the tip lesson.
- Replay slider: pick historical `master_hash` → materialize → show board at that move.

---

## Alternate story card (if not a game)

**“Minutes”** under group `board-acme`:

- `minutes/2026-09-27.md` append-only.
- Meeting ends → export → hash → all directors cosign `UpdateMaster`.
- Proof story: corporate record witnessed by L0 without putting prose in txs.

Same SDK surface; less visceral than a game for a conference booth.

---

## Suggested naming / placement

| Item | Suggestion |
|------|------------|
| Account | `ttt` or `demo-ttt` on Simba (short demo name; expect squat race — fine for testnet) |
| Code | `src/guld-tic-tac-toe/` submodule + `/demo/ttt/` |
| Task | **[037](../tasks/done/2026-09/037-guld-tic-tac-toe.md)**; leaf materialize [033](../tasks/done/2026-09/033-leaf-host-materialize.md); SDK [036](../tasks/done/2026-09/036-guld-js-sdk.md) |
| Docs | This file; polyglot SDK sketch (**Accepted**) |

---

## Decision

**Ship the turn game first** — now done and working on Simba. It is the smallest artefact that includes:

- a **git-backed leaf**,
- **software that changes a state machine in files**,
- and an **on-record proof story** (authorized tip sequence) without pretending the chain interprets the game.

Treat on-record chat as the same pattern with a louder social UI — second example, not the reference. Developers landing copy points here from [/#developers](/#developers).

## History

- 2026-09-27: Sketched from polyglot SDK + reference dapp discussion.
- 2026-09-27: Package scaffolded as `src/guld-tic-tac-toe` ([037](../tasks/done/2026-09/037-guld-tic-tac-toe.md)); `/demo/ttt/` local tip hashing.
- 2026-09-27: 036 + 037 archived; on-chain Simba cosign e2e remains under 033.
- 2026-09-27: On-chain path + `guld-node --dev` e2e (register → winning-line tips) in package tests.
- 2026-09-27: [033](../tasks/done/2026-09/033-leaf-host-materialize.md) closed — faucet `ttt-demo` ensure, `auditGameTip`, Spec 11 §8.
- 2026-09-27: Called out as live PoC on landing `#developers` + FAQ.
