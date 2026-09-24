import "./chrome.js";
import { apiGet, persistApiBase, resolveApiBase } from "./lib/api.js";
import { getLocalIdentity, LOGIN_HREF, REGISTER_HREF } from "./lib/auth.js";
import { escapeHtml, formatTime, quantaToGuld, summarizeActivity } from "./lib/rpc.js";
import { getActiveName, setActiveName } from "./lib/wallet-session.js";

const statusEl = document.querySelector("[data-wallet-status]");
const hostEl = document.querySelector("[data-wallet-host]");
const apiInput = document.querySelector("[data-wallet-api]");
const nameInput = document.querySelector("[data-wallet-name]");
const lookupBtn = document.querySelector("[data-wallet-lookup]");
const refreshBtn = document.querySelector("[data-wallet-refresh]");

/** @type {string} */
let apiBase = resolveApiBase();

if (apiInput instanceof HTMLInputElement) {
  apiInput.value = apiBase;
  apiInput.addEventListener("change", () => {
    apiBase = apiInput.value.trim() || "/api/v1";
    persistApiBase(apiBase);
    route();
  });
}

if (nameInput instanceof HTMLInputElement) {
  const active = getActiveName();
  if (active && !nameInput.value) nameInput.value = active;
}

nameInput?.addEventListener("keydown", (ev) => {
  if (ev.key === "Enter") openAccount();
});

lookupBtn?.addEventListener("click", openAccount);
refreshBtn?.addEventListener("click", () => route());

window.addEventListener("hashchange", () => route());

/**
 * @returns {{ view: "home" } | { view: "account", name: string }}
 */
function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "account" && parts[1]) {
    return { view: "account", name: decodeURIComponent(parts[1]) };
  }
  return { view: "home" };
}

function openAccount() {
  if (!(nameInput instanceof HTMLInputElement)) return;
  const name = nameInput.value.trim().toLowerCase();
  if (!name) return;
  location.hash = `#/account/${encodeURIComponent(name)}`;
}

function setStatus(text, state = "ok") {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.textContent = text;
  statusEl.dataset.state = state;
}

async function route() {
  const r = parseRoute();
  if (!(hostEl instanceof HTMLElement)) return;

  if (r.view === "home") {
    const id = getLocalIdentity();
    if (!id.hasKey) {
      hostEl.innerHTML = `
        <article class="wallet__card">
          <p class="wallet__name">Welcome</p>
          <p class="wallet__meta">Look up any name below, or create yours to get a local key.</p>
          <p style="margin-top:1rem">
            <a class="btn btn--primary" href="${REGISTER_HREF}">Sign up</a>
            <a class="btn btn--outline" href="${LOGIN_HREF}" style="margin-left:0.5rem">Log in</a>
          </p>
        </article>
        <p class="wallet__empty">Or look up a public name to browse activity.</p>`;
    } else {
      hostEl.innerHTML = `
        <article class="wallet__card">
          <p class="wallet__name">${escapeHtml(id.name || "")}</p>
          <p class="wallet__meta">${id.pending ? "Registration pending…" : "Signed in on this device"}</p>
          <p style="margin-top:0.75rem">
            <a class="btn btn--primary" href="#/account/${encodeURIComponent(id.name || "")}">Open my account</a>
            ${
              !id.pending
                ? `<a class="btn btn--outline" href="/settings/" style="margin-left:0.5rem">Sell GULD (OTC desk)</a>`
                : ""
            }
          </p>
        </article>`;
    }
    try {
      const st = await apiGet(apiBase, "/chain/status");
      const h = st.height ?? "—";
      setStatus(`Chain height ${h}${st.ready === false ? " · node not ready" : ""}`);
    } catch (err) {
      setStatus(`API: ${/** @type {Error} */ (err).message}`, "error");
    }
    return;
  }

  if (nameInput instanceof HTMLInputElement) nameInput.value = r.name;
  setActiveName(r.name);
  hostEl.innerHTML = `<p class="doc-status">Loading ${escapeHtml(r.name)}…</p>`;
  setStatus("Loading…", "pending");

  try {
    const [st, acct] = await Promise.all([
      apiGet(apiBase, "/chain/status"),
      apiGet(apiBase, `/chain/accounts/${encodeURIComponent(r.name)}`),
    ]);
    const activity = await apiGet(
      apiBase,
      `/chain/accounts/${encodeURIComponent(r.name)}/activity?limit=25`,
    );

    setStatus(`Height ${st.height ?? "—"}`);
    const account = acct.account || {};
    const balanceGuld = acct.balance?.guld ?? quantaToGuld(acct.balance?.quanta || "0");
    const kind = account.kind || "—";
    const legacy = account.legacy_locked ? " · legacy locked" : "";

    const rows = (activity.items || []).map((row) => {
      const sum = summarizeActivity(row);
      const when =
        row.height != null
          ? `h${row.height}`
          : formatTime(row.timestamp ?? row.time ?? row.block_time);
      return `<li><strong>${escapeHtml(sum.type)}</strong> ${escapeHtml(sum.primary)} · ${escapeHtml(sum.amount)} GULD <span class="wallet__meta">${escapeHtml(when)}</span></li>`;
    });

    hostEl.innerHTML = `
      <article class="wallet__card">
        <p class="wallet__name">${escapeHtml(r.name)}</p>
        <p class="wallet__meta">${escapeHtml(kind)}${escapeHtml(legacy)}</p>
        <p class="wallet__balance">${escapeHtml(balanceGuld)} <span class="wallet__meta">GULD</span></p>
      </article>
      <section class="wallet__activity">
        <h2>Recent activity</h2>
        ${rows.length ? `<ul>${rows.join("")}</ul>` : `<p class="wallet__empty">No activity yet.</p>`}
      </section>
      <p class="wallet__note">Send and contacts ship next. Look up any name above anytime.</p>
    `;
  } catch (err) {
    setStatus(/** @type {Error} */ (err).message, "error");
    hostEl.innerHTML = `<p class="wallet__empty">${escapeHtml(/** @type {Error} */ (err).message)}</p>`;
  }
}

route();
