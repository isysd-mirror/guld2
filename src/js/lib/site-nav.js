import { whitepaperDocHref } from "./doc-paths.js";

/** @typedef {{ href: string, label: string, external?: boolean }} NavItem */

/** Community Discord (informal; not required for mesh membership). */
export const DISCORD_INVITE_URL = "https://discord.gg/PMCEGjGCQ";

/** Primary product — header only (Wallet + Explorer; gateway injected at runtime). */
export const HEADER_NAV = [{ href: "/explorer/", label: "Explorer" }];

/** Docs / meta — footer only. */
export const FOOTER_NAV = [
  { href: "/#developers", label: "Build" },
  { href: "/#operators", label: "Install" },
  { href: DISCORD_INVITE_URL, label: "Discord", external: true },
  { href: "/claim/", label: "Legacy claim" },
  { href: whitepaperDocHref(), label: "Whitepaper" },
  { href: "/specs/", label: "Specs" },
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
  if (/^https?:\/\//i.test(href)) return false;
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
