---
gip: 4
title: Guld 2.0 protocol and component specs
description: Turn the whitepaper into implementable numbered specs before large node work.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Meta
created: 2026-09-25
---

## Abstract

Turn the whitepaper into implementable numbered specs before large node work.

## Goal

Turn the whitepaper into **implementable specs**: clear components, wire/logical APIs, tx/proof/state/consensus boundaries—before large Rust node work.

## Delivered (v0)

- [`../specs/README.md`](../specs/README.md) index  
- Specs `00`–`17`: protocol + **reference UI (PWA wallet on guld.io)**; spec **13** is **informative** (cross-chain dapp patterns — no genesis foreign names, task 007 **A11**)  
- Scaffold: `src/guld-types`, `src/guld-crypto`, `src/guld-wallet` ([`GIP-2`](gip-2.md))

## Next acceptance criteria

- [x] Freeze wire codec — **BARE** in `01` §4 ([`schemas/`](../../schemas/README.md))  
- [ ] Freeze registration funding model in `03`  
- [x] Freeze PoW + subsidy function shape in `06`/`07` (10-min blocks; `(2/3)^(y−1)` floored at 4%)  
- [ ] Prototype `guld-types` + `guld-crypto` against `01`/`04`  
- [x] Flatten implementation under `src/` matching `00`  
- [x] Extension + provider scaffold (moved out of protocol repo; spec 14 is wallet + webapp only)  

## Out of scope

- Shipping mainnet  
- Indexer SQL schema as consensus

## History

Supersedes: `docs/intents/specs-2.0.md`
