# Task: CAS / tip≠DA availability UX

Status: **cancelled** (by design — not an L0 gap)  
Priority: —  
GIP:  
Spec: ../specs/08-cas-and-homes.md  
Related: ../whitepaper/guld-2.0.md §9.4 / §11.2 / glossary **Tip ≠ DA**, ../research/external-code-review-beta.md  

## Why cancelled

Opened from an external-review framing that treated **tip ≠ data availability** as a missing protocol/UX TODO. That is wrong for Guld 2.0:

- L0 witnesses **tips** (`master_hash`); home **bytes** are a **leaf / host / operator** concern ([spec 08](../specs/08-cas-and-homes.md) §5, whitepaper §9.4).  
- The protocol MUST NOT gain consensus obligations, pin markets, or mandatory full-CAS retention for arbitrary accounts.  
- Optional UX (e.g. reference dapp / materialize demo showing “content not on this peer”) may live in leaf apps — **not** as L0 node or wallet SoT work tracked here.

## Non-goals (remain)

- Protocol or full-node features that pretend tip finality implies content permanence  
- Spec/code for general CAS DA beyond existing optional `exists` / fetch helpers leaves already use  

## Notes

```
2026-09-29: Opened from external-code-review-beta finding 7.
2026-09-29: Cancelled — tip≠DA is intentional L0 boundary; leaf concern only.
```
