import { HEADER_NAV, isNavActive } from "../lib/site-nav.js";
import { AUTH_EVENT, GATEWAY_HREF, getLocalIdentity, REGISTER_HREF } from "../lib/auth.js";
import { walletAccountHref } from "../lib/wallet-nav.js";
import { keyring } from "../lib/keyring.js";
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
import { bannerText, loadNetworkInfo } from "../lib/network.js";

const template = document.createElement("template");
template.innerHTML = `
  <a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header">
    <a class="site-header__brand" href="/" aria-label="Guld home">
      <img src="/assets/logo.svg" width="120" height="40" alt="Guld" />
    </a>
    <div class="site-header__actions">
      <button type="button" class="site-header__toggle" data-menu-toggle
        aria-expanded="false" aria-controls="site-menu" aria-label="Menu">
        <span></span><span></span>
      </button>
      <div class="site-header__menu" id="site-menu" data-menu>
        <img class="site-header__menu-mark" src="/assets/shield.svg" width="64" height="80" alt="" aria-hidden="true" />
        <nav class="site-nav" aria-label="Primary">
          <ul class="site-nav__list"></ul>
        </nav>
        <a class="site-header__login" href="/login/" data-header-login hidden>Log in</a>
        <p class="site-header__menu-net" data-menu-net aria-hidden="true"></p>
        <a class="site-header__register" data-header-register hidden>Register</a>
      </div>
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

    // Banner sits in page flow *before* the header so the page sheet can overlap it.
    const banner = document.createElement("aside");
    banner.className = "site-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-label", "Network status");
    banner.dataset.siteBanner = "";
    banner.innerHTML = `<p>Connecting…</p>`;
    this.before(banner);
    // Banner is sticky behind the sticky header: when the banner is taller (wrapped
    // on phones), pin it higher so the header still covers it completely.
    // --banner-h sizes the dark well behind the banner (see layout.css).
    if (header instanceof HTMLElement && "ResizeObserver" in window) {
      const syncStick = () => {
        document.body.style.setProperty("--banner-h", `${banner.offsetHeight}px`);
        if (variant === "overlay") return;
        const overflow = banner.offsetHeight - header.offsetHeight;
        banner.style.setProperty("--banner-stick", `${-Math.max(0, overflow)}px`);
      };
      new ResizeObserver(syncStick).observe(banner);
      new ResizeObserver(syncStick).observe(header);
    }
    void loadNetworkInfo().then((info) => {
      const { html } = bannerText(info);
      banner.innerHTML = `<p>${html}</p>`;
      banner.dataset.mode = info.mode;
      // Quiet echo of the network banner inside the mobile drawer.
      const net = this.querySelector("[data-menu-net]");
      if (net instanceof HTMLElement) {
        net.innerHTML = html;
        net.dataset.mode = info.mode;
      }
    });

    const list = /** @type {HTMLUListElement} */ (this.querySelector(".site-nav__list"));
    const registerLink = /** @type {HTMLAnchorElement} */ (
      this.querySelector("[data-header-register]")
    );
    const loginLink = /** @type {HTMLAnchorElement} */ (this.querySelector("[data-header-login]"));
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

    // Collapsed site menu (hamburger) below the lg breakpoint — see layout.css.
    const toggle = /** @type {HTMLButtonElement} */ (this.querySelector("[data-menu-toggle]"));
    const siteMenu = /** @type {HTMLElement} */ (this.querySelector("[data-menu]"));
    const setMenu = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        // Vertical center of the X, so the drawer's shield sits on the same row.
        const r = toggle.getBoundingClientRect();
        siteMenu.style.setProperty("--menu-row-y", `${r.top + r.height / 2}px`);
      }
      siteMenu.toggleAttribute("data-open", open);
      document.documentElement.classList.toggle("is-menu-open", open);
    };
    toggle.addEventListener("click", (ev) => {
      ev.stopPropagation();
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("click", (ev) => {
      if (!siteMenu.contains(/** @type {Node} */ (ev.target))) setMenu(false);
    });
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        toggle.focus();
      }
    });
    siteMenu.addEventListener("click", (ev) => {
      if (/** @type {Element} */ (ev.target).closest("a")) setMenu(false);
    });
    matchMedia("(min-width: 64.01rem)").addEventListener("change", () => setMenu(false));

    const renderNav = () => {
      const pathname = globalThis.location?.pathname ?? "/";
      const hash = globalThis.location?.hash ?? "";
      list.replaceChildren();

      /** @type {{ href: string, label: string }[]} */
      const items = [];
      const id = getLocalIdentity();
      if (id.hasKey && id.name) {
        items.push({ href: walletAccountHref(id.name), label: "Wallet" });
      }
      items.push(...HEADER_NAV);
      items.push({ href: "/#install", label: "Run a node" });
      if (isGatewayConfigured(loadGatewaySettings())) {
        const explorerIdx = items.findIndex((i) => i.href === "/explorer/");
        const gateway = { href: GATEWAY_HREF, label: "Gateway" };
        if (explorerIdx >= 0) items.splice(explorerIdx, 0, gateway);
        else items.push(gateway);
      }

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
      const loggedIn = getLocalIdentity().hasKey;
      registerLink.hidden = loggedIn;
      loginLink.hidden = loggedIn;
      profileWrap.hidden = !loggedIn;
      if (loggedIn) {
        renderProfileTrigger(trigger);
        renderProfileMenu(menu);
        if (!menu.hidden) closeMenu();
      } else {
        registerLink.href = REGISTER_HREF;
        closeMenu();
      }
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
    globalThis.addEventListener("hashchange", refresh);
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
