/**
 * Header profile menu — switch accounts, register, import (spec 14).
 */

import {
  activateAccount,
  LOGIN_HREF,
  REGISTER_HREF,
  SETTINGS_HREF,
} from "./auth.js";
import { pubkeyHex, fromHex } from "./crypto.js";
import { keyring } from "./keyring.js";
import {
  bindExportKeySections,
  parseKeyImport,
  renderProfileExportPanel,
} from "./key-export.js";
import { escapeHtml } from "./rpc.js";
import { initialsForName, WALLET_HREF } from "./wallet-session.js";

/**
 * @param {HTMLElement} menu
 * @param {{ onClose?: () => void }} [opts]
 */
export function bindProfileMenu(menu, opts = {}) {
  const close = () => {
    menu.hidden = true;
    const trigger = menu.closest("[data-header-profile]")?.querySelector("[data-profile-trigger]");
    if (trigger instanceof HTMLElement) trigger.setAttribute("aria-expanded", "false");
    opts.onClose?.();
  };

  menu.addEventListener("click", async (ev) => {
    const target = ev.target;
    if (!(target instanceof Element)) return;

    const switchBtn = target.closest("[data-profile-switch]");
    if (switchBtn instanceof HTMLElement) {
      ev.preventDefault();
      const name = switchBtn.getAttribute("data-profile-switch");
      if (!name) return;
      const passEl = menu.querySelector("[data-profile-pass]");
      const pass =
        passEl instanceof HTMLInputElement ? passEl.value : "";
      try {
        if (!keyring.isUnlocked()) {
          if (!pass) throw new Error("Enter your passphrase first");
          await keyring.unlock(pass);
        }
        if (!keyring.getPriv(name)) {
          throw new Error("Wrong passphrase or no key for this name");
        }
        activateAccount(name);
        close();
        location.href = `${WALLET_HREF}#/account/${encodeURIComponent(name)}`;
      } catch (err) {
        showMenuError(menu, /** @type {Error} */ (err).message);
      }
      return;
    }

    if (target.closest("[data-profile-lock]")) {
      ev.preventDefault();
      keyring.lock();
      close();
      document.dispatchEvent(new CustomEvent("guld:auth"));
      return;
    }

    if (target.closest("[data-profile-toggle-import]")) {
      ev.preventDefault();
      const panel = menu.querySelector("[data-profile-import]");
      const exportPanel = menu.querySelector("[data-profile-export]");
      if (exportPanel instanceof HTMLElement) exportPanel.hidden = true;
      if (panel instanceof HTMLElement) panel.hidden = !panel.hidden;
      return;
    }

    if (target.closest("[data-profile-toggle-export]")) {
      ev.preventDefault();
      const panel = menu.querySelector("[data-profile-export]");
      const importPanel = menu.querySelector("[data-profile-import]");
      if (importPanel instanceof HTMLElement) importPanel.hidden = true;
      if (panel instanceof HTMLElement) panel.hidden = !panel.hidden;
      return;
    }
  });

  menu.addEventListener("submit", async (ev) => {
    const form = ev.target;
    if (!(form instanceof HTMLFormElement) || !form.matches("[data-profile-import-form]")) return;
    ev.preventDefault();
    const fd = new FormData(form);
    const pass = String(fd.get("pass") || "");
    const nameInput = String(fd.get("name") || "").trim();
    const privRaw = String(fd.get("priv") || "").trim();
    const parsed = parseKeyImport(privRaw);
    const name = (nameInput || parsed.name || "").trim().toLowerCase();
    const privHex = parsed.privHex;
    if (!name) throw new Error("Name required");
    try {
      if (!pass) throw new Error("Passphrase required");
      const pubHex = await pubkeyHex(fromHex(privHex));
      if (!keyring.isUnlocked()) await keyring.unlock(pass);
      await keyring.upsertAccount({ name, privHex, pubHex, pending: false });
      activateAccount(name);
      close();
      location.href = `${WALLET_HREF}#/account/${encodeURIComponent(name)}`;
    } catch (err) {
      showMenuError(menu, /** @type {Error} */ (err).message);
    }
  });
}

/**
 * @param {HTMLElement} menu
 * @param {string} msg
 */
function showMenuError(menu, msg) {
  let el = menu.querySelector("[data-profile-error]");
  if (!(el instanceof HTMLElement)) {
    el = document.createElement("p");
    el.className = "site-header__profile-error";
    el.dataset.profileError = "";
    menu.prepend(el);
  }
  el.textContent = msg;
  el.hidden = false;
}

/**
 * @param {HTMLElement} menu
 */
export function renderProfileMenu(menu) {
  const kr = keyring.load();
  const active = kr.activeName || kr.accounts[0]?.name || null;
  const unlocked = keyring.isUnlocked();
  const parts = [];

  if (kr.accounts.length) {
    parts.push(
      `<p class="site-header__profile-heading">${active ? escapeHtml(active) : "Accounts"}</p>`,
    );
    if (!unlocked) {
      parts.push(`
        <label class="site-header__profile-field">
          <span class="site-header__profile-label">Passphrase</span>
          <input type="password" data-profile-pass autocomplete="current-password" placeholder="Unlock to switch" />
        </label>`);
    }
    parts.push('<ul class="site-header__profile-list" role="none">');
    for (const acct of kr.accounts) {
      const isActive = acct.name === active;
      const meta = acct.pending ? "pending" : "saved key";
      parts.push(`
        <li>
          <button type="button" class="site-header__profile-item${isActive ? " is-active" : ""}"
            data-profile-switch="${escapeHtml(acct.name)}" role="menuitem">
            <span class="site-header__profile-item-name">${escapeHtml(acct.name)}</span>
            <span class="site-header__profile-item-meta">${escapeHtml(meta)}${isActive ? " · active" : ""}</span>
          </button>
        </li>`);
    }
    parts.push("</ul>");
  } else {
    parts.push('<p class="site-header__profile-heading">No keys on this device</p>');
  }

  parts.push('<div class="site-header__profile-actions" role="none">');
  parts.push(
    `<a class="site-header__profile-link" href="${REGISTER_HREF}" role="menuitem">Register new name</a>`,
  );
  parts.push(
    `<button type="button" class="site-header__profile-link site-header__profile-link--btn" data-profile-toggle-import role="menuitem">Import key</button>`,
  );
  if (active && keyring.hasStoredKey(active)) {
    parts.push(
      `<button type="button" class="site-header__profile-link site-header__profile-link--btn" data-profile-toggle-export role="menuitem">Export key</button>`,
    );
  }
  if (active) {
    parts.push(
      `<a class="site-header__profile-link" href="${WALLET_HREF}#/account/${encodeURIComponent(active)}" role="menuitem">Open wallet</a>`,
    );
  }
  parts.push(
    `<a class="site-header__profile-link" href="${SETTINGS_HREF}" role="menuitem">Settings</a>`,
  );
  if (kr.accounts.length && unlocked) {
    parts.push(
      `<button type="button" class="site-header__profile-link site-header__profile-link--btn" data-profile-lock role="menuitem">Lock keys</button>`,
    );
  }
  if (!kr.accounts.length) {
    parts.push(
      `<a class="site-header__profile-link" href="${LOGIN_HREF}" role="menuitem">Log in</a>`,
    );
  }
  parts.push("</div>");

  parts.push(`
    <div class="site-header__profile-import" data-profile-import hidden>
      <form class="site-header__profile-import-form" data-profile-import-form>
        <label class="site-header__profile-field">
          <span class="site-header__profile-label">Passphrase</span>
          <input name="pass" type="password" autocomplete="new-password" required />
        </label>
        <label class="site-header__profile-field">
          <span class="site-header__profile-label">Name</span>
          <input name="name" type="text" spellcheck="false" required />
        </label>
        <label class="site-header__profile-field">
          <span class="site-header__profile-label">Private key (hex or guld1key:…)</span>
          <input name="priv" type="password" spellcheck="false" autocomplete="off" required />
        </label>
        <button type="submit" class="site-header__profile-submit">Import</button>
      </form>
    </div>`);

  if (active && keyring.hasStoredKey(active)) {
    parts.push(renderProfileExportPanel(active));
  }

  menu.innerHTML = parts.join("");
  menu.querySelector("[data-profile-error]")?.remove();
  bindExportKeySections(menu);
}

/**
 * @param {HTMLElement} trigger
 */
export function renderProfileTrigger(trigger) {
  const kr = keyring.load();
  const active = kr.activeName || kr.accounts[0]?.name || null;
  const hasStored = kr.accounts.length > 0;
  trigger.replaceChildren();

  if (active && hasStored) {
    trigger.dataset.state = keyring.isUnlocked() ? "signed-in" : "locked";
    trigger.setAttribute("aria-label", `Account menu · ${active}`);
    const initials = document.createElement("span");
    initials.className = "site-header__avatar site-header__avatar--initials";
    initials.textContent = initialsForName(active);
    initials.setAttribute("aria-hidden", "true");
    trigger.append(initials);
    return;
  }

  trigger.dataset.state = "signed-out";
  trigger.setAttribute("aria-label", "Account menu");
  trigger.insertAdjacentHTML(
    "beforeend",
    `<svg class="site-header__account-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-4.418 0-8 2.239-8 5v1h16v-1c0-2.761-3.582-5-8-5z"/>
    </svg>`,
  );
}
