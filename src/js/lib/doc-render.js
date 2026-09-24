import { renderXyCharts } from "./xychart.js";
import { renderMermaidDiagrams } from "./mermaid-render.js";

/**
 * Render a Markdown document into a host element (GFM via marked).
 * Mermaid fences: `xychart-beta` → custom SVG; other diagrams → Mermaid.
 * @param {HTMLElement} host
 * @param {string} src
 * @param {{ titleFallback?: string }} [opts]
 */
export async function renderMarkdownDoc(host, src, opts = {}) {
  host.replaceChildren();
  const status = document.createElement("p");
  status.className = "doc-status";
  status.textContent = "Loading…";
  host.append(status);

  try {
    const res = await fetch(src, { headers: { Accept: "text/markdown, text/plain" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const md = await res.text();
    const { marked } = await import("/vendor/marked/marked.esm.js");
    marked.setOptions({ gfm: true, breaks: false });
    const html = marked.parse(md);
    const article = document.createElement("article");
    article.className = "doc-prose";
    article.innerHTML = html;
    polishDoc(article);
    renderXyCharts(article);
    await renderMermaidDiagrams(article);
    host.replaceChildren(article);
    const h1 = article.querySelector("h1");
    if (h1 && document.title && opts.titleFallback !== false) {
      document.title = `${h1.textContent.trim()} — Guld`;
    }
    buildToc(article);
  } catch (err) {
    status.textContent = "Could not load this document.";
    console.warn("doc-render:", err);
  }
}

/** @param {HTMLElement} article */
function polishDoc(article) {
  article.querySelectorAll("a[href]").forEach((a) => {
    const href = a.getAttribute("href") || "";
    if (href.startsWith("http")) {
      a.setAttribute("rel", "noopener noreferrer");
      a.setAttribute("target", "_blank");
    } else if (href.endsWith(".md")) {
      const base = href.replace(/^\.\//, "").replace(/^\.\.\//, "");
      if (base.includes("whitepaper/") || /guld-2\.0/.test(base)) {
        a.setAttribute("href", "/whitepaper/");
      } else if (base.startsWith("specs/") || base.includes("/specs/")) {
        const name = base.replace(/^.*specs\//, "").replace(/\.md$/, "");
        a.setAttribute("href", `/specs/?doc=${encodeURIComponent(name)}`);
      } else if (!base.includes("/")) {
        // same-folder spec link
        a.setAttribute("href", `/specs/?doc=${encodeURIComponent(base.replace(/\.md$/, ""))}`);
      }
    }
  });
  article.querySelectorAll("img[src]").forEach((img) => {
    const src = img.getAttribute("src") || "";
    if (/^(?:\.\/)?figures\//.test(src)) {
      img.setAttribute("src", `/docs/whitepaper/${src.replace(/^\.\//, "")}`);
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
