import "./chrome.js";
import { renderMarkdownDoc } from "./lib/doc-render.js";

const host = document.querySelector("[data-doc-host]");
if (host instanceof HTMLElement) {
  renderMarkdownDoc(host, "/docs/whitepaper/guld-2.0-draft.md");
}
