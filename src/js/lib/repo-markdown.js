import { marked } from "../../../vendor/marked/marked.esm.js";

/** @typedef {{ repo: string, ref: string, filePath?: string, origin?: string }} RepoMarkdownContext */

/**
 * @param {string} repo
 * @param {string} path
 * @param {string} [ref]
 * @param {string} [origin]
 */
export function softwareBlobUrl(repo, path, ref = "main", origin = "") {
  const clean = normalizeRepoPath(String(path || "").replace(/^\/+/, ""));
  const base = (origin || globalThis.location?.origin || "").replace(/\/+$/, "");
  return `${base}/software/${encodeURIComponent(repo)}/blob/${encodeURIComponent(ref)}/${clean}`;
}

/**
 * @param {string} repo
 * @param {string} [path]
 * @param {string} [ref]
 * @param {string} [origin]
 */
export function softwareTreeUrl(repo, path = "", ref = "main", origin = "") {
  const clean = normalizeRepoPath(String(path || "").replace(/^\/+/, ""));
  const base = (origin || globalThis.location?.origin || "").replace(/\/+$/, "");
  const suffix = clean ? `/${clean}` : "/";
  return `${base}/software/${encodeURIComponent(repo)}/tree/${encodeURIComponent(ref)}${suffix}`;
}

/**
 * @param {string} path
 */
export function normalizeRepoPath(path) {
  /** @type {string[]} */
  const parts = [];
  for (const part of String(path).split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join("/");
}

/**
 * @param {string} baseDir
 * @param {string} href
 */
export function joinRepoPath(baseDir, href) {
  const raw = String(href || "").trim();
  if (!raw || raw.startsWith("#")) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/software/")) return raw;
  if (raw.startsWith("/")) return normalizeRepoPath(raw.slice(1));
  const base = baseDir ? normalizeRepoPath(baseDir) : "";
  return normalizeRepoPath(base ? `${base}/${raw}` : raw);
}

/**
 * @param {string} href
 * @param {RepoMarkdownContext} ctx
 */
export function resolveRepoMarkdownHref(href, ctx) {
  const raw = String(href || "").trim();
  if (!raw || raw.startsWith("#")) return raw;
  if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/") && !raw.startsWith("/software/")) {
    const origin = ctx.origin || globalThis.location?.origin || "";
    const repoPath = normalizeRepoPath(raw.slice(1));
    const target =
      repoPath.endsWith("/") || (!repoPath.includes(".") && !repoPath.endsWith(".git"))
        ? softwareTreeUrl(ctx.repo, repoPath.replace(/\/+$/, ""), ctx.ref, origin)
        : softwareBlobUrl(ctx.repo, repoPath, ctx.ref, origin);
    return target;
  }
  if (raw.startsWith("/software/")) {
    const origin = (ctx.origin || globalThis.location?.origin || "").replace(/\/+$/, "");
    return raw.startsWith("http") ? raw : `${origin}${raw}`;
  }

  const baseDir = ctx.filePath ? dirnamePosix(ctx.filePath) : "";
  const repoPath = joinRepoPath(baseDir, raw);
  const origin = ctx.origin || globalThis.location?.origin || "";
  if (raw.endsWith("/") || (!repoPath.includes(".") && !raw.includes("://"))) {
    return softwareTreeUrl(ctx.repo, repoPath.replace(/\/+$/, ""), ctx.ref, origin);
  }
  return softwareBlobUrl(ctx.repo, repoPath, ctx.ref, origin);
}

/** @param {string} path */
function dirnamePosix(path) {
  const norm = normalizeRepoPath(path);
  const idx = norm.lastIndexOf("/");
  return idx === -1 ? "" : norm.slice(0, idx);
}

/**
 * @param {string} markdown
 * @param {RepoMarkdownContext} ctx
 */
export function renderRepoMarkdown(markdown, ctx) {
  const origin = ctx.origin || globalThis.location?.origin || "";
  const context = { ...ctx, origin };

  const renderer = new marked.Renderer();
  renderer.link = ({ href, title, text }) => {
    const resolved = resolveRepoMarkdownHref(href || "", context);
    const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : "";
    const external =
      /^https?:\/\//i.test(resolved) &&
      !resolved.startsWith(origin.replace(/\/+$/, ""));
    const rel = external ? ' rel="noopener noreferrer"' : "";
    const target = external ? ' target="_blank"' : "";
    return `<a href="${escapeHtmlAttr(resolved)}"${titleAttr}${rel}${target}>${text}</a>`;
  };
  renderer.image = ({ href, title, text }) => {
    const resolved = resolveRepoMarkdownHref(href || "", context);
    const titleAttr = title ? ` title="${escapeHtmlAttr(title)}"` : "";
    const alt = escapeHtmlAttr(text || "");
    return `<img src="${escapeHtmlAttr(resolved)}" alt="${alt}"${titleAttr} loading="lazy" />`;
  };

  return marked.parse(String(markdown || ""), { async: false, renderer });
}

/** @param {string} value */
function escapeHtmlAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

/** @param {string} path */
export function isMarkdownPath(path) {
  const lower = String(path || "").toLowerCase();
  return lower.endsWith(".md") || lower.endsWith(".markdown");
}
