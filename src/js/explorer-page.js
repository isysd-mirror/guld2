import "./chrome.js";
import { startChainLive } from "./lib/chain-events.js";
import { blockHashHex } from "../guld-js/src/wire/header.js";
import {
  escapeHtml,
  formatTime,
  quantaToGuld,
  resolveRpcUrl,
  rpcCall,
  shortHash,
  summarizeTx,
  summarizeActivity,
  activityConfirmations,
  activityIsUnconfirmed,
} from "./lib/rpc.js";
import { currencyTicker, loadNetworkInfo } from "./lib/network.js";

const PAGE_SIZE = 20;
/** Home right-column preview rows (each panel scrolls inside the shared column height). */
const HOME_TX_LIMIT = 12;

/** @type {string} */
let ticker = "tGULD";

const statusEl = document.querySelector("[data-explorer-status]");
const hostEl = document.querySelector("[data-explorer-host]");
const suggestEl = document.querySelector("[data-explorer-suggest]");

/** @type {string} */
let rpcUrl = resolveRpcUrl();
/** @type {number} */
let tipHeight = 0;
/** @type {Map<number, object>} */
const blockCache = new Map();
/** @type {(() => void) | null} */
let stopLive = null;
/** @type {Map<string, object>} */
let liveMempool = new Map();
/** Full mempool size (RPC `count`); may exceed rows kept in `liveMempool` on home. */
let liveMempoolTotal = 0;
/** @type {"streaming"|"reconnecting"|"polling"|"offline"|""} */
let liveTransport = "";
/** @type {ReturnType<typeof setTimeout> | null} */
let homeBlocksTimer = null;

window.addEventListener("hashchange", () => route());

document.addEventListener("click", (ev) => {
  const btn = /** @type {HTMLElement | null} */ (
    ev.target instanceof Element ? ev.target.closest("[data-copy]") : null
  );
  if (!btn) return;
  const text = btn.getAttribute("data-copy") || "";
  if (!text) return;
  void navigator.clipboard.writeText(text).then(
    () => {
      btn.dataset.copied = "1";
      const prev = btn.textContent;
      btn.textContent = "Copied";
      window.setTimeout(() => {
        btn.dataset.copied = "0";
        btn.textContent = prev || "Copy";
      }, 1200);
    },
    () => {
      /* clipboard optional */
    },
  );
});

bindLookupForm();

function haltLive() {
  if (stopLive) {
    stopLive();
    stopLive = null;
  }
  if (homeBlocksTimer != null) {
    clearTimeout(homeBlocksTimer);
    homeBlocksTimer = null;
  }
  liveTransport = "";
}

/** @param {string | undefined} id */
function normTxId(id) {
  const s = String(id || "").toLowerCase();
  return s.startsWith("0x") ? s : s ? `0x${s}` : "";
}

function transportLabel() {
  switch (liveTransport) {
    case "streaming":
      return " · live";
    case "reconnecting":
      return " · reconnecting";
    case "polling":
      return " · polling";
    default:
      return "";
  }
}

/** @param {number} [n] */
function mempoolCountLabel(n = liveMempoolTotal) {
  const c = Math.max(0, Number(n) || 0);
  return c === 1 ? "1 unconfirmed" : `${c} unconfirmed`;
}

/**
 * Apply a `guld_getMempool` snapshot — prefer RPC `count` over truncated `txs.length`.
 * @param {{ count?: number, txs?: unknown[] }} pool
 */
function applyMempoolSnapshot(pool) {
  const txs = Array.isArray(pool?.txs) ? pool.txs : [];
  const reported = pool?.count != null ? Number(pool.count) : NaN;
  liveMempoolTotal = Number.isFinite(reported) ? reported : txs.length;
  liveMempool = new Map();
  for (const row of txs) {
    const id = normTxId(/** @type {{ id?: string }} */ (row).id);
    if (id) liveMempool.set(id, /** @type {object} */ (row));
  }
}

function paintLiveMempool(limit) {
  const slot = hostEl?.querySelector("[data-live-mempool]");
  if (!(slot instanceof HTMLElement)) return;
  const items = [...liveMempool.values()]
    .sort((a, b) => Number(b.fee_rate || 0) - Number(a.fee_rate || 0))
    .slice(0, limit);
  const empty =
    limit <= HOME_TX_LIMIT
      ? "Mempool empty — no unconfirmed transactions."
      : "Mempool empty.";
  slot.innerHTML = mempoolTable(items, { empty });
  const countEl = hostEl?.querySelector("[data-live-mempool-count]");
  if (countEl instanceof HTMLElement) {
    countEl.textContent = mempoolCountLabel();
  }
}

/**
 * @param {"home"|"mempool"} view
 */
function attachLive(view) {
  haltLive();
  const limit = view === "home" ? HOME_TX_LIMIT : 100;
  stopLive = startChainLive(rpcUrl, {
    onTransport(t) {
      liveTransport = t;
      refreshStatusLine(view);
    },
    onHello(data) {
      if (data?.tip_height != null) tipHeight = Number(data.tip_height);
      refreshStatusLine(view);
    },
    onNewHeads(data) {
      if (data?.height != null) tipHeight = Number(data.height);
      blockCache.clear();
      refreshStatusLine(view);
      if (view === "home") {
        if (homeBlocksTimer != null) clearTimeout(homeBlocksTimer);
        homeBlocksTimer = setTimeout(() => {
          homeBlocksTimer = null;
          refreshHomeBlocks().catch((err) => console.warn("live blocks", err));
        }, 400);
      }
    },
    onMempoolAdded(row) {
      const id = normTxId(row?.id);
      if (!id) return;
      const wasCached = liveMempool.has(id);
      liveMempool.set(id, row);
      // Home keeps a truncated cache; still bump total for true inserts.
      // Re-delivery of an already-cached row is treated as an update.
      if (!wasCached) liveMempoolTotal += 1;
      paintLiveMempool(limit);
      refreshStatusLine(view);
    },
    onMempoolRemoved(data) {
      const id = normTxId(data?.id);
      if (!id) return;
      liveMempool.delete(id);
      // Decrement even when the id was outside the home display window.
      liveMempoolTotal = Math.max(0, liveMempoolTotal - 1);
      paintLiveMempool(limit);
      refreshStatusLine(view);
    },
    async onPollSnapshot() {
      const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
      tipHeight = Number(info.height || tipHeight);
      const pool = await rpcCall(rpcUrl, "guld_getMempool", [limit]);
      applyMempoolSnapshot(pool);
      paintLiveMempool(limit);
      refreshStatusLine(view);
      if (view === "home") await refreshHomeBlocks();
    },
  });
}

/** @param {"home"|"mempool"} view */
function refreshStatusLine(view) {
  const n = liveMempoolTotal;
  if (view === "mempool") {
    setStatus(
      "ok",
      `Height ${tipHeight.toLocaleString()} · mempool ${n}${transportLabel()}`,
    );
  } else {
    setStatus(
      "ok",
      `Height ${tipHeight.toLocaleString()} · ${n} unconfirmed${transportLabel()}`,
    );
  }
}

async function refreshHomeBlocks() {
  if (!(hostEl instanceof HTMLElement)) return;
  if (parseRoute().view !== "home") return;
  const from = tipHeight;
  const to = Math.max(0, tipHeight - PAGE_SIZE + 1);
  const rows = await fetchBlockRange(from, to);
  /** @type {{ height: number, index: number, tx: Record<string, unknown> }[]} */
  const recentTxs = [];
  for (const { height, block } of rows) {
    const txs = Array.isArray(block.txs) ? block.txs : [];
    txs.forEach((tx, index) => {
      if (recentTxs.length < HOME_TX_LIMIT) recentTxs.push({ height, index, tx });
    });
    if (recentTxs.length >= HOME_TX_LIMIT) break;
  }
  const blocksSlot = hostEl.querySelector("[data-live-blocks]");
  const txsSlot = hostEl.querySelector("[data-live-confirmed-txs]");
  if (blocksSlot instanceof HTMLElement) {
    const older = to > 0;
    blocksSlot.innerHTML = `${blocksTable(rows)}${
      older ? `<p class="explorer__more">${blockLink(to - 1, `Older block #${to - 1}`)}</p>` : ""
    }`;
  }
  if (txsSlot instanceof HTMLElement) {
    txsSlot.innerHTML = txsTable(recentTxs);
  }
}

/**
 * @returns {
 *   | { view: "home" }
 *   | { view: "mempool" }
 *   | { view: "block", height: number }
 *   | { view: "account", name: string }
 *   | { view: "tx", height: number, index: number }
 *   | { view: "pendingTx", id: string }
 * }
 */
function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "mempool") {
    return { view: "mempool" };
  }
  if (parts[0] === "block" && parts[1] != null) {
    const height = Number(parts[1]);
    if (Number.isFinite(height) && height >= 0) return { view: "block", height };
  }
  if (
    parts[0] === "tx" &&
    (parts[1] === "unconfirmed" || parts[1] === "pending") &&
    parts[2]
  ) {
    const id = parts[2].startsWith("0x") ? parts[2].toLowerCase() : `0x${parts[2].toLowerCase()}`;
    return { view: "pendingTx", id };
  }
  if (parts[0] === "tx" && parts[1] != null && parts[2] != null) {
    const height = Number(parts[1]);
    const index = Number(parts[2]);
    if (Number.isFinite(height) && height >= 0 && Number.isFinite(index) && index >= 0) {
      return { view: "tx", height, index };
    }
  }
  if (parts[0] === "account" && parts[1]) {
    return { view: "account", name: decodeURIComponent(parts[1]).toLowerCase() };
  }
  return { view: "home" };
}

/** @param {string} name */
function accountHref(name) {
  return `#/account/${encodeURIComponent(String(name || "").toLowerCase())}`;
}

/** @param {number|string} height */
function blockHref(height) {
  return `#/block/${height}`;
}

/** @param {number|string} height @param {number|string} index */
function txHref(height, index) {
  return `#/tx/${height}/${index}`;
}

/** @param {string} name */
function nameLink(name) {
  const n = String(name || "").trim();
  if (!n || n === "—") return escapeHtml(n || "—");
  return `<a href="${accountHref(n)}"><code>${escapeHtml(n)}</code></a>`;
}

/** @param {number|string} height @param {string} [label] */
function blockLink(height, label) {
  const h = String(height);
  const text = label != null ? label : h;
  return `<a href="${blockHref(h)}">${escapeHtml(text)}</a>`;
}

/** @param {number|string} height @param {number|string} index @param {string} [label] */
function txLink(height, index, label) {
  const text = label != null ? label : `${height}:${index}`;
  return `<a href="${txHref(height, index)}">${escapeHtml(text)}</a>`;
}

/** @param {string} id */
function pendingTxHref(id) {
  const hex = String(id || "").startsWith("0x") ? String(id) : `0x${id}`;
  return `#/tx/unconfirmed/${encodeURIComponent(hex)}`;
}

/** @param {string} id @param {string} [label] */
function pendingTxLink(id, label) {
  const text = label != null ? label : shortHash(id, 10);
  return `<a href="${pendingTxHref(id)}"><code>${escapeHtml(text)}</code></a>`;
}

/**
 * Link known name fields inside a summarizeTx primary string.
 * @param {Record<string, unknown>} tx
 * @param {string} primary
 */
function linkifyTxPrimary(tx, primary) {
  const type = String(tx.type || "");
  if (type === "transfer") {
    return `${nameLink(/** @type {string} */ (tx.from))} → ${nameLink(/** @type {string} */ (tx.to))}`;
  }
  if (type === "register_username" || type === "register_group") {
    return `${nameLink(/** @type {string} */ (tx.payer))} → ${nameLink(/** @type {string} */ (tx.name))}`;
  }
  if (type === "register_subaccount") {
    return `${nameLink(/** @type {string} */ (tx.parent))} → ${nameLink(`${tx.parent}.${tx.label}`)}`;
  }
  if (
    type === "claim_legacy" ||
    type === "update_master" ||
    type === "rotate_keys" ||
    type === "settle_registration" ||
    type === "convert_account_kind"
  ) {
    return nameLink(/** @type {string} */ (tx.name));
  }
  return escapeHtml(primary);
}

/**
 * Link counterparties inside activity primary text when possible.
 * @param {Record<string, unknown>} row
 * @param {{ type: string, primary: string, amount: string }} s
 */
function linkifyActivityPrimary(row, s) {
  const kind = String(row.kind || row.type || s.type);
  const cp = row.counterparty != null ? String(row.counterparty) : "";
  if (kind === "transfer" && cp) {
    const dir = String(row.direction || "");
    if (dir === "out") return `→ ${nameLink(cp)}`;
    if (dir === "in") return `← ${nameLink(cp)}`;
    return nameLink(cp);
  }
  if ((kind === "register" || kind === "register_username" || kind === "register_group") && cp) {
    return nameLink(cp);
  }
  if (cp && (kind === "register_subaccount" || s.primary.includes(cp))) {
    return nameLink(cp);
  }
  return escapeHtml(s.primary);
}

/** @param {string} query */
async function navigateLookup(query) {
  const q = query.trim();
  if (!q) return;
  // tx locator: 12:3 or 12/3
  const txMatch = q.match(/^(\d+)[:/](\d+)$/);
  if (txMatch) {
    location.hash = txHref(txMatch[1], txMatch[2]);
    return;
  }
  // bare block height
  if (/^\d+$/.test(q)) {
    location.hash = blockHref(q);
    return;
  }
  // 0x hash → try tx, then block
  if (/^(0x)?[0-9a-fA-F]{64}$/.test(q)) {
    const hex = q.startsWith("0x") ? q : `0x${q}`;
    try {
      const tx = await rpcCall(rpcUrl, "guld_getTransaction", [hex]);
      if (tx && tx.height != null && tx.index != null) {
        location.hash = txHref(tx.height, tx.index);
        return;
      }
      if (tx && tx.pending) {
        location.hash = pendingTxHref(tx.tx_id || hex);
        return;
      }
      const block = await rpcCall(rpcUrl, "guld_getBlockByHash", [hex, false]);
      if (block && block.header && block.header.height != null) {
        location.hash = blockHref(block.header.height);
        return;
      }
    } catch (err) {
      console.warn("hash lookup", err);
    }
    setStatus("offline", `No tx or block for ${shortHash(hex, 10)}`);
    return;
  }
  location.hash = accountHref(q.toLowerCase());
}

async function route() {
  haltLive();
  ticker = currencyTicker(await loadNetworkInfo());
  // Prefer Bitcoin-style path; keep `#/tx/pending/…` as a one-shot alias.
  if (/#\/tx\/pending\//i.test(location.hash)) {
    location.hash = location.hash.replace(/\/tx\/pending\//i, "/tx/unconfirmed/");
    return;
  }
  const r = parseRoute();
  if (hostEl instanceof HTMLElement) {
    hostEl.innerHTML = `<p class="doc-status">Loading…</p>`;
  }
  try {
    if (r.view === "block") {
      await renderBlock(r.height);
    } else if (r.view === "tx") {
      await renderTx(r.height, r.index);
    } else if (r.view === "pendingTx") {
      await renderPendingTx(r.id);
    } else if (r.view === "mempool") {
      await renderMempool();
    } else if (r.view === "account") {
      await renderAccount(r.name);
    } else {
      await renderHome();
    }
  } catch (err) {
    console.warn("explorer:", err);
    haltLive();
    setStatus("offline", String(/** @type {Error} */ (err).message || err));
    if (hostEl instanceof HTMLElement) {
      hostEl.innerHTML = `
        <div class="explorer__empty">
          <p>Could not reach the node at <code>${escapeHtml(rpcUrl)}</code>.</p>
          <p>Local node: <code>http://127.0.0.1:8545</code>. On this site use same-origin <code>/rpc</code>.</p>
          <p><a href="/explorer/legacy/">Legacy block 0 import details</a> (static snapshot)</p>
        </div>`;
    }
  }
}

/**
 * @param {"ok"|"offline"} kind
 * @param {string} detail
 */
function setStatus(kind, detail) {
  if (!(statusEl instanceof HTMLElement)) return;
  statusEl.dataset.state = kind;
  statusEl.textContent = detail;
}

/** @param {number} height */
async function fetchBlock(height) {
  if (blockCache.has(height)) return blockCache.get(height);
  const block = await rpcCall(rpcUrl, "guld_getBlockByNumber", [height]);
  if (block) blockCache.set(height, block);
  return block;
}

/** @param {number} fromInclusive @param {number} toInclusive */
async function fetchBlockRange(fromInclusive, toInclusive) {
  const heights = [];
  for (let h = fromInclusive; h >= toInclusive; h--) heights.push(h);
  const blocks = await Promise.all(heights.map((h) => fetchBlock(h)));
  return heights.map((h, i) => ({ height: h, block: blocks[i] })).filter((x) => x.block);
}

/**
 * Copyable monospace value for detail views.
 * @param {string | number | null | undefined} value
 * @param {{ compact?: boolean }} [opts]
 */
function copyable(value, opts = {}) {
  const v = String(value ?? "");
  if (!v || v === "—") return escapeHtml(v || "—");
  const shown = opts.compact && v.length > 40 ? shortHash(v, 14) : v;
  return `<span class="explorer-copy">
    <code class="explorer-copy__text" title="${escapeHtml(v)}">${escapeHtml(shown)}</code>
    <button type="button" class="btn btn--outline btn--small explorer-copy__btn" data-copy="${escapeHtml(v)}">Copy</button>
  </span>`;
}

/**
 * @param {unknown[]} keys
 * @param {string} [heading]
 */
function keysListHtml(keys, heading = "Keys") {
  if (!Array.isArray(keys) || !keys.length) return "";
  const items = keys
    .map((k, i) => {
      const hex = String(k);
      return `<li><span class="explorer__meta">[${i}]</span> ${copyable(hex)}</li>`;
    })
    .join("");
  return `<h3 class="explorer__subhead">${escapeHtml(heading)}</h3>
    <ul class="explorer__keys">${items}</ul>`;
}

/**
 * @param {string} label
 * @param {string} html
 * @param {{ wide?: boolean }} [opts]
 */
function kvRow(label, html, opts = {}) {
  const wide = opts.wide ? " explorer-kv--wide" : "";
  return `<div class="explorer-kv${wide}"><dt>${escapeHtml(label)}</dt><dd>${html}</dd></div>`;
}

function bindLookupForm() {
  const form = document.querySelector("[data-explorer-lookup]");
  const input = form?.querySelector('input[name="q"]');
  form?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
    void navigateLookup(String(fd.get("q") || ""));
  });
  let suggestTimer = 0;
  input?.addEventListener("input", () => {
    window.clearTimeout(suggestTimer);
    suggestTimer = window.setTimeout(() => void updateAccountSuggest(input, suggestEl), 200);
  });
}

/** @param {number} height */
async function fetchBlockTxIds(height) {
  const slim = await rpcCall(rpcUrl, "guld_getBlockByNumber", [height, false]);
  return Array.isArray(slim?.txs) ? slim.txs.map(String) : [];
}

/**
 * @param {HTMLInputElement | null | undefined} input
 * @param {Element | null | undefined} suggest
 */
async function updateAccountSuggest(input, suggest) {
  if (!(input instanceof HTMLInputElement) || !(suggest instanceof HTMLElement)) return;
  const prefix = input.value.trim().toLowerCase();
  if (!prefix || /^\d/.test(prefix) || prefix.startsWith("0x") || prefix.includes(":")) {
    suggest.hidden = true;
    suggest.innerHTML = "";
    return;
  }
  try {
    const items = await rpcCall(rpcUrl, "guld_searchAccounts", [prefix, 8]);
    if (!Array.isArray(items) || !items.length) {
      suggest.hidden = true;
      suggest.innerHTML = "";
      return;
    }
    suggest.hidden = false;
    suggest.innerHTML = `<ul>${items
      .map(
        (a) =>
          `<li><a href="${accountHref(a.name)}"><code>${escapeHtml(a.name)}</code></a>
            <span class="explorer__meta">${escapeHtml(String(a.kind || ""))} · ${escapeHtml(quantaToGuld(a.balance || "0"))} ${ticker}</span></li>`,
      )
      .join("")}</ul>`;
  } catch {
    suggest.hidden = true;
  }
}

async function renderHome() {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);
  const pending = Number(info.txPoolPending ?? 0);

  const from = tipHeight;
  const to = Math.max(0, tipHeight - PAGE_SIZE + 1);
  const rows = await fetchBlockRange(from, to);

  /** @type {{ height: number, index: number, tx: Record<string, unknown> }[]} */
  const recentTxs = [];
  for (const { height, block } of rows) {
    const txs = Array.isArray(block.txs) ? block.txs : [];
    txs.forEach((tx, index) => {
      if (recentTxs.length < HOME_TX_LIMIT) recentTxs.push({ height, index, tx });
    });
    if (recentTxs.length >= HOME_TX_LIMIT) break;
  }

  let mempool = { count: pending, txs: [] };
  try {
    mempool = await rpcCall(rpcUrl, "guld_getMempool", [HOME_TX_LIMIT]);
  } catch (err) {
    console.warn("mempool snapshot", err);
  }
  applyMempoolSnapshot(mempool);
  const pendingTxs = Array.isArray(mempool.txs) ? mempool.txs : [];

  if (!(hostEl instanceof HTMLElement)) return;

  const older = to > 0;
  const pendingLabel = mempoolCountLabel();

  hostEl.innerHTML = `
    <div class="explorer__grid">
      <section class="explorer__panel">
        <header class="explorer__panel-head">
          <h2>Blocks</h2>
          <p>Newest ${rows.length} of tip</p>
        </header>
        <div data-live-blocks>
        ${blocksTable(rows)}
        ${older ? `<p class="explorer__more">${blockLink(to - 1, `Older block #${to - 1}`)}</p>` : ""}
        </div>
      </section>
      <div class="explorer__col">
        <section class="explorer__panel explorer__panel--mempool">
          <header class="explorer__panel-head">
            <h2>Mempool</h2>
            <p><span data-live-mempool-count>${escapeHtml(pendingLabel)}</span> · 0 confirmations
              · <a href="#/mempool">Full list</a></p>
          </header>
          <div data-live-mempool>
          ${mempoolTable(pendingTxs, { empty: "Mempool empty — no unconfirmed transactions." })}
          </div>
        </section>
        <section class="explorer__panel">
          <header class="explorer__panel-head">
            <h2>Confirmed transactions</h2>
            <p>From recent blocks</p>
          </header>
          <div data-live-confirmed-txs>
          ${txsTable(recentTxs)}
          </div>
        </section>
      </div>
    </div>
    <p class="explorer__foot-note">
      Genesis import balances live under
      ${blockLink(0, "block 0")} →
      <a href="/explorer/legacy/">legacy details</a>.
    </p>
  `;
  refreshStatusLine("home");
  attachLive("home");
}

async function renderMempool() {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);
  const pool = await rpcCall(rpcUrl, "guld_getMempool", [100]);
  const weightUsed = pool.weight_used ?? "0";
  const weightLimit = pool.weight_limit ?? "—";
  applyMempoolSnapshot(pool);
  const txs = Array.isArray(pool.txs) ? pool.txs : [];

  if (!(hostEl instanceof HTMLElement)) return;
  hostEl.innerHTML = `
    <nav class="explorer__crumb">
      <a href="#/">Explorer</a>
      <span aria-hidden="true">/</span>
      <span>Mempool</span>
    </nav>
    <section class="explorer__panel">
      <header class="explorer__panel-head">
        <h2>Mempool</h2>
        <p><span data-live-mempool-count>${escapeHtml(mempoolCountLabel())}</span> · weight ${escapeHtml(String(weightUsed))} / ${escapeHtml(String(weightLimit))}
          ${pool.truncated ? " · truncated" : ""}</p>
      </header>
      <p class="explorer__meta">Unconfirmed txs stream live via SSE (GIP-19). Fallback polls the snapshot if the stream drops.</p>
      <div data-live-mempool>
      ${mempoolTable(txs, { empty: "Mempool empty." })}
      </div>
    </section>
  `;
  refreshStatusLine("mempool");
  attachLive("mempool");
}

/**
 * @param {Array<{ id?: string, inclusion_fee?: string, weight?: string, tx?: Record<string, unknown> }>} items
 * @param {{ empty?: string }} [opts]
 */
function mempoolTable(items, opts = {}) {
  if (!items.length) {
    return `<p class="explorer__empty">${escapeHtml(opts.empty || "No unconfirmed transactions.")}</p>`;
  }
  const body = items
    .map((row) => {
      const tx = /** @type {Record<string, unknown>} */ (row.tx || {});
      const s = summarizeTx(tx);
      const id = String(row.id || "");
      const fee = quantaToGuld(row.inclusion_fee || tx.inclusion_fee || "0");
      return `<tr>
        <td class="num">${pendingTxLink(id)}</td>
        <td><a href="${pendingTxHref(id)}"><span class="tx-pill tx-pill--pending">${escapeHtml(s.type)}</span></a></td>
        <td>${linkifyTxPrimary(tx, s.primary)}</td>
        <td class="num">${escapeHtml(s.amount)}</td>
        <td class="num">${escapeHtml(fee)}</td>
      </tr>`;
    })
    .join("");
  return `<div class="explorer__table-wrap"><table class="explorer-table">
    <thead><tr>
      <th class="num">Id</th><th>Type</th><th>Detail</th><th class="num">Amount</th><th class="num">Fee</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

/** @param {string} id */
async function renderPendingTx(id) {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);
  const loc = await rpcCall(rpcUrl, "guld_getTransaction", [id]);

  if (!(hostEl instanceof HTMLElement)) return;
  if (!loc) {
    setStatus("ok", `Height ${tipHeight.toLocaleString()} · tx not found`);
    hostEl.innerHTML = `
      <div class="explorer__empty">
        <p>No mempool or chain tx for <code>${escapeHtml(shortHash(id, 14))}</code>.</p>
        <p><a href="#/mempool">← Mempool</a></p>
      </div>`;
    return;
  }

  // Mined since lookup — bounce to confirmed route.
  if (!loc.pending && loc.height != null && loc.index != null) {
    location.hash = txHref(loc.height, loc.index);
    return;
  }

  const tx = /** @type {Record<string, unknown>} */ (loc.tx || {});
  const s = summarizeTx(tx);
  const txId = String(loc.tx_id || id);
  setStatus("ok", `Height ${tipHeight.toLocaleString()} · unconfirmed ${shortHash(txId, 10)}`);

  hostEl.innerHTML = `
    <nav class="explorer__crumb">
      <a href="#/">Explorer</a>
      <span aria-hidden="true">/</span>
      <a href="#/mempool">Mempool</a>
      <span aria-hidden="true">/</span>
      <span>Unconfirmed</span>
    </nav>
    <aside class="explorer__banner">
      <p><strong>Unconfirmed</strong> — in the mempool (0 confirmations). Watch for the next block.</p>
    </aside>
    <section class="explorer__panel">
      <header class="explorer__panel-head">
        <h2>${escapeHtml(s.type)}</h2>
        <p>0 confirmations</p>
      </header>
      <p class="explorer__tx-summary">${linkifyTxPrimary(tx, s.primary)}
        ${s.amount !== "—" ? ` · <strong>${escapeHtml(s.amount)}</strong> ${ticker}` : ""}</p>
      <dl class="explorer-kv-grid">
        ${kvRow("Tx id", copyable(txId), { wide: true })}
        ${kvRow("Confirmations", `<span class="num">0</span>`)}
        ${kvRow("Status", `<span class="tx-pill tx-pill--pending">Unconfirmed</span>`)}
        ${txDetailRowsHtml(tx)}
      </dl>
      ${txExtrasHtml(tx)}
    </section>
  `;
}

/**
 * @param {{ height: number, block: object }[]} rows
 */
function blocksTable(rows) {
  if (!rows.length) {
    return `<p class="explorer__empty">No blocks yet.</p>`;
  }
  const body = rows
    .map(({ height, block }) => {
      const h = block.header || {};
      const txCount = Array.isArray(block.txs) ? block.txs.length : 0;
      const fees = quantaToGuld(h.inclusion_fees || "0");
      const legacy =
        height === 0
          ? ` <a class="explorer-inline-link" href="/explorer/legacy/">legacy</a>`
          : "";
      return `<tr>
        <td class="num">${blockLink(height)}${legacy}</td>
        <td>${escapeHtml(formatTime(h.timestamp))}</td>
        <td>${nameLink(h.miner || "—")}</td>
        <td class="num">${txCount}</td>
        <td class="num">${escapeHtml(fees)}</td>
      </tr>`;
    })
    .join("");
  return `<div class="explorer__table-wrap"><table class="explorer-table">
    <thead><tr>
      <th class="num">Height</th><th>Time</th><th>Miner</th><th class="num">Txs</th><th class="num">Fees (${ticker})</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

/**
 * @param {{ height: number, index: number, tx: Record<string, unknown> }[]} items
 */
function txsTable(items) {
  if (!items.length) {
    return `<p class="explorer__empty">No confirmed transactions in the recent window.</p>`;
  }
  const body = items
    .map(({ height, index, tx }) => {
      const s = summarizeTx(tx);
      return `<tr>
        <td class="num">${txLink(height, index)}</td>
        <td><a href="${txHref(height, index)}"><span class="tx-pill">${escapeHtml(s.type)}</span></a></td>
        <td>${linkifyTxPrimary(tx, s.primary)}</td>
        <td class="num">${escapeHtml(s.amount)}</td>
      </tr>`;
    })
    .join("");
  return `<div class="explorer__table-wrap"><table class="explorer-table">
    <thead><tr>
      <th class="num">Tx</th><th>Type</th><th>Detail</th><th class="num">Amount</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

/** @param {number} height */
async function renderBlock(height) {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);
  setStatus("ok", `Height ${tipHeight.toLocaleString()} · viewing block ${height}`);

  const block = await fetchBlock(height);
  if (!(hostEl instanceof HTMLElement)) return;
  if (!block) {
    hostEl.innerHTML = `<div class="explorer__empty"><p>Block ${height} not found.</p><p><a href="#/">← Back to tip</a></p></div>`;
    return;
  }

  const h = block.header || {};
  const txs = Array.isArray(block.txs) ? block.txs : [];
  const isGenesis = height === 0;
  let blockHash = "";
  try {
    blockHash = await blockHashHex(/** @type {import("../guld-js/src/wire/header.js").HeaderJson} */ (h));
  } catch (err) {
    console.warn("block hash", err);
  }
  let txIds = [];
  try {
    txIds = await fetchBlockTxIds(height);
  } catch (err) {
    console.warn("block tx ids", err);
  }

  const dl = [
    kvRow("Height", `<span class="num">${blockLink(h.height ?? height)}</span>`),
    blockHash ? kvRow("Block hash", copyable(blockHash), { wide: true }) : "",
    kvRow("Time", escapeHtml(formatTime(h.timestamp))),
    kvRow("Miner", nameLink(String(h.miner || "—"))),
    kvRow("Version", escapeHtml(String(h.version ?? "—"))),
    kvRow("Difficulty", escapeHtml(String(h.difficulty ?? "—"))),
    kvRow("Nonce", copyable(String(h.nonce ?? "—"))),
    kvRow("Inclusion fees", `${escapeHtml(quantaToGuld(h.inclusion_fees || "0"))} ${ticker}`),
    kvRow(
      "Prev hash",
      `${copyable(String(h.prev_hash || "—"))}${
        height > 0
          ? ` <span class="explorer__meta">(${blockLink(height - 1, `block ${height - 1}`)})</span>`
          : ""
      }`,
      { wide: true },
    ),
    kvRow("State root", copyable(String(h.state_root || "—")), { wide: true }),
    kvRow("Tx root", copyable(String(h.tx_root || "—")), { wide: true }),
    kvRow("Receipt root", copyable(String(h.receipt_root || "—")), { wide: true }),
    kvRow("Rules hash", copyable(String(h.guld_rules_hash || "—")), { wide: true }),
  ].join("");

  const txRows = txs.length
    ? txs
        .map((tx, index) => {
          const s = summarizeTx(tx);
          const fee = quantaToGuld(tx.inclusion_fee || "0");
          const id = txIds[index] || "";
          return `<tr>
            <td class="num">${txLink(height, index, String(index))}</td>
            <td>${id ? copyable(id, { compact: true }) : "—"}</td>
            <td><a href="${txHref(height, index)}"><span class="tx-pill">${escapeHtml(s.type)}</span></a></td>
            <td>${linkifyTxPrimary(tx, s.primary)}</td>
            <td class="num">${escapeHtml(s.amount)}</td>
            <td class="num">${escapeHtml(fee)}</td>
          </tr>`;
        })
        .join("")
    : "";

  const prev = height > 0 ? blockLink(height - 1, `← #${height - 1}`) : `<span></span>`;
  const next =
    height < tipHeight ? blockLink(height + 1, `#${height + 1} →`) : `<span></span>`;

  hostEl.innerHTML = `
    <nav class="explorer__crumb">
      <a href="#/">Explorer</a>
      <span aria-hidden="true">/</span>
      <span>Block ${height}</span>
    </nav>
    <div class="explorer__block-nav">${prev}<strong>Block ${height}</strong>${next}</div>
    ${
      isGenesis
        ? `<aside class="explorer__banner">
            <p><strong>Genesis (block 0)</strong> — legacy 1.0 balances are imported here as locked accounts (no txs in the block body).</p>
            <p><a href="/explorer/legacy/">Open legacy import details</a> · <a href="/specs/?doc=15-ledger-import">Spec 15</a></p>
          </aside>`
        : ""
    }
    <section class="explorer__panel">
      <header class="explorer__panel-head"><h2>Header</h2></header>
      <dl class="explorer-kv-grid">${dl}</dl>
    </section>
    <section class="explorer__panel">
      <header class="explorer__panel-head">
        <h2>Transactions</h2>
        <p>${txs.length} in block</p>
      </header>
      ${
        txs.length
          ? `<div class="explorer__table-wrap"><table class="explorer-table">
              <thead><tr>
                <th class="num">#</th><th>Tx id</th><th>Type</th><th>Detail</th><th class="num">Amount</th><th class="num">Fee</th>
              </tr></thead>
              <tbody>${txRows}</tbody>
            </table></div>`
          : `<p class="explorer__empty">${isGenesis ? "Genesis has no body txs — see legacy import details for account balances." : "Empty block."}</p>`
      }
    </section>
  `;
}

/**
 * @param {number} height
 * @param {number} index
 */
async function renderTx(height, index) {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);

  const block = await fetchBlock(height);
  if (!(hostEl instanceof HTMLElement)) return;
  if (!block) {
    setStatus("ok", `Height ${tipHeight.toLocaleString()} · block missing`);
    hostEl.innerHTML = `<div class="explorer__empty"><p>Block ${height} not found.</p><p><a href="#/">← Back</a></p></div>`;
    return;
  }

  const txs = Array.isArray(block.txs) ? block.txs : [];
  const tx = txs[index];
  if (!tx) {
    setStatus("ok", `Height ${tipHeight.toLocaleString()} · tx missing`);
    hostEl.innerHTML = `
      <div class="explorer__empty">
        <p>No transaction at index ${index} in ${blockLink(height, `block ${height}`)} (${txs.length} txs).</p>
        <p>${blockLink(height, "← Open block")}</p>
      </div>`;
    return;
  }

  const s = summarizeTx(tx);
  const header = block.header || {};
  const conf = tipHeight >= Number(height) ? tipHeight - Number(height) + 1 : 0;
  const confLabel = conf === 1 ? "1 confirmation" : `${conf} confirmations`;
  setStatus("ok", `Height ${tipHeight.toLocaleString()} · tx ${height}:${index} · ${confLabel}`);

  let txId = "";
  let blockHash = "";
  try {
    const ids = await fetchBlockTxIds(height);
    txId = ids[index] || "";
  } catch (err) {
    console.warn("tx id", err);
  }
  if (txId) {
    try {
      const loc = await rpcCall(rpcUrl, "guld_getTransaction", [txId]);
      if (loc?.block_hash) blockHash = String(loc.block_hash);
    } catch {
      /* optional */
    }
  }
  if (!blockHash) {
    try {
      blockHash = await blockHashHex(
        /** @type {import("../guld-js/src/wire/header.js").HeaderJson} */ (header),
      );
    } catch {
      /* optional */
    }
  }

  const siblings =
    txs.length > 1
      ? `<p class="explorer__foot-note">Also in this block:
          ${txs
            .map((_, i) =>
              i === index
                ? `<strong>${i}</strong>`
                : txLink(height, i, String(i)),
            )
            .join(" · ")}</p>`
      : "";

  hostEl.innerHTML = `
    <nav class="explorer__crumb">
      <a href="#/">Explorer</a>
      <span aria-hidden="true">/</span>
      ${blockLink(height, `Block ${height}`)}
      <span aria-hidden="true">/</span>
      <span>Tx ${index}</span>
    </nav>
    <section class="explorer__panel">
      <header class="explorer__panel-head">
        <h2>${escapeHtml(s.type)}</h2>
        <p>${txLink(height, index)} · ${blockLink(height, `block ${height}`)} · ${escapeHtml(confLabel)} · ${escapeHtml(formatTime(header.timestamp))}</p>
      </header>
      <p class="explorer__tx-summary">${linkifyTxPrimary(tx, s.primary)}
        ${s.amount !== "—" ? ` · <strong>${escapeHtml(s.amount)}</strong> ${ticker}` : ""}</p>
      <dl class="explorer-kv-grid">
        ${txId ? kvRow("Tx id", copyable(txId), { wide: true }) : kvRow("Locator", copyable(`${height}:${index}`))}
        ${blockHash ? kvRow("Block hash", copyable(blockHash), { wide: true }) : ""}
        ${kvRow("Block", blockLink(height, `block ${height}`))}
        ${kvRow("Index", `<span class="num">${escapeHtml(String(index))}</span>`)}
        ${kvRow("Confirmations", `<span class="num">${escapeHtml(String(conf))}</span>`)}
        ${kvRow("Time", escapeHtml(formatTime(header.timestamp)))}
        ${header.miner ? kvRow("Miner", nameLink(String(header.miner))) : ""}
        ${txDetailRowsHtml(tx)}
      </dl>
      ${txExtrasHtml(tx)}
      ${siblings}
    </section>
  `;
}

/**
 * Scalar / name / amount fields as kv rows (keys & sigs via txExtrasHtml).
 * @param {Record<string, unknown>} tx
 */
function txDetailRowsHtml(tx) {
  const nameFields = new Set([
    "from",
    "to",
    "name",
    "payer",
    "parent",
    "miner",
  ]);
  const amountFields = new Set([
    "amount",
    "endowment",
    "inclusion_fee",
    "registration_fee",
  ]);
  const skip = new Set([
    "type",
    "cosignatures",
    "keys",
    "new_keys",
    "signature",
    "payer_signature",
    "registrant_signature",
    "parent_signature",
    "sub_signature",
    "new_key_signature",
    "legacy_proof",
  ]);

  /** @type {string[]} */
  const rows = [
    kvRow("Type", `<span class="tx-pill">${escapeHtml(String(tx.type || "unknown"))}</span>`),
  ];

  for (const [key, val] of Object.entries(tx)) {
    if (skip.has(key) || val == null || val === "") continue;
    if (nameFields.has(key)) {
      rows.push(kvRow(labelize(key), nameLink(String(val))));
      continue;
    }
    if (key === "label" && tx.parent) {
      rows.push(kvRow("Full name", nameLink(`${tx.parent}.${val}`)));
      rows.push(kvRow("Label", copyable(String(val))));
      continue;
    }
    if (amountFields.has(key)) {
      rows.push(
        kvRow(labelize(key), `${escapeHtml(quantaToGuld(/** @type {string} */ (val)))} ${ticker}`),
      );
      continue;
    }
    if (key === "memo") {
      rows.push(kvRow("Memo", copyable(String(val)), { wide: true }));
      continue;
    }
    if (key === "threshold" || key === "nonce") {
      rows.push(kvRow(labelize(key), `<span class="num">${escapeHtml(String(val))}</span>`));
      continue;
    }
    if (key === "new_kind" || key === "kind") {
      rows.push(kvRow(labelize(key), escapeHtml(String(val))));
      continue;
    }
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      const s = String(val);
      if (/^(0x)?[0-9a-fA-F]{16,}$/.test(s) || s.length > 40) {
        rows.push(kvRow(labelize(key), copyable(s), { wide: true }));
      } else {
        rows.push(kvRow(labelize(key), `<code>${escapeHtml(s)}</code>`));
      }
      continue;
    }
    if (typeof val === "object") {
      const json = JSON.stringify(val, null, 2);
      rows.push(kvRow(labelize(key), copyable(json), { wide: true }));
    }
  }

  return rows.join("");
}

/**
 * Keys, signatures, cosignatures — full values with copy.
 * @param {Record<string, unknown>} tx
 */
function txExtrasHtml(tx) {
  /** @type {string[]} */
  const parts = [];

  if (Array.isArray(tx.keys) && tx.keys.length) {
    parts.push(keysListHtml(tx.keys, "Keys"));
  }
  if (Array.isArray(tx.new_keys) && tx.new_keys.length) {
    parts.push(keysListHtml(tx.new_keys, "New keys"));
  }

  const sigKeys = [
    "signature",
    "payer_signature",
    "registrant_signature",
    "parent_signature",
    "sub_signature",
    "new_key_signature",
  ];
  /** @type {string[]} */
  const sigRows = [];
  for (const key of sigKeys) {
    if (tx[key] == null || tx[key] === "") continue;
    sigRows.push(kvRow(labelize(key), copyable(String(tx[key])), { wide: true }));
  }
  if (Array.isArray(tx.cosignatures) && tx.cosignatures.length) {
    tx.cosignatures.forEach((sig, i) => {
      sigRows.push(kvRow(`Cosignature [${i}]`, copyable(String(sig)), { wide: true }));
    });
  }
  if (tx.legacy_proof != null && tx.legacy_proof !== "") {
    const proof =
      typeof tx.legacy_proof === "string"
        ? tx.legacy_proof
        : JSON.stringify(tx.legacy_proof, null, 2);
    sigRows.push(kvRow("Legacy proof", copyable(proof), { wide: true }));
  }
  if (sigRows.length) {
    parts.push(`
      <h3 class="explorer__subhead">Signatures</h3>
      <dl class="explorer-kv-grid">${sigRows.join("")}</dl>`);
  }

  return parts.join("");
}

/** @param {string} key */
function labelize(key) {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** @param {string} name */
async function renderAccount(name) {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);

  let account = null;
  try {
    account = await rpcCall(rpcUrl, "guld_getAccount", [name]);
  } catch (err) {
    console.warn("getAccount", err);
  }

  if (!(hostEl instanceof HTMLElement)) return;

  if (!account) {
    setStatus("ok", `Height ${tipHeight.toLocaleString()} · name not found`);
    hostEl.innerHTML = `
      <nav class="explorer__crumb">
        <a href="#/">Explorer</a>
        <span aria-hidden="true">/</span>
        <span>${escapeHtml(name)}</span>
      </nav>
      <div class="explorer__empty">
        <p>No account named <code>${escapeHtml(name)}</code> on this chain.</p>
        <p><a href="#/">← Back</a></p>
      </div>`;
    return;
  }

  const balance = await rpcCall(rpcUrl, "guld_getBalance", [name]);
  const activity = await rpcCall(rpcUrl, "guld_getAccountActivity", [name, 25]);
  const balanceGuld = quantaToGuld(balance || "0");
  setStatus("ok", `Height ${tipHeight.toLocaleString()} · ${name}`);

  const legacy = account.legacy
    ? kvRow("Legacy", copyable(JSON.stringify(account.legacy, null, 2)), { wide: true })
    : account.legacy_locked
      ? kvRow("Legacy", "locked")
      : "";
  const expires =
    account.expires_at_height != null && String(account.expires_at_height) !== "18446744073709551615"
      ? kvRow("Expires at height", `<span class="num">${blockLink(account.expires_at_height)}</span>`)
      : kvRow("Expires", "never");

  const parentName =
    typeof account.parent === "string"
      ? account.parent
      : account.parent && typeof account.parent === "object" && "0" in /** @type {object} */ (account.parent)
        ? String(account.parent)
        : account.parent
          ? String(account.parent)
          : "";

  const items = Array.isArray(activity) ? activity : [];
  const actRows = items.length
    ? items
        .map((row) => {
          const rec = /** @type {Record<string, unknown>} */ (row);
          const s = summarizeActivity(rec);
          const h = row.height != null ? String(row.height) : "";
          const idx = row.tx_index;
          const unconfirmed = activityIsUnconfirmed(rec);
          const conf = activityConfirmations(rec, tipHeight);
          const confCell = unconfirmed
            ? `<span class="tx-pill tx-pill--pending">Unconfirmed</span>`
            : conf != null
              ? `<span class="num">${conf}</span>`
              : "—";
          const when = unconfirmed
            ? "—"
            : h
              ? blockLink(h, `h${h}`)
              : escapeHtml(formatTime(row.timestamp));
          let txCell = "—";
          if (unconfirmed && row.tx_id) {
            const id = String(row.tx_id);
            txCell = `<span class="explorer-copy">
              <a href="${pendingTxHref(id)}"><code class="explorer-copy__text" title="${escapeHtml(id)}">${escapeHtml(shortHash(id, 10))}</code></a>
              <button type="button" class="btn btn--outline btn--small explorer-copy__btn" data-copy="${escapeHtml(id)}">Copy</button>
            </span>`;
          } else if (h && idx != null && Number.isFinite(Number(idx))) {
            const id = row.tx_id ? String(row.tx_id) : "";
            txCell = id
              ? `<span class="explorer-copy">
                  <a href="${txHref(h, idx)}"><code class="explorer-copy__text" title="${escapeHtml(id)}">${escapeHtml(shortHash(id, 10))}</code></a>
                  <button type="button" class="btn btn--outline btn--small explorer-copy__btn" data-copy="${escapeHtml(id)}">Copy</button>
                </span>`
              : txLink(h, idx, `${h}:${idx}`);
          } else if (h && s.type === "coinbase") {
            txCell = blockLink(h, "coinbase");
          } else if (h) {
            txCell = blockLink(h);
          }
          return `<tr>
            <td><span class="tx-pill${unconfirmed ? " tx-pill--pending" : ""}">${escapeHtml(s.type)}</span></td>
            <td>${linkifyActivityPrimary(rec, s)}</td>
            <td class="num">${escapeHtml(s.amount)}</td>
            <td>${txCell}</td>
            <td class="num">${confCell}</td>
            <td class="num">${when}</td>
          </tr>`;
        })
        .join("")
    : "";

  hostEl.innerHTML = `
    <nav class="explorer__crumb">
      <a href="#/">Explorer</a>
      <span aria-hidden="true">/</span>
      <span>${escapeHtml(name)}</span>
    </nav>
    <section class="explorer__panel">
      <header class="explorer__panel-head">
        <h2>${escapeHtml(name)}</h2>
        <p>${escapeHtml(String(account.kind || "account"))}</p>
      </header>
      <p class="explorer__balance"><strong>${escapeHtml(balanceGuld)}</strong> ${ticker}</p>
      <dl class="explorer-kv-grid">
        ${kvRow("Name", `${nameLink(name)} <button type="button" class="btn btn--outline btn--small" data-copy="${escapeHtml(name)}">Copy</button>`)}
        ${kvRow("Kind", escapeHtml(String(account.kind || "—")))}
        ${kvRow("Balance", `${escapeHtml(balanceGuld)} ${ticker}`)}
        ${kvRow("Threshold", `<span class="num">${escapeHtml(String(account.threshold ?? "—"))}</span>`)}
        ${kvRow("Nonce", `<span class="num">${escapeHtml(String(account.nonce ?? "—"))}</span>`)}
        ${kvRow("Account id", copyable(String(account.account_id || "—")), { wide: true })}
        ${kvRow("Master hash", copyable(String(account.master_hash || "—")), { wide: true })}
        ${expires}
        ${legacy}
        ${parentName ? kvRow("Parent", nameLink(parentName)) : ""}
      </dl>
      ${keysListHtml(Array.isArray(account.keys) ? account.keys : [])}
      <p class="explorer__foot-note"><a href="/wallet/#/account/${encodeURIComponent(name)}">Open in wallet</a></p>
    </section>
    <section class="explorer__panel">
      <header class="explorer__panel-head"><h2>Recent activity</h2></header>
      ${
        actRows
          ? `<div class="explorer__table-wrap"><table class="explorer-table">
              <thead><tr><th>Type</th><th>Detail</th><th class="num">Amount</th><th>Tx id</th><th class="num">Confirmations</th><th class="num">When</th></tr></thead>
              <tbody>${actRows}</tbody>
            </table></div>`
          : `<p class="explorer__empty">No activity yet.</p>`
      }
    </section>
  `;
}

route();
