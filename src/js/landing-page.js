import { renderMarkdownDoc } from "./lib/doc-render.js";

/** Mount the chain comparison table on the landing page (/#compare). */
export function mountLandingComparison() {
  const host = document.querySelector("[data-chain-comparison]");
  if (!(host instanceof HTMLElement)) return;
  void renderMarkdownDoc(host, "/docs/fragments/chain-comparison.md", {
    titleFallback: false,
  });
}
