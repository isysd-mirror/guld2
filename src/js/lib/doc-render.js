import { renderXyCharts } from "./xychart.js";
import { renderMermaidDiagrams } from "./mermaid-render.js";
import { curatedDocHref, resolveMarkdownLink } from "./doc-paths.js";

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
    const md = await res.text();
    if (opts.signal?.aborted) return;
    const { marked } = await import("/vendor/marked/marked.esm.js");
    marked.setOptions({ gfm: true, breaks: false });
    const html = marked.parse(md);
    const article = document.createElement("article");
    article.className = "doc-prose";
    article.innerHTML = html;
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
    const id =
      heading.id ||
      heading.textContent
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    heading.id = id;
    const li = document.createElement("li");
    li.className = heading.tagName === "H3" ? "doc-toc__item doc-toc__item--sub" : "doc-toc__item";
    const a = document.createElement("a");
    a.href = `#${id}`;
    a.textContent = heading.textContent.trim();
    li.append(a);
    list.append(li);
  }
  nav.append(title, list);
  slot.replaceChildren(nav);
  slot.hidden = false;
}
