/**
 * Hex helpers.
 * @param {Uint8Array} bytes
 */
export function toHex(bytes, prefix = true) {
  const h = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return prefix ? `0x${h}` : h;
}

/** @param {string} hex */
export function fromHex(hex) {
  const s = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (s.length % 2) throw new Error("odd hex length");
  const out = new Uint8Array(s.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/** @param {bigint|number|string} n @param {number} len */
export function u64Be(n, len = 8) {
  let v = BigInt(n);
  const out = new Uint8Array(len);
  for (let i = len - 1; i >= 0; i--) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

/** @param {number} n */
export function u32Be(n) {
  return u64Be(n, 4);
}

/** @param {number} n */
export function u16Be(n) {
  return u64Be(n, 2);
}

export function concat(...parts) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
