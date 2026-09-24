# Intent: Guld 2.0 protocol & component specs

Status: accepted (drafting in progress)

## Goal

Turn the whitepaper into **implementable specs**: clear components, wire/logical APIs, tx/proof/state/consensus boundaries—before large Rust node work.

## Delivered (v0)

- [`../specs/README.md`](../specs/README.md) index  
- Specs `00`–`14`: protocol through foreign chains + **reference UI (PWA wallet on guld.io)**  
- Scaffold: `src/guld-types`, `src/guld-crypto`, `src/guld-wallet` ([`scaffold-2.0.md`](scaffold-2.0.md))

## Next acceptance criteria

- [ ] Freeze wire codec (BARE/protobuf/…) in `01`  
- [ ] Freeze registration funding model in `03`  
- [x] Freeze PoW + subsidy function shape in `06`/`07` (10-min blocks; geometric 100%→4%/20y)  
- [ ] Prototype `guld-types` + `guld-crypto` against `01`/`04`  
- [x] Flatten implementation under `src/` matching `00`  
- [x] Extension + provider scaffold (moved out of protocol repo; spec 14 is wallet + webapp only)  

## Out of scope

- Shipping mainnet  
- Indexer SQL schema as consensus
