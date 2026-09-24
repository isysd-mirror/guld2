/**
 * Paths and URLs for the docs browser (`/docs/?doc=` / `?src=`).
 */

/**
 * @param {string} path
 * @returns {boolean}
 */
export function isSafeDocsRelPath(path) {
  if (!path || path.includes("\0")) return false;
  const norm = path.replace(/^\/+/, "").replace(/\\/g, "/");
  if (!norm || norm.startsWith("/") || norm.includes("://")) return false;
  if (norm.split("/").some((p) => p === ".." || p === "")) return false;
  return /\.md$/i.test(norm);
}

/**
 * Allowlisted absolute fetch URLs for the viewer.
 * @param {string} src
 * @returns {boolean}
 */
export function isAllowedDocFetch(src) {
  if (!src || src.includes("\0") || src.includes("://")) return false;
  const path = src.startsWith("/") ? src : `/${src}`;
  if (path === "/README.md") return true;
  if (!path.startsWith("/docs/")) return false;
  return isSafeDocsRelPath(path.slice("/docs/".length));
}

/**
 * Viewer href for a path under /docs/.
 * @param {string} relPath e.g. HOSTING.md or specs/00-overview.md
 */
export function docsViewerHref(relPath) {
  return `/docs/?doc=${encodeURIComponent(relPath.replace(/^\/+/, ""))}`;
}

/**
 * Viewer href for an allowlisted absolute fetch path.
 * @param {string} fetchPath e.g. /README.md
 */
export function docsSrcHref(fetchPath) {
  const path = fetchPath.startsWith("/") ? fetchPath : `/${fetchPath}`;
  return `/docs/?src=${encodeURIComponent(path)}`;
}

/**
 * Resolve a markdown href (possibly relative) against the fetching doc URL.
 * @param {string} href
 * @param {string} [fromFetch] absolute path of the current doc, e.g. /docs/specs/00-overview.md
 * @returns {{ fetch: string, viewer: string } | null}
 */
export function resolveMarkdownLink(href, fromFetch = "/docs/") {
  if (!href || href.startsWith("#") || href.startsWith("mailto:")) return null;
  if (href.startsWith("http://") || href.startsWith("https://")) return null;
  if (!/\.md(?:#.*)?$/i.test(href)) return null;

  const hashIdx = href.indexOf("#");
  const pathPart = hashIdx >= 0 ? href.slice(0, hashIdx) : href;
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : "";

  let fetchPath;
  if (pathPart.startsWith("/")) {
    fetchPath = pathPart;
  } else {
    const baseDir = fromFetch.replace(/\/[^/]*$/, "/");
    const joined = new URL(pathPart, `https://guld.io${baseDir}`).pathname;
    fetchPath = joined;
  }

  if (fetchPath === "/README.md") {
    return { fetch: fetchPath, viewer: docsSrcHref(fetchPath) + hash };
  }
  if (fetchPath.startsWith("/docs/") && isAllowedDocFetch(fetchPath)) {
    const rel = fetchPath.slice("/docs/".length);
    return { fetch: fetchPath, viewer: docsViewerHref(rel) + hash };
  }
  return null;
}

/**
 * Prefer curated product URLs when they exist.
 * @param {string} fetchPath
 * @returns {string | null}
 */
export function curatedDocHref(fetchPath) {
  if (/\/docs\/whitepaper\//.test(fetchPath) || /guld-2\.0-draft\.md$/i.test(fetchPath)) {
    return "/whitepaper/";
  }
  const spec = fetchPath.match(/\/docs\/specs\/([^/]+)\.md$/i);
  if (spec) {
    const id = spec[1];
    if (id.toLowerCase() === "readme") return "/specs/";
    return `/specs/?doc=${encodeURIComponent(id)}`;
  }
  if (/\/docs\/help\/paymento\.md$/i.test(fetchPath)) return "/help/paymento/";
  return null;
}
