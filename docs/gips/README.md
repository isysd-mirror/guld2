# Guld Improvement Proposals (GIPs)

Numbered proposals for substantial changes to the Guld protocol, reference software, and processes.

**Process:** [GIP-1](gip-1.md) · **Template:** [gip-template.md](gip-template.md) · **Contributing:** [../../CONTRIBUTING.md](../../CONTRIBUTING.md)

## How to submit

1. Read [GIP-1](gip-1.md).
2. Copy [gip-template.md](gip-template.md) into a working draft (do not self-assign a number).
3. Discuss, then open a patch / PR against this repo (`repos/guld.git` or a mirror).
4. An editor assigns a number, merges `gip-N.md`, and updates this index.

Small bugs and polish: use [`../tasks/`](../tasks/) instead. Specs remain normative SoT: [`../specs/`](../specs/). Delivery after acceptance: [`../SOFTWARE_FLOW.md`](../SOFTWARE_FLOW.md).

## Index

| GIP | Title | Status | Type | Category |
|-----|-------|--------|------|----------|
| [1](gip-1.md) | GIP Purpose and Guidelines | Living | Meta | — |
| [2](gip-2.md) | Scaffold 2.0 crates + provider | Final | Meta | — |
| [3](gip-3.md) | Repository and submodule layout | Accepted | Meta | — |
| [4](gip-4.md) | Guld 2.0 protocol and component specs | Accepted | Meta | — |
| [5](gip-5.md) | PWA reference wallet on guld.io | Accepted | Standards | Application |
| [6](gip-6.md) | Docs browser | Accepted | Standards | Application |
| [7](gip-7.md) | Software browser | Final | Standards | Application |
| [8](gip-8.md) | Optional paid registrar | Accepted | Standards | Interface |
| [9](gip-9.md) | Letter-based registration fees | Final | Standards | Core |
| [10](gip-10.md) | Registration fee vesting (8 blocks) | Final | Standards | Core |
| [11](gip-11.md) | Name registration expiry | Accepted | Standards | Core |
| [12](gip-12.md) | Subaccounts | Accepted | Standards | Core |
| [13](gip-13.md) | RotateKeys | Accepted | Standards | Core |
| [14](gip-14.md) | Ledger 1.0 to 2.0 import and claim | Accepted | Standards | Core |
| [15](gip-15.md) | P2P mesh (libp2p) | Final | Standards | Networking |
| [16](gip-16.md) | Tx memo + protocol upgrade activation | Final | Standards | Core |
| [17](gip-17.md) | UI full coverage | Accepted | Standards | Interface |
| [18](gip-18.md) | Consumer integration | Draft | Informational | — |
| [19](gip-19.md) | Mempool visualizer | Accepted | Standards | Interface |
| [20](gip-20.md) | Wallet contacts and account lookup | Accepted | Standards | Application |
| [21](gip-21.md) | guld.io in guld leaf + miner governance | Draft | Standards | Core |
| [22](gip-22.md) | Deferred miner rewards (ClaimReward) | Accepted | Standards | Core |
| [23](gip-23.md) | Consensus-enforced difficulty schedule | Accepted | Standards | Core |
| [24](gip-24.md) | Legacy distribution transparency | Accepted | Informational | — |
| [25](gip-25.md) | Diversified ClaimLegacy attestation | Draft | Standards | Core |
| [26](gip-26.md) | Consensus golden vectors | Final | Standards | Interface |
| [27](gip-27.md) | Legacy names under pay-or-release | Final | Standards | Core |
| [28](gip-28.md) | Atomic individual↔group kind conversion | Accepted | Standards | Core |
| [29](gip-29.md) | Threshold Transfer cosignatures | Accepted | Standards | Core |
| [30](gip-30.md) | P2P mesh robustness | Accepted | Standards | Networking |
| [31](gip-31.md) | Contacts address book and private invites | Draft | Standards | Application |
| [32](gip-32.md) | Shared web UI leaf and extension pairing | Draft | Standards | Application |
| [33](gip-33.md) | Voluntary account unregister | Draft | Standards | Core |

## Migration note

GIP-2 through GIP-21 supersede the former `docs/intents/` series. See each GIP’s **History** section.
