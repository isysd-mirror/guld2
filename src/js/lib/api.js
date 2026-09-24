/**
 * Thin HTTP client for the node HTTP API (`guld-node --http`) / guld-api façade.
 * When the wallet is served from the node (`--http-static`), same-origin `/api/v1` works.
 */

export const DEFAULT_API_BASE = "/api/v1";
/** Local node HTTP API (preferred over transitional guld-api :8004). */
const DEV_NODE_API = "http://127.0.0.1:8755/api/v1";

function isLocalDevHost() {
  const host = location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function isProductionSiteHost() {
  const host = location.hostname;
  return host === "guld.io" || host === "www.guld.io" || host === "dev.guld.io";
}

/** @returns {string} */
export function resolveApiBase() {
  try {
    const q = new URLSearchParams(location.search).get("api");
    if (q) {
      const base = q.replace(/\/$/, "");
      localStorage.setItem("guld.apiBase", base);
      return base;
    }
    const stored = localStorage.getItem("guld.apiBase");
    // Absolute URL — honor user override (node :8080 or guld-api :8004).
    if (stored && /^https?:\/\//i.test(stored)) {
      return stored.replace(/\/$/, "");
    }
    if (isProductionSiteHost()) {
      return DEFAULT_API_BASE;
    }
    if (isLocalDevHost()) {
      // Same-origin when node serves static, or npm proxies /api → node :8080.
      return DEFAULT_API_BASE;
    }
  } catch {
    /* ignore */
  }
  return DEV_NODE_API;
}

/** @param {string} base */
export function persistApiBase(base) {
  try {
    localStorage.setItem("guld.apiBase", base.replace(/\/$/, ""));
  } catch {
    /* ignore */
  }
}

/**
 * @param {unknown} body
 * @param {string} path
 */
function assertJsonApiBody(body, path) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new Error(`API returned non-JSON for ${path} — is guld-node --http running?`);
  }
  if (path.endsWith("/chain/status") && !("height" in /** @type {object} */ (body))) {
    throw new Error(
      "API response missing height — check API base URL (run guld-node with --http 127.0.0.1:8755)",
    );
  }
}

/**
 * @param {string} base
 * @param {string} path
 * @param {{ timeoutMs?: number }} [opts]
 */
export async function apiGet(base, path, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 10_000;
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    const ctype = res.headers.get("content-type") || "";
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail =
        body && typeof body === "object" && "detail" in body
          ? body.detail
          : body?.message || res.statusText;
      throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
    }
    if (!ctype.includes("application/json")) {
      throw new Error(
        `Expected JSON from API but got ${ctype || "unknown type"} — wrong URL or API not running (${url})`,
      );
    }
    assertJsonApiBody(body, path);
    return body;
  } catch (err) {
    if (err && /** @type {Error} */ (err).name === "AbortError") {
      throw new Error(`API timeout after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
