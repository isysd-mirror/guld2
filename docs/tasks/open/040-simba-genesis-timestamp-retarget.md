# Task: Simba genesis timestamp skewed first retarget (height 2016)

Status: open  
Priority: high  
Surface: Simba (`chain_id` 2) — **no regenesis**  
Spec: ../specs/06-blocks-and-consensus.md §2.4  
Related: ../gips/gip-23.md, ../deploy/SIMBA.md, data/genesis/simba/, [031](./031-mainnet-genesis-ceremony.md)  

## Problem

Simba **block 0 was post-dated**. The first difficulty retarget at height **2016** uses:

```text
actual = tip.timestamp - start.timestamp   # start = header at height 0
```

([spec 06](../specs/06-blocks-and-consensus.md) §2.4). A genesis `timestamp` ahead of real ceremony / early mining time warps `actual` for the opening 2016-block window, so the adjustment at **H = 2016** is wrong (bits climb or fall for the wrong reason). Later epochs that start from mined headers are less affected; the bad epoch is the genesis→2016 span.

**Product lock:** We will **not** regenerate Simba for this. Treat the first-epoch skew as known historical chain state. The **next genesis ceremony** (mainnet — [031](./031-mainnet-genesis-ceremony.md)) MUST set height-0 `timestamp` to the real ceremony wall-clock (not post-dated, not far future).

Pinned Simba artifacts (unchanged):

| Field | Value |
|-------|--------|
| `data/genesis/simba/blocks/0.json` → `header.timestamp` | `1770000000` (2026-02-02T02:40:00Z) |
| `data/genesis/simba/params.json` → `timestamp` | `1770000000` |

## Done when

- [ ] Confirm on a live Simba tip: measured `actual` for heights `0…2015` vs expected ~`2016 × 600` s; note the skew magnitude in `deploy/SIMBA.md` (optional but preferred).
- [x] Document in `deploy/SIMBA.md` / `data/genesis/simba/README.md`: first retarget at 2016 skewed by post-dated genesis; **no Simba regenesis**.
- [x] Mainnet ceremony checklist ([031](./031-mainnet-genesis-ceremony.md)): height-0 `timestamp` MUST equal ceremony UTC.
- [ ] Close this task once optional measurement is recorded (or explicitly skipped).

## Non-goals

- Simba regenesis or tip wipe for this bug.  
- Changing 2016 / 14-day / 4× clamp constants.  
- Replacing bit-difficulty with Bitcoin `nBits`.  
- One-shot consensus exception for the first epoch (leave history as-is).

## Notes

```
2026-09-28: Logged — block 0 post-dated; adjustment at 2016 off.
2026-09-28: Decision — no Simba regenesis; next genesis ceremony must get the date right (→ 031).
2026-09-28: Documented in deploy/SIMBA.md + data/genesis/simba/README.md; 031 checklist updated.
```
