/**
 * /demo/login/ — extension site-login sample (spec 14 §10.1).
 */

import "./chrome.js";
import { apiGet, resolveApiBase } from "./lib/api.js";
import { escapeHtml } from "./lib/rpc.js";
import {
  buildChallenge,
  verifyLoginResponse,
} from "./lib/site-login.js";

const statusEl = document.querySelector("[data-demo-status]");
const hostEl = document.querySelector("[data-demo-host]");
const apiBase = resolveApiBase();

/**
 * @param {string} msg
 * @param {"pending"|"ok"|"error"} [kind]
 */
function setStatus(msg, kind = "pending") {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.textContent = msg;
  statusEl.dataset.state = kind;
}

/** @returns {Promise<{ request: Function, isGuld?: boolean } | null>} */
function waitForGuld(timeoutMs = 2500) {
  return new Promise((resolve) => {
    if (globalThis.guld?.isGuld) {
      resolve(globalThis.guld);
      return;
    }
    const onReady = () => {
      cleanup();
      resolve(globalThis.guld);
    };
    const cleanup = () => {
      window.removeEventListener("guld#initialized", onReady);
      clearTimeout(timer);
    };
    window.addEventListener("guld#initialized", onReady);
    const timer = setTimeout(() => {
      cleanup();
      resolve(globalThis.guld?.isGuld ? globalThis.guld : null);
    }, timeoutMs);
  });
}

async function main() {
  const guld = await waitForGuld();
  let status;
  try {
    status = await apiGet(apiBase, "/chain/status");
  } catch (err) {
    setStatus(
      `Node API unavailable (${/** @type {Error} */ (err).message}). Serve with guld-node --http --http-static .`,
      "error",
    );
    hostEl.innerHTML = `<p class="wallet__empty">Fix API base in <a href="/settings/">Settings</a> and reload.</p>`;
    return;
  }

  const chainId = Number(status.chain_id ?? status.chainId);
  if (!guld) {
    setStatus("Extension not detected. Load unpacked src/guld-extension in Chrome.", "error");
    hostEl.innerHTML = `
      <ol class="wallet__empty">
        <li>Chrome → <code>chrome://extensions</code> → Developer mode → Load unpacked → <code>src/guld-extension</code></li>
        <li>Import the same private key as your PWA (<a href="/login/">Log in</a> / export from wallet)</li>
        <li>Reload this page</li>
      </ol>
      <p class="wallet__meta">Chain id ${escapeHtml(String(chainId))} · API ${escapeHtml(apiBase)}</p>
    `;
    return;
  }

  setStatus(`Extension ready · chain ${chainId}`, "ok");
  hostEl.innerHTML = `
    <form class="wallet__form" data-login-form>
      <label>
        Name
        <input name="name" type="text" spellcheck="false" required placeholder="alice" />
      </label>
      <label>
        Statement (optional)
        <input name="statement" type="text" maxlength="200" placeholder="Log in to Guld demo" />
      </label>
      <button type="submit" class="btn btn--primary">Connect &amp; sign login</button>
    </form>
    <pre class="wallet__meta" data-demo-out hidden></pre>
  `;

  const out = hostEl.querySelector("[data-demo-out]");
  hostEl.querySelector("[data-login-form]")?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
    const name = String(fd.get("name") || "").trim().toLowerCase();
    const statement = String(fd.get("statement") || "").trim();
    try {
      setStatus("Requesting accounts…", "pending");
      const accounts = await guld.request({ method: "guld_requestAccounts" });
      if (!Array.isArray(accounts) || !accounts.includes(name)) {
        throw new Error(
          accounts?.length
            ? `Extension accounts: ${accounts.join(", ")} — pick one of those or import ${name}`
            : "No accounts connected",
        );
      }

      const challenge = buildChallenge({
        domain: location.host,
        uri: location.href.split("#")[0],
        name,
        chainId,
        statement: statement || undefined,
      });

      setStatus("Confirm login in the extension…", "pending");
      const response = await guld.request({
        method: "guld_login",
        params: [challenge],
      });

      setStatus("Verifying against on-chain keys…", "pending");
      const acctBody = await apiGet(
        apiBase,
        `/chain/accounts/${encodeURIComponent(name)}`,
      );
      const keys = acctBody?.account?.keys || acctBody?.keys || [];
      await verifyLoginResponse(response, {
        accountKeys: keys,
        chainId,
        expectedDomain: location.host,
        expectedUri: challenge.uri,
      });

      setStatus(`Verified — you are ${name}`, "ok");
      if (out instanceof HTMLElement) {
        out.hidden = false;
        out.textContent = JSON.stringify(response, null, 2);
      }
    } catch (err) {
      setStatus(/** @type {Error} */ (err).message || String(err), "error");
      if (out instanceof HTMLElement) out.hidden = true;
    }
  });
}

main();
