/**
 * Guld tagged SHA-256 + Ed25519 (matches guld-crypto / extension).
 */

import * as ed from "../vendor/ed25519.js";
import { concat, fromHex, toHex, u16Be, u32Be, u64Be } from "./hex.js";

async function sha256(data) {
  const buf = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(buf);
}

/** SHA256(tag ‖ 0x00 ‖ payload) */
export async function taggedHash(tag, payload) {
  const tagBytes = new TextEncoder().encode(tag);
  return sha256(concat(tagBytes, new Uint8Array([0]), payload));
}

function u128Be(n) {
  return u64Be(n, 16);
}

export async function randomPrivateKey() {
  return ed.utils.randomPrivateKey();
}

export async function getPublicKey(priv) {
  return ed.getPublicKeyAsync(priv);
}

export async function sign(message, priv) {
  return ed.signAsync(message, priv);
}

/** @param {Uint8Array} message @param {Uint8Array} sig @param {Uint8Array|string} pub */
export async function verify(message, sig, pub) {
  const pubBytes = typeof pub === "string" ? fromHex(pub) : pub;
  return ed.verifyAsync(sig, message, pubBytes);
}

export async function pubkeyHex(priv) {
  return toHex(await getPublicKey(priv));
}

/** Default empty master hash (guld-client claim DEFAULT_MASTER_HASH). */
export const DEFAULT_MASTER_HASH =
  "0x0909090909090909090909090909090909090909090909090909090909090909";

/** Registrant consent (spec 16). */
export async function registerIntentMessage(
  newName,
  threshold,
  initialMasterHex,
  endowmentQuanta,
  regFeeQuanta,
  feeQuanta,
  keysHex,
) {
  const payload = concat(
    new TextEncoder().encode(newName),
    new Uint8Array([0]),
    u16Be(threshold),
    fromHex(initialMasterHex),
    u128Be(endowmentQuanta),
    u128Be(regFeeQuanta),
    u128Be(feeQuanta),
    ...keysHex.map((h) => fromHex(h)),
  );
  return taggedHash("guld/register/intent/v1", payload);
}

/** Sponsor spend message for registration. */
export async function registerMessage(
  payerAccountIdHex,
  payerNonce,
  newName,
  threshold,
  initialMasterHex,
  endowmentQuanta,
  regFeeQuanta,
  feeQuanta,
  keysHex,
) {
  const payload = concat(
    fromHex(payerAccountIdHex),
    u64Be(payerNonce),
    new TextEncoder().encode(newName),
    new Uint8Array([0]),
    u16Be(threshold),
    fromHex(initialMasterHex),
    u128Be(endowmentQuanta),
    u128Be(regFeeQuanta),
    u128Be(feeQuanta),
    ...keysHex.map((h) => fromHex(h)),
  );
  return taggedHash("guld/register/v1", payload);
}

/** Append optional memo (`u16_be(len) ‖ bytes`) when non-empty. */
function withMemo(parts, memoBytes) {
  if (!memoBytes || memoBytes.length === 0) return concat(...parts);
  if (memoBytes.length > 64) {
    throw new Error(`memo exceeds 64 bytes (got ${memoBytes.length})`);
  }
  return concat(...parts, u16Be(memoBytes.length), memoBytes);
}

/** Subaccount key consent (`guld/register_sub/intent/v1`). */
export async function registerSubIntentMessage(
  fullName,
  keysHex,
  threshold,
  initialMasterHex,
  endowmentQuanta,
  regFeeQuanta,
  feeQuanta,
  memoBytes,
) {
  const payload = withMemo(
    [
      new TextEncoder().encode(fullName),
      new Uint8Array([0]),
      u16Be(threshold),
      fromHex(initialMasterHex),
      u128Be(endowmentQuanta),
      u128Be(regFeeQuanta),
      u128Be(feeQuanta),
      ...keysHex.map((h) => fromHex(h)),
    ],
    memoBytes,
  );
  return taggedHash("guld/register_sub/intent/v1", payload);
}

/** Parent spend for subaccount (`guld/register_sub/v1`). */
export async function registerSubMessage(
  parentAccountIdHex,
  parentNonce,
  fullName,
  keysHex,
  threshold,
  initialMasterHex,
  endowmentQuanta,
  regFeeQuanta,
  feeQuanta,
  memoBytes,
) {
  const payload = withMemo(
    [
      fromHex(parentAccountIdHex),
      u64Be(parentNonce),
      new TextEncoder().encode(fullName),
      new Uint8Array([0]),
      u16Be(threshold),
      fromHex(initialMasterHex),
      u128Be(endowmentQuanta),
      u128Be(regFeeQuanta),
      u128Be(feeQuanta),
      ...keysHex.map((h) => fromHex(h)),
    ],
    memoBytes,
  );
  return taggedHash("guld/register_sub/v1", payload);
}

/** Transfer spend message (`guld/transfer/v1`). */
export async function transferMessage(
  accountIdHex,
  nonce,
  toName,
  amountQuanta,
  feeQuanta,
  memoBytes,
) {
  const payload = withMemo(
    [
      fromHex(accountIdHex),
      u64Be(nonce),
      new TextEncoder().encode(toName),
      new Uint8Array([0]),
      u128Be(amountQuanta),
      u128Be(feeQuanta),
    ],
    memoBytes,
  );
  return taggedHash("guld/transfer/v1", payload);
}

/** UpdateMaster cosign message (`guld/cosign/v1`). */
export async function cosignMessage(
  accountIdHex,
  prevMasterHex,
  newMasterHex,
  nonce,
  chainId,
  memoBytes,
) {
  const payload = withMemo(
    [
      fromHex(accountIdHex),
      fromHex(prevMasterHex),
      fromHex(newMasterHex),
      u64Be(nonce),
      u32Be(chainId),
    ],
    memoBytes,
  );
  return taggedHash("guld/cosign/v1", payload);
}

async function rotateKeysCommit(keysHex, threshold) {
  const payload = concat(u16Be(threshold), ...keysHex.map((h) => fromHex(h)));
  return taggedHash("guld/rotate_keys/commit/v1", payload);
}

/** New controller consent (`guld/rotate_keys/intent/v1`). */
export async function rotateKeysIntentMessage(name, keysHex, threshold, feeQuanta) {
  const commit = await rotateKeysCommit(keysHex, threshold);
  const payload = concat(
    new TextEncoder().encode(name),
    new Uint8Array([0]),
    u16Be(threshold),
    commit,
    u128Be(feeQuanta),
  );
  return taggedHash("guld/rotate_keys/intent/v1", payload);
}

/** Current-owner cosign for key rotation (`guld/rotate_keys/v1`). */
export async function rotateKeysMessage(
  accountIdHex,
  nonce,
  chainId,
  keysHex,
  threshold,
  feeQuanta,
) {
  const commit = await rotateKeysCommit(keysHex, threshold);
  const payload = concat(
    fromHex(accountIdHex),
    u64Be(nonce),
    u32Be(chainId),
    u16Be(threshold),
    commit,
    u128Be(feeQuanta),
  );
  return taggedHash("guld/rotate_keys/v1", payload);
}

/** Spec 15 claim message (`guld/claim_legacy/v1`). */
export async function claimMessage(
  chainId,
  name,
  keysHex,
  threshold,
  initialMasterHex,
  nonce,
) {
  const keysPayload = concat(...keysHex.map((h) => fromHex(h)), u16Be(threshold));
  const keysHash = await taggedHash("guld/claim_legacy/keys/v1", keysPayload);
  const payload = concat(
    u32Be(chainId),
    new TextEncoder().encode(name),
    new Uint8Array([0]),
    keysHash,
    fromHex(initialMasterHex),
    u64Be(nonce),
  );
  return taggedHash("guld/claim_legacy/v1", payload);
}

/** Claim message hex without 0x prefix (PGP clearsign payload). */
export function claimMessageHex(hash32) {
  return toHex(hash32, false);
}

export { toHex, fromHex };
