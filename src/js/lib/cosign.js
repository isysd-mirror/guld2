/**
 * Cosign request/response helpers (spec 14 §9.2.1 — frozen v1).
 */

import {
  cosignMessage,
  fromHex,
  rotateKeysMessage,
  sign,
  toHex,
  verify,
} from "./crypto.js";

export const COSIGN_REQ = "guld1cosignreq";
export const COSIGN_RES = "guld1cosignres";

/**
 * @typedef {"update_master"|"rotate_keys"} CosignOp
 * @typedef {{
 *   v: 1,
 *   type: "guld1cosignreq",
 *   op: CosignOp,
 *   name: string,
 *   account_id: string,
 *   nonce: string,
 *   chain_id: number,
 *   threshold: number,
 *   keys: string[],
 *   needed: number[],
 *   inclusion_fee: string,
 *   memo?: string,
 *   prev_master_hash?: string,
 *   new_master_hash?: string,
 *   new_keys?: string[],
 *   new_threshold?: number,
 * }} CosignRequest
 * @typedef {{
 *   v: 1,
 *   type: "guld1cosignres",
 *   op: CosignOp,
 *   name: string,
 *   account_id: string,
 *   nonce: string,
 *   chain_id: number,
 *   inclusion_fee: string,
 *   key_index: number,
 *   signature: string,
 *   memo?: string,
 *   prev_master_hash?: string,
 *   new_master_hash?: string,
 *   new_keys?: string[],
 *   new_threshold?: number,
 * }} CosignResponse
 */

/** @param {string} hex */
export function normHex(hex) {
  const h = String(hex || "").trim().toLowerCase();
  if (!h) return h;
  return h.startsWith("0x") ? h : `0x${h}`;
}

/** @param {unknown} raw @returns {Uint8Array|undefined} */
function memoBytesFrom(raw) {
  if (!raw) return undefined;
  const s = String(raw);
  const bytes = new TextEncoder().encode(s);
  if (bytes.length > 64) throw new Error("memo exceeds 64 bytes");
  return bytes;
}

/**
 * @param {unknown} raw
 * @returns {CosignRequest}
 */
export function parseCosignRequest(raw) {
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== "object") throw new Error("Invalid cosign request");
  if (obj.v !== 1 || obj.type !== COSIGN_REQ) {
    throw new Error("Unsupported cosign request (need v:1 guld1cosignreq)");
  }
  if (obj.op !== "update_master" && obj.op !== "rotate_keys") {
    throw new Error(`Unsupported cosign op: ${obj.op}`);
  }
  const keys = Array.isArray(obj.keys) ? obj.keys.map(normHex) : [];
  const needed = Array.isArray(obj.needed)
    ? [...new Set(obj.needed.map((n) => Number(n)))].filter((i) => Number.isFinite(i) && i >= 0)
    : [];
  if (!keys.length) throw new Error("Cosign request missing keys");
  if (!needed.length) throw new Error("Cosign request missing needed indices");
  for (const i of needed) {
    if (i >= keys.length) throw new Error(`needed index ${i} out of range`);
  }
  /** @type {CosignRequest} */
  const req = {
    v: 1,
    type: COSIGN_REQ,
    op: obj.op,
    name: String(obj.name || "").trim().toLowerCase(),
    account_id: normHex(obj.account_id),
    nonce: String(obj.nonce ?? "0"),
    chain_id: Number(obj.chain_id ?? 1),
    threshold: Number(obj.threshold),
    keys,
    needed,
    inclusion_fee: String(obj.inclusion_fee ?? "0"),
  };
  if (!req.name || !req.account_id) throw new Error("Cosign request missing name/account_id");
  if (!(req.threshold > 0)) throw new Error("Invalid threshold");
  if (obj.memo) req.memo = String(obj.memo);
  if (req.op === "update_master") {
    req.prev_master_hash = normHex(obj.prev_master_hash);
    req.new_master_hash = normHex(obj.new_master_hash);
    if (!req.prev_master_hash || !req.new_master_hash) {
      throw new Error("update_master request needs prev/new master hash");
    }
  } else {
    req.new_keys = Array.isArray(obj.new_keys) ? obj.new_keys.map(normHex) : [];
    req.new_threshold = Number(obj.new_threshold);
    if (!req.new_keys?.length || !(req.new_threshold > 0)) {
      throw new Error("rotate_keys request needs new_keys and new_threshold");
    }
  }
  return req;
}

/**
 * @param {unknown} raw
 * @returns {CosignResponse}
 */
export function parseCosignResponse(raw) {
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== "object") throw new Error("Invalid cosign response");
  if (obj.v !== 1 || obj.type !== COSIGN_RES) {
    throw new Error("Unsupported cosign response (need v:1 guld1cosignres)");
  }
  if (obj.op !== "update_master" && obj.op !== "rotate_keys") {
    throw new Error(`Unsupported cosign op: ${obj.op}`);
  }
  /** @type {CosignResponse} */
  const res = {
    v: 1,
    type: COSIGN_RES,
    op: obj.op,
    name: String(obj.name || "").trim().toLowerCase(),
    account_id: normHex(obj.account_id),
    nonce: String(obj.nonce ?? "0"),
    chain_id: Number(obj.chain_id ?? 1),
    inclusion_fee: String(obj.inclusion_fee ?? "0"),
    key_index: Number(obj.key_index),
    signature: normHex(obj.signature),
  };
  if (!res.name || !res.account_id) throw new Error("Cosign response missing name/account_id");
  if (!Number.isFinite(res.key_index) || res.key_index < 0 || !res.signature) {
    throw new Error("Cosign response missing key_index/signature");
  }
  if (obj.memo) res.memo = String(obj.memo);
  if (res.op === "update_master") {
    res.prev_master_hash = normHex(obj.prev_master_hash);
    res.new_master_hash = normHex(obj.new_master_hash);
    if (!res.prev_master_hash || !res.new_master_hash) {
      throw new Error("update_master response needs prev/new master hash");
    }
  } else {
    res.new_keys = Array.isArray(obj.new_keys) ? obj.new_keys.map(normHex) : [];
    res.new_threshold = Number(obj.new_threshold);
    if (!res.new_keys?.length || !(res.new_threshold > 0)) {
      throw new Error("rotate_keys response needs new_keys and new_threshold");
    }
  }
  return res;
}

/**
 * @param {CosignRequest | CosignResponse} binding
 */
export async function deriveCosignMessage(binding) {
  const memoBytes = memoBytesFrom(binding.memo);
  if (binding.op === "update_master") {
    return cosignMessage(
      binding.account_id,
      /** @type {string} */ (binding.prev_master_hash),
      /** @type {string} */ (binding.new_master_hash),
      Number(binding.nonce),
      binding.chain_id,
      memoBytes,
    );
  }
  return rotateKeysMessage(
    binding.account_id,
    Number(binding.nonce),
    binding.chain_id,
    /** @type {string[]} */ (binding.new_keys),
    /** @type {number} */ (binding.new_threshold),
    binding.inclusion_fee,
  );
}

/**
 * @param {CosignRequest} req
 * @param {{ key_index: number, privHex: string }} signer
 * @returns {Promise<CosignResponse>}
 */
export async function signCosignRequest(req, signer) {
  const idx = signer.key_index;
  if (!req.needed.includes(idx)) {
    throw new Error(`key_index ${idx} is not in needed[]`);
  }
  if (!req.keys[idx]) throw new Error(`No pubkey at key_index ${idx}`);
  const msg = await deriveCosignMessage(req);
  const sig = await sign(msg, fromHex(signer.privHex));
  /** @type {CosignResponse} */
  const res = {
    v: 1,
    type: COSIGN_RES,
    op: req.op,
    name: req.name,
    account_id: req.account_id,
    nonce: req.nonce,
    chain_id: req.chain_id,
    inclusion_fee: req.inclusion_fee,
    key_index: idx,
    signature: toHex(sig),
  };
  if (req.memo) res.memo = req.memo;
  if (req.op === "update_master") {
    res.prev_master_hash = req.prev_master_hash;
    res.new_master_hash = req.new_master_hash;
  } else {
    res.new_keys = req.new_keys;
    res.new_threshold = req.new_threshold;
  }
  return res;
}

/**
 * @param {CosignResponse} res
 * @param {string[]} keys
 */
export async function verifyCosignResponse(res, keys) {
  const pub = keys[res.key_index];
  if (!pub) throw new Error(`No pubkey at key_index ${res.key_index}`);
  const msg = await deriveCosignMessage(res);
  const ok = await verify(msg, fromHex(res.signature), pub);
  if (!ok) throw new Error(`Invalid signature for key_index ${res.key_index}`);
  return true;
}

/**
 * @param {CosignRequest} req
 * @param {Map<number, string>} sigs
 * @param {string[]} [liveKeys]
 */
export async function mergeAndVerify(req, sigs, liveKeys) {
  const keys = (liveKeys?.length ? liveKeys : req.keys).map(normHex);
  /** @type {{ key_index: number, signature: string }[]} */
  const out = [];
  for (const [idx, signature] of sigs) {
    /** @type {CosignResponse} */
    const res = {
      v: 1,
      type: COSIGN_RES,
      op: req.op,
      name: req.name,
      account_id: req.account_id,
      nonce: req.nonce,
      chain_id: req.chain_id,
      inclusion_fee: req.inclusion_fee,
      key_index: idx,
      signature: normHex(signature),
    };
    if (req.memo) res.memo = req.memo;
    if (req.op === "update_master") {
      res.prev_master_hash = req.prev_master_hash;
      res.new_master_hash = req.new_master_hash;
    } else {
      res.new_keys = req.new_keys;
      res.new_threshold = req.new_threshold;
    }
    await verifyCosignResponse(res, keys);
    out.push({ key_index: idx, signature: normHex(signature) });
  }
  out.sort((a, b) => a.key_index - b.key_index);
  return out;
}

/**
 * @param {object} p
 * @param {CosignOp} p.op
 * @param {string} p.name
 * @param {Record<string, unknown>} p.account
 * @param {number} p.chainId
 * @param {string} p.inclusionFee
 * @param {string} [p.newMasterHash]
 * @param {string[]} [p.newKeys]
 * @param {number} [p.newThreshold]
 * @param {number[]} [p.alreadySigned]
 * @param {string} [p.memo]
 * @returns {CosignRequest}
 */
export function buildCosignRequest(p) {
  const keys = (Array.isArray(p.account.keys) ? p.account.keys : []).map(normHex);
  const threshold = Number(p.account.threshold ?? 1);
  const already = new Set(p.alreadySigned || []);
  const needed = keys.map((_, i) => i).filter((i) => !already.has(i));
  /** @type {CosignRequest} */
  const req = {
    v: 1,
    type: COSIGN_REQ,
    op: p.op,
    name: p.name.trim().toLowerCase(),
    account_id: normHex(String(p.account.account_id || "")),
    nonce: String(p.account.nonce ?? "0"),
    chain_id: p.chainId,
    threshold,
    keys,
    needed: needed.length ? needed : keys.map((_, i) => i),
    inclusion_fee: String(p.inclusionFee),
  };
  if (p.memo) req.memo = p.memo;
  if (p.op === "update_master") {
    req.prev_master_hash = normHex(String(p.account.master_hash || ""));
    req.new_master_hash = normHex(/** @type {string} */ (p.newMasterHash));
  } else {
    req.new_keys = (p.newKeys || []).map(normHex);
    req.new_threshold = Number(p.newThreshold);
  }
  return req;
}

/**
 * @param {string[]} accountKeys
 * @param {string} pubHex
 */
export function keyIndexForPub(accountKeys, pubHex) {
  const want = normHex(pubHex);
  return accountKeys.map(normHex).findIndex((k) => k === want);
}

/**
 * @param {CosignRequest} req
 * @param {{ key_index: number, signature: string }[]} cosignatures
 * @param {string} [newKeySignature]
 */
export function buildTxFromCosign(req, cosignatures, newKeySignature) {
  if (req.op === "update_master") {
    return {
      type: "update_master",
      name: req.name,
      new_master_hash: req.new_master_hash,
      cosignatures,
      inclusion_fee: req.inclusion_fee,
      ...(req.memo ? { memo: req.memo } : {}),
    };
  }
  return {
    type: "rotate_keys",
    name: req.name,
    new_keys: req.new_keys,
    new_threshold: req.new_threshold,
    cosignatures,
    new_key_signature: newKeySignature,
    inclusion_fee: req.inclusion_fee,
    ...(req.memo ? { memo: req.memo } : {}),
  };
}

/** Pretty JSON for copy/paste. */
export function stringifyCosign(obj) {
  return `${JSON.stringify(obj, null, 2)}\n`;
}
