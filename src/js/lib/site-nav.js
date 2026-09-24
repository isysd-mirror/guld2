/** @typedef {{ href: string, label: string }} NavItem */

/** Primary product — header only (static items; auth/gateway injected at runtime). */
export const HEADER_NAV = [
  { href: "/wallet/", label: "Wallet" },
  { href: "/explorer/", label: "Explorer" },
];

/** Docs / meta — footer only. */
export const FOOTER_NAV = [
  { href: "/#install", label: "Install" },
  { href: "/claim/", label: "Legacy claim" },
  { href: "/whitepaper/", label: "Whitepaper" },
  { href: "/specs/", label: "Specs" },
  { href: "/help/", label: "Help" },
  { href: "/software/", label: "Software" },
  { href: "/docs/", label: "Docs" },
];

/**
 * @param {string | undefined} pathname
 * @returns {string}
 */
export function normalizePath(pathname) {
  if (!pathname || pathname === "/index.html") return "/";
  let path = pathname;
  if (path.endsWith("/index.html")) path = path.slice(0, -"index.html".length);
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path || "/";
}

/**
 * @param {string} href
 * @param {string | undefined} pathname
 * @param {string} [hash]
 * @returns {boolean}
 */
export function isNavActive(href, pathname, hash = "") {
  const current = normalizePath(pathname);
  let url;
  try {
    url = new URL(href, "https://guld.io");
  } catch {
    return false;
  }
  const itemPath = normalizePath(url.pathname);
  const itemHash = url.hash || "";

  if (itemHash) {
    return current === itemPath && (hash === itemHash || hash === itemHash.slice(1));
  }
  if (itemPath === "/") return current === "/";
  return current === itemPath || current.startsWith(`${itemPath}/`);
}
