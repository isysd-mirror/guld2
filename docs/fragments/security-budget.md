# PoW security budget (operator / miner blurb)

**Short copy for launch, FAQ, Simba, and ceremony notes.** Normative detail: [whitepaper §11](../whitepaper/guld-2.0.md#11-security-notes-and-risks). Consensus parameters: [spec 06](../specs/06-blocks-and-consensus.md).

## One paragraph

Guld uses **solo SHA256d** proof of work with Bitcoin-**parameter** timing (≈10 min blocks, 2016-block / 14-day retarget). That is a **parameter class**, not a Bitcoin-class **security budget**. Rewrite cost tracks **empirical hashrate** on this chain. Early Simba and early mainnet will not have peer-class rewrite resistance. **Merged mining (AuxPoW) is out of scope for launch** — optional later miner bonus if ever pursued; engineering completeness would still not equal Bitcoin hashrate. Prefer: *Bitcoin-parameter PoW; security budget is an empirical market outcome.*

## Do / don’t

| Prefer | Avoid |
|--------|--------|
| Bitcoin-**parameter** PoW / SHA256d timing class | “Bitcoin-class security,” “as secure as Bitcoin” |
| Security budget = empirical hashrate | Peer L1 / BTC–ETH–SOL rewrite-cost claims |
| Solo SHA256d at launch | Implying AuxPoW or merge hashrate is required or already live |
| AuxPoW = optional **later** miner bonus | Marketing merge-mine as a launch security fix |

## Operators / miners

- Seal with `--miner <name>` (solo header PoW). Shared hosts: `--mine-cpu-percent 1`.
- Validating peers omit `--miner`.
- Do not promise visitors that a green tip implies Bitcoin-class finality depth.
- Research only: [merged-mining-bitcoin.md](../research/merged-mining-bitcoin.md).

## Ceremony checklist hook

Before publishing mainnet genesis / launch notes ([031](../tasks/open/031-mainnet-genesis-ceremony.md)): confirm FAQ, SIMBA_BETA, deploy runbooks, and landing FAQ use this framing — no unqualified “Bitcoin-class security” footguns.
