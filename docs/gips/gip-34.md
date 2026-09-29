---
gip: 34
title: Account bio (128-byte name profile)
description: Optional 128-byte opaque bio on each account for URLs, proofs, and short ids — discoverable without materializing a home tip.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Core
created: 2026-09-29
requires: 16
---

## Abstract

Add an optional **`bio`** field on every account — at most **128 bytes**, consensus-opaque, in the same spirit as the per-tx **`memo`** ([GIP-16](gip-16.md)) but with a larger budget. Holders MAY put a short blurb, URL, proof handle, external id, or other application tag where wallets and explorers can read it from **account state** without fetching CAS / leaf home bytes.

## Motivation

Names today expose keys, threshold, balance, nonce, and `master_hash` ([spec 02](../specs/02-identity-and-accounts.md)). Useful “who is this / where do I go?” hints live only in:

1. **Leaf home content** — requires materializing objects via CAS or `remotes[]`; unavailable to lean explorers and many wallets.
2. **Tx `memo`** — ephemeral, attached to a single payment, not a durable name attribute.
3. **`remotes[]`** — structured fetch hints for leaf hosts, not a general profile string.

People and dapps already want a **small, always-on handle** next to the name: home URL, dapp entrypoint, attestation id, invoice prefix, truncated hash, etc. That is the same product niche memo fills for transfers — only **bound to the name**, not to one spend.

## Specification

The key words "MUST", "MUST NOT", "REQUIRED", "SHALL", "SHALL NOT", "SHOULD", "SHOULD NOT", "RECOMMENDED", "NOT RECOMMENDED", "MAY", and "OPTIONAL" in this document are to be interpreted as described in RFC 2119 and RFC 8174.

### Field (account state)

Extend logical `Account` ([spec 02](../specs/02-identity-and-accounts.md) §3):

```text
Account {
  …
  bio: Option<Bytes>,   // §this GIP; omit or empty = absent
}
```

| Rule | Choice |
|------|--------|
| Field | `bio: bytes` optional (JSON/RPC: UTF-8 string; empty/omit = absent) |
| Max size | **128 bytes** after encode (2× tx `memo`; see Rationale) |
| Consensus | Opaque — MUST NOT affect validity except size / weight / signature coverage |
| Storage | Part of the account leaf → contributes to `state_root` |
| Auth | Set only by authorized account mutations (below) |
| Default | Absent on genesis imports and existing accounts until first set |

Binary / non-UTF-8 MAY use hex-prefixed (`0x…`) in RPC — same convention as memo ([spec 03](../specs/03-transactions.md) §2.1).

### Setting and clearing

#### At registration (optional)

`RegisterUsername`, `RegisterGroup`, and `RegisterSubaccount` MAY include `bio` in the signed intent / body. If present and non-empty:

- Length MUST be `1..=128` bytes.
- New account is created with that `bio`.

`SettleRegistration` renew MUST NOT change `bio`. `ClaimLegacy` MAY leave bio absent (claimants set it afterward).

#### Update tx

```text
UpdateBio {
  name: Name,
  bio: Option<Bytes>,           // empty / omit = clear
  cosignatures: Vec<CosignProof>,  // current threshold on `name`
  inclusion_fee: Amount,
  memo: optional bytes,         // GIP-16; unrelated to account bio
}
```

**Checks:**

- Account exists; not legacy-locked (MUST `ClaimLegacy` first); not `network` (`guld`) unless a future rule explicitly allows a protocol bio.
- Cosignatures MUST verify under current `keys` / `threshold` over a domain-separated intent (tag `guld/update_bio/v1`) binding at minimum:

```text
name ‖ nonce ‖ chain_id ‖ bio_bytes ‖ inclusion_fee ‖ memo?
```

(`nonce` = account value **before** apply.)

- If `bio` present: `len(bio) <= 128`. Empty / omit clears.
- `inclusion_fee` sufficient for weight; paid from `name`.

**Effects:** `account.bio ← bio` (or clear); `nonce++`; inclusion fee → miner.

Threshold **1** accounts MAY supply a single qualifying signature in `cosignatures[0]`.

### Wire / digests

Exact codec: [spec 03](../specs/03-transactions.md) §3.8–§3.9. Treat `bio` like `memo` — length-prefixed when non-empty, covered by signatures, counted in `size_bytes(canonical_tx)`.

### Indexing and UI (non-consensus)

- Account lookup / explorer / contacts SHOULD surface `bio` when present.
- Wallets SHOULD offer set / clear on Account tools (same class as UpdateMaster / RotateKeys).
- Applications MAY define **profiles** (e.g. `https://…`, `did:…`, `0x` + 32-byte hash) — consensus MUST NOT parse them.

### Non-goals

- On-chain interpretation of bio (no URL fetch, no OP_RETURN contracts, no schema enforcement).
- Unbounded profile text, avatars, or HTML on L0 — use leaf homes / CAS.
- Replacing `remotes[]` or `master_hash` — bio is a **discoverability** side-channel, not DA.
- Automatic propagation from leaf `README` / `index.html` into bio.

## Rationale

**Why 128 bytes (not memo’s 64)?** Memo is a high-churn payment tag; bio is a **per-name** durable field with far fewer instances and updates. Platform bios commonly land around ~100–160 characters — **128 bytes** fits a short sentence plus a URL without inviting essays. Still too small for a forum; still fully weight-priced on set/update.

**Why L0 state instead of only the home tip?** Account lookup is already the identity SoT for names. Requiring every wallet to materialize a leaf just to show a profile line fights the lean L0 / rich leaf split. Bio is the small on-state exception: always paid for, always capped.

**Why a dedicated `UpdateBio`?** Keeps tip advances (`UpdateMaster`) and key hygiene (`RotateKeys`) uncluttered. Alternative — piggyback bio onto every tip update — couples profile text to leaf cadence and invites accidental clears.

**Alternative — encode in `remotes[]`.** Rejected: remotes are fetch hints for hosts; bio is free-form human/app metadata. Overloading remotes muddies both.

**Alternative — stay at 64 B (memo parity).** Rejected: too tight for a real “bio” once a URL is included; cardinality does not justify matching the memo ceiling.

**Alternative — larger bio (256 B / 1 KiB).** Rejected: state bloat across every account leaf; enlarge only with a later GIP if demand is proven.

## Backwards Compatibility

- Existing accounts: `bio` absent — no migration required.
- Nodes that do not upgrade reject `UpdateBio` and reject registration bodies with `bio` — activate via [spec 17](../specs/17-protocol-upgrades.md) rule bundle on networks that already shipped.
- Account leaf codec gains an optional trailing field; old readers that ignore unknown trailing bytes MAY still verify roots only after the rule digests align (implementations MUST version the leaf encoding with the rule bundle).

## Security Considerations

- **Public forever.** Bio is in state and explorers — do not put secrets, private keys, or PII you would not put on a billboard (same guidance as memo).
- **Phishing / decoy URLs.** Consensus does not verify links; wallets SHOULD display bio as untrusted text, not auto-navigate without confirmation.
- **Spam / insult bios.** Off-chain mitigations (mute lists, UI folding); fee market prices updates.
- **State DoS.** Cap at 128 B and fee the update tx; do not allow unbounded bio growth.
- **Cosign binding.** Must cover `bio` bytes so a co-signer cannot swap a URL after another key signs.

## Reference Implementation

Specs updated. Code: `guld-types` / `guld-state` account field + `UpdateBio` apply; wallet Account tools; HTTP account JSON `bio`; golden vectors ([GIP-26](gip-26.md)). Activate with Core bundle ([055](../tasks/open/055-simba-single-rule-bundle.md)).

## History

- 2026-09-29: Draft — name-scoped bio parallel to tx memo (URLs, proofs, short ids); max size **128 B** (not memo’s 64) given lower cardinality and platform bio norms.
- 2026-09-29: **Accepted** — activate via rule bundle ([055](../tasks/open/055-simba-single-rule-bundle.md)).
