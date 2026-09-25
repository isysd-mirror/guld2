---
gip: 2
title: Scaffold 2.0 crates + provider
description: Implement Guld 2.0 core Rust crates and reference surfaces against docs/specs.
author: Guld contributors
discussions-to: ./README.md
status: Final
type: Meta
created: 2026-09-25
---

## Abstract

Implement Guld 2.0 core Rust crates and reference surfaces against docs/specs.

## Goal

Implement Guld 2.0 against `docs/specs/`: core Rust crates + reference desktop wallet.

## Acceptance

- [x] `guld-types` / `guld-crypto` — tagged SHA-256, Ed25519, threshold cosign
- [x] `guld-provider` EIP-1193-shaped `request` API (lives in separate browser-extension repo — not protocol)
- [x] `guld-state` — apply, genesis, fjall KV, 10-decimal amounts, issuance, legacy lock
- [x] `guld-consensus` — Header/Block, PoW, seal_block, mempool, retarget
- [x] `guld-cas` — object store + home tree materialize / seed `guld` home
- [x] `guld-node` — JSON-RPC, datadir, mempool, auto-mine, `guld_ready`
- [x] Account SMT `state_root` + membership / absence proofs (`guld_getAccountProof`)
- [x] PGP `ClaimLegacy` binding-set (`guld-legacy` + `archives/keys-pgp`)
- [x] Extension shell (separate browser-extension repo — not protocol)
- [x] P2P — phase A in [`GIP-15`](gip-15.md) (Hello + tx gossip); phases B/C open
- [ ] Extension polish (encrypted keyring, confirm prompts, store packaging)

## History

Supersedes: `docs/intents/scaffold-2.0.md`
