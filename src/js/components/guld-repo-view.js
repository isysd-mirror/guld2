import { apiUrl } from "../lib/api.js";
import { publicItems } from "../lib/catalog.js";
import { isMarkdownPath, renderRepoMarkdown } from "../lib/repo-markdown.js";

/**
 * GitHub-like repo browser: README, clone URL, tree/blob navigation.
 * Routes: /software/<id>/ | /software/<id>/tree/<ref>/… | /software/<id>/blob/<ref>/…
 */
export class GuldRepoView extends HTMLElement {
  /** @type {AbortController | null} */
  #abort = null;

  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = "true";
    this.setAttribute("role", "region");
    this.setAttribute("aria-label", "Repository");
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
   * @returns {{ name: string, mode: "home" | "tree" | "blob", ref: string, path: string } | null}
   */
  #parse() {
    const parts = globalThis.location.pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (parts[0] !== "software" || !parts[1] || parts[1] === "_view") return null;
    const name = parts[1];
    if (parts[2] === "tree" || parts[2] === "blob") {
      const mode = parts[2];
      const ref = parts[3] || "";
      const path = parts.slice(4).join("/");
      if (!ref) return { name, mode: "home", ref: "", path: "" };
      return { name, mode, ref, path };
    }
    return { name, mode: "home", ref: "", path: "" };
  }

  async #route() {
    this.#abort?.abort();
    this.#abort = new AbortController();
    const signal = this.#abort.signal;
    const parsed = this.#parse();
    this.replaceChildren();
    const status = document.createElement("p");
    status.className = "catalog__status";
    status.textContent = "Loading…";
    this.append(status);

    if (!parsed) {
      status.textContent = "Repository not found.";
      return;
    }

    try {
      const fetchImpl = this.fetchImpl || globalThis.fetch;
      const [metaRes, catalogRes] = await Promise.all([
        fetchImpl(apiUrl(`/api/v1/repos/${encodeURIComponent(parsed.name)}`), {
          headers: { Accept: "application/json" },
          signal,
        }),
        fetchImpl("/data/software.json", {
          headers: { Accept: "application/json" },
          signal,
        }),
      ]);
      if (!metaRes.ok) throw new Error(`HTTP ${metaRes.status}`);
      const meta = await metaRes.json();
      let shelf = null;
      if (catalogRes.ok) {
        const catalog = await catalogRes.json();
        shelf = publicItems(catalog).find((row) => row.id === parsed.name) || null;
      }
      const ref = parsed.ref || meta.default_branch || "main";
      if (parsed.mode === "blob") {
        await this.#renderBlob(meta, shelf, ref, parsed.path, fetchImpl, signal);
      } else if (parsed.mode === "tree") {
        await this.#renderTree(meta, shelf, ref, parsed.path, fetchImpl, signal);
      } else {
        await this.#renderHome(meta, shelf, ref, fetchImpl, signal);
      }
    } catch (err) {
      if (signal.aborted) return;
      status.textContent = "Could not open this repository.";
      console.warn("guld-repo-view:", err);
    }
  }

  /** @param {Record<string, unknown>} meta @param {Record<string, unknown> | null} shelf @param {string} ref */
  #header(meta, shelf, ref) {
    const head = document.createElement("header");
    head.className = "repo-head";

    const kicker = document.createElement("p");
    kicker.className = "kicker";
    const shelfLink = document.createElement("a");
    shelfLink.href = "/software/";
    shelfLink.textContent = "Software";
    kicker.append(shelfLink, document.createTextNode(" / "));
    const nameLink = document.createElement("a");
    nameLink.href = `/software/${meta.name}/`;
    nameLink.textContent = String(meta.name);
    kicker.append(nameLink);
    head.append(kicker);

    const title = document.createElement("h1");
    title.textContent = String(shelf?.title || meta.name);
    head.append(title);

    const summary = document.createElement("p");
    summary.className = "repo-head__summary";
    summary.textContent = String(shelf?.summary || meta.head?.subject || "");
    head.append(summary);

    const clone = document.createElement("div");
    clone.className = "repo-clone";
    const label = document.createElement("span");
    label.className = "repo-clone__label";
    label.textContent = "Clone";
    const code = document.createElement("code");
    code.textContent = String(meta.clone_url || "");
    const copy = document.createElement("button");
    copy.type = "button";
    copy.className = "repo-clone__copy";
    copy.textContent = "Copy";
    copy.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(String(meta.clone_url || ""));
        copy.textContent = "Copied";
        setTimeout(() => {
          copy.textContent = "Copy";
        }, 1500);
      } catch {
        copy.textContent = "Failed";
      }
    });
    clone.append(label, code, copy);
    head.append(clone);

    const metaLine = document.createElement("p");
    metaLine.className = "repo-head__meta";
    const branch = document.createElement("span");
    branch.textContent = `Branch ${ref}`;
    metaLine.append(branch);
    if (meta.head?.short_sha) {
      metaLine.append(document.createTextNode(" · "));
      const sha = document.createElement("span");
      sha.textContent = String(meta.head.short_sha);
      metaLine.append(sha);
    }
    if (meta.head?.subject) {
      metaLine.append(document.createTextNode(" · "));
      const subj = document.createElement("span");
      subj.textContent = String(meta.head.subject);
      metaLine.append(subj);
    }
    head.append(metaLine);
    return head;
  }

  /** @param {string} name @param {string} ref @param {string} path @param {"tree" | "blob"} mode */
  #crumbs(name, ref, path, mode) {
    const nav = document.createElement("nav");
    nav.className = "repo-crumbs";
    nav.setAttribute("aria-label", "Path");
    const root = document.createElement("a");
    root.href = `/software/${name}/`;
    root.textContent = String(name);
    root.addEventListener("click", (ev) => this.#navigate(root.href, ev));
    nav.append(root);
    const parts = path ? path.split("/").filter(Boolean) : [];
    let accum = "";
    parts.forEach((part, i) => {
      nav.append(document.createTextNode(" / "));
      accum = accum ? `${accum}/${part}` : part;
      const isLast = i === parts.length - 1;
      if (isLast && mode === "blob") {
        const span = document.createElement("span");
        span.textContent = part;
        nav.append(span);
      } else {
        const a = document.createElement("a");
        a.href = `/software/${name}/tree/${encodeURIComponent(ref)}/${accum}`;
        a.textContent = part;
        a.addEventListener("click", (ev) => this.#navigate(a.href, ev));
        nav.append(a);
      }
    });
    return nav;
  }

  /** @param {string} href @param {MouseEvent} event */
  #navigate(href, event) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    globalThis.history.pushState({}, "", href);
    this.#route();
  }

  /** @param {HTMLElement} body @param {Record<string, unknown>} meta @param {Record<string, unknown> | null} shelf */
  #renderReadmeFallback(body, meta, shelf) {
    const summary = String(shelf?.summary || meta.description || "").trim();
    if (summary) {
      const p = document.createElement("p");
      p.textContent = summary;
      body.append(p);
    } else {
      body.textContent = "No README in this repository yet.";
    }
    const note = document.createElement("p");
    note.className = "repo-readme__fallback";
    const docs = document.createElement("a");
    docs.href = "/docs/PACKAGES.md";
    docs.textContent = "Package catalog";
    const specs = document.createElement("a");
    specs.href = "/docs/specs/README.md";
    specs.textContent = "protocol specs";
    note.append("More context in the ", docs, " and ", specs, ".");
    body.append(note);
  }

  async #renderHome(meta, shelf, ref, fetchImpl, signal) {
    const wrap = document.createElement("div");
    wrap.className = "repo-view";
    wrap.append(this.#header(meta, shelf, ref));

    const filesLink = document.createElement("p");
    filesLink.className = "repo-actions";
    const a = document.createElement("a");
    a.href = `/software/${meta.name}/tree/${encodeURIComponent(ref)}/`;
    a.textContent = "Browse files";
    a.addEventListener("click", (ev) => this.#navigate(a.href, ev));
    filesLink.append(a);
    wrap.append(filesLink);

    const readmeBox = document.createElement("section");
    readmeBox.className = "repo-readme";
    const readmeTitle = document.createElement("h2");
    readmeTitle.textContent = "README";
    readmeBox.append(readmeTitle);
    const body = document.createElement("div");
    body.className = "prose repo-readme__body";
    body.textContent = "Loading README…";
    readmeBox.append(body);
    wrap.append(readmeBox);

    this.replaceChildren(wrap);

    const res = await fetchImpl(
      apiUrl(
        `/api/v1/repos/${encodeURIComponent(String(meta.name))}/readme?ref=${encodeURIComponent(ref)}`,
      ),
      { headers: { Accept: "application/json" }, signal },
    );
    if (signal.aborted) return;
    if (res.status === 404) {
      this.#renderReadmeFallback(body, meta, shelf);
      return;
    }
    if (!res.ok) {
      body.textContent = "Could not load README.";
      return;
    }
    const data = await res.json();
    const pathLabel = document.createElement("p");
    pathLabel.className = "repo-readme__path";
    pathLabel.textContent = String(data.path || "README");
    readmeBox.insertBefore(pathLabel, body);
    body.innerHTML = renderRepoMarkdown(String(data.content || ""), {
      repo: String(meta.name),
      ref,
      filePath: String(data.path || "README.md"),
    });
  }

  async #renderTree(meta, shelf, ref, path, fetchImpl, signal) {
    const wrap = document.createElement("div");
    wrap.className = "repo-view";
    wrap.append(this.#header(meta, shelf, ref));
    wrap.append(this.#crumbs(String(meta.name), ref, path, "tree"));

    const list = document.createElement("ul");
    list.className = "repo-tree";
    const status = document.createElement("p");
    status.className = "catalog__status";
    status.textContent = "Loading…";
    wrap.append(status);
    this.replaceChildren(wrap);

    const qs = new URLSearchParams({ ref, path });
    const res = await fetchImpl(
      apiUrl(`/api/v1/repos/${encodeURIComponent(String(meta.name))}/tree?${qs}`),
      { headers: { Accept: "application/json" }, signal },
    );
    if (signal.aborted) return;
    if (!res.ok) {
      status.textContent = "Could not list files.";
      return;
    }
    const data = await res.json();
    status.remove();
    for (const entry of data.entries || []) {
      const li = document.createElement("li");
      li.className = entry.type === "tree" ? "repo-tree__dir" : "repo-tree__file";
      const link = document.createElement("a");
      const href =
        entry.type === "tree"
          ? `/software/${meta.name}/tree/${encodeURIComponent(ref)}/${entry.path}`
          : `/software/${meta.name}/blob/${encodeURIComponent(ref)}/${entry.path}`;
      link.href = href;
      link.textContent = entry.name;
      link.addEventListener("click", (ev) => this.#navigate(href, ev));
      li.append(link);
      if (entry.type === "blob" && entry.size != null) {
        const size = document.createElement("span");
        size.className = "repo-tree__size";
        size.textContent = formatSize(entry.size);
        li.append(size);
      }
      list.append(li);
    }
    wrap.append(list);
  }

  async #renderBlob(meta, shelf, ref, path, fetchImpl, signal) {
    const wrap = document.createElement("div");
    wrap.className = "repo-view";
    wrap.append(this.#header(meta, shelf, ref));
    wrap.append(this.#crumbs(String(meta.name), ref, path, "blob"));

    const status = document.createElement("p");
    status.className = "catalog__status";
    status.textContent = "Loading…";
    wrap.append(status);
    this.replaceChildren(wrap);

    const qs = new URLSearchParams({ ref, path });
    const res = await fetchImpl(
      apiUrl(`/api/v1/repos/${encodeURIComponent(String(meta.name))}/blob?${qs}`),
      { headers: { Accept: "application/json" }, signal },
    );
    if (signal.aborted) return;
    if (!res.ok) {
      status.textContent = "Could not open file.";
      return;
    }
    const data = await res.json();
    status.remove();
    const pathStr = String(path || "");
    const text = String(data.content || "");
    if (data.binary || data.truncated) {
      const pre = document.createElement("pre");
      pre.className = "repo-blob";
      pre.textContent = data.truncated
        ? `File too large to display (${formatSize(data.size)}).`
        : `Binary file (${formatSize(data.size)}).`;
      wrap.append(pre);
    } else if (isMarkdownPath(pathStr)) {
      const article = document.createElement("article");
      article.className = "prose repo-readme__body";
      article.innerHTML = renderRepoMarkdown(text, {
        repo: String(meta.name),
        ref,
        filePath: pathStr,
      });
      wrap.append(article);
    } else {
      const pre = document.createElement("pre");
      pre.className = "repo-blob";
      pre.textContent = text;
      wrap.append(pre);
    }
  }
}

/** @param {number} n */
function formatSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

if (!customElements.get("guld-repo-view")) {
  customElements.define("guld-repo-view", GuldRepoView);
}
