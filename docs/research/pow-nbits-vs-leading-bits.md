# Research: `nBits` (compact target) vs leading-zero bits for PoW

**Status:** decided — **leading-zero bits locked for v1** (merged mining via custom tooling / future GIP)  
**Related:** [spec 06 §2](../specs/06-blocks-and-consensus.md), [bitcoin-guld-comparison.md](./bitcoin-guld-comparison.md), [merged-mining-bitcoin.md](./merged-mining-bitcoin.md), task [007](../tasks/open/007-simba-beta-public-readiness.md) A1

## Question

Guld uses **`difficulty: u32`** = “minimum leading zero bits in `block_hash`”. Bitcoin uses **`nBits`** = compact encoding of a 256-bit **target** threshold. Why call leading-zero bits “simpler to verify”? Why might **`nBits` still matter** if we want merged mining with Bitcoin?

Short answer:

| | Leading-zero bits | Compact `nBits` |
|---|-------------------|-----------------|
| **Verify** | Scan ≤32 bytes, count zeros | Decode compact → 256-bit integer → full compare |
| **Expressiveness** | ~64 coarse steps (powers of 2) | Fine-grained targets |
| **Merged mining** | Works in principle; **custom pool/miner stack** | **Reuse Bitcoin tooling** that already speaks `nBits`/target |

**Merged mining does not mathematically require `nBits`** on the aux chain — but **operational compatibility** with SHA256d mining infrastructure strongly favors it.

---

## 1. What each scheme is

### Bitcoin `nBits` (compact target)

Header field: 32-bit **compact** representation of a 256-bit target `T`.

Decode (simplified — see Bitcoin Core `SetCompact` / `DeriveTarget` in `src/pow.cpp`):

```text
mantissa = nBits & 0x007fffff
exponent = (nBits >> 24) & 0xff
T        = mantissa × 256^(exponent - 3)   // as 256-bit integer
```

**Valid PoW:** interpret `block_hash` as big-endian integer `H`; require `H ≤ T`.

Retarget adjusts `T` proportionally (× `actual/expected` with clamp), then re-encodes to compact `nBits`.

### Guld leading-zero bits

Header field: `difficulty = d` (u32).

**Valid PoW:** `leading_zero_bits(block_hash) ≥ d` (big-endian bytes; see `guld-consensus/src/pow.rs`).

Equivalent to requiring `H < 2^(256-d)` — i.e. targets that are **exact powers of two** only. Each +1 to `d` **doubles** required work.

Retarget scales `2^d` by `expected/actual` (with clamp), then maps back to an integer bit count.

---

## 2. Why leading-zero bits are simpler to **verify**

### 2.1 Less arithmetic

**Guld check today:**

1. `H = SHA256(SHA256(preimage))` — same as Bitcoin  
2. Walk at most 32 bytes until a non-zero byte; count zero bits  
3. Compare `count ≥ d`

No 256-bit multiplication, no compact decode, no overflow/negative-target edge cases (Bitcoin tests these in `src/test/pow_tests.cpp`).

### 2.2 Same code path at every difficulty

`nBits` decode depends on exponent/mantissa ranges; invalid encodings must be rejected (`fNegative`, `fOverflow`, above `powLimit`). Leading-bit rules are one loop.

### 2.3 Easier dev / test networks

Simba and `--dev` can use `difficulty = 1..16` and mine in milliseconds. Teaching and CI benefit from “each +1 bit ≈ 2× harder” without a target calculator.

### 2.4 Fork-choice proxy is trivial

Guld uses `work = 2^d` for Nakamoto comparison. That matches the PoW definition exactly when difficulty *is* a bit count.

---

## 3. Costs of leading-zero bits

### 3.1 Coarse retarget

Bitcoin can adjust target by any ratio allowed within the 4× clamp (then round to compact). Guld snaps to the nearest `d` with `2^d ≥ work_new`.

**Effect:** small retarget corrections quantize to ±1 bit (2×) jumps. Usually acceptable at 2016-block cadence; slightly more oscillation than Bitcoin near the clamp boundary.

### 3.2 Not identical to “Bitcoin difficulty”

Explorers and pools quote “difficulty” as `difficulty_1_target / current_target`. That number is a **derived** human scale from `nBits`, not a bit count. External tooling cannot reuse Bitcoin difficulty charts without conversion.

### 3.3 Header field size

Both fit in 32 bits today. If Guld ever wanted **full 256-bit target** in header, we’d need another representation anyway (`nBits` or raw target hash).

---

## 4. What merged mining actually needs

### 4.1 Namecoin-style AuxPoW (historical reference)

Typical pattern (SHA256 parent + SHA256 aux):

1. Bitcoin miner finds valid Bitcoin header `H_btc` (satisfies Bitcoin `nBits`).
2. Builds **aux block header** for chain B (Namecoin/Guld) and embeds a commitment in Bitcoin **coinbase** (Merkle tree of aux hashes).
3. Chain B accepts block if:
   - Aux header hash meets **chain B’s** target, and  
   - AuxPoW structure correctly references a valid parent Bitcoin block at sufficient depth.

Chain B’s verification of its **own** header PoW is independent of how Bitcoin encodes *its* target. Namecoin still used Bitcoin-like **`nBits`** on the aux header.

### 4.2 Why people say “you need `nBits` for merged mining”

Strictly false at consensus level. Practically true for **mining economics**:

| Layer | Leading-zero bits | `nBits` |
|-------|-------------------|---------|
| **Consensus** | Define any rule; aux chain validates its own header | Same |
| **Miners / pools (Stratum, etc.)** | Custom “share target” math | Already implemented for SHA256d |
| **Hashrate market** | “Point your Bitcoin ASIC at us” needs familiar difficulty/target APIs | Standard |
| **Cross-chain work accounting** | Must document mapping `d ↔ target` | Direct `GetBlockProof` analogue |

Bitcoin pool software computes **share difficulty** and **block target** from compact target or a difficulty float derived from it. A Guld-only bit count requires:

- Guld-specific pool fork or proxy  
- Conversion layer: `target(T) ↔ d` so operators see one coherent “difficulty”  
- Careful docs so merged work is not mis-measured vs Bitcoin parent work

So: **`nBits` is not a consensus prerequisite for merged mining; it is an integration prerequisite** if we want Bitcoin miners/pools to adopt Guld with minimal friction.

### 4.3 SHA256d alignment we already have

Merged mining cares that **both** chains use the same hash function on header-like preimages (Guld locked SHA256d in spec 06). That is necessary. Target encoding is **orthogonal** but affects **tooling**.

---

## 5. Tradeoff matrix

| Criterion | Leading-zero bits (Guld v1) | Compact `nBits` (Bitcoin) |
|-----------|----------------------------|---------------------------|
| Verify CPU | **Low** — O(32) bit scan | Higher — decode + 256-bit compare |
| Implementation risk | **Low** | Medium (compact edge cases) |
| Retarget smoothness | **Coarse** (2× steps) | Fine-grained |
| Match Bitcoin header layout | No | **Yes** |
| Pool / Stratum reuse | **Custom** | **Reuse** |
| Merged mining (AuxPoW) | Possible + extra spec | **Natural fit** |
| Dev/test ergonomics | **Excellent** | Good (regtest `powLimit`) |
| Explorer “difficulty” metric | Needs definition | Ecosystem standard |

---

## 6. Hybrid paths (if we want both)

### Option A — Keep `d` internally, add `nBits` on wire (display only)

- Header carries both; consensus uses one as SoT.  
- **Risk:** two fields can disagree — avoid unless one is derived from the other.

### Option B — Switch SoT to `nBits`, derive `d` for logging

- Consensus: `CheckProofOfWork(hash, nBits)` like Bitcoin.  
- Retarget outputs compact `nBits` directly (copy `CalculateNextWorkRequired` logic with `arith_uint256` or fixed-width crate).  
- **Cost:** dependency + tests; **gain:** merged mining + Bitcoin parity.

### Option C — Keep `d` for v1 Simba; `nBits` at merged-mining GIP

- Document bijection in a narrow range: `T(d) = 2^(256-d) - 1` or `H < 2^(256-d)`.  
- Pool adapter converts Stratum target ↔ `d`.  
- **Lowest short-term churn**; accept custom pool work.

### Option D — Full Bitcoin header subset for PoW-only “mining header”

- Split “Guld header” (state, names, rules) from 80-byte **PoW tail** that matches Bitcoin layout for ASICs.  
- Heavy design; only if merged mining is first-class day one.

---

## 7. Decision (locked)

**Leading-zero bit difficulty stays the v1 PoW target format.**

Rationale (maintainer, 2026-09-26):

- Better verify path and implementation safety for a small team shipping consensus code.
- Adequate with 2016-block retarget; coarse 2× steps are acceptable.
- Merged mining remains **possible** (SHA256d + AuxPoW witness GIP) — we accept **custom pool / Stratum tooling** rather than adopting `nBits` for ecosystem convenience alone.

**Rejected for v1:** switching SoT to compact `nBits` (Option B). Revisit only if operational pain proves worse than consensus migration cost.

Merged-mining work should plan **Option C** (adapter layer: Stratum target ↔ `d`) or a dedicated Guld pool, not a breaking PoW encoding change.

---

## 8. Conversion reference (if bridging)

For power-of-two targets only (Guld’s current rule):

```text
Given d (leading zero bits required):
  T = 2^(256-d) - 1   // maximum valid H
  // Encode T to compact nBits with standard SetCompact (Bitcoin Core)

Given valid nBits (general):
  H ≤ T(nBits)
  d_min = 256 - floor(log2(T)) - 1   // approximate; not always invertible
```

Only targets exactly equal to `2^(256-k)` round-trip cleanly between schemes. Arbitrary Bitcoin targets have **no** exact single `d`.

---

## 9. References

| Source | Location |
|--------|----------|
| Guld PoW verify | `src/guld-consensus/src/pow.rs` |
| Guld retarget | `src/guld-consensus/src/retarget.rs` |
| Bitcoin PoW | Bitcoin Core `src/pow.cpp` — `CheckProofOfWorkImpl`, `CalculateNextWorkRequired` |
| Bitcoin compact tests | `src/test/pow_tests.cpp` |
| Guld spec | [06-blocks-and-consensus.md §2](../specs/06-blocks-and-consensus.md) |
| Comparison table | [bitcoin-guld-comparison.md §2](./bitcoin-guld-comparison.md) |

Optional local clone:

```bash
git clone --depth 1 https://github.com/bitcoin/bitcoin.git /tmp/bitcoin-core-ref
```

---

## 10. Decision log

| Date | Note |
|------|------|
| 2026-09-26 | Document created; tradeoffs vs `nBits` |
| 2026-09-26 | **Locked:** leading-zero bits for v1; merged mining = tooling/GIP, not `nBits` migration |
