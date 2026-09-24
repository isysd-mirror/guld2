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
  // … existing fee / schema / proof-kind fields …
  previous_rules_hash: Hash32,     // optional link for explorers
  upgrade_class: "soft" | "hard",  // advisory for operators; see §4
}
```

`guld_rules_hash = tagged_hash("guld/rules_bundle/v1", canonical_manifest_bytes)`.

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

## 6. What is *not* an on-chain upgrade

- Wallet UX, HTTP routes, static site, registrar desks  
- Adding optional **leaf** conventions (memo display, invoice URLs)  
- Bugfixes that do not change consensus validity  

Those ship in git anytime.

## 7. Testnets (e.g. simba)

- Freeze genesis `guld_rules_hash` for the lifetime of the named net, **or**  
- Schedule upgrades with short `activation_height` margins and tagged releases.  
- Bumping `--chain-id` / network name starts a **new** net (not an in-place upgrade).

## 8. Open parameters

- Exact safety margin policy per network  
- Whether soft-class upgrades may keep accepting old-hash headers until H (sticky) vs require dual-hash awareness only  
- Signed release attestations for binaries (operator policy, not consensus)
