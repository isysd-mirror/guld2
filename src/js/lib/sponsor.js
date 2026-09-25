/**
 * Sponsored registration — build on-chain tx from a portable request (spec 16).
 */

import { apiGet, apiPost } from "./api.js";
import { fromHex, registerMessage, sign, toHex } from "./crypto.js";
import { keyring } from "./keyring.js";

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
export function parseRegistrationRequest(raw) {
  const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!obj || typeof obj !== "object") throw new Error("Invalid registration request");
  const type = String(obj.type || "");
  if (type !== "register_username" && type !== "register_group") {
    throw new Error('Request type must be "register_username" or "register_group"');
  }
  const name = String(obj.name || "")
    .trim()
    .toLowerCase();
  const keys = Array.isArray(obj.keys) ? obj.keys.map(String) : [];
  if (!name || !keys.length) throw new Error("Request missing name or keys");
  if (!obj.registrant_signature) throw new Error("Request missing registrant_signature");
  return {
    ...obj,
    type,
    name,
    keys,
    threshold: Number(obj.threshold || 1),
    endowment: String(obj.endowment || "0"),
    registration_fee: String(obj.registration_fee || "0"),
    inclusion_fee: String(obj.inclusion_fee || "10000"),
    initial_master_hash: String(obj.initial_master_hash || ""),
    registrant_signature: String(obj.registrant_signature),
  };
}

/**
 * @param {string} apiBase
 * @param {string} payerName
 * @param {Record<string, unknown>} req parsed registration request
 */
export async function sponsorRegistration(apiBase, payerName, req) {
  const privHex = keyring.getPriv(payerName);
  if (!privHex) {
    throw new Error(`Unlock your keyring for “${payerName}” first.`);
  }
  const acctBody = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(payerName)}`);
  const account = acctBody.account || {};
  const accountId = account.account_id;
  const nonce = account.nonce;
  if (!accountId || nonce == null) {
    throw new Error("Could not read payer account_id / nonce");
  }

  const kind = req.type === "register_group" ? "group" : "individual";
  const nKeys = Array.isArray(req.keys) ? req.keys.length : 1;
  const feeEst = await apiGet(
    apiBase,
    `/chain/fees/registration?kind=${encodeURIComponent(kind)}&name=${encodeURIComponent(String(req.name))}&nKeys=${nKeys}`,
  );
  const chainFee = String(feeEst.fee ?? "0");
  if (chainFee !== String(req.registration_fee)) {
    throw new Error(
      `Registration fee stale (request ${req.registration_fee} vs chain ${chainFee}) — ask for a fresh request`,
    );
  }

  const exists = await apiGet(
    apiBase,
    `/chain/accounts/${encodeURIComponent(String(req.name))}/exists`,
  );
  if (exists.exists) {
    throw new Error(`Name “${req.name}” is already registered`);
  }

  const msg = await registerMessage(
    accountId,
    nonce,
    String(req.name),
    Number(req.threshold),
    String(req.initial_master_hash),
    String(req.endowment),
    String(req.registration_fee),
    String(req.inclusion_fee),
    /** @type {string[]} */ (req.keys),
  );
  const payerSig = await sign(msg, fromHex(privHex));

  const tx = {
    type: req.type === "register_group" ? "register_group" : "register_username",
    payer: payerName,
    name: req.name,
    keys: req.keys,
    threshold: Number(req.threshold),
    initial_master_hash: req.initial_master_hash,
    endowment: req.endowment,
    payer_signature: toHex(payerSig),
    registrant_signature: req.registrant_signature,
    inclusion_fee: req.inclusion_fee,
  };

  return apiPost(apiBase, "/chain/transactions", tx);
}
