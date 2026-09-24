/**
 * Private key export / import payloads (spec 14 — key backup).
 */

import { keyring } from "./keyring.js";
import { qrSvgDataUrl } from "./qr.js";
import { escapeHtml } from "./rpc.js";

export const KEY_EXPORT_PREFIX = "guld1key:";

/**
 * @param {string} name
 * @param {string} privHex
 */
export function buildKeyExportPayload(name, privHex) {
  return `${KEY_EXPORT_PREFIX}${JSON.stringify({ name: name.trim().toLowerCase(), priv: privHex })}`;
}

/**
 * Parse pasted export text, QR payload, or raw hex.
 * @param {string} raw
 * @returns {{ name: string | null, privHex: string }}
 */
export function parseKeyImport(raw) {
  const trimmed = raw.trim();
  let payload = trimmed;
  if (payload.startsWith(KEY_EXPORT_PREFIX)) {
    payload = payload.slice(KEY_EXPORT_PREFIX.length);
  }
  if (payload.startsWith("{")) {
    const json = JSON.parse(payload);
    const priv = String(json.priv || json.private || "").trim();
    if (!priv) throw new Error("Import JSON missing private key");
    const name = json.name ? String(json.name).trim().toLowerCase() : null;
    return { name, privHex: priv.startsWith("0x") ? priv : `0x${priv}` };
  }
  return { name: null, privHex: trimmed.startsWith("0x") ? trimmed : `0x${trimmed}` };
}

/**
 * @param {string} name
 * @param {{ id?: string }} [opts]
 */
export function renderExportKeySection(name, opts = {}) {
  const id = opts.id || "export-key";
  const n = escapeHtml(name);
  return `
    <fieldset class="wallet__export-key" id="${escapeHtml(id)}" data-export-key-root>
      <legend>Export private key</legend>
      <p class="wallet__meta wallet__export-key__warn">
        Anyone with this key controls the account. Store offline; never share in chat or email.
      </p>
      <form class="wallet__form wallet__export-key__form" data-export-key-form data-export-name="${n}">
        <label>
          Passphrase
          <input name="pass" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="btn btn--outline">Reveal key</button>
      </form>
      <div class="wallet__export-key__reveal" data-export-key-reveal hidden>
        <label>
          Private key (hex)
          <input type="text" readonly data-export-key-hex spellcheck="false" />
        </label>
        <div class="wallet__export-key__actions">
          <button type="button" class="btn btn--outline" data-export-key-copy>Copy hex</button>
          <button type="button" class="btn btn--outline" data-export-key-copy-qr>Copy QR payload</button>
        </div>
        <figure class="wallet__export-key__qr">
          <img alt="Private key QR code" width="240" height="240" data-export-key-qr />
          <figcaption class="wallet__meta">Scan to import on another device (keep private)</figcaption>
        </figure>
      </div>
      <p class="wallet__export-key__error" data-export-key-error hidden></p>
    </fieldset>`;
}

/**
 * Compact export panel for the header profile menu.
 * @param {string} name
 */
export function renderProfileExportPanel(name) {
  const n = escapeHtml(name);
  return `
    <div class="site-header__profile-export" data-profile-export data-export-key-root hidden>
      <p class="site-header__profile-note">Anyone with this key controls the account. Keep private.</p>
      <form class="site-header__profile-export-form" data-export-key-form data-export-name="${n}">
        <label class="site-header__profile-field">
          <span class="site-header__profile-label">Passphrase</span>
          <input name="pass" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit" class="site-header__profile-submit">Reveal key</button>
      </form>
      <div class="site-header__profile-export-reveal" data-export-key-reveal hidden>
        <label class="site-header__profile-field">
          <span class="site-header__profile-label">Private key (hex)</span>
          <input type="text" readonly data-export-key-hex spellcheck="false" />
        </label>
        <div class="site-header__profile-export-actions">
          <button type="button" class="site-header__profile-link site-header__profile-link--btn" data-export-key-copy>Copy hex</button>
          <button type="button" class="site-header__profile-link site-header__profile-link--btn" data-export-key-copy-qr>Copy QR payload</button>
        </div>
        <figure class="site-header__profile-export-qr">
          <img alt="Private key QR code" width="200" height="200" data-export-key-qr />
        </figure>
      </div>
      <p class="site-header__profile-error" data-export-key-error hidden></p>
    </div>`;
}

/**
 * @param {ParentNode} root
 */
export function bindExportKeySections(root) {
  root.querySelectorAll("[data-export-key-form]").forEach((form) => {
    if (!(form instanceof HTMLFormElement)) return;
    if (form.dataset.exportBound) return;
    form.dataset.exportBound = "1";

    const name = form.getAttribute("data-export-name") || "";
    const section = form.closest("[data-export-key-root]");
    const reveal = section?.querySelector("[data-export-key-reveal]");
    const hexInput = section?.querySelector("[data-export-key-hex]");
    const qrImg = section?.querySelector("[data-export-key-qr]");
    const errEl = section?.querySelector("[data-export-key-error]");

    /** @param {string} msg */
    const showError = (msg) => {
      if (!(errEl instanceof HTMLElement)) return;
      errEl.textContent = msg;
      errEl.hidden = !msg;
    };

    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      showError("");
      const pass = String(new FormData(form).get("pass") || "");
      try {
        const privHex = await keyring.revealPriv(name, pass);
        const payload = buildKeyExportPayload(name, privHex);
        if (hexInput instanceof HTMLInputElement) hexInput.value = privHex;
        if (qrImg instanceof HTMLImageElement) {
          qrImg.src = qrSvgDataUrl(payload);
          qrImg.dataset.payload = payload;
        }
        if (reveal instanceof HTMLElement) reveal.hidden = false;
        form.querySelector("[name=pass]")?.removeAttribute("value");
      } catch (err) {
        if (reveal instanceof HTMLElement) reveal.hidden = true;
        showError(/** @type {Error} */ (err).message);
      }
    });

    section?.querySelector("[data-export-key-copy]")?.addEventListener("click", async () => {
      if (!(hexInput instanceof HTMLInputElement) || !hexInput.value) return;
      try {
        await navigator.clipboard.writeText(hexInput.value);
      } catch {
        hexInput.select();
      }
    });

    section?.querySelector("[data-export-key-copy-qr]")?.addEventListener("click", async () => {
      const payload = qrImg instanceof HTMLImageElement ? qrImg.dataset.payload : "";
      if (!payload) return;
      try {
        await navigator.clipboard.writeText(payload);
      } catch {
        /* ignore */
      }
    });
  });
}
