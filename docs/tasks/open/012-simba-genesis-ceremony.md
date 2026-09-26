# Task: Simba genesis ceremony (block 0 pin)

Status: open (G2–G4 landed — tick 007 / optional CI remain)
Priority: **high** (task 007 **G2–G4**)
GIP: ../gips/gip-14.md
Spec: ../specs/15-ledger-import.md, ../specs/05-state.md §6
Artifacts: ../../data/genesis/simba/
Runbook: ../../deploy/SIMBA.md

## Problem

Simba has committed **import manifest**, **params**, and **isysd claim** ([A7](../tasks/open/007-simba-beta-public-readiness.md)), but not a reproducible **height-0 bundle** in-repo: matching `blocks/0.json`, state root, and tip hash that peers can verify without wall-clock drift or ad-hoc `--dev` genesis.

Operators must not rely on empty-datadir mint or post-hoc `--import-ledger`.

## Goals

1. **G2 — Regenerate ceremony output** with fixed `params.json` timestamp and deterministic build:
   - `guld-genesis build` → state root, block 0 header/body, tip hash
   - Commit under `data/genesis/simba/` (or documented export path) what peers need to load
2. **G3 — Document ceremony** in `data/genesis/simba/README.md` + `deploy/SIMBA.md` (operator steps, verify commands).
3. **G4 — Reset policy** published: one-line comms (“Simba may reset once before durable lock” vs “locked for beta”) on site / task 007 **D1**.

## Prerequisites

- **A7** manifest locked (done).
- Prefer **GIP-22** + **BARE** decision before final pin if those change `txs[0]` / state root — or pin now with documented “one more reset” before durable beta.

## Done when

- [x] Reproducible `guld-genesis build` from committed artifacts; documented hash pins (`pins.json`)
- [x] Fresh datadir + `--network simba` reaches same tip without `--dev` (pin-checked in `datadir.rs`)
- [x] G2–G4 ticked in [007](./007-simba-beta-public-readiness.md)
- [ ] Optional: CI smoke loads genesis-only datadir (no mine)

## Pins

- **tip_hash:** `0xc4a0171e5afd7ecd425b0ef8a7e57cc737226e4a992aecaa05324257c6adb3f0`
- **state_root (post home):** `0xcd380447a4513c7736a178ab83c506f956552e239dd9c25c56699f1ae7b6064d`
- Artifacts: `blocks/0.json`, `pins.json`

## Notes

```
2026-09-26: Opened — A7 done; G1 full ledger documented; ceremony output still open.
2026-09-26: Committed blocks/0.json + tip pins; datadir verifies pins on artifact genesis; G4 = one more reset OK.
```
