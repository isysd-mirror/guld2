import { renderMarkdownDoc } from "../lib/doc-render.js";

/**
 * Markdown document host. Set attribute `src` to a same-origin path
 * (e.g. `/docs/HOSTING.md`). Re-renders when `src` changes.
 */
export class GuldMdDoc extends HTMLElement {
  /** @type {AbortController | null} */
  #abort = null;
  /** @type {string} */
  #renderedSrc = "";

  static get observedAttributes() {
    return ["src"];
  }

  connectedCallback() {
    this.#load();
  }

  disconnectedCallback() {
    this.#abort?.abort();
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (name === "src" && oldVal !== newVal && this.isConnected) this.#load();
  }

  async #load() {
    const src = (this.getAttribute("src") || "").trim();
    if (!src || src === this.#renderedSrc) return;
    this.#abort?.abort();
    this.#abort = new AbortController();
    const signal = this.#abort.signal;
    this.#renderedSrc = src;
    try {
      await renderMarkdownDoc(this, src, { signal });
      if (signal.aborted) return;
    } catch (err) {
      if (signal.aborted) return;
      console.warn("guld-md-doc:", err);
    }
  }
}

if (!customElements.get("guld-md-doc")) {
  customElements.define("guld-md-doc", GuldMdDoc);
}
