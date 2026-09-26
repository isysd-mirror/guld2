import { renderXyCharts } from "./xychart.js";
import { renderMermaidDiagrams } from "./mermaid-render.js";
import { curatedDocHref, resolveMarkdownLink } from "./doc-paths.js";

/** Stable in-page anchor id (must match marked heading targets in docs viewer). */
export function slugifyHeading(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** @param {ParentNode} article */
export function applyHeadingIds(article) {
  for (const heading of article.querySelectorAll("h2, h3, h4")) {
    heading.id = slugifyHeading(heading.textContent);
  }
}

/**
 * Scroll to a `#fragment` after dynamic markdown render.
 * @param {string} [hash]
 * @param {{ behavior?: ScrollBehavior }} [opts]
 * @returns {boolean}
 */
export function scrollToDocHash(hash, opts = {}) {
  const raw = (hash || "").replace(/^#/, "").trim();
  if (!raw) return false;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  const el = document.getElementById(id);
  if (!(el instanceof HTMLElement)) return false;
  el.scrollIntoView({ behavior: opts.behavior ?? "instant", block: "start" });
  return true;
}

const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Parse simple `key: value` YAML (GIP front matter only — no nesting).
 * @param {string} yaml
 */
export function parseSimpleYaml(yaml) {
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of yaml.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf(":");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    fields[key] = value;
  }
  return fields;
}

/**
 * Split GIP-style YAML front matter from markdown body.
 * @param {string} md
 * @returns {{ body: string, meta: Record<string, string> | null }}
 */
export function splitFrontMatter(md) {
  if (!md.startsWith("---")) return { body: md, meta: null };
  const match = md.match(FRONT_MATTER_RE);
  if (!match) return { body: md, meta: null };
  const meta = parseSimpleYaml(match[1]);
  if (!("gip" in meta)) return { body: md, meta: null };
  return { body: match[2], meta };
}

/**
 * @param {Record<string, string>} meta
 * @param {string} src fetch path of the hosting doc
 */
function buildGipFrontMatter(meta, src) {
  const wrap = document.createElement("div");
  wrap.className = "doc-frontmatter";

  const h1 = document.createElement("h1");
  const gipNo = meta.gip || "";
  const title = meta.title || "Untitled";
  h1.textContent = /^\d+$/.test(gipNo) ? `GIP-${gipNo}: ${title}` : title;

  wrap.append(h1);

  if (meta.description) {
    const desc = document.createElement("p");
    desc.className = "doc-frontmatter__desc";
    desc.textContent = meta.description;
    wrap.append(desc);
  }

  /** @type {Array<[string, string | null, boolean?]>} */
  const rows = [
    ["Status", meta.status || null],
    ["Type", meta.type || null],
    ["Category", meta.category || null],
    ["Created", meta.created || null],
    ["Author", meta.author || null],
    ["Requires", meta.requires || null],
  ].filter((row) => row[1]);

  const discuss = meta["discussions-to"];
  if (discuss) rows.push(["Discuss", discuss, true]);

  if (rows.length) {
    const dl = document.createElement("dl");
    dl.className = "doc-frontmatter__meta";
    for (const [label, value, isLink] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      if (isLink && value) {
        const a = document.createElement("a");
        if (/^https?:\/\//i.test(value)) {
          a.href = value;
          a.textContent = value.replace(/^https?:\/\//, "");
          a.rel = "noopener noreferrer";
          a.target = "_blank";
        } else if (/\.md(?:#.*)?$/i.test(value)) {
          const resolved = resolveMarkdownLink(value, src);
          a.href = resolved?.viewer || value;
          a.textContent = value.split("/").pop() || value;
        } else {
          a.href = value;
          a.textContent = value;
        }
        dd.append(a);
      } else {
        dd.textContent = value || "";
      }
      dl.append(dt, dd);
    }
    wrap.append(dl);
  }

  return wrap;
}

/** @param {HTMLAnchorElement} anchor */
function wireInPageHashLink(anchor) {
  const href = anchor.getAttribute("href") || "";
  if (!href.startsWith("#") || href.length < 2) return;
  anchor.addEventListener("click", (event) => {
    event.preventDefault();
    if (!scrollToDocHash(href)) return;
    const url = new URL(globalThis.location.href);
    url.hash = href;
    globalThis.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  });
}

/**
 * Render a Markdown document into a host element (GFM via marked).
 * Mermaid fences: `xychart-beta` → custom SVG; other diagrams → Mermaid.
 * @param {HTMLElement} host
 * @param {string} src absolute same-origin path (e.g. /docs/HOSTING.md)
 * @param {{ titleFallback?: string | false, signal?: AbortSignal }} [opts]
 */
export async function renderMarkdownDoc(host, src, opts = {}) {
  host.replaceChildren();
  const status = document.createElement("p");
  status.className = "doc-status";
  status.textContent = "Loading…";
  host.append(status);

  try {
    const res = await fetch(src, {
      headers: { Accept: "text/markdown, text/plain" },
      signal: opts.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.text();
    if (opts.signal?.aborted) return;
    const { body, meta } = splitFrontMatter(raw);
    const { marked } = await import("/vendor/marked/marked.esm.js");
    marked.setOptions({ gfm: true, breaks: false });
    const html = marked.parse(body);
    const article = document.createElement("article");
    article.className = "doc-prose";
    if (meta) {
      article.append(buildGipFrontMatter(meta, src));
    }
    const bodyEl = document.createElement("div");
    bodyEl.className = "doc-prose__body";
    bodyEl.innerHTML = html;
    article.append(bodyEl);
    applyHeadingIds(article);
    polishDoc(article, { src });
    renderXyCharts(article);
    await renderMermaidDiagrams(article);
    if (opts.signal?.aborted) return;
    host.replaceChildren(article);
    const h1 = article.querySelector("h1");
    if (h1 && document.title && opts.titleFallback !== false) {
      document.title = `${h1.textContent.trim()} — Guld`;
    }
    buildToc(article);
    requestAnimationFrame(() => {
      scrollToDocHash(globalThis.location.hash);
    });
  } catch (err) {
    if (opts.signal?.aborted || (err && /** @type {{ name?: string }} */ (err).name === "AbortError")) {
      return;
    }
    status.textContent = "Could not load this document.";
    console.warn("doc-render:", err);
  }
}

/**
 * @param {HTMLElement} article
 * @param {{ src?: string }} [ctx]
 */
function polishDoc(article, ctx = {}) {
  const fromFetch = ctx.src || "/docs/";
  article.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("#")) {
      wireInPageHashLink(/** @type {HTMLAnchorElement} */ (a));
      return;
    }
    if (href.startsWith("http")) {
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("target", "_blank");
      return;
    }
    if (!/\.md(?:#.*)?$/i.test(href)) return;

    const resolved = resolveMarkdownLink(href, fromFetch);
    if (!resolved) return;
    const curated = curatedDocHref(resolved.fetch);
    a.setAttribute("href", curated || resolved.viewer);
  });
  article.querySelectorAll("img[src]").forEach((img) => {
    const imgSrc = img.getAttribute("src") || "";
    if (/^(?:\.\/)?figures\//.test(imgSrc)) {
      img.setAttribute("src", `/docs/whitepaper/${imgSrc.replace(/^\.\//, "")}`);
      img.setAttribute("loading", "lazy");
      img.classList.add("doc-figure");
    }
  });
  article.querySelectorAll("pre").forEach((pre) => {
    if (pre.querySelector("code.language-mermaid")) return;
    pre.classList.add("doc-pre");
  });
  article.querySelectorAll("table").forEach((table) => {
    const wrap = document.createElement("div");
    wrap.className = "doc-table-wrap";
    table.replaceWith(wrap);
    wrap.append(table);
  });
}

/** @param {HTMLElement} article */
function buildToc(article) {
  const slot = document.querySelector("[data-doc-toc]");
  if (!slot) return;
  const headings = [...article.querySelectorAll("h2, h3")];
  if (!headings.length) {
    slot.hidden = true;
    return;
  }
  const nav = document.createElement("nav");
  nav.className = "doc-toc";
  nav.setAttribute("aria-label", "On this page");
  const title = document.createElement("p");
  title.className = "doc-toc__title";
  title.textContent = "On this page";
  const list = document.createElement("ol");
  list.className = "doc-toc__list";
  for (const heading of headings) {
    const id = slugifyHeading(heading.textContent);
    heading.id = id;
    const li = document.createElement("li");
    li.className = heading.tagName === "H3" ? "doc-toc__item doc-toc__item--sub" : "doc-toc__item";
    const a = document.createElement("a");
    a.href = `#${id}`;
    a.textContent = heading.textContent.trim();
    wireInPageHashLink(a);
    li.append(a);
    list.append(li);
  }
  nav.append(title, list);
  slot.replaceChildren(nav);
  slot.hidden = false;
}
