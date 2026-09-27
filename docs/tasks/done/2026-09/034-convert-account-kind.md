# Task: ConvertAccountKind (GIP-28)

Status: done  
Priority: normal  
GIP: ../../gips/gip-28.md  
Spec: ../../specs/02-identity-and-accounts.md, ../../specs/03-transactions.md, ../../specs/07-fees-and-tokenomics.md, ../../specs/14-reference-ui.md  

## Problem

Individual↔group kind changes required releasing the name and re-registering, racing squatters. [GIP-28](../../gips/gip-28.md) adds atomic `ConvertAccountKind`.

## Goals

1. Land GIP-28 (Draft → Accepted).
2. Implement `ConvertAccountKind` in `guld-state` + messages + tests — registration fee schedule for target kind; reject with live subs; legacy-locked reject.
3. BARE / JSON wire + GIP-26 `tx_id` golden.
4. Spec sync 02/03/07; reference UI path (settings/register follow-on).
5. Lifecycle / apply / node e2e coverage.

## Non-goals

- CloseSubaccount (may remain separate); group-owned subs.
- Name transfer / resale.
- Full PWA settings UX (crypto helpers shipped; UI follow-on).

## Done when

- [x] GIP-28 Accepted
- [x] Convert green in state + wire + vectors
- [x] Specs + lifecycle_matrix + `convert_account_kind_rpc_lifecycle` e2e
- [x] Task archived

## Notes

```
2026-09-27: Opened with GIP-28 Draft.
2026-09-27: Fees = same registration schedule (F_user / F_group for new_kind), not convert delta.
2026-09-27: Implemented (BARE tag 10); Accepted; archived.
```
