/** Wallet hash routes (spec 14). Single account page — no tab chrome. */

/**
 * @param {string} name
 */
export function walletAccountHref(name) {
  const n = encodeURIComponent(name.trim().toLowerCase());
  return `/wallet/#/account/${n}`;
}

/**
 * @param {string | undefined} hash
 * @returns {string | null} account name, or null
 */
export function walletNameFromHash(hash) {
  const raw = (hash || "").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] !== "account" || !parts[1]) return null;
  try {
    return decodeURIComponent(parts[1]).trim().toLowerCase();
  } catch {
    return null;
  }
}
