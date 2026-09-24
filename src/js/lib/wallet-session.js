/** Browser wallet session hint for chrome (profile icon). Keys stay local later. */

export const ACTIVE_NAME_KEY = "guld.activeName";
export const WALLET_HREF = "/wallet/";
export const SESSION_EVENT = "guld:session";

/**
 * @returns {string | null}
 */
export function getActiveName() {
  try {
    const name = localStorage.getItem(ACTIVE_NAME_KEY);
    if (!name) return null;
    const trimmed = name.trim().toLowerCase();
    return trimmed || null;
  } catch {
    return null;
  }
}

/**
 * @param {string | null | undefined} name
 */
export function setActiveName(name) {
  try {
    if (!name || !String(name).trim()) {
      localStorage.removeItem(ACTIVE_NAME_KEY);
    } else {
      localStorage.setItem(ACTIVE_NAME_KEY, String(name).trim().toLowerCase());
    }
  } catch {
    /* ignore quota / private mode */
  }
  document.dispatchEvent(new CustomEvent(SESSION_EVENT));
}

/**
 * @param {string} name
 * @returns {string}
 */
export function initialsForName(name) {
  const clean = name.replace(/[^a-z0-9]/gi, "");
  if (clean.length >= 2) return clean.slice(0, 2).toUpperCase();
  if (clean.length === 1) return `${clean}·`.toUpperCase();
  return "?";
}
