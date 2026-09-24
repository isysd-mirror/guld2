/**
 * JSON-RPC client for guld-node (read-only explorer use).
 */

export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

/**
 * @param {string} rpcUrl
 * @param {string} method
 * @param {unknown[]} [params]
 * @param {{ timeoutMs?: number }} [opts]
 */
export async function rpcCall(rpcUrl, method, params = [], opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 8_000;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error(`RPC HTTP ${res.status}`);
    const body = await res.json();
    if (body.error) {
      const err = new Error(body.error.message || "RPC error");
      // @ts-expect-error attach code
      err.code = body.error.code;
      throw err;
    }
    return body.result;
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === "AbortError") {
      throw new Error(`RPC timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve RPC URL from query `?rpc=`, localStorage, or default. */
export function resolveRpcUrl() {
  try {
    const q = new URLSearchParams(location.search).get("rpc");
    if (q) {
      localStorage.setItem("guld.rpcUrl", q);
      return q;
    }
    return localStorage.getItem("guld.rpcUrl") || DEFAULT_RPC_URL;
  } catch {
    return DEFAULT_RPC_URL;
  }
}

/** @param {string} url */
export function persistRpcUrl(url) {
  try {
    localStorage.setItem("guld.rpcUrl", url);
  } catch {
    /* ignore */
  }
}

/** Quanta string → GULD decimal string. */
export function quantaToGuld(quantaStr) {
  const q = BigInt(quantaStr || "0");
  const whole = q / 10_000_000_000n;
  const frac = q % 10_000_000_000n;
  if (frac === 0n) return whole.toString();
  const f = frac.toString().padStart(10, "0").replace(/0+$/, "");
  return `${whole}.${f}`;
}

/** @param {string} s */
export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** @param {string | number | undefined} ts unix seconds */
export function formatTime(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try {
    return new Date(n * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

/** Shorten 0x hashes for tables. */
export function shortHash(h, keep = 10) {
  const s = String(h || "");
  if (s.length <= keep * 2 + 1) return s;
  return `${s.slice(0, keep)}…${s.slice(-6)}`;
}

/**
 * Summarize a tx for list rows.
 * @param {Record<string, unknown>} tx
 */
export function summarizeTx(tx) {
  const type = String(tx.type || "unknown");
  switch (type) {
    case "transfer":
      return {
        type,
        primary: `${tx.from} → ${tx.to}`,
        amount: quantaToGuld(/** @type {string} */ (tx.amount)),
      };
    case "claim_legacy":
      return { type, primary: String(tx.name || ""), amount: "—" };
    case "register_username":
    case "register_group":
      return {
        type,
        primary: `${tx.payer} → ${tx.name}`,
        amount: quantaToGuld(/** @type {string} */ (tx.endowment || "0")),
      };
    case "register_subaccount":
      return {
        type,
        primary: `${tx.parent}.${tx.label}`,
        amount: quantaToGuld(/** @type {string} */ (tx.endowment || "0")),
      };
    case "update_master":
      return { type, primary: String(tx.name || ""), amount: "—" };
    case "rotate_keys":
      return { type, primary: String(tx.name || ""), amount: "—" };
    default:
      return { type, primary: "—", amount: "—" };
  }
}
