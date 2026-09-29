# Mufasa (next testnet)

**Status:** **named, not launched.** Planning name for the successor to [Simba](SIMBA_BETA.md) when a change cannot height-activate on the locked tip.

**Address people by name.** Lion-king succession: Simba stays; **Mufasa** is the next public testnet if/when Simba’s tip cannot absorb a break.

| | Simba (live) | Mufasa (planned) |
|--|--------------|------------------|
| **Network** | `simba` | `mufasa` (when shipped) |
| **`chain_id`** | `2` | **`3`** (reserved; assign at ceremony) |
| **Tip policy** | **Locked** — no further resets | New genesis / new tip |
| **How protocol advances** | Height-activated rule bundle ([spec 17](specs/17-protocol-upgrades.md), [055](tasks/open/055-simba-single-rule-bundle.md)) | Genesis ceremony + new network profile |
| **Docs** | [SIMBA_BETA.md](SIMBA_BETA.md) · [deploy/SIMBA.md](../deploy/SIMBA.md) | This page · launch checklist [052](tasks/open/052-next-testnet-checklist.md) |

There is **no** `data/networks/mufasa.json`, genesis tree, or bootnode entry yet. Creating those is part of the launch checklist — not a silent half-ship.

---

## When Mufasa (not Simba)

Use **Mufasa** for incompatible changes that would require tip wipe, global state rehash, or a new `chain_id` — not for soft Core catch-up that fits a rule bundle.

| Track | Examples | Where |
|-------|----------|--------|
| **Simba** | Merkle roots, `UnregisterAccount`, `UpdateBio`, attestation quorum **wire**, fee-table bumps | [055](tasks/open/055-simba-single-rule-bundle.md) + [044](tasks/open/044-merkle-roots-implement-simba-activate.md) / [041](tasks/open/041-voluntary-unregister.md) |
| **Mufasa** | Account-leaf codec **rewrite** (new SMT value preimage ≠ today’s `account_value_hash`); other tip-incompatible codec/storage breaks; optional datadir-native BARE as a **new-net** default | [051](tasks/open/051-account-leaf-datadir-bare.md) *(rewrite path)* · checklist [052](tasks/open/052-next-testnet-checklist.md) |
| **Either / docs-only** | Freeze **current** leaf encoding + vectors (no byte change) | [051](tasks/open/051-account-leaf-datadir-bare.md) *(freeze-as-is — can close on Simba)* |
| **Mainnet** | Genesis ceremony, community attestation roster fill | [031](tasks/open/031-mainnet-genesis-ceremony.md), [045](tasks/open/045-gip-25-attestation-cosigners.md) |

**Not Mufasa blockers:** Application GIPs (contacts, web-ui), faucet hardening, UX polish, P2P mesh polish — those ship on any live net via git.

---

## Launch checklist (summary)

Full checkbox list: [052](tasks/open/052-next-testnet-checklist.md). At a high level:

1. Freeze Mufasa genesis params + import policy (inherit Simba lessons; fix leaf/datadir choices up front).  
2. `data/networks/mufasa.json` (`chain_id` 3), `data/genesis/mufasa/`, pins.  
3. Bootnodes / guld.io peer profile; faucet keys; site banner `network=mufasa`.  
4. Discord/comms: Simba still valid for height upgrades; Mufasa is opt-in new mesh.  
5. Operator wipe notice: new `--network mufasa` datadir — **do not** reuse `.guld-data/simba`.

---

## Related

- Spec 17 §7 — new network name / `chain_id` = new net, not in-place upgrade.  
- External review: [external-code-review-beta.md](research/external-code-review-beta.md) (next-testnet open Q → 052).  
- Whitepaper: breaking testnet → new named net ([§12 risks](whitepaper/guld-2.0.md)).
