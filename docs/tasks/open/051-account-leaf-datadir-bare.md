# Task: Account-leaf + datadir BARE freeze (post-interim codec)

Status: open  
Priority: low (deferred from [009](../done/2026-09/009-bare-wire-implementation.md); not Simba tip-wipe)  
GIP: ../gips/gip-4.md  
Spec: ../specs/01-cryptography.md, ../specs/05-state.md, ../schemas/README.md  
Related: ../done/2026-09/043-merkle-tx-receipt-roots-gip.md, ../MUFASA.md, ./052-next-testnet-checklist.md  

## Problem

TxId BARE shipped; **account SMT leaf** and **datadir block** encodings remain JSON / interim (`account.bare` deferred; W7 datadir BARE). Codec freeze row in the external review still calls this out. Any **byte-changing** cutover after durable history needs **height activation with full leaf rehash**, a tip wipe, or a **new testnet** — same class of risk as changing `state_root` preimages. That path is **[Mufasa](../MUFASA.md)**, not Simba [055](./055-simba-single-rule-bundle.md).

## Paths

| Path | Net | Work |
|------|-----|------|
| **A — Freeze as-is** | Simba / mainnet docs | Spec + schema + GIP-26 vectors for **today’s** `account_value_hash`; defer W7 datadir BARE past mainnet |
| **B — Rewrite leaf / native datadir BARE** | **Mufasa** genesis | New leaf preimage (and optional disk BARE) from block 0 — [052](./052-next-testnet-checklist.md) |

Prefer **A** unless a rewrite is worth a new named net.

## Done when

- [ ] Spec + schema freeze for account leaf preimage (`account.bare` **or** documented current binary preimage)  
- [ ] Dual-path / height plan **or** explicit “no change — frozen as shipped” **or** Mufasa genesis plan — **no Simba wipe**  
- [ ] Optional datadir BARE migration (W7) documented; implement on Mufasa / defer past mainnet  
- [ ] GIP-26 vectors for account leaf hash (match Rust)  
- [ ] Matrix / schemas README updated  

## Non-goals

- Replacing HTTP JSON client API  
- Bundling a leaf **rewrite** into [055](./055-simba-single-rule-bundle.md)  
- Blocking mainnet if leaf hash already stable and documented as frozen-as-is (then close by **accepting** current leaf encoding as permanent)

## Notes

```
2026-09-29: Opened from external review codec-freeze row + 009 deferred W7/account.bare.
2026-09-29: Rewrite path → Mufasa ([MUFASA.md](../MUFASA.md)); freeze-as-is can close without new net.
```
