import {
  curatedDocHref,
  docsSrcHref,
  docsViewerHref,
  isAllowedDocFetch,
  isSafeDocsRelPath,
} from "../lib/doc-paths.js";
import "./guld-md-doc.js";

/**
 * Docs browser: file tree + markdown viewer.
 * Routes: /docs/ | /docs/?doc=HOSTING.md | /docs/?src=/README.md
 */
export class GuldDocView extends HTMLElement {
  /** @type {AbortController | null} */
  #abort = null;
  /** @type {unknown} */
  #manifest = null;

  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = "true";
    this.setAttribute("role", "region");
    this.setAttribute("aria-label", "Documentation");
    this.#route();
    globalThis.addEventListener("popstate", this.#onPop);
  }

  disconnectedCallback() {
    globalThis.removeEventListener("popstate", this.#onPop);
    this.#abort?.abort();
  }

  #onPop = () => {
    this.#route();
  };

  /**
   * @returns {{ kind: "landing" } | { kind: "doc", fetch: string, rel: string } | { kind: "src", fetch: string } | { kind: "error", message: string }}
   */
  #parse() {
    const params = new URLSearchParams(globalThis.location.search);
    const src = (params.get("src") || "").trim();
    const doc = (params.get("doc") || "").trim().replace(/^\/+/, "");

    if (src) {
      const path = src.startsWith("/") ? src : `/${src}`;
      if (!isAllowedDocFetch(path)) {
        return { kind: "error", message: "That document path is not allowed." };
      }
      return { kind: "src", fetch: path };
    }
    if (doc) {
      if (!isSafeDocsRelPath(doc)) {
        return { kind: "error", message: "Unknown or unsafe document path." };
      }
      return { kind: "doc", fetch: `/docs/${doc}`, rel: doc };
    }
    return { kind: "landing" };
  }

  async #route() {
    this.#abort?.abort();
    this.#abort = new AbortController();
    const signal = this.#abort.signal;
    const parsed = this.#parse();

    this.replaceChildren();
    const layout = document.createElement("div");
    layout.className = "doc-browser";

    const treeAside = document.createElement("aside");
    treeAside.className = "doc-browser__tree";
    treeAside.setAttribute("aria-label", "Document tree");

    const main = document.createElement("div");
    main.className = "doc-browser__main";

    const tocSlot = document.createElement("aside");
    tocSlot.className = "doc-aside doc-browser__toc";
    tocSlot.setAttribute("data-doc-toc", "");
    tocSlot.hidden = true;

    const host = document.createElement("div");
    host.className = "doc-browser__host";

    main.append(tocSlot, host);
    layout.append(treeAside, main);
    this.append(layout);

    try {
      const manifest = await this.#loadManifest(signal);
      if (signal.aborted) return;
      this.#renderTree(treeAside, manifest, parsed);

      if (parsed.kind === "error") {
        host.textContent = parsed.message;
        return;
      }
      if (parsed.kind === "landing") {
        this.#renderLanding(host);
        return;
      }

      const md = document.createElement("guld-md-doc");
      md.setAttribute("src", parsed.fetch);
      host.append(md);
    } catch (err) {
      if (signal.aborted) return;
      host.textContent = "Could not load the docs browser.";
      console.warn("guld-doc-view:", err);
    }
  }

  /** @param {AbortSignal} signal */
  async #loadManifest(signal) {
    if (this.#manifest) return this.#manifest;
    const fetchImpl = this.fetchImpl || globalThis.fetch;
    const res = await fetchImpl("/data/docs-tree.json", {
      headers: { Accept: "application/json" },
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    this.#manifest = await res.json();
    return this.#manifest;
  }

  /** @param {HTMLElement} host */
  #renderLanding(host) {
    const section = document.createElement("section");
    section.className = "section";
    section.style.paddingLeft = "0";
    section.style.paddingRight = "0";

    const h1 = document.createElement("h1");
    h1.textContent = "Docs";
    const p = document.createElement("p");
    p.textContent =
      "Operator and protocol documents for Guld 2.0. Pick a file from the tree, or open a featured entry below.";
    const list = document.createElement("ul");
    list.className = "spec-list";

    /** @type {Array<{ href: string, title: string, blurb: string }>} */
    const featured = [
      { href: docsViewerHref("HOSTING.md"), title: "Hosting", blurb: "Node-first peers, remotes, nginx" },
      { href: docsViewerHref("REPO_LAYOUT.md"), title: "Repo layout", blurb: "Umbrella, submodules, bares" },
      { href: docsViewerHref("PACKAGES.md"), title: "Packages", blurb: "Crate and package catalog notes" },
      { href: "/whitepaper/", title: "Whitepaper", blurb: "Design draft (curated page)" },
      { href: "/specs/", title: "Specs", blurb: "Normative drafts index" },
      { href: docsSrcHref("/README.md"), title: "README", blurb: "Repository root readme" },
    ];
    for (const item of featured) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.title;
      a.addEventListener("click", (e) => this.#navigate(item.href, e));
      const span = document.createElement("span");
      span.textContent = item.blurb;
      a.append(span);
      li.append(a);
      list.append(li);
    }
    section.append(h1, p, list);
    host.append(section);
  }

  /**
   * @param {HTMLElement} aside
   * @param {{ extras?: Array<{ name: string, fetch: string, label?: string }>, tree?: unknown[] }} manifest
   * @param {ReturnType<GuldDocView["#parse"]>} parsed
   */
  #renderTree(aside, manifest, parsed) {
    const nav = document.createElement("nav");
    nav.className = "doc-tree";
    nav.setAttribute("aria-label", "Files");

    const title = document.createElement("p");
    title.className = "doc-tree__title";
    const rootLink = document.createElement("a");
    rootLink.href = "/docs/";
    rootLink.textContent = "Docs";
    rootLink.addEventListener("click", (e) => this.#navigate("/docs/", e));
    title.append(rootLink);
    nav.append(title);

    const activeFetch =
      parsed.kind === "doc" || parsed.kind === "src" ? parsed.fetch : "";

    if (Array.isArray(manifest.extras) && manifest.extras.length) {
      const extras = document.createElement("ul");
      extras.className = "doc-tree__list";
      for (const extra of manifest.extras) {
        const fetch = String(extra.fetch || "");
        if (!isAllowedDocFetch(fetch)) continue;
        const li = document.createElement("li");
        li.className = "doc-tree__file";
        const a = document.createElement("a");
        a.href = docsSrcHref(fetch);
        a.textContent = extra.label || extra.name || fetch;
        if (fetch === activeFetch) a.setAttribute("aria-current", "page");
        a.addEventListener("click", (e) => this.#navigate(a.href, e));
        li.append(a);
        extras.append(li);
      }
      nav.append(extras);
    }

    const list = document.createElement("ul");
    list.className = "doc-tree__list";
    for (const node of manifest.tree || []) {
      list.append(this.#treeNode(node, activeFetch));
    }
    nav.append(list);
    aside.replaceChildren(nav);
  }

  /**
   * @param {{ name?: string, path?: string, children?: unknown[] }} node
   * @param {string} activeFetch
   * @returns {HTMLLIElement}
   */
  #treeNode(node, activeFetch) {
    const li = document.createElement("li");
    if (Array.isArray(node.children) && node.children.length) {
      li.className = "doc-tree__dir";
      const details = document.createElement("details");
      details.open = this.#subtreeHasFetch(node, activeFetch);

      const summary = document.createElement("summary");
      summary.textContent = node.name || "folder";
      const inner = document.createElement("ul");
      inner.className = "doc-tree__list";
      for (const child of node.children) {
        inner.append(this.#treeNode(/** @type {{ name?: string, path?: string, children?: unknown[] }} */ (child), activeFetch));
      }
      details.append(summary, inner);
      li.append(details);
      return li;
    }

    li.className = "doc-tree__file";
    const rel = String(node.path || "");
    const a = document.createElement("a");
    a.href = docsViewerHref(rel);
    a.textContent = node.name || rel;
    const fetch = `/docs/${rel}`;
    if (fetch === activeFetch) a.setAttribute("aria-current", "page");
    a.addEventListener("click", (e) => this.#navigate(a.href, e));
    li.append(a);
    return li;
  }

  /**
   * @param {unknown} node
   * @param {string} activeFetch
   */
  #subtreeHasFetch(node, activeFetch) {
    if (!activeFetch || !node || typeof node !== "object") return false;
    const n = /** @type {{ path?: string, children?: unknown[] }} */ (node);
    if (n.path && `/docs/${n.path}` === activeFetch) return true;
    return (n.children || []).some((c) => this.#subtreeHasFetch(c, activeFetch));
  }

  /** @param {string} href @param {MouseEvent} event */
  #navigate(href, event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const url = new URL(href, globalThis.location.origin);
    globalThis.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    this.#route();
  }
}

if (!customElements.get("guld-doc-view")) {
  customElements.define("guld-doc-view", GuldDocView);
}
