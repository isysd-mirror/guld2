# Task: Human-first UX redesign

Status: open  
Priority: high  
Design: ../design/human-first-ux.md  
Feedback: ../design/feedback-ux-2026-09.md  
Spec: ../specs/14-reference-ui.md  
GIP: (promote when accepted — relates to gip-5, gip-17, gip-20, gip-31)

## Problem

Friend + maintainer feedback: reference UI is too technical and ugly. Spec 14 / GIP-17 coverage is not a citizen product. Default paths still center JSON paste, hex keys, and operator chrome (API/RPC).

## Work

Follow [`../design/human-first-ux.md`](../design/human-first-ux.md) phases:

- [ ] **P0** — Citizen/Operator split on landing + app chrome; strip API/RPC from wallet/register shell (shell strip largely done; landing split in progress)
- [ ] **P1** — Contacts address book + private invite: track under [038](038-contacts-private-invite.md) / [GIP-31](../gips/gip-31.md); register cards / wallet-home polish as follow-ons
- [ ] **P2** — Manage drill-ins; cosign sessions UX (depends on functional Transfer cosign — [028](../done/2026-09/028-threshold-transfer-cosign.md)); citizen backup export
- [ ] **P3** — Visual system pass (tokens/type/motion)
- [ ] Amend Spec 14 default-vs-advanced; promote design doc → numbered GIP

## Out of scope for this task file

- Protocol changes. Framework/bundler migration (forbidden by GIP-5).
- **P1 invite binding / public claim URLs** — rejected; use non-binding private share (GIP-31).
- **P4 (cancelled)** — “Explorer soften.” Explorers are meant to expose technical detail (RPC, SSE, hex, heights). Leave as-is; optional lede tidy is not a phase.
