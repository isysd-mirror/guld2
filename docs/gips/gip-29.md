---
gip: 29
title: Threshold Transfer cosignatures
description: Group and multi-key spends use threshold_cosign_v1 over guld/transfer/v1 (BARE Transfer v2).
author: Guld contributors
discussions-to: ../tasks/done/2026-09/028-threshold-transfer-cosign.md
status: Accepted
type: Standards
category: Core
created: 2026-09-27
requires: 13, 16, 17
---

## Abstract

Allow **`Transfer`** to authenticate with `threshold_cosign_v1` (same family as UpdateMaster / RotateKeys) when `account.threshold > 1`. Wire: BARE Transfer **v2** carries a cosignature list; v1 remains single-signature for `threshold == 1`.

## Motivation

Before this GIP, tips and key rotation supported multi-sig while **spend stayed 1-of-1**, forcing groups to fund a 1-of-1 sub for everyday GULD. Spec 03 §3.6 and PWA cosign workstation (task [028](../tasks/done/2026-09/028-threshold-transfer-cosign.md)) closed that hole. This document is the **retrospective Standards record** so the GIP index matches consensus.

## Specification

Normative detail: [`../specs/03-transactions.md`](../specs/03-transactions.md) §3.6, [`../specs/04-proofs.md`](../specs/04-proofs.md), [`../specs/14-reference-ui.md`](../specs/14-reference-ui.md) §9.

1. Auth message remains `tagged_hash("guld/transfer/v1", …)` (optional memo length-prefix as for tips).  
2. When `cosignatures` is non-empty: verify under current keys/threshold.  
3. Else: `threshold` MUST be `1` and `signature` MUST verify under `keys[0]`.  
4. BARE: Transfer union version **1** = single `signature`; version **2** = `cosignatures` list.

## Rationale

Reusing `threshold_cosign_v1` avoids a second spend-proof vocabulary. UI already collects partials via `guld1cosignreq` / `guld1cosignres` with `op=transfer`.

## Backwards Compatibility

Existing 1-of-1 Transfer JSON/BARE v1 unchanged. Peers MUST accept v2 when threshold > 1.

## Security Considerations

Same as any multisig: a malicious majority of keys can move funds. Mitigation remains `RotateKeys` and leaf policy.

## Reference Implementation

- Task: [028](../tasks/done/2026-09/028-threshold-transfer-cosign.md) (**done**)
- State / client / PWA cosign workstation; lifecycle coverage for thr>1 spend

## History

- 2026-09-27: Accepted retrospectively — documents shipped consensus + UI from task 028.
