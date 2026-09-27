/**
 * Site-login challenge / response helpers (spec 14 §10.1 — frozen v1).
 */

import {
  fromHex,
  sign,
  siteLoginMessage,
  toHex,
  verify,
} from "./crypto.js";

export const LOGIN_REQ = "guld1loginreq";
export const LOGIN_RES = "guld1login";

/**
 * @typedef {{
 *   v: 1,
 *   type: "guld1loginreq",
 *   domain: string,
 *   uri: string,
 *   name: string,
 *   chain_id: number,
 *   nonce: string,
 *   issued_at: string,
 *   expiration_time: string,
 *   statement?: string,
 * }} LoginChallenge
 *
 * @typedef {LoginChallenge & {
 *   type: "guld1login",
 *   key_index: number,
 *   pubkey: string,
 *   signature: string,
 * }} LoginResponse
 */

/** @param {string} hex */
export function normHex(hex) {
  const s = String(hex || "").trim().toLowerCase();
  return s.startsWith("0x") ? s : `0x${s}`;
}

/**
 * @param {{
 *   domain: string,
 *   uri: string,
 *   name: string,
 *   chainId: number,
 *   nonce?: string,
 *   issuedAt?: string,
 *   expirationTime?: string,
 *   ttlMs?: number,
 *   statement?: string,
 * }} opts
 * @returns {LoginChallenge}
 */
export function buildChallenge(opts) {
  const name = String(opts.name || "")
    .trim()
    .toLowerCase();
  if (!name) throw new Error("name required");
  const domain = String(opts.domain || "").trim();
  const uri = String(opts.uri || "").trim();
  if (!domain || !uri) throw new Error("domain and uri required");
  const chainId = Number(opts.chainId);
  if (!Number.isFinite(chainId) || chainId < 0) throw new Error("chain_id required");

  const now = new Date();
  const issuedAt = opts.issuedAt || now.toISOString().replace(/\.\d{3}Z$/, "Z");
  const ttlMs = opts.ttlMs ?? 10 * 60 * 1000;
  const expirationTime =
    opts.expirationTime ||
    new Date(Date.parse(issuedAt) + ttlMs).toISOString().replace(/\.\d{3}Z$/, "Z");

  let nonce = opts.nonce;
  if (!nonce) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    nonce = toHex(bytes, false);
  }

  /** @type {LoginChallenge} */
  const challenge = {
    v: 1,
    type: LOGIN_REQ,
    domain,
    uri,
    name,
    chain_id: chainId,
    nonce,
    issued_at: issuedAt,
    expiration_time: expirationTime,
  };
  if (opts.statement) {
    const stmt = String(opts.statement);
    if (new TextEncoder().encode(stmt).length > 256) {
      throw new Error("statement exceeds 256 bytes");
    }
    challenge.statement = stmt;
  }
  return challenge;
}

/** @param {unknown} obj @returns {LoginChallenge} */
export function parseLoginChallenge(obj) {
  if (!obj || typeof obj !== "object") throw new Error("invalid login challenge");
  const o = /** @type {Record<string, unknown>} */ (obj);
  if (o.v !== 1) throw new Error("unsupported login challenge version");
  if (o.type !== LOGIN_REQ) throw new Error(`expected type ${LOGIN_REQ}`);
  const name = String(o.name || "")
    .trim()
    .toLowerCase();
  const domain = String(o.domain || "").trim();
  const uri = String(o.uri || "").trim();
  const nonce = String(o.nonce || "");
  const issuedAt = String(o.issued_at || "");
  const expirationTime = String(o.expiration_time || "");
  const chainId = Number(o.chain_id);
  if (!name || !domain || !uri || !nonce || !issuedAt || !expirationTime) {
    throw new Error("login challenge missing required fields");
  }
  if (!Number.isFinite(chainId)) throw new Error("chain_id required");
  /** @type {LoginChallenge} */
  const out = {
    v: 1,
    type: LOGIN_REQ,
    domain,
    uri,
    name,
    chain_id: chainId,
    nonce,
    issued_at: issuedAt,
    expiration_time: expirationTime,
  };
  if (o.statement != null && o.statement !== "") {
    out.statement = String(o.statement);
    if (new TextEncoder().encode(out.statement).length > 256) {
      throw new Error("statement exceeds 256 bytes");
    }
  }
  return out;
}

/** @param {LoginChallenge} challenge */
export async function loginMessage(challenge) {
  const c = parseLoginChallenge(challenge);
  return siteLoginMessage(
    c.chain_id,
    c.name,
    c.domain,
    c.uri,
    c.nonce,
    c.issued_at,
    c.expiration_time,
    c.statement || "",
  );
}

/**
 * @param {LoginChallenge} challenge
 * @param {{ key_index: number, privHex: string, pubHex: string }} opts
 * @returns {Promise<LoginResponse>}
 */
export async function signLoginChallenge(challenge, opts) {
  const c = parseLoginChallenge(challenge);
  const msg = await loginMessage(c);
  const sig = await sign(msg, fromHex(opts.privHex));
  /** @type {LoginResponse} */
  const res = {
    ...c,
    type: LOGIN_RES,
    key_index: opts.key_index,
    pubkey: normHex(opts.pubHex),
    signature: toHex(sig),
  };
  return res;
}

/**
 * Cryptographic + schema verify (does not fetch chain).
 *
 * @param {unknown} response
 * @param {{
 *   accountKeys: string[],
 *   chainId: number,
 *   now?: Date | number,
 *   expectedDomain?: string,
 *   expectedUri?: string,
 * }} opts
 */
export async function verifyLoginResponse(response, opts) {
  if (!response || typeof response !== "object") {
    throw new Error("invalid login response");
  }
  const o = /** @type {Record<string, unknown>} */ (response);
  if (o.v !== 1) throw new Error("unsupported login response version");
  if (o.type !== LOGIN_RES) throw new Error(`expected type ${LOGIN_RES}`);

  const challenge = parseLoginChallenge({
    ...o,
    type: LOGIN_REQ,
  });

  if (opts.expectedDomain != null && challenge.domain !== opts.expectedDomain) {
    throw new Error("domain mismatch");
  }
  if (opts.expectedUri != null && challenge.uri !== opts.expectedUri) {
    throw new Error("uri mismatch");
  }
  if (challenge.chain_id !== opts.chainId) {
    throw new Error("chain_id mismatch");
  }

  const issued = Date.parse(challenge.issued_at);
  const expires = Date.parse(challenge.expiration_time);
  if (!Number.isFinite(issued) || !Number.isFinite(expires)) {
    throw new Error("invalid timestamps");
  }
  if (expires < issued) throw new Error("expiration before issued_at");
  const nowMs =
    opts.now instanceof Date
      ? opts.now.getTime()
      : typeof opts.now === "number"
        ? opts.now
        : Date.now();
  if (nowMs < issued || nowMs > expires) {
    throw new Error("login challenge outside validity window");
  }

  const keyIndex = Number(o.key_index);
  if (!Number.isInteger(keyIndex) || keyIndex < 0) {
    throw new Error("key_index required");
  }
  const keys = (opts.accountKeys || []).map(normHex);
  if (keyIndex >= keys.length) throw new Error("key_index out of range");
  const pubkey = normHex(String(o.pubkey || ""));
  if (pubkey !== keys[keyIndex]) {
    throw new Error("pubkey does not match account.keys[key_index]");
  }

  const sigHex = String(o.signature || "");
  if (!sigHex) throw new Error("signature required");
  const msg = await loginMessage(challenge);
  const ok = await verify(msg, fromHex(sigHex), pubkey);
  if (!ok) throw new Error("invalid site-login signature");
  return true;
}

/**
 * Origin binding checks for extension / dapp.
 * @param {LoginChallenge} challenge
 * @param {string} pageOrigin e.g. https://guld.io
 */
export function assertOriginBinding(challenge, pageOrigin) {
  let originUrl;
  try {
    originUrl = new URL(pageOrigin);
  } catch {
    throw new Error("invalid page origin");
  }
  if (challenge.domain !== originUrl.host) {
    throw new Error("challenge.domain does not match page origin host");
  }
  let uriUrl;
  try {
    uriUrl = new URL(challenge.uri);
  } catch {
    throw new Error("invalid challenge.uri");
  }
  if (uriUrl.origin !== originUrl.origin) {
    throw new Error("challenge.uri is not same-origin as page");
  }
}
