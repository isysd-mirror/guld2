# Task: HTTP `--http-static` deny-list + CORS audit

Status: **done**  
Priority: **high** (public peer ops — [external review](../research/external-code-review-beta.md) §6 / P1 #6)  
GIP:  
Spec: ../specs/10-node.md, ../specs/12-rpc.md  
Related: ../HOSTING.md, ../../deploy/SIMBA.md  

## Problem

`guld-node` module docs say `--http-static` MUST refuse sensitive paths (`archives/`, `.guld-data/`, `target/`, secrets). Implementation appears to be largely `ServeDir` fallback + **`CorsLayer::permissive()`**. Public peers (and guld.io) that serve the checkout risk leaking archives, datadir, or build trees if deny rules are comment-only.

## Done when

- [x] Audit actual middleware / path filters vs documented refuse list  
- [x] Enforce denylist (or equivalent safe root) in code + regression test  
- [x] CORS policy: permissive only where intentional (wallet/dapp); document for operator peers  
- [x] Deploy / HOSTING note for public `--http-static`  
- [x] Close review open Q on static denials  

## Non-goals

- Redesigning the whole HTTP API surface  
- TLS termination (nginx stays optional on guld.io)

## Notes

```
2026-09-29: Opened from external-code-review-beta finding 6 / open Q.
2026-09-29: Done — `is_denied_static_path` + middleware; unit + ServeDir tests;
           HOSTING / SIMBA / README / review note. CORS stays permissive (wallet peers).
```
