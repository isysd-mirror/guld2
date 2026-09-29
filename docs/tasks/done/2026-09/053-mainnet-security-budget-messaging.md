# Task: Mainnet security-budget messaging (solo PoW)

Status: done  
Priority: normal  
GIP:  
Spec:  
Related: ../whitepaper/guld-2.0.md §11, ./031-mainnet-genesis-ceremony.md, ../fragments/security-budget.md, ../research/merged-mining-bitcoin.md, ../research/external-code-review-beta.md (P1 #5)  

## Problem

Early solo SHA256d hashrate will not be Bitcoin-class. Merged mining is **out of scope for launch**. Launch / FAQ / SIMBA / mainnet ceremony copy must keep **parameter class vs security budget** language consistent so marketing never implies peer-class rewrite cost.

## Done when

- [x] Audit landing, FAQ, SIMBA_BETA, deploy, ceremony notes for “Bitcoin-class security” footguns  
- [x] Short operator/miner blurb: solo SHA256d; AuxPoW later optional bonus; security budget is empirical  
- [x] Fold into [031](../open/031-mainnet-genesis-ceremony.md) ceremony checklist  

## Non-goals

- Shipping AuxPoW  
- Changing PoW parameters  

## Notes

```
2026-09-29: Opened from external-code-review-beta finding 5.
2026-09-29: Done — fragments/security-budget.md; FAQ + landing FAQ; SIMBA_BETA; deploy/SIMBA mining §;
           chain-comparison + guld-consensus README footguns; 031 checklist item.
```
