/**
 * Thin HTTP client for the node HTTP API (`guld-node --http`).
 * When the wallet is served from the node (`--http-static`), same-origin `/api/v1` works.
 */

export const DEFAULT_API_BASE = "/api/v1";

/**
 * Same-origin API URL (repo browser, chain, registrar).
 *
 * @param {string} path e.g. `/api/v1/repos` or `/repos/guld-node`
 */
export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const base = resolveApiBase().replace(/\/$/, "");
  if (path.startsWith("/api/v1")) {
    return `${base}${path.slice("/api/v1".length)}`;
  }
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
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
    if (stored) {
      return stored.replace(/\/$/, "");
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_API_BASE;
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
      "API response missing height — check API base URL (guld-node --http + --http-static)",
    );
  }
}

/**
 * @param {Response} res
 * @param {unknown} body
 */
function throwIfBad(res, body) {
  if (res.ok) return;
  const detail =
    body && typeof body === "object" && body !== null && "detail" in body
      ? /** @type {{ detail: unknown }} */ (body).detail
      : body && typeof body === "object" && body !== null && "message" in body
        ? /** @type {{ message: unknown }} */ (body).message
        : res.statusText;
  throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
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
    throwIfBad(res, body);
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

/**
 * @param {string} base
 * @param {string} path
 * @param {unknown} payload
 * @param {{ timeoutMs?: number, headers?: Record<string, string>, method?: string }} [opts]
 */
export async function apiSend(base, path, payload, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const method = opts.method || "POST";
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        "content-type": "application/json",
        ...(opts.headers || {}),
      },
      body: JSON.stringify(payload ?? {}),
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => null);
    throwIfBad(res, body);
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

export const apiPost = (base, path, payload, opts) =>
  apiSend(base, path, payload, { ...opts, method: "POST" });

export const apiPatch = (base, path, payload, opts) =>
  apiSend(base, path, payload, { ...opts, method: "PATCH" });

/**
 * @param {string} base
 * @param {string} path
 * @param {{ timeoutMs?: number, headers?: Record<string, string> }} [opts]
 */
export async function apiDelete(base, path, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "DELETE",
      headers: { Accept: "application/json", ...(opts.headers || {}) },
      signal: ctrl.signal,
    });
    const body = await res.json().catch(() => (res.ok ? {} : null));
    throwIfBad(res, body);
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
