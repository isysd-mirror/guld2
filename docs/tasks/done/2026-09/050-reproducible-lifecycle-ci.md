# Task: Reproducible CI artifact for lifecycle + GIP-26 vectors

Status: **cancelled** (covered by signed-tag + local CI trust model)  
Priority: —  
GIP: ../gips/gip-26.md  
Spec:  
Related: ../SOURCE_AND_RELEASE.md, ../research/external-code-review-beta.md (P2 #9), ../../scripts/chain-lifecycle/README.md, ../SOFTWARE_FLOW.md  

## Why cancelled

Opened from an external-review framing that treated **missing hosted CI** as a trust gap for strangers. That misreads the Guld release model:

- **SoT** is peer-served `/repos/` with **guld.io** as the official remote — not a forge.  
- **CI** is local pre-commit (lifecycle + genesis + GIP-26 vectors); anyone can re-run the same commands.  
- **Releases** are maintainer **PGP-signed tags** after QA. That attests intent and green tests more strongly than a forge Actions badge.  
- **Interim WIP** does not need release-grade signatures; ordinary git (and optional GitHub PR mirrors) is enough.  
- GitHub Actions / badges remain **optional signals** for people who value corporate mirrors — never the gate or SoT.

Decision and full write-up: [`../SOURCE_AND_RELEASE.md`](../SOURCE_AND_RELEASE.md).

## Non-goals (remain)

- Requiring GitHub as canonical SoT  
- Blocking commits on a third-party forge  
- Replacing local pre-commit as the contributor gate  

## Notes

```
2026-09-29: Opened from external-code-review-beta finding 9.
2026-09-29: Cancelled — forge CI is optional UX, not a missing proof; see SOURCE_AND_RELEASE.md.
```
