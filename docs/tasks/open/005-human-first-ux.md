# Task: Human-first UX redesign

Status: open  
Priority: high  
Design: ../design/human-first-ux.md  
Feedback: ../design/feedback-ux-2026-09.md  
Spec: ../specs/14-reference-ui.md  
GIP: (promote when accepted — relates to gip-5, gip-17, gip-20)

## Problem

Friend + maintainer feedback: reference UI is too technical and ugly. Spec 14 / GIP-17 coverage is not a citizen product. Default paths still center JSON paste, hex keys, and operator chrome (API/RPC).

## Work

Follow [`../design/human-first-ux.md`](../design/human-first-ux.md) phases:

- [ ] **P0** — Citizen/Operator split on landing + app chrome; strip API/RPC from wallet/register shell (shell strip largely done; landing split in progress)
- [ ] **P2** — Manage drill-ins; cosign sessions UX (depends on functional Transfer cosign — [028](../done/2026-09/028-threshold-transfer-cosign.md)); citizen backup export
- [ ] **P3** — Visual system pass (tokens/type/motion)
- [ ] Amend Spec 14 default-vs-advanced; promote design doc → numbered GIP

## Out of scope for this task file

- Protocol changes. Framework/bundler migration (forbidden by GIP-5).
- **P1 (deferred)** — Register method cards, share-first friend invite, wallet-home composition, send polish beyond contacts. Name pickup / sponsorship is off-channel and chicken-and-egg for now; contacts typeahead already shipped in [002](../done/2026-09/002-wallet-send-contacts.md)–[004](../done/2026-09/004-rpc-search-accounts.md). Revisit when bootstrap story is clearer.
- **P4 (cancelled)** — “Explorer soften.” Explorers are meant to expose technical detail (RPC, SSE, hex, heights). Leave as-is; optional lede tidy is not a phase.
