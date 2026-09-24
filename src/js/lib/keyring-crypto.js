/**
 * Wallet keyring encryption (spec 01 §3.1): AES-256-GCM + PBKDF2-SHA256.
 */

const PBKDF2_ITER = 310_000;
const SALT_LEN = 16;
const IV_LEN = 12;

/** @param {Uint8Array} bytes */
function b64Encode(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/** @param {string} b64 */
function b64Decode(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * @param {string} passphrase
 * @param {Uint8Array} salt
 */
async function deriveKey(passphrase, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITER, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

/**
 * @param {string} privHex
 * @param {string} passphrase
 */
export async function encryptPriv(privHex, passphrase) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(privHex);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return {
    v: 1,
    alg: "aes-256-gcm",
    kdf: "pbkdf2-sha256",
    iter: PBKDF2_ITER,
    salt: b64Encode(salt),
    iv: b64Encode(iv),
    ciphertext: b64Encode(new Uint8Array(ciphertext)),
  };
}

/**
 * @param {{ v: number, alg: string, kdf: string, iter: number, salt: string, iv: string, ciphertext: string }} enc
 * @param {string} passphrase
 */
export async function decryptPriv(enc, passphrase) {
  if (!enc || enc.v !== 1 || enc.alg !== "aes-256-gcm") {
    throw new Error("Unsupported keyring encryption record");
  }
  const salt = b64Decode(enc.salt);
  const iv = b64Decode(enc.iv);
  const key = await deriveKey(passphrase, salt);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    b64Decode(enc.ciphertext),
  );
  return new TextDecoder().decode(plain);
}
