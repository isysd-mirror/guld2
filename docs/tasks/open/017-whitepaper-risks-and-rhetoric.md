# Task: Soften peer-security rhetoric; add Risks section

Status: open
Priority: normal
GIP:
Spec:
Whitepaper: ../whitepaper/guld-2.0-draft.md

## Problem

Whitepaper design bar and comparison text place Guld in the “BTC/ETH/SOL **security conversation**” and imply Bitcoin-class rewrite cost, while:

- Hashrate / economic security budget are not peer-class
- Difficulty schedule was not consensus-enforced (GIP-23)
- Wire identities still JSON; Simba not frozen
- Premine unlock authority is concentrated

§11 Security notes are thin relative to §§8–10. External review called the peer-class language an **overclaim**.

## Goals

1. Replace or qualify “security conversation / Bitcoin-class security” with **parameter-class** language (SHA256d, 10 min, 2016 retarget) vs **security budget**.
2. Add a short **§ Risks** (or expand §11) covering: hashrate, premine concentration + attestation gate, tip≠DA, single-client risk, reset policy, JSON/BARE freeze.
3. Align Abstract “DeFi / cross-chain” wording with §3.4 dapp-only disclaimers (one editorial pass).
4. Cross-link [GIP-24](../gips/gip-24.md) from §8.6 once the brief exists.

## Non-goals

- Changing issuance formulas or consensus rules.
- Removing honest comparison tables entirely.

## Done when

- [ ] No unqualified “Bitcoin-class security” / peer security-class claims remain
- [ ] Risks section (or expanded §11) merged
- [ ] Abstract vs §3.4 wording consistent

## Notes

```
2026-09-26: Opened from external review §5 / §8 overclaim findings.
```
