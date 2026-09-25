import { FOOTER_NAV } from "../lib/site-nav.js";

const template = document.createElement("template");
template.innerHTML = `
  <footer class="site-footer">
    <div class="site-footer__brand">
      <img src="/assets/guld.svg" width="28" height="28" alt="" />
      <p class="site-footer__legal">Guld 2.0 beta · Simba testnet</p>
    </div>
    <nav class="site-footer__nav" aria-label="Documents">
      <ul class="site-footer__list"></ul>
    </nav>
  </footer>
`;

export class GuldFooter extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = "true";
    this.append(template.content.cloneNode(true));
    const list = /** @type {HTMLUListElement} */ (this.querySelector(".site-footer__list"));
    for (const item of FOOTER_NAV) {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = item.href;
      a.textContent = item.label;
      li.append(a);
      list.append(li);
    }
    const year = document.createElement("li");
    year.className = "site-footer__year";
    year.textContent = String(new Date().getFullYear());
    list.append(year);
  }
}

if (!customElements.get("guld-footer")) {
  customElements.define("guld-footer", GuldFooter);
}
