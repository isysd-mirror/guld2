Comparative sketch for positioning — not a feature checklist or investment advice. **Cosmos Hub** stands in for the widely deployed **IBC interoperability hub** (Polkadot relay and Avalanche subnets follow similar L0 patterns). Guld 2.0 beta on Simba uses interim double-SHA256 PoW; DAG-PoW and foreign-chain proof kinds remain draft ([spec 13](../specs/13-foreign-chains.md)). Hard fork / 1.0 continuity: [FAQ](../FAQ.md).

| Dimension | Guld 2.0 | Guld 1.0 | Bitcoin | Ethereum | Solana | Cosmos Hub |
|-----------|----------|----------|---------|----------|--------|------------|
| **Relationship** | Hard fork from 1.0 snapshot | Original 1.0 chain (continues) | Independent L1 | Independent L1 | Independent L1 | Independent L0 hub |
| **Primary role** | L0 witness hub: names, tips, balances | Identity-first chain: names, ledger, git leaves | L1 digital money | L1 programmable settlement | L1 high-throughput chain | L0 interconnect hub (IBC) |
| **Consensus** | Open PoW (DAG-PoW planned) | Identity/contribution-weighted **PoS** (staker agreement degraded) | Nakamoto PoW | Gasper PoS | Tower BFT PoS | Tendermint BFT PoS |
| **Block time (target)** | ~10 minutes | Irregular / policy-driven | ~10 minutes | ~12 s (slots) | ~400 ms | ~7 seconds |
| **Header / state hash** | SHA-256 commitments | Git object SHA-1; ledger hashes | Double SHA-256 | Keccak-256 (Merkle Patricia) | SHA-256 | SHA-256 (Tendermint) |
| **Account keys** | Ed25519 (PQ migration path) | OpenPGP + mixed legacy | secp256k1 (ECDSA) | secp256k1 (+ smart wallets) | Ed25519 | secp256k1 (amino-encoded) |
| **Addressing** | Registered **usernames** (global namespace) | Usernames in namespace | UTXO outputs (addresses) | 20-byte account addresses | Ed25519 pubkeys | Bech32 account addresses |
| **Smart contracts (L0)** | **None** — fixed tx vocabulary only | No L0 VM; leaf tooling | Bitcoin Script (limited) | EVM (+ account abstraction) | SVM (BPF programs) | **None on Hub** — CosmWasm on zones |
| **Execution model** | Parse schema → verify proofs → built-in state delta | Ledger postings + weighted staker tips + git leaves | UTXO + script | General VM re-execution | Parallel accounts + programs | App logic on connected chains |
| **Fee model** | Bitcoin-style **weight** (GULD per vB) + registration protocol fees | Registration fees + ledger conventions | sat/vB weight market | Gas (EIP-1559 base + tip) | Compute units + priority fee | Gas per connected chain |
| **Cross-chain** | Foreign chain **names** + witnessed tips (SPV/light proofs); not an auto token bridge | Namespace could reference other systems | Apps (Lightning, L2); not native L0 | Bridges, rollups, L2s | Wormhole / etc. | **IBC** native between zones |
| **Identity model** | **First-class** names, groups, threshold cosign | **First-class** names; PGP/git identity layers | Pseudonymous keys | Keys + optional ENS (app layer) | Pseudonymous keys | Keys; ICS-23 proofs between chains |
| **Validator / node burden** | Keys, tips, balances, enumerated proof verify | Ledger + git/PGP + staker-weight votes | UTXO set + headers | Full state + EVM | Accounts + programs + ledger | Hub consensus + light clients for IBC |
| **Consensus state growth** | O(registered names); payments update balances in place | Ledger + git history on chain | O(UTXO outputs); dust persists | O(accounts + contract storage) | O(accounts + program data) | Hub state + IBC light clients |
| **Typical L0 tx shape** | Fixed schema (~264 vB `Transfer`; cosign scales linearly) | Variable (git/PGP/staker votes) | Variable I/O + script; can be very large | Variable calldata + EVM steps | Fixed-ish but program-heavy | Zone-dependent (not Hub-native) |

**Guld 2.0 thesis in one row:** address by **name**, commit by **hash**, authorize by **proof** — leaves and dapps stay unbounded; the chain witnesses heads rather than re-running leaf politics.
