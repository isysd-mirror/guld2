# Spec 17 — Protocol upgrades

**Status:** draft  
**Related:** [`00-overview.md`](00-overview.md) §4.4, [`08-cas-and-homes.md`](08-cas-and-homes.md), [`06-blocks-and-consensus.md`](06-blocks-and-consensus.md), whitepaper §3.5 / §11

## 1. Goals

- Change fee tables, schemas, and proof kinds without silent reinterpretation.  
- Keep **node software** (git) separate from the on-chain **rule bundle**.  
- Make activation **height-scheduled** so peers can upgrade binaries before enforcement.  
- Preserve the blunt safety net already implemented: mismatched `guld_rules_hash` ⇒ disconnect / reject blocks.

## 2. Two layers

| Layer | What changes | Who ships it |
|-------|----------------|--------------|
| **Rule bundle** | Normative params: fee tables, letter caps, proof-kind ids, schema version ids | On-chain tip of account **`guld`** (CAS home) |
| **Node binary** | Apply logic, tx codecs, PoW, P2P, wallets | Off-chain git release (e.g. `guld.io/repos/guld.git`) |

Headers always carry `guld_rules_hash` = digest of the **active** rule bundle at that height ([`08-cas-and-homes.md`](08-cas-and-homes.md)).

## 3. Rule bundle fields (normative sketch)

Extend the canonical manifest (today: `rules/manifest.v1.json`) with activation metadata:

```text
GuldRulesManifest {
  version: u32,                    // bundle format version
  activation_height: u64,          // first height that MUST use this digest in headers
                                    // omit / 0 for genesis (field skipped in canonical JSON)
  // … existing fee / schema / proof-kind fields …
  previous_rules_hash: Hash32,     // optional link; prior digest active until H−1
  upgrade_class: "soft" | "hard",  // advisory for operators; see §4
  root_scheme: Option<String>,     // omit/"interim" | "merkle_v1" ([GIP-35](../gips/gip-35.md))
  attestation_quorum: Option<{     // GIP-25; empty attestors OK on Simba
    threshold: u16,
    attestors: Vec<String>,        // 0x-hex Ed25519 pubs
  }>,
}
```

`guld_rules_hash = tagged_hash("guld/rules_bundle/v1", canonical_manifest_bytes)`.

**Schedule:** nodes build `RulesSchedule` from the tip manifest: if `previous_rules_hash` is set, entries are `(0, previous)` and `(activation_height, tip_digest)`; otherwise a single entry at `activation_height` (usually 0). Headers at height `h` MUST carry `schedule.hash_at(h)`. Hello MAY accept any digest present in the local schedule (dual-hash awareness during the publish→activate window).

RPC: `guld_getGuldRulesHash` returns the digest for the **current tip height**; `guld_getRulesSchedule` lists schedule entries.

## 4. Soft vs hard

| Class | Meaning | Old binary |
|-------|---------|------------|
| **Soft** | New rules are a **restriction** or param tweak old nodes still *parse*; enforcement differs only after activation | MAY keep running but will diverge if it ignores the new hash |
| **Hard** | New tx types, signature schemes, or codec breaks | MUST upgrade before `activation_height` or it cannot validate the tip |

In practice Guld treats **any** unknown `guld_rules_hash` as fatal for Hello / import (current code). Operators SHOULD treat every rules change as requiring a **matching binary release** before activation.

## 5. Activation procedure (normative)

1. **Publish software** that understands both the current and next rule digests (and implements the new apply logic).  
2. **Publish** a new `guld` home tip whose rule bundle sets `activation_height = H` (H strictly greater than the current tip at publish time by a safety margin — recommend ≥ **2016** blocks ≈ 2 weeks at 10-minute blocks for mainnet; testnets MAY use smaller margins).  
3. **Until height H−1:** headers MUST still carry the **old** `guld_rules_hash`.  
4. **From height H inclusive:** headers MUST carry the **new** `guld_rules_hash`; blocks with the wrong digest are invalid (`BadRulesHash`).  
5. Nodes that never learned the new digest cannot sync past H−1 (Hello / header checks fail). That is intentional.

`UpdateMaster` on `guld` that installs a next bundle does **not** by itself change header validation — only height `H` does.

### 5.1 Publishing on keyless `guld` (reference)

The network account is keyless. Reference nodes accept a **permissionless** `UpdateMaster` when:

- `name == "guld"` / `kind == network`
- `cosignatures` empty and `inclusion_fee == 0` (mempool fee floor exempt)
- `memo` carries the **HomeTree** object id (`0x`-hex → 32 raw bytes after memo normalize)
- `new_master_hash == tagged_hash("guld/master_hash/v1", tree_id ‖ zero_meta ‖ schema_u32=1)`

Peers MUST materialize the tree from CAS, then reload `RulesSchedule` from `rules/manifest.v1.json` in that tip. RPC helper: `guld_publishRulesUpgrade` (puts CAS objects, queues the tx, returns blobs for peer `guld_putObject` seeding).

### 5.2 Disposable-net rehearsal

Integration test: `cargo test -p guld-node --test rule_bundle_upgrade` ([042](../tasks/done/2026-09/042-rule-bundle-upgrade-e2e.md)). First **live Simba** activation payload: single Core catch-up bundle ([055](../tasks/open/055-simba-single-rule-bundle.md)).

## 6. What is *not* an on-chain upgrade

- Wallet UX, HTTP routes, static site, registrar desks  
- Adding optional **leaf** conventions (memo display, invoice URLs)  
- Bugfixes that do not change consensus validity  

Those ship in git anytime.

## 7. Testnets

| Net | Role |
|-----|------|
| **simba** (`chain_id` 2) | Live public testnet; tip **locked**. Prefer height-activated rule bundles ([§5](#5-activation-procedure-normative), [055](../tasks/open/055-simba-single-rule-bundle.md)). |
| **mufasa** (planned `chain_id` 3) | Named successor when a change cannot height-activate without tip wipe / global state rehash. Planning: [MUFASA.md](../MUFASA.md); checklist [052](../tasks/open/052-next-testnet-checklist.md). **Not launched.** |

- Freeze genesis `guld_rules_hash` for the lifetime of the named net, **or**  
- Schedule upgrades with short `activation_height` margins and tagged releases.  
- Bumping `--network` / `chain_id` starts a **new** net (not an in-place upgrade).

## 8. Open parameters

- Exact safety margin policy per network  
- Whether soft-class upgrades may keep accepting old-hash headers until H (sticky) vs require dual-hash awareness only  
- Signed release attestations for binaries (operator policy, not consensus)
