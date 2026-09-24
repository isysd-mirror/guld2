import { HEADER_NAV, isNavActive } from "../lib/site-nav.js";
import {
  AUTH_EVENT,
  GATEWAY_HREF,
  getLocalIdentity,
  LOGIN_HREF,
  REGISTER_HREF,
  SETTINGS_HREF,
} from "../lib/auth.js";
import {
  GATEWAY_SETTINGS_EVENT,
  isGatewayConfigured,
  loadGatewaySettings,
} from "../lib/gateway-settings.js";
import {
  ACTIVE_NAME_KEY,
  getActiveName,
  initialsForName,
  SESSION_EVENT,
  WALLET_HREF,
} from "../lib/wallet-session.js";
import { startGatewayPaymentWatcher } from "../lib/gateway-watcher.js";

const PERSON_ICON = `
  <svg class="site-header__account-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"/>
  </svg>
`;

const template = document.createElement("template");
template.innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="site-header__brand" href="/" aria-label="Guld home">
      <img src="/assets/logo.svg" width="120" height="40" alt="Guld" />
    </a>
    <div class="site-header__actions">
      <nav class="site-nav" aria-label="Primary">
        <ul class="site-nav__list"></ul>
      </nav>
      <div class="site-header__auth" data-header-auth></div>
      <a class="site-header__account" href="${WALLET_HREF}" aria-label="Open wallet"></a>
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
    const authEl = /** @type {HTMLElement} */ (this.querySelector("[data-header-auth]"));
    const account = /** @type {HTMLAnchorElement | null} */ (
      this.querySelector(".site-header__account")
    );

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

    const refreshAuth = () => {
      const id = getLocalIdentity();
      const name = id.name || getActiveName();
      authEl.replaceChildren();

      if (!id.hasKey) {
        const login = document.createElement("a");
        login.className = "site-header__cta site-header__cta--ghost";
        login.href = LOGIN_HREF;
        login.textContent = "Log in";
        const signup = document.createElement("a");
        signup.className = "site-header__cta site-header__cta--primary";
        signup.href = REGISTER_HREF;
        signup.textContent = "Sign up";
        authEl.append(login, signup);
      }

      if (!account) return;
      account.replaceChildren();
      if (name && id.hasKey) {
        account.href = `${WALLET_HREF}#/account/${encodeURIComponent(name)}`;
        account.dataset.state = "signed-in";
        account.setAttribute("aria-label", `Wallet · ${name}`);
        const initials = document.createElement("span");
        initials.className = "site-header__avatar site-header__avatar--initials";
        initials.textContent = initialsForName(name);
        initials.setAttribute("aria-hidden", "true");
        account.append(initials);
        return;
      }
      account.href = LOGIN_HREF;
      account.dataset.state = "signed-out";
      account.setAttribute("aria-label", "Log in");
      account.insertAdjacentHTML("beforeend", PERSON_ICON);
    };

    const refresh = () => {
      renderNav();
      refreshAuth();
      startGatewayPaymentWatcher();
    };

    refresh();

    document.addEventListener(SESSION_EVENT, refresh);
    document.addEventListener(AUTH_EVENT, refresh);
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
