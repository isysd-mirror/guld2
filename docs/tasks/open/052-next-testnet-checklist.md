# Task: Mufasa next-testnet naming + ceremony checklist

Status: open  
Priority: normal (ops — name reserved; launch only when a break needs a new net)  
GIP:  
Spec: ../specs/17-protocol-upgrades.md §7  
Related: ../MUFASA.md, ../SIMBA_BETA.md, ./031-mainnet-genesis-ceremony.md, ./051-account-leaf-datadir-bare.md, ../research/external-code-review-beta.md  

## Problem

Simba tip is **locked**. Incompatible protocol changes that cannot height-activate MUST ship as a **new named testnet** (`chain_id`, genesis, bootnodes). The successor name is **Mufasa** (`mufasa`, planned `chain_id` **3**). Operators need a short checklist so the next break is not ad-hoc.

## Naming (locked for planning)

| Field | Value |
|-------|--------|
| Display | Mufasa |
| `--network` / profile | `mufasa` |
| Planned `chain_id` | `3` |
| Planning page | [MUFASA.md](../MUFASA.md) |

**Do not** create `data/networks/mufasa.json` or genesis until a concrete launch (this task’s ceremony checkboxes).

## Simba vs Mufasa — which tasks?

### Simba (height-activate; **no** tip wipe)

| Task | Notes |
|------|--------|
| [055](./055-simba-single-rule-bundle.md) | Single Core catch-up bundle |
| [044](./044-merkle-roots-implement-simba-activate.md) | Live Merkle `H` via 055 |
| [041](./041-voluntary-unregister.md) | Activate via 055 |
| GIP-34 bio / GIP-25 wire | In 055 payload |

### Mufasa (new genesis / new tip — when needed)

| Task | Notes |
|------|--------|
| **This task (052)** | Ceremony checklist + launch ops |
| [051](./051-account-leaf-datadir-bare.md) | **Only** if leaf/datadir BARE **changes bytes** (rewrite). Freeze-as-is of today’s `account_value_hash` can finish on Simba without Mufasa. |

### Not a testnet split

Mainnet ceremony ([031](./031-mainnet-genesis-ceremony.md)), attestation **roster** identities ([045](./045-gip-25-attestation-cosigners.md)), app/UX ([005](./005-human-first-ux.md), [039](./039-guld-web-ui-extension-pair.md)), faucet hardening ([054](./054-faucet-registrar-hardening.md)), mesh polish ([032](./032-p2p-mesh-robustness-phase-b.md)).

## Done when

- [x] Successor name documented (**Mufasa**) + [MUFASA.md](../MUFASA.md)  
- [x] Pointer from [SIMBA_BETA.md](../SIMBA_BETA.md) reset policy  
- [ ] Ceremony checklist executed at launch (below) — **not** until a break requires the new net  
- [ ] Does **not** create network/genesis artifacts until that launch  

### Ceremony checklist (at launch)

- [ ] `data/networks/mufasa.json` (`chain_id` 3, mode testnet, bootnodes)  
- [ ] `data/genesis/mufasa/` + pins + smoke test  
- [ ] `deploy/MUFASA.md` operator runbook (or SIMBA twin)  
- [ ] Site / status banner: `network=mufasa`; FAQ + Discord notice  
- [ ] Faucet keys + datadir wipe notice (new path; never reuse Simba datadir)  
- [ ] Bootnode list / guld.io peer profile for Mufasa  
- [ ] Mark which open tasks closed by genesis choices (e.g. 051 rewrite)  

## Non-goals

- Launching Mufasa now  
- Simba tip wipe  
- Mainnet ceremony ([031](./031-mainnet-genesis-ceremony.md))  

## Notes

```
2026-09-29: Opened from external-code-review-beta open Q (next-testnet checklist).
2026-09-29: Named successor **Mufasa** (planned chain_id 3); planning page
           docs/MUFASA.md; Simba vs Mufasa task split recorded.
```
