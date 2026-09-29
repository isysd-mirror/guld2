# Task: Lift draft banners on locked Simba-critical specs

Status: open  
Priority: low  
GIP:  
Spec: ../specs/README.md  
Related: ../research/external-code-review-beta.md (P2 #12)  

## Problem

Whitepaper is **current**, but many numbered specs still say **Status: draft** even where the implementation matrix **Code** column is **yes** for Simba-critical rows. That undercuts “normative locked” messaging for external reviewers.

## Done when

- [ ] Walk [specs/README.md](../specs/README.md) matrix; for each Simba-critical **yes** row, lift or narrow the draft banner (e.g. “draft except §… locked”)  
- [ ] Leave genuine open areas (spec 11 HTTP daemon, spec 17 partial, etc.) explicitly draft  
- [ ] One-line note in specs README on how banners relate to the matrix  

## Non-goals

- Rewriting normative text  
- Claiming Final for unfinished upgrade / leaf-host HTTP paths  

## Notes

```
2026-09-29: Opened from external-code-review-beta finding 12.
```
