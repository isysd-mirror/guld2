---
gip: 1
title: GIP Purpose and Guidelines
description: Defines Guld Improvement Proposals — types, statuses, editors, and when a GIP is required.
author: Guld contributors
discussions-to: ../gips/README.md
status: Living
type: Meta
created: 2026-09-25
---

## Abstract

Guld Improvement Proposals (GIPs) are the numbered, versioned documents for proposing substantial changes to the Guld protocol, its reference implementations, and its development processes. This GIP (GIP-1) defines the process itself. It is a **Living** document and MAY be updated as norms evolve.

## Motivation

Guld is a decentralized protocol. Change proposals need stable citations (**GIP-N**), clear lifecycle statuses, and a separation from:

1. **Normative consolidated specs** ([`../specs/`](../specs/)) and the [whitepaper](../whitepaper/guld-2.0-draft.md)
2. **Engineering delivery** ([`../SOFTWARE_FLOW.md`](../SOFTWARE_FLOW.md) — implement, push leaf/umbrella, QA, signed tags)
3. **On-chain activation** ([spec 17](../specs/17-protocol-upgrades.md) — rule-bundle `activation_height`)

Without this split, “intent” docs and personal software-flow habits blur proposal, SoT, and release.

## Specification

### What a GIP is

A GIP is a Markdown file under [`docs/gips/`](./) named `gip-N.md` (decimal N, no zero-padding required). Supporting assets MAY live in `docs/gips/assets/gip-N/`.

Having a GIP merged here means the proposal is **in scope** and meets editorial criteria. It does **not** by itself mean the change is adopted on every peer’s tip or activated in consensus.

### Types

| Type | Meaning |
|------|---------|
| **Standards** | Affects interoperability: consensus validity, tx vocabulary, P2P wire, rule bundles, cross-implementation APIs or conventions |
| **Meta** | Process around Guld (including this document), contribution guidelines, tooling norms that users are not free to ignore |
| **Informational** | Design notes, research summaries, or guidance that does not require implementation consensus |

### Categories (Standards Track only)

| Category | Examples |
|----------|----------|
| **Core** | Consensus, fees, names, txs, rule-bundle semantics |
| **Networking** | P2P discovery, gossip, sync |
| **Interface** | HTTP/RPC shapes, provider APIs, UI coverage matrices that bind reference clients |
| **Application** | Reference PWA/site UX that is product-normative but not consensus opcodes |

### Statuses

| Status | Meaning |
|--------|---------|
| **Draft** | Formally tracked; open to substantial revision |
| **Review** | Author believes it is ready for editor/peer review |
| **Accepted** | Rough consensus to implement and/or fold into specs; **not** necessarily live on-chain |
| **Final** | Implemented as specified (and, for Core activation cases, shipped in software); further changes SHOULD be a new GIP or a deliberate Living update |
| **Stagnant** | No progress for a prolonged period |
| **Withdrawn** | Author or editors withdrew the proposal |
| **Living** | Process docs (e.g. GIP-1) that do not ossify |

For Standards Track **Core** that needs a height-activated rule change: **Accepted** means ready to implement and schedule activation; peers follow tip only after software ships and the rule bundle’s `activation_height` is reached ([spec 17](../specs/17-protocol-upgrades.md)).

### When a GIP is required

You MUST open (or update) a GIP for substantial changes to:

- Consensus validity, fee schedules, name rules, or tx vocabulary
- P2P wire behavior or rule-bundle semantics
- Cross-implementation HTTP/RPC/provider standards
- The GIP process itself

You SHOULD NOT require a new GIP for:

- Typos, editorial cleanups, or non-normative doc polish
- Non-consensus UX polish already covered by an Accepted/Final GIP
- Single-crate refactors with no protocol or API surface change
- Small tickets under [`../tasks/`](../tasks/) already linked to an Accepted GIP

### Workflow

1. **Discuss** — open a discussion (issue, patch series, or peer review) before a large Draft if the idea is exploratory.
2. **Draft** — copy [`gip-template.md`](gip-template.md); leave `gip:` unset or use a working title file until an editor assigns a number.
3. **Number** — only editors assign `gip` numbers and merge `gip-N.md` into this tree.
4. **Review → Accepted** — gather feedback; update specs/whitepaper when Accepted.
5. **Implement** — follow [`../SOFTWARE_FLOW.md`](../SOFTWARE_FLOW.md) (leaf → umbrella → QA → maintainer signed tag).
6. **Activate (if Core)** — publish matching node software, then next `guld` rule bundle with `activation_height` when required.
7. **Final** — mark Final when the specification matches what shipped.

### Editors

Editors maintain format, numbering, and index integrity. They MUST NOT treat merge as endorsement that the proposal is economically or socially “correct.” Adoption rests with implementers and, for consensus rules, with peers who run software and follow activated rule digests.

Initially, Guld maintainers act as editors. This Living document SHOULD list editor handoff when the set grows.

### Header preamble

Each GIP MUST begin with YAML front matter between `---` lines, including at least: `gip`, `title`, `description`, `author`, `status`, `type`, `created`. Standards Track MUST include `category`. Optional: `discussions-to`, `requires`, History/`Supersedes` for migrations.

### Normative language

Standards Track Specification sections SHOULD use RFC 2119 / RFC 8174 keywords.

### Relationship to other docs

| Layer | Path | Role |
|-------|------|------|
| Proposals | `docs/gips/` | What should change and why |
| SoT | whitepaper → `docs/specs/` | Consolidated MUST/SHOULD once agreed |
| Tickets | `docs/tasks/` | Small actionable work |
| Delivery | `docs/SOFTWARE_FLOW.md` | Ship code after acceptance |
| Activation | Spec 17 | Height-activated rule bundles |

**SoT hierarchy is unchanged:** whitepaper wins disputes → specs → implementation. Accepted GIPs **patch** that SoT; they do not replace it.

### Copyright

Unless otherwise stated, GIPs are contributed under the same license as this repository.

## Rationale

In-tree GIPs (not a separate host farm) match Guld’s peer `/repos/` distribution. Simplified statuses avoid EIP Last Call bureaucracy while keeping citeable numbers. Specs remain the consolidated normative series so implementers have one reading path.

## Backwards Compatibility

Pre-GIP **intents** under `docs/intents/` were migrated to GIP-2…GIP-21. A stub README remains at `docs/intents/` for redirects.

## Security Considerations

Editors gating format must not become a covert veto on technical content. Core activation MUST remain height-based so binary upgrades cannot silently change validity mid-tip.

## Reference Implementation

Process only — no protocol code.
