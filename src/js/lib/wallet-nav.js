/** Wallet hash routes and header tab links (spec 14). */

/** @typedef {"send" | "receive" | "history" | "advanced"} WalletTabId */

/** @type {{ id: WalletTabId, label: string }[]} */
export const WALLET_TABS = [
  { id: "send", label: "Send" },
  { id: "receive", label: "Receive" },
  { id: "history", label: "History" },
  { id: "advanced", label: "Advanced" },
];

/** @type {WalletTabId[]} */
export const WALLET_TAB_IDS = WALLET_TABS.map((t) => t.id);

/**
 * @param {string} name
 * @param {WalletTabId} [tab]
 */
export function walletAccountHref(name, tab = "send") {
  const n = encodeURIComponent(name.trim().toLowerCase());
  return `/wallet/#/account/${n}/${tab}`;
}

/**
 * @param {string | undefined} hash
 * @returns {WalletTabId | null}
 */
export function walletTabFromHash(hash) {
  const raw = (hash || "").replace(/^#/, "");
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] !== "account" || !parts[1]) return null;
  const tab = parts[2];
  return WALLET_TAB_IDS.includes(/** @type {WalletTabId} */ (tab)) ? /** @type {WalletTabId} */ (tab) : null;
}
