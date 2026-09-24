/**
 * Auth helpers: logged-in = local private key for a name that exists on-chain
 * (or is mid-registration with a pending key).
 */

import { apiGet } from "./api.js";
import { keyring, KEYRING_EVENT } from "./keyring.js";
import { getActiveName, setActiveName, SESSION_EVENT } from "./wallet-session.js";

export const AUTH_EVENT = "guld:auth";
export const LOGIN_HREF = "/login/";
export const REGISTER_HREF = "/register/";
export const SETTINGS_HREF = "/settings/";
export const GATEWAY_HREF = "/gateway/";

/**
 * @param {string} apiBase
 * @param {string} name
 */
export async function accountExists(apiBase, name) {
  const body = await apiGet(apiBase, `/chain/accounts/${encodeURIComponent(name)}/exists`);
  return Boolean(body.exists);
}

/**
 * Session identity for chrome / gating.
 * @returns {{ name: string | null, hasKey: boolean, pending: boolean }}
 */
export function getLocalIdentity() {
  const kr = keyring.load();
  const name = kr.activeName || getActiveName();
  if (!name) return { name: null, hasKey: false, pending: false };
  const acct = keyring.getAccount(name);
  return {
    name,
    hasKey: Boolean(acct?.privHex),
    pending: Boolean(acct?.pending),
  };
}

/**
 * Logged in for product UX: local key + (registered OR pending registration).
 * @param {string} [apiBase]
 */
export async function isLoggedIn(apiBase) {
  const id = getLocalIdentity();
  if (!id.name || !id.hasKey) return false;
  if (id.pending) return true;
  if (!apiBase) return true;
  try {
    return await accountExists(apiBase, id.name);
  } catch {
    return true;
  }
}

/**
 * Sync chrome session name from keyring.
 * @param {string | null} name
 */
export function activateAccount(name) {
  if (name) {
    keyring.setActive(name);
    setActiveName(name);
  } else {
    keyring.setActive(null);
    setActiveName(null);
  }
  document.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

/**
 * Redirect to login/register when a page requires an authenticated user.
 * @param {{ apiBase?: string, next?: string }} [opts]
 * @returns {Promise<boolean>} true if allowed to proceed
 */
export async function requireLogin(opts = {}) {
  const ok = await isLoggedIn(opts.apiBase);
  if (ok) return true;
  const next = opts.next || `${location.pathname}${location.search}${location.hash}`;
  const q = new URLSearchParams({ next });
  location.href = `${LOGIN_HREF}?${q.toString()}`;
  return false;
}

/** Keep chrome in sync when keyring changes. */
export function bindAuthChrome() {
  const sync = () => {
    const id = getLocalIdentity();
    if (id.name) setActiveName(id.name);
    document.dispatchEvent(new CustomEvent(AUTH_EVENT));
  };
  document.addEventListener(KEYRING_EVENT, sync);
  document.addEventListener(SESSION_EVENT, () => {
    document.dispatchEvent(new CustomEvent(AUTH_EVENT));
  });
}
