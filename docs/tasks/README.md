# Task queue

Lightweight, **git-native** issue tracking — no GitHub Issues required. Canonical host is [guld.io](https://guld.io/) (this repo); GitHub is an optional mirror.

## How this relates to other docs

| Layer | Path | Use for |
|-------|------|---------|
| **GIP** | [`../gips/`](../gips/) | Larger features / protocol slices — document *before* implementation ([`SOFTWARE_FLOW.md`](../SOFTWARE_FLOW.md)) |
| **Task** | `docs/tasks/` (here) | Actionable tickets: bugs, UI polish, single PR-sized work |
| **Spec** | [`../specs/`](../specs/) | Normative behavior once agreed |
| **Later** | [`../LATER.md`](../LATER.md) | Strategic backlog, research, multi-quarter |

Promote a task → GIP when scope grows. Close tasks when merged; archive under `done/`.

## Layout (`.github`-like, but markdown)

```
docs/tasks/
  README.md           ← this file
  templates/
    task.md           ← copy to open a new task
  open/               ← active work
  done/               ← completed (YYYY-MM slug)
```

There is **no** repo-root `.github/ISSUE_TEMPLATE` today — guld uses this tree instead so tasks version with the code (and with the static site that is this same repo).

## Task file format

Filename: `NNN-short-slug.md` (zero-padded number, kebab-case).

```markdown
# Task: Short title

Status: open | blocked | done
Priority: low | normal | high
GIP: ../gips/gip-N.md   # optional link
Spec: ../specs/14-reference-ui.md   # optional

## Problem
…

## Done when
- [ ] …
```

## Workflow

1. Add file under `open/`.
2. Implement; reference task id in commit message if helpful.
3. Move to `done/YYYY-MM/` when shipped; set `Status: done`.

## Open queue (2026-09-29)

Prioritized for **mainnet SoT + Simba catch-up** — see [007](./done/2026-09/007-simba-beta-public-readiness.md) (**done**; D2 confirmed).  
Whitepaper / specs describe **mainnet**; Simba trails via **one** rule bundle ([055](./open/055-simba-single-rule-bundle.md)). Tip **locked** (no further resets). Next named testnet if a tip-incompatible break is required: **[Mufasa](../MUFASA.md)** ([052](./open/052-next-testnet-checklist.md); not launched).

| Pri | Task | Spec / GIP | Notes |
|-----|------|------------|-------|
| **P1** | [055](./open/055-simba-single-rule-bundle.md) | GIP-25/33/34/35 | **Simba** — single Core catch-up bundle ([042](./done/2026-09/042-rule-bundle-upgrade-e2e.md) e2e **done**) |
| **P1** | [044](./open/044-merkle-roots-implement-simba-activate.md) | GIP-35, 055 | **Simba** — dual-path + goldens **done**; live `H` via 055 |
| **P1** | [040](./open/040-simba-genesis-timestamp-retarget.md) | spec 06 §2.4, Simba | First retarget skewed; **no regenesis** — doc + mainnet ceremony ([031](./open/031-mainnet-genesis-ceremony.md)) |
| **P1** | [041](./open/041-voluntary-unregister.md) | GIP-33 Accepted | **Simba** — activate via 055 |
| **P2** | [045](./open/045-gip-25-attestation-cosigners.md) | GIP-25 Accepted | Community cosigner identities TBD; mainnet ≥ some |
| **P2** | [039](./open/039-guld-web-ui-extension-pair.md) | GIP-32 Accepted | Shared `guld-web-ui` + extension pairing (ops: publish bare to guld.io) |
| **P2** | [005](./open/005-human-first-ux.md) | spec 14, GIP-20/31 | Human-first chrome; invite → [038](./done/2026-09/038-contacts-private-invite.md) **done** |
| **P2** | [048](./open/048-lift-locked-spec-draft-banners.md) | specs README | Lift draft banners on locked Simba-critical specs |
| **P3** | [031](./open/031-mainnet-genesis-ceremony.md) | GIP-14 | Mainnet genesis + import audit |
| **P3** | [051](./open/051-account-leaf-datadir-bare.md) | GIP-4 | Freeze-as-is → Simba docs; **rewrite** → [Mufasa](../MUFASA.md) |
| **P3** | [052](./open/052-next-testnet-checklist.md) | spec 17 §7 | **Mufasa** naming + launch checklist (name reserved; not launched) |
| **P3** | [032](./open/032-p2p-mesh-robustness-phase-b.md) | spec 09 | Mesh Phase B polish (incl. multi-bootnode) |

**Done recently:** [054](./done/2026-09/054-faucet-registrar-hardening.md) (faucet/registrar hardening checklist), [053](./done/2026-09/053-mainnet-security-budget-messaging.md) (solo PoW security-budget messaging), [049](./done/2026-09/049-fuzz-apply-import.md) (proptest apply/import + mempool/P2P caps), [002](./done/2026-09/002-wallet-send-contacts.md)–[004](./done/2026-09/004-rpc-search-accounts.md) ([GIP-20](../gips/gip-20.md) **Accepted** — contacts, `guld1contact:`, Send typeahead), [032](./done/2026-09/032-gip-26-non-rust-vectors.md) ([GIP-26](../gips/gip-26.md) **Final** — JS vector consumer), [033](./done/2026-09/033-leaf-host-materialize.md) (JS leaf materialize + ttt e2e + Spec 11 §8), [036](./done/2026-09/036-guld-js-sdk.md) (`@guld/js`), [037](./done/2026-09/037-guld-tic-tac-toe.md) (`/demo/ttt/`), [029](./done/2026-09/029-sync-fork-catchup.md) (sync hygiene / reorg catch-up), [035](./done/2026-09/035-group-multisig-lifecycle-e2e.md) (group thr>1 register→cosign→rotate→spend + peer; `import_block` vesting fix), [034](./done/2026-09/034-convert-account-kind.md) ([GIP-28](../gips/gip-28.md) Accepted — `ConvertAccountKind`), [030](./done/2026-09/030-extension-site-login.md) (extension site-login §10.1 + `/demo/login/`), [028](./done/2026-09/028-threshold-transfer-cosign.md) (threshold Transfer cosign / [GIP-29](../gips/gip-29.md)), [022](./done/2026-09/022-legacy-settle-parity.md)–[027](./done/2026-09/027-legacy-parity-comms.md) ([GIP-27](../gips/gip-27.md) **Final** — settle parity; tip `0xf4cdc017…`), [007](./done/2026-09/007-simba-beta-public-readiness.md) (Simba beta readiness; D2 confirmed), [021](./done/2026-09/021-consensus-golden-vectors.md) (GIP-26 vectors + Rust/pre-commit), [006](./done/2026-09/006-chain-lifecycle-tests.md) (lifecycle Phase 1–5 pre-commit), [012](./done/2026-09/012-simba-genesis-ceremony.md) (genesis ceremony + pin smoke), [011](./done/2026-09/011-gip-22-miner-rewards.md) + [020](./done/2026-09/020-remove-credit-miner-footguns.md) (GIP-22 footguns), [008](./done/2026-09/008-mempool-persistence.md) (mempool.jsonl), [009](./done/2026-09/009-bare-wire-implementation.md) (BARE TxId + dual-wire), [010](./done/2026-09/010-header-timestamp-validation.md) (MTP + 2 h), [013](./done/2026-09/013-chain-reorg-implementation.md) + [019](./done/2026-09/019-dual-miner-reorg-integration-test.md) (reorg), [014](./done/2026-09/014-enforce-difficulty-on-import.md) (GIP-23 schedule), [015](./done/2026-09/015-reconcile-docs-with-code.md) (docs ↔ code), [016](./done/2026-09/016-reconcile-genesis-x-vs-manifest.md) (`x` = row sum), [017](./done/2026-09/017-whitepaper-risks-and-rhetoric.md) (risks / rhetoric), [018](./done/2026-09/018-publish-omitted-buckets-and-negatives.md) (ERC20 + negatives) — archive 2026-09.

**Checklist hub:** [007](./done/2026-09/007-simba-beta-public-readiness.md) (A1–A11 locked; C/D closed; archived).  
**Public beta page:** [SIMBA_BETA.md](../SIMBA_BETA.md).  
**Next testnet (named, not launched):** [MUFASA.md](../MUFASA.md) · checklist [052](./open/052-next-testnet-checklist.md).  
**Whitepaper gaps:** [`../whitepaper/guld-2.0.md`](../whitepaper/guld-2.0.md) §12.2.  
**Draft protocol follow-ups:** [GIP-25](../gips/gip-25.md) **Accepted** — cosigners TBD for mainnet ([045](./open/045-gip-25-attestation-cosigners.md)); wire in [055](./open/055-simba-single-rule-bundle.md). Core: [GIP-33](../gips/gip-33.md)/[GIP-34](../gips/gip-34.md)/[GIP-35](../gips/gip-35.md) Accepted → [055](./open/055-simba-single-rule-bundle.md). Application: [GIP-31](../gips/gip-31.md) → [038](./done/2026-09/038-contacts-private-invite.md) **done**; [GIP-32](../gips/gip-32.md) → [039](./open/039-guld-web-ui-extension-pair.md) (ops pin).  
**Before mainnet:** [031](./open/031-mainnet-genesis-ceremony.md); [042](./done/2026-09/042-rule-bundle-upgrade-e2e.md) → [055](./open/055-simba-single-rule-bundle.md); [045](./open/045-gip-25-attestation-cosigners.md); [053](./done/2026-09/053-mainnet-security-budget-messaging.md) **done** (security-budget blurb).  
**External review follow-ups:** [048](./open/048-lift-locked-spec-draft-banners.md)–[052](./open/052-next-testnet-checklist.md) (from [external-code-review-beta.md](../research/external-code-review-beta.md); [046](./done/2026-09/046-http-static-deny-cors-audit.md) **done**; [049](./done/2026-09/049-fuzz-apply-import.md) **done**; [053](./done/2026-09/053-mainnet-security-budget-messaging.md) **done** — [security-budget blurb](../fragments/security-budget.md); [054](./done/2026-09/054-faucet-registrar-hardening.md) **done** — [faucet-registrar hardening](../fragments/faucet-registrar-hardening.md); [047](./open/047-cas-tip-da-ux.md) cancelled — tip≠DA is leaf-by-design; [050](./done/2026-09/050-reproducible-lifecycle-ci.md) cancelled — see [SOURCE_AND_RELEASE.md](../SOURCE_AND_RELEASE.md)).

## Automation (future)

Optional later: script to list open tasks, render an HTML index on guld.io, or wire Cursor agents to `docs/tasks/open/*.md`. Not required for v1.
