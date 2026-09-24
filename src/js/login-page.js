import "./chrome.js";
import { resolveApiBase } from "./lib/api.js";
import { accountExists, activateAccount } from "./lib/auth.js";
import { parseKeyImport } from "./lib/key-export.js";
import { keyring } from "./lib/keyring.js";
import { escapeHtml } from "./lib/rpc.js";

const statusEl = document.querySelector("[data-login-status]");
const hostEl = document.querySelector("[data-login-host]");
const apiBase = resolveApiBase();

function nextHref() {
  const q = new URLSearchParams(location.search).get("next");
  if (q && q.startsWith("/") && !q.startsWith("//")) return q;
  return "/wallet/";
}

/**
 * @param {string} msg
 * @param {"pending"|"ok"|"error"} [kind]
 */
function setStatus(msg, kind = "pending") {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.textContent = msg;
  statusEl.dataset.state = kind;
}

/**
 * @param {string} pass
 */
async function unlockWith(pass) {
  if (!pass) throw new Error("Passphrase required");
  await keyring.unlock(pass);
}

async function render() {
  const { accounts } = keyring.load();
  if (!accounts.length) {
    setStatus("No local keys yet.", "pending");
    hostEl.innerHTML = `
      <p class="wallet__empty">Generate a key by <a href="/register/">signing up</a>.</p>
      <form class="wallet__form" data-import-form>
        <label>
          Passphrase
          <input name="pass" type="password" autocomplete="new-password" required />
        </label>
        <label>
          Name
          <input name="name" type="text" spellcheck="false" required />
        </label>
        <label>
          Private key (hex or guld1key:… / QR payload)
          <input name="priv" type="password" spellcheck="false" autocomplete="off" required />
        </label>
        <button type="submit" class="btn btn--outline">Import key</button>
      </form>
    `;
    hostEl.querySelector("[data-import-form]")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
      const pass = String(fd.get("pass") || "");
      const nameInput = String(fd.get("name") || "").trim();
      const parsed = parseKeyImport(String(fd.get("priv") || "").trim());
      const name = (nameInput || parsed.name || "").trim().toLowerCase();
      const privHex = parsed.privHex;
      if (!name) throw new Error("Name required");
      try {
        const { pubkeyHex, fromHex } = await import("./lib/crypto.js");
        const pubHex = await pubkeyHex(fromHex(privHex));
        await unlockWith(pass);
        await keyring.upsertAccount({ name, privHex, pubHex, pending: false });
        activateAccount(name);
        location.href = nextHref();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });
    return;
  }

  const rows = await Promise.all(
    accounts.map(async (a) => {
      let onChain = false;
      try {
        onChain = await accountExists(apiBase, a.name);
      } catch {
        onChain = false;
      }
      const label = a.pending ? "pending registration" : onChain ? "registered" : "key only";
      return `<li>
        <button type="button" class="btn btn--primary" data-login="${escapeHtml(a.name)}">
          ${escapeHtml(a.name)}
        </button>
        <span class="wallet__meta">${escapeHtml(label)}</span>
      </li>`;
    }),
  );

  setStatus("Enter passphrase and choose an account", "ok");
  hostEl.innerHTML = `
    <form class="wallet__form" data-unlock-form>
      <label>
        Passphrase
        <input name="pass" type="password" autocomplete="current-password" required />
      </label>
      <ul class="wallet__account-list">${rows.join("")}</ul>
      <p class="wallet__note"><a href="/register/">Sign up</a> for a new name · <a href="/settings/">Settings</a></p>
    </form>
  `;
  hostEl.querySelectorAll("[data-login]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const name = btn.getAttribute("data-login");
      if (!name) return;
      const form = hostEl.querySelector("[data-unlock-form]");
      const pass =
        form instanceof HTMLFormElement
          ? String(new FormData(form).get("pass") || "")
          : "";
      try {
        await unlockWith(pass);
        if (!keyring.getPriv(name)) {
          throw new Error("Wrong passphrase or no key for this account");
        }
        activateAccount(name);
        location.href = nextHref();
      } catch (err) {
        setStatus(/** @type {Error} */ (err).message, "error");
      }
    });
  });
}

render();
