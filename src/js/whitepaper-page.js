import { registerServiceWorker } from "./register-sw.js";
import { renderMarkdownDoc } from "./lib/doc-render.js";

registerServiceWorker();

const host = document.querySelector("[data-doc-host]");
if (host instanceof HTMLElement) {
  renderMarkdownDoc(host, "/docs/whitepaper/guld-2.0-draft.md");
}
