# Task: Simba genesis ceremony (block 0 pin)

Status: done
Priority: **high** (task 007 **G2–G4**)
GIP: ../../gips/gip-14.md
Spec: ../../specs/15-ledger-import.md, ../../specs/05-state.md §6
Artifacts: ../../../data/genesis/simba/
Runbook: ../../../deploy/SIMBA.md

## Problem

Simba has committed **import manifest**, **params**, and **isysd claim** ([A7](../open/007-simba-beta-public-readiness.md)), but not a reproducible **height-0 bundle** in-repo: matching `blocks/0.json`, state root, and tip hash that peers can verify without wall-clock drift or ad-hoc `--dev` genesis.

Operators must not rely on empty-datadir mint or post-hoc `--import-ledger`.

## Goals

1. **G2 — Regenerate ceremony output** with fixed `params.json` timestamp and deterministic build.
2. **G3 — Document ceremony** in `data/genesis/simba/README.md` + `deploy/SIMBA.md`.
3. **G4 — Reset policy** published (“one more reset OK”).
4. **Pre-commit CI** — empty-datadir Simba load + pin check (no hosted CI).

## Done when

- [x] Reproducible `guld-genesis build` from committed artifacts; documented hash pins (`pins.json`)
- [x] Fresh datadir + `--network simba` reaches same tip without `--dev` (pin-checked in `datadir.rs`)
- [x] G2–G4 ticked in [007](../open/007-simba-beta-public-readiness.md)
- [x] Pre-commit smoke: `cargo test -p guld-node --test simba_genesis_smoke` (gated on genesis / node / legacy changes)

## Pins

- **tip_hash:** `0xadbff5409912ffa96fee913b3775b471eaca58b26323465ec41a400f86a1cd96`
- **state_root (post home):** `0x67988785b8f6a3cc9f3e188a00df1e8b51cd1bbb5f48d3ddc0cb8edcb9997ff1`
- **import_manifest_hash:** `0x59a39af461d66fa1ef892708f8fa8838684d812cccfbe253816a34f448980e70`
- Artifacts: `blocks/0.json`, `pins.json`

## Notes

```
2026-09-26: Opened — A7 done; G1 full ledger documented; ceremony output still open.
2026-09-26: Committed blocks/0.json + tip pins; datadir verifies pins on artifact genesis; G4 = one more reset OK.
2026-09-26: Regenesis for task 016 (hyphen remaps + x = sum(rows)); prior tip 0xc4a017… obsolete.
2026-09-27: Pre-commit CI — simba_genesis_smoke + scripts/chain-lifecycle/simba-genesis-smoke.sh.
```
