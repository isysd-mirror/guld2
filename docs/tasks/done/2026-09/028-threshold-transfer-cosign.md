# Task: Threshold Transfer cosign (group spend)

Status: done  
Priority: **high** (P0 — next protocol/UI hole after tips/rotate cosign)  
Spec: [`../../specs/03-transactions.md`](../../specs/03-transactions.md) §3.6, [`../../specs/14-reference-ui.md`](../../specs/14-reference-ui.md) §9 / §13  
Whitepaper: [`../../whitepaper/guld-2.0-draft.md`](../../whitepaper/guld-2.0-draft.md) §12.2  
Surface: `guld-state` / `guld-client` / PWA wallet cosign workstation

## Problem

Groups and multi-key accounts can already **UpdateMaster** and **RotateKeys** via `threshold_cosign_v1` and the PWA cosign workstation. **`Transfer` is still single-signature only** on the wire (`signature` field); the wallet refuses threshold > 1 spend and tells users to fund a 1-of-1 sub. Spec 03 still marks multi-sig spend as draft. That leaves cosign half-finished for everyday money movement.

## Scope

1. **Spec freeze** — Choose the Transfer auth shape (reuse `LeafConsensusProof` / cosign list vs tagged spend message). Update specs 03 + 14; remove “UI MUST refuse” once consensus accepts it.
2. **State / crypto / client** — Verify threshold spend in `guld-state`; builders + signing helpers in `guld-client`; golden / lifecycle tests (2-of-2 and 2-of-3 happy path + reject under-threshold).
3. **PWA** — Extend cosign workstation (`guld1cosignreq` / `guld1cosignres`) to Transfer; Send flow starts a session when local keys < threshold; broadcast when complete.
4. **Docs** — Spec 14 §12 implementation order; whitepaper gap row closes when done.

## Non-goals

- Citizen UX polish of cosign sessions (links [005](../open/005-human-first-ux.md) P2) — functional path first.
- Hardware keys / PQ.
- Changing tip (`UpdateMaster`) cosign already shipped.

## Done when

- [x] Spec 03 §3.6 + 14 §9/§13 normative for threshold Transfer
- [x] `guld-state` accepts / rejects Transfer under threshold correctly
- [x] PWA can assemble, share, and broadcast a multi-sig Transfer without JSON-only operator path as the sole flow
- [x] Lifecycle or unit coverage for multi-sig spend
- [x] Task → `done/YYYY-MM/`

## Notes

```
2026-09-27: Opened from whitepaper gap review — cosign prioritized ahead of contacts polish.
2026-09-27: Shipped — Transfer cosignatures + BARE v2; PWA op=transfer; tests apply_tx + wire + cosign.test.js.
```
