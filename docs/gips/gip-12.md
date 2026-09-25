---
gip: 12
title: Subaccounts
description: Individual roots MAY open parent.label device wallets with fixed F_sub fees.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Core
created: 2026-09-25
---

## Abstract

Individual roots MAY open parent.label device wallets with fixed F_sub fees.

## Goal

Let a registered **individual** root account open **subaccounts** under its name for separate keys and balances — e.g. mobile hot wallet vs cold storage — without registering a new global username.

Addressing uses a **dot** separator:

```text
isysd.mobile
isysd.cold
alice.laptop
```

Each subaccount is a first-class on-chain account (own keys, nonce, balance, `master_hash`) that can send/receive with roots and other accounts.

## Decisions (locked)

| Item | Value |
|------|--------|
| Live cap | **8** subaccounts per parent |
| Nesting | One level only (`parent.label`) |
| Group parents | **No** — only `individual` roots may open subs |
| Fees | **Fixed** (see below); no year schedule / supply leg for registration |
| Close | Later (not v1) |

### Fixed registration fees (→ miners, 8-block vest)

| Kind | Fee |
|------|-----|
| Individual (`F_user`) | **1 GULD** |
| Subaccount (`F_sub`) | **0.1 GULD** |
| Group (`F_group(L, n)`) | **`F_user(L) × (2 + n)`** GULD (`L` = letters; `n` = initial key count) |

## Naming

| Rule | Draft |
|------|--------|
| Form | `{parent}.{label}` exactly **one** dot |
| Parent | Existing `individual` root (not group / network / foreign / sub) |
| Label | `^[a-z0-9]+(-[a-z0-9]+)*$` |
| Full name length | ≤ 64 UTF-8 bytes |
| Uniqueness | Full string globally unique |

## Account model

```text
kind: subaccount
parent: Name          // individual root
keys / threshold / nonce / master_hash / balance
```

- Spend authority is **only** the subaccount’s keys.
- Parent **registers** the sub; Transfers use the full dotted name.

## Transaction: `RegisterSubaccount`

Parent pays `F_sub + endowment + inclusion_fee`; dual-sig (parent spend + new `keys[0]` intent). Full normative text in specs 02 / 03 / 07.

## Out of scope (v1)

- Nested subaccounts; group-owned subs; parent spending from sub; CloseSubaccount; height-indexed registration fees

## Acceptance

- [x] Intent accepted (fee, cap, no group subs)
- [x] Specs updated (02 / 03 / 07 / 16 + whitepaper §8.7)
- [x] Node applies `RegisterSubaccount`; Transfer to/from `parent.label` works
- [x] Live-cap enforced; fee paid to miner
- [x] Wallet can create a sub and move funds parent ↔ sub

## History

Supersedes: `docs/intents/subaccounts.md`
