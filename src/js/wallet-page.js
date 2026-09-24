import { registerServiceWorker } from "./register-sw.js";
import { apiGet, persistApiBase, resolveApiBase } from "./lib/api.js";
import { escapeHtml, formatTime, quantaToGuld, summarizeTx } from "./lib/rpc.js";

registerServiceWorker();

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
    hostEl.innerHTML = `<p class="wallet__empty">Look up a name to see balance and recent activity.</p>`;
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
      const tx = row.tx || row;
      const sum = summarizeTx(tx);
      const when = formatTime(row.timestamp ?? row.time ?? row.block_time);
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
      <p class="wallet__note">Read-only for now. Full send/register flows will ship in this PWA.</p>
    `;
  } catch (err) {
    setStatus(/** @type {Error} */ (err).message, "error");
    hostEl.innerHTML = `<p class="wallet__empty">${escapeHtml(/** @type {Error} */ (err).message)}</p>`;
  }
}

route();
