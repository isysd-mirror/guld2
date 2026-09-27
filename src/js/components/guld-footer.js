import { FOOTER_NAV } from "../lib/site-nav.js";
import {
  currencyTicker,
  loadNetworkInfo,
  matchNetworkOption,
  NETWORK_OPTIONS,
  selectNetwork,
} from "../lib/network.js";

const template = document.createElement("template");
template.innerHTML = `
  <footer class="site-footer">
    <div class="site-footer__brand">
      <img src="/assets/guld.svg" width="28" height="28" alt="" />
      <div class="site-footer__network" data-footer-network>
        <label class="site-footer__network-label">
          <span class="visually-hidden">Network</span>
          <select class="site-footer__network-select" data-network-select aria-label="Network">
            <option value="">Connecting…</option>
          </select>
        </label>
        <span class="site-footer__network-meta" data-network-meta></span>
      </div>
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

    const select = /** @type {HTMLSelectElement} */ (this.querySelector("[data-network-select]"));
    const meta = /** @type {HTMLElement} */ (this.querySelector("[data-network-meta]"));

    select.addEventListener("change", () => {
      const id = select.value;
      if (!id) return;
      selectNetwork(id);
    });

    void loadNetworkInfo().then((info) => {
      const matched = matchNetworkOption(info);
      const ticker = currencyTicker(info);
      select.replaceChildren();

      for (const opt of NETWORK_OPTIONS) {
        const option = document.createElement("option");
        option.value = opt.id;
        option.textContent = `${opt.label} · chain ${opt.chainId}`;
        option.disabled = !opt.available;
        if (!opt.available) {
          option.textContent += " (soon)";
        }
        if (matched ? matched.id === opt.id : opt.chainId === info.chainId) {
          option.selected = true;
        }
        select.append(option);
      }

      // Peer reports an unknown network — show it as a read-only extra option.
      if (!matched && info.network) {
        const option = document.createElement("option");
        option.value = info.network;
        option.textContent = `${info.network} · chain ${info.chainId}`;
        option.selected = true;
        select.prepend(option);
      }

      const availableCount = NETWORK_OPTIONS.filter((o) => o.available).length;
      select.disabled = availableCount <= 1 && Boolean(matched);

      meta.dataset.mode = info.mode;
      meta.textContent =
        info.mode === "mainnet" ? ticker : `${info.mode} · ${ticker}`;

      document.querySelectorAll("[data-currency]").forEach((el) => {
        el.textContent = ticker;
      });
    });
  }
}

if (!customElements.get("guld-footer")) {
  customElements.define("guld-footer", GuldFooter);
}
