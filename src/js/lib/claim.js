/**
 * ClaimLegacy helpers — mirrors guld-client / extension claim flow.
 */

import { apiGet, apiPost } from "./api.js";
import { claimMessage, claimMessageHex, DEFAULT_MASTER_HASH } from "./crypto.js";

const DRAFT_KEY = "guld.claim.draft.v1";

/** @typedef {{ name: string, walletName: string, messageHex: string, initialMasterHash: string, threshold: number, keys: string[], chainId?: number, nonce?: string, balance?: string }} ClaimDraft */

/**
 * @param {ClaimDraft} draft
 */
export function saveClaimDraft(draft) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

/** @returns {ClaimDraft | null} */
export function loadClaimDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    return raw ? /** @type {ClaimDraft} */ (JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearClaimDraft() {
  try {
    sessionStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} proof
 * @param {boolean} devUnlock
 */
export function normalizeLegacyProof(proof, devUnlock) {
  if (devUnlock) return "dev_unlock_v1";
  const trimmed = proof.trim();
  if (!trimmed) throw new Error("paste PGP proof or enable dev unlock");
  if (trimmed.includes("BEGIN PGP") && !trimmed.startsWith("pgp_cleartext_v1:")) {
    return `pgp_cleartext_v1:${trimmed}`;
  }
  return trimmed;
}

/**
 * Extract signed cleartext from armored PGP (best-effort; node verifies fully).
 * @param {string} armored
 */
export function extractPgpCleartext(armored) {
  const body = armored.includes("pgp_cleartext_v1:")
    ? armored.split("pgp_cleartext_v1:")[1]
    : armored;
  const start = body.indexOf("-----BEGIN PGP SIGNED MESSAGE-----");
  if (start < 0) throw new Error("not a PGP signed message");
  const afterHeader = body.indexOf("\n\n", start);
  if (afterHeader < 0) throw new Error("malformed PGP signed message");
  const sigStart = body.indexOf("-----BEGIN PGP SIGNATURE-----", afterHeader);
  const text =
    sigStart >= 0
      ? body.slice(afterHeader + 2, sigStart)
      : body.slice(afterHeader + 2);
  return text.trim();
}

/**
 * @param {string} proof
 * @param {string} messageHex
 * @param {boolean} devUnlock
 */
export function assertProofMatchesMessage(proof, messageHex, devUnlock) {
  if (devUnlock) return;
  const signed = extractPgpCleartext(proof);
  const expected = messageHex.trim();
  if (signed !== expected) {
    throw new Error(
      `PGP signed ${signed.slice(0, 40)}… but claim message is ${expected.slice(0, 40)}… — rebuild and sign again`,
    );
  }
}

/**
 * @param {string} apiBase
 * @param {string} legacyName
 * @param {string} walletPubHex
 * @param {number} [threshold]
 * @param {string} [initialMasterHash]
 */
export async function buildClaimMessage(
  apiBase,
  legacyName,
  walletPubHex,
  threshold = 1,
  initialMasterHash,
) {
  const name = legacyName.trim().toLowerCase();
  let body;
  try {
    body = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(name)}`);
  } catch (err) {
    if (/** @type {Error} */ (err).message?.includes("404")) {
      throw new Error(`unknown account ${name}`);
    }
    throw err;
  }
  const acct = body.account;
  if (!acct?.legacy || acct.legacy.status !== "locked") {
    throw new Error(`${name} is not legacy-locked`);
  }
  const status = await apiGet(apiBase, "/chain/status");
  const chainId = Number(status.chainId ?? status.chain_id ?? 1);
  const master = initialMasterHash?.trim() || DEFAULT_MASTER_HASH;
  const msg = await claimMessage(
    chainId,
    name,
    [walletPubHex],
    threshold,
    master,
    BigInt(acct.nonce ?? 0),
  );
  return {
    chainId,
    nonce: String(acct.nonce ?? 0),
    initialMasterHash: master,
    messageHex: claimMessageHex(msg),
    balance: body.balance?.quanta ?? acct.balance ?? "0",
  };
}

/**
 * @param {string} apiBase
 * @param {{ name: string, keys: string[], threshold: number, initialMasterHash: string, legacyProof: string, devUnlock?: boolean }} opts
 */
export async function sendClaim(apiBase, opts) {
  const proof = normalizeLegacyProof(opts.legacyProof, Boolean(opts.devUnlock));
  const tx = {
    type: "claim_legacy",
    name: opts.name.trim().toLowerCase(),
    keys: opts.keys,
    threshold: opts.threshold,
    initial_master_hash: opts.initialMasterHash,
    legacy_proof: proof,
    inclusion_fee: "0",
  };
  return apiPost(apiBase, "/chain/transactions", tx);
}
