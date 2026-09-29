# Source, CI, CD, and release

How Guld software is hosted, tested, shipped, and optionally mirrored. This is the trust story for the **developer tree** — not L0 consensus.

Normative delivery loop: [`SOFTWARE_FLOW.md`](SOFTWARE_FLOW.md). Layout and clone URLs: [`REPO_LAYOUT.md`](REPO_LAYOUT.md). HTTP serving: [`HOSTING.md`](HOSTING.md). Contributor entry: [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## Thesis

| Question | Answer |
|----------|--------|
| Where is the source of truth? | The guld mesh: peers that serve `/repos/` via `guld-node`. **guld.io** is the official public remote for that tree. |
| What is CI? | **Local git hooks** (pre-commit) that run lifecycle phases, genesis pin smoke, and GIP-26 vectors. |
| What is a release? | A **maintainer PGP-signed annotated git tag** after QA — not a forge checkbox. |
| What is GitHub? | An **optional mirror** and contributor-relations surface. Actions / badges are optional **signals** for people who value corporate forges — never the trust root. |

A stranger who wants proof can **clone from guld.io, verify the tag signature, and re-run the same tests**. That is stronger than trusting Microsoft-hosted runners on a mirror.

---

## 1. Git source ecosystem

```text
                    ┌─────────────────────────────────────┐
                    │  Working trees (umbrella + src/*)   │
                    │  day-to-day edit / cargo / commit   │
                    └─────────────────┬───────────────────┘
                                      │ push
                    ┌─────────────────▼───────────────────┐
                    │  Bare remotes  repos/<name>.git     │
                    │  (on disk next to the site root)    │
                    └─────────────────┬───────────────────┘
                                      │ guld-node --http-static
              ┌───────────────────────┼───────────────────────┐
              ▼                       ▼                       ▼
     peer A /repos/…         guld.io /repos/…         peer N /repos/…
     (optional host)         (official remote)        (optional host)
```

- **Umbrella** (`repos/guld.git`) — site, docs, Cargo workspace, submodule pins. Clone this first.
- **Leaves** (`repos/guld-*.git`) — packages under `src/`; individually clonable.
- **Official clone URLs** — `https://guld.io/repos/<name>.git` (also what `.gitmodules` uses).
- **Any peer** may materialize and serve the same bares. Hosting software remotes is part of the product surface, not a third-party forge franchise.
- **Consensus** does not pin developer git tips. Rule bundles (`guld_rules_hash`) are the network parameter set; source distribution is a peer/operator concern.

Detail: [`REPO_LAYOUT.md`](REPO_LAYOUT.md), [`HOSTING.md`](HOSTING.md) §1.

### What is *not* the source of truth

- GitHub (or any forge) org / default branch tip  
- A green Actions badge  
- Unsigned commits on a development branch  

Those may be useful, timely, and friendly. They are still **mirrors or social overlays**.

---

## 2. Continuous integration (CI)

**CI = local pre-commit**, installed once per clone:

```bash
./scripts/install-dev-hooks.sh
```

Hooks live in [`scripts/githooks/`](../scripts/githooks/) and run on the umbrella and the crates that own consensus / node / wire / legacy when those trees change. Typical coverage:

| Gate | What |
|------|------|
| Lifecycle Phase 1–5 | State matrix, node smoke, two-node sync, reorg, Simba catch-up |
| Genesis | Simba pin smoke |
| Vectors | GIP-26 TxId + consensus goldens (Rust + non-Rust consumer) |

Commands and phase map: [`scripts/chain-lifecycle/README.md`](../scripts/chain-lifecycle/README.md).

### Properties we care about

1. **Fails closed for hooked contributors** — broken lifecycle or drifted vectors do not land as ordinary commits.
2. **Reproducible by anyone** — same scripts and `cargo test` targets; no private CI secret required to verify.
3. **Does not depend on a forge** — peers without GitHub accounts have a complete gate.

Maintainer-only escape hatches (`GULD_SKIP_*`, `--no-verify`) exist for exceptional human ops. They are not the contributor path ([`CONTRIBUTING.md`](../CONTRIBUTING.md)).

There is **no requirement** for a hosted pipeline. Hosted jobs may be added later as optional mirrors of these commands; they do not become the gate.

---

## 3. Continuous delivery (CD) and deployment

“CD” here means **publish the tree peers can run**, not “ship to GitHub.”

1. Commit and push **leaf** → matching `repos/<name>.git` (hooks on).
2. Pin gitlink + docs in the **umbrella**; push `repos/guld.git`.
3. Peers (including guld.io) serve `/repos/` and run `guld-node` on the published checkout.
4. Bootstrap host may auto-sync worktrees / restart via bare `post-receive` ([`REPO_LAYOUT.md`](REPO_LAYOUT.md) § Auto-sync).

Any peer that runs the published tree is a valid deployment. **guld.io** may add nginx for TLS only ([`HOSTING.md`](HOSTING.md)). Product behavior stays in `guld-node`.

Interim branch tips and WIP pushes do **not** need release-grade attestation. Ordinary git sync (and optional forge PR flow) is enough while work is in flight — the same bar as a typical open-source project, not a higher one.

---

## 4. Releases

Production protocol software releases are **maintainer-only PGP-signed annotated tags** on the canonical remotes (umbrella and/or shipping leaf). Agents never cut tags.

A signed tag means, in substance:

- The tagged tree is what the maintainer intends peers to run.
- Lifecycle / vector / QA expectations for that cut were satisfied (or consciously waived and noted).
- Consumers can `git verify-tag` (or equivalent) against the maintainer’s published key.

**Shipping a binary or bumping a branch tip is not activation.** Consensus rule changes need a height-activated rule bundle ([spec 17](specs/17-protocol-upgrades.md)).

### How to verify a release (recommended)

```bash
git clone https://guld.io/repos/guld.git
cd guld
git fetch --tags
git verify-tag <tag>          # PGP — trust root for “this cut”
git checkout <tag>
git submodule update --init --recursive
./scripts/install-dev-hooks.sh   # optional; or run lifecycle/vector tests directly
# e.g. cargo test -p guld-consensus --test vectors_gip26
```

That sequence does not depend on GitHub.

---

## 5. GitHub and other forges (optional)

GitHub already mirrors some Guld repos; mirroring the rest is fine and welcome for **discoverability** and **contributor relations** (Issues, PRs, familiar clone UX).

| Surface | Role |
|---------|------|
| Mirror remotes | Convenience clone / browse; **not** official SoT |
| Pull requests / Issues | Social overlay for contributors who prefer forges; canonical tracking remains [`docs/tasks/`](tasks/) and [`docs/gips/`](gips/) in-tree |
| GitHub Actions (or similar) | **Optional signal** — re-run the same lifecycle/vector commands so forge UIs show green for people who trust that culture |
| Release assets on a forge | Optional redistribution; authenticity still rests on **signed tags** from guld.io / mesh remotes |

### Explicit non-goals for forges

- Requiring GitHub (or any forge) as canonical SoT  
- Blocking commits or releases on a third-party CI result  
- Treating a green badge as stronger evidence than a maintainer-signed tag  
- Raising WIP sync to “every push needs a signature or hosted proof”

If Actions (or a peer-published log) exists, document the workflow as: *mirror of local CI, for forge consumers*. Point README / SOFTWARE_FLOW at **this** document so outsiders know where trust actually lives.

---

## 6. Trust comparison (why forge CI is not “better”)

| Claim | Signed tag + local/re-runnable tests | Hosted Actions on a mirror |
|-------|--------------------------------------|----------------------------|
| Binds to official remote | Yes (guld.io / peer `/repos/`) | No — forge copy |
| Attests maintainer intent | Yes (PGP) | No — runner identity |
| Reproducible by the reader | Yes | Only if they still clone and re-run |
| Fits mesh-first hosting | Yes | Imports a corporate trust root |

Forge CI is useful **marketing and contributor UX** for audiences trained on GitHub. It is not a substitute for the release model above, and it is not a gap in transparency when signed tags and open test scripts already exist.

---

## Related

- [`SOFTWARE_FLOW.md`](SOFTWARE_FLOW.md) — GIP → implement → push → QA → signed tag  
- [`REPO_LAYOUT.md`](REPO_LAYOUT.md) · [`HOSTING.md`](HOSTING.md)  
- [`scripts/chain-lifecycle/README.md`](../scripts/chain-lifecycle/README.md)  
- [GIP-26](gips/gip-26.md) — golden vectors  
- Task [050](tasks/done/2026-09/050-reproducible-lifecycle-ci.md) — cancelled; this doc is the decision  
- External review context: [`research/external-code-review-beta.md`](research/external-code-review-beta.md) finding 9  
