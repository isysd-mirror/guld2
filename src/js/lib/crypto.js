/**
 * Guld tagged SHA-256 + Ed25519 (matches guld-crypto / extension).
 */

import * as ed from "../vendor/ed25519.js";
import { concat, fromHex, toHex, u16Be, u64Be } from "./hex.js";

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

export { toHex, fromHex };
