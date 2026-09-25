/**
 * JSON-RPC client for guld-node (read-only explorer use).
 */

/** Loopback default for local `guld-node --rpc` (CLI / same-machine browser). */
export const DEFAULT_RPC_URL = "http://127.0.0.1:8545";

/**
 * Default inclusion fee in GULD — enough for typical tx weight at `fee_rate_min_per_vb = 1`.
 * Prefer `guld_getMempoolFeeHints` + `guld_estimateWeight` when wiring fee UI.
 */
export const DEFAULT_INCLUSION_FEE_GULD = "0.000001";

/** Same-origin JSON-RPC when the site is served from the node (or nginx → node). */
export const SAME_ORIGIN_RPC_PATH = "/rpc";

/**
 * Prefer `/rpc` on remote hosts (avoids mixed-content + wrong-machine 127.0.0.1).
 * Keep loopback when the page itself is local.
 */
export function defaultRpcUrl() {
  try {
    const host = location.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return DEFAULT_RPC_URL;
    }
    return SAME_ORIGIN_RPC_PATH;
  } catch {
    return DEFAULT_RPC_URL;
  }
}

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
    const stored = localStorage.getItem("guld.rpcUrl");
    if (stored) {
      // Sticky "127.0.0.1:8545" from local testing breaks on https://guld.io — ignore it.
      const loopback = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?\/?$/i.test(
        stored,
      );
      const pageLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/i.test(location.hostname);
      if (!(loopback && !pageLocal)) {
        return stored;
      }
    }
    return defaultRpcUrl();
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

/** GULD decimal string → quanta bigint string. */
export function guldToQuanta(guldStr) {
  const s = String(guldStr || "0").trim();
  if (!s) return "0";
  const [whole, frac = ""] = s.split(".");
  if (!/^\d+$/.test(whole) || (frac && !/^\d+$/.test(frac))) {
    throw new Error(`Invalid GULD amount: ${guldStr}`);
  }
  const f = frac.padEnd(10, "0").slice(0, 10);
  return (BigInt(whole) * 10_000_000_000n + BigInt(f || "0")).toString();
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
 * Summarize a raw chain tx (explorer / mempool JSON with `type`).
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

/**
 * Summarize `guld_getAccountActivity` / HTTP activity items
 * (`kind`, `direction`, `amount`, `counterparty`, `height` — not nested `tx`).
 * @param {Record<string, unknown>} item
 */
export function summarizeActivity(item) {
  if (item && item.tx && typeof item.tx === "object") {
    return summarizeTx(/** @type {Record<string, unknown>} */ (item.tx));
  }
  const kind = String(item.kind || item.type || "unknown");
  const amount =
    item.amount != null && item.amount !== ""
      ? quantaToGuld(/** @type {string} */ (item.amount))
      : "—";
  const cp = item.counterparty != null ? String(item.counterparty) : "";
  const dir = item.direction != null ? String(item.direction) : "";

  switch (kind) {
    case "coinbase":
      return { type: kind, primary: "block reward", amount };
    case "transfer":
      if (dir === "out" && cp) return { type: kind, primary: `→ ${cp}`, amount };
      if (dir === "in" && cp) return { type: kind, primary: `← ${cp}`, amount };
      return { type: kind, primary: cp || "—", amount };
    case "claim_legacy":
      return { type: kind, primary: "claim", amount: "—" };
    case "register":
    case "register_group":
    case "register_subaccount":
      return {
        type: kind,
        primary: cp ? (dir === "out" ? `sponsored ${cp}` : `via ${cp}`) : "registration",
        amount,
      };
    case "update_master":
    case "rotate_keys":
    case "settle_registration":
      return { type: kind, primary: cp || "—", amount: "—" };
    default:
      return { type: kind, primary: cp || "—", amount };
  }
}
