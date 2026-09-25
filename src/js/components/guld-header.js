import { HEADER_NAV, isNavActive } from "../lib/site-nav.js";
import { AUTH_EVENT, GATEWAY_HREF, SETTINGS_HREF } from "../lib/auth.js";
import {
  GATEWAY_SETTINGS_EVENT,
  isGatewayConfigured,
  loadGatewaySettings,
} from "../lib/gateway-settings.js";
import {
  bindProfileMenu,
  renderProfileMenu,
  renderProfileTrigger,
} from "../lib/profile-menu.js";
import {
  ACTIVE_NAME_KEY,
  getActiveName,
  SESSION_EVENT,
} from "../lib/wallet-session.js";
import { startGatewayPaymentWatcher } from "../lib/gateway-watcher.js";
import { KEYRING_EVENT } from "../lib/keyring.js";

const template = document.createElement("template");
template.innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <aside class="site-banner" role="status" aria-label="Network status">
    <p>
      <strong>Guld 2.0 is in beta.</strong>
      This site shows <strong>Simba testnet</strong> data — not mainnet.
    </p>
  </aside>
  <header class="site-header">
    <a class="site-header__brand" href="/" aria-label="Guld home">
      <img src="/assets/logo.svg" width="120" height="40" alt="Guld" />
    </a>
    <div class="site-header__actions">
      <nav class="site-nav" aria-label="Primary">
        <ul class="site-nav__list"></ul>
      </nav>
      <div class="site-header__profile" data-header-profile>
        <button type="button" class="site-header__account" data-profile-trigger
          aria-haspopup="menu" aria-expanded="false" aria-controls="profile-menu"></button>
        <div id="profile-menu" class="site-header__profile-menu" role="menu" hidden></div>
      </div>
    </div>
  </header>
`;

export class GuldHeader extends HTMLElement {
  connectedCallback() {
    if (this.dataset.ready) return;
    this.dataset.ready = "true";
    this.append(template.content.cloneNode(true));

    const variant = this.getAttribute("variant") || "solid";
    const header = this.querySelector(".site-header");
    if (header instanceof HTMLElement && variant === "overlay") {
      header.classList.add("site-header--overlay");
    } else if (header instanceof HTMLElement) {
      header.classList.add("site-header--solid");
    }

    const list = /** @type {HTMLUListElement} */ (this.querySelector(".site-nav__list"));
    const profileWrap = /** @type {HTMLElement} */ (this.querySelector("[data-header-profile]"));
    const trigger = /** @type {HTMLButtonElement} */ (
      this.querySelector("[data-profile-trigger]")
    );
    const menu = /** @type {HTMLElement} */ (this.querySelector(".site-header__profile-menu"));

    /** @type {(() => void) | null} */
    let onDocClick = null;

    const closeMenu = () => {
      menu.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      if (onDocClick) {
        document.removeEventListener("click", onDocClick);
        onDocClick = null;
      }
    };

    bindProfileMenu(menu, { onClose: closeMenu });

    const renderNav = () => {
      const pathname = globalThis.location?.pathname ?? "/";
      const hash = globalThis.location?.hash ?? "";
      list.replaceChildren();

      /** @type {{ href: string, label: string }[]} */
      const items = [...HEADER_NAV];
      if (isGatewayConfigured(loadGatewaySettings())) {
        items.splice(1, 0, { href: GATEWAY_HREF, label: "Gateway" });
      }
      items.push({ href: SETTINGS_HREF, label: "Settings" });

      for (const item of items) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = item.href;
        a.textContent = item.label;
        if (isNavActive(item.href, pathname, hash)) a.setAttribute("aria-current", "page");
        li.append(a);
        list.append(li);
      }
    };

    const refreshProfile = () => {
      renderProfileTrigger(trigger);
      renderProfileMenu(menu);
      if (!menu.hidden) closeMenu();
    };

    trigger.addEventListener("click", (ev) => {
      ev.stopPropagation();
      const open = menu.hidden;
      if (open) {
        renderProfileMenu(menu);
        menu.hidden = false;
        trigger.setAttribute("aria-expanded", "true");
        onDocClick = (e) => {
          if (!profileWrap.contains(/** @type {Node} */ (e.target))) closeMenu();
        };
        setTimeout(() => document.addEventListener("click", onDocClick), 0);
      } else {
        closeMenu();
      }
    });

    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && !menu.hidden) closeMenu();
    });

    const refresh = () => {
      renderNav();
      refreshProfile();
      startGatewayPaymentWatcher();
    };

    refresh();

    document.addEventListener(SESSION_EVENT, refresh);
    document.addEventListener(AUTH_EVENT, refresh);
    document.addEventListener(KEYRING_EVENT, refresh);
    document.addEventListener(GATEWAY_SETTINGS_EVENT, refresh);
    if (typeof globalThis.addEventListener === "function") {
      globalThis.addEventListener("storage", (event) => {
        if (
          event.key === ACTIVE_NAME_KEY ||
          event.key === "guld.keyring.v1" ||
          event.key === "guld.gatewaySettings.v1"
        ) {
          refresh();
        }
      });
    }
  }
}

if (!customElements.get("guld-header")) {
  customElements.define("guld-header", GuldHeader);
}
