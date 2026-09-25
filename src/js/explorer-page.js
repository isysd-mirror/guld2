import "./chrome.js";
import {
  defaultRpcUrl,
  escapeHtml,
  formatTime,
  persistRpcUrl,
  quantaToGuld,
  resolveRpcUrl,
  rpcCall,
  shortHash,
  summarizeTx,
  shortHash,
  summarizeActivity,
} from "./lib/rpc.js";

const PAGE_SIZE = 20;

const statusEl = document.querySelector("[data-explorer-status]");
const hostEl = document.querySelector("[data-explorer-host]");
const rpcInput = document.querySelector("[data-explorer-rpc]");
const refreshBtn = document.querySelector("[data-explorer-refresh]");

/** @type {string} */
let rpcUrl = resolveRpcUrl();
/** @type {number} */
let tipHeight = 0;
/** @type {Map<number, object>} */
const blockCache = new Map();

if (rpcInput instanceof HTMLInputElement) {
  rpcInput.value = rpcUrl;
  rpcInput.addEventListener("change", () => {
    rpcUrl = rpcInput.value.trim() || defaultRpcUrl();
    persistRpcUrl(rpcUrl);
    blockCache.clear();
    route();
  });
}

refreshBtn?.addEventListener("click", () => {
  blockCache.clear();
  route();
});

window.addEventListener("hashchange", () => route());

/**
 * @returns {{ view: "home" } | { view: "block", height: number } | { view: "account", name: string }}
 */
function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "block" && parts[1] != null) {
    const height = Number(parts[1]);
    if (Number.isFinite(height) && height >= 0) return { view: "block", height };
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

/** @param {string} name */
function nameLink(name) {
  const n = String(name || "").trim();
  if (!n || n === "—") return escapeHtml(n || "—");
  return `<a href="${accountHref(n)}"><code>${escapeHtml(n)}</code></a>`;
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
    const full = `${tx.parent}.${tx.label}`;
    return nameLink(full);
  }
  if (type === "claim_legacy" || type === "update_master" || type === "rotate_keys") {
    return nameLink(/** @type {string} */ (tx.name));
  }
  return escapeHtml(primary);
}

async function route() {
  const r = parseRoute();
  if (hostEl instanceof HTMLElement) {
    hostEl.innerHTML = `<p class="doc-status">Loading…</p>`;
  }
  try {
    if (r.view === "block") {
      await renderBlock(r.height);
    } else if (r.view === "account") {
      await renderAccount(r.name);
    } else {
      await renderHome();
    }
  } catch (err) {
    console.warn("explorer:", err);
    setStatus("offline", String(/** @type {Error} */ (err).message || err));
    if (hostEl instanceof HTMLElement) {
      hostEl.innerHTML = `
        <div class="explorer__empty">
          <p>Could not reach the node at <code>${escapeHtml(rpcUrl)}</code>.</p>
          <p>Local node: <code>http://127.0.0.1:8545</code>. On this site use same-origin <code>/rpc</code> (or clear a stuck loopback URL above).</p>
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

async function renderHome() {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);
  const pending = info.txPoolPending ?? 0;
  setStatus(
    "ok",
    `Height ${tipHeight.toLocaleString()} · ${pending} pending · miner ${info.miner || "—"} · chain ${info.chainId ?? "—"}`,
  );

  const from = tipHeight;
  const to = Math.max(0, tipHeight - PAGE_SIZE + 1);
  const rows = await fetchBlockRange(from, to);

  /** @type {{ height: number, index: number, tx: Record<string, unknown> }[]} */
  const recentTxs = [];
  for (const { height, block } of rows) {
    const txs = Array.isArray(block.txs) ? block.txs : [];
    txs.forEach((tx, index) => {
      if (recentTxs.length < PAGE_SIZE) recentTxs.push({ height, index, tx });
    });
    if (recentTxs.length >= PAGE_SIZE) break;
  }

  if (!(hostEl instanceof HTMLElement)) return;

  const older = to > 0;

  hostEl.innerHTML = `
    <div class="explorer__lookup">
      <form data-explorer-lookup>
        <label>
          Look up name
          <input name="name" type="text" spellcheck="false" autocomplete="off" placeholder="alice" required />
        </label>
        <button type="submit" class="btn btn--outline">Open</button>
      </form>
    </div>
    <div class="explorer__grid">
      <section class="explorer__panel">
        <header class="explorer__panel-head">
          <h2>Blocks</h2>
          <p>Newest ${rows.length} of tip</p>
        </header>
        ${blocksTable(rows)}
        ${older ? `<p class="explorer__more"><a href="#/block/${to - 1}">Older block #${to - 1}</a></p>` : ""}
      </section>
      <section class="explorer__panel">
        <header class="explorer__panel-head">
          <h2>Transactions</h2>
          <p>From recent blocks</p>
        </header>
        ${txsTable(recentTxs)}
      </section>
    </div>
    <p class="explorer__foot-note">
      Genesis import balances live under
      <a href="#/block/0">block 0</a> →
      <a href="/explorer/legacy/">legacy details</a>.
    </p>
  `;

  hostEl.querySelector("[data-explorer-lookup]")?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
    const name = String(fd.get("name") || "")
      .trim()
      .toLowerCase();
    if (!name) return;
    location.hash = `#/account/${encodeURIComponent(name)}`;
  });
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
        <td class="num"><a href="#/block/${height}">${height}</a>${legacy}</td>
        <td>${escapeHtml(formatTime(h.timestamp))}</td>
        <td>${nameLink(h.miner || "—")}</td>
        <td class="num">${txCount}</td>
        <td class="num">${escapeHtml(fees)}</td>
      </tr>`;
    })
    .join("");
  return `<div class="explorer__table-wrap"><table class="explorer-table">
    <thead><tr>
      <th class="num">Height</th><th>Time</th><th>Miner</th><th class="num">Txs</th><th class="num">Fees (GULD)</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}

/**
 * @param {{ height: number, index: number, tx: Record<string, unknown> }[]} items
 */
function txsTable(items) {
  if (!items.length) {
    return `<p class="explorer__empty">No transactions in the recent window.</p>`;
  }
  const body = items
    .map(({ height, index, tx }) => {
      const s = summarizeTx(tx);
      return `<tr>
        <td class="num"><a href="#/block/${height}">${height}</a>:${index}</td>
        <td><span class="tx-pill">${escapeHtml(s.type)}</span></td>
        <td>${linkifyTxPrimary(tx, s.primary)}</td>
        <td class="num">${escapeHtml(s.amount)}</td>
      </tr>`;
    })
    .join("");
  return `<div class="explorer__table-wrap"><table class="explorer-table">
    <thead><tr>
      <th class="num">Block</th><th>Type</th><th>Detail</th><th class="num">Amount</th>
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

  /** @type {[string, string, boolean][]} label, value, truncate? */
  const fields = [
    ["Height", String(h.height ?? height), false],
    ["Time", formatTime(h.timestamp), false],
    ["Miner", String(h.miner || "—"), false],
    ["Difficulty", String(h.difficulty ?? "—"), false],
    ["Nonce", String(h.nonce ?? "—"), false],
    ["Inclusion fees", `${quantaToGuld(h.inclusion_fees || "0")} GULD`, false],
    ["Prev hash", String(h.prev_hash || "—"), true],
    ["State root", String(h.state_root || "—"), true],
    ["Tx root", String(h.tx_root || "—"), true],
    ["Receipt root", String(h.receipt_root || "—"), true],
    ["Rules hash", String(h.guld_rules_hash || "—"), true],
  ];

  const dl = fields
    .map(([k, v, trunc]) => {
      if (k === "Miner") {
        return `<div class="explorer-kv"><dt>${escapeHtml(k)}</dt><dd>${nameLink(v)}</dd></div>`;
      }
      const shown = trunc ? shortHash(v, 14) : v;
      return `<div class="explorer-kv"><dt>${escapeHtml(k)}</dt><dd><code title="${escapeHtml(v)}">${escapeHtml(shown)}</code></dd></div>`;
    })
    .join("");

  const txRows = txs.length
    ? txs
        .map((tx, index) => {
          const s = summarizeTx(tx);
          const fee = quantaToGuld(tx.inclusion_fee || "0");
          return `<tr>
            <td class="num">${index}</td>
            <td><span class="tx-pill">${escapeHtml(s.type)}</span></td>
            <td>${linkifyTxPrimary(tx, s.primary)}</td>
            <td class="num">${escapeHtml(s.amount)}</td>
            <td class="num">${escapeHtml(fee)}</td>
          </tr>`;
        })
        .join("")
    : "";

  const prev = height > 0 ? `<a href="#/block/${height - 1}">← #${height - 1}</a>` : `<span></span>`;
  const next =
    height < tipHeight ? `<a href="#/block/${height + 1}">#${height + 1} →</a>` : `<span></span>`;

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
                <th class="num">#</th><th>Type</th><th>Detail</th><th class="num">Amount</th><th class="num">Fee</th>
              </tr></thead>
              <tbody>${txRows}</tbody>
            </table></div>`
          : `<p class="explorer__empty">${isGenesis ? "Genesis has no body txs — see legacy import details for account balances." : "Empty block."}</p>`
      }
    </section>
  `;
}

/** @param {string} name */
async function renderAccount(name) {
  const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
  tipHeight = Number(info.height || 0);

  let account = null;
  try {
    account = await rpcCall(rpcUrl, "guld_getAccount", [name]);
  } catch (err) {
    // null / missing handled below
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

  const keys = Array.isArray(account.keys)
    ? account.keys.map((k) => `<li><code>${escapeHtml(shortHash(String(k), 12))}</code></li>`).join("")
    : "";
  const legacy = account.legacy
    ? `<div class="explorer-kv"><dt>Legacy</dt><dd><code>${escapeHtml(JSON.stringify(account.legacy))}</code></dd></div>`
    : account.legacy_locked
      ? `<div class="explorer-kv"><dt>Legacy</dt><dd>locked</dd></div>`
      : "";
  const expires =
    account.expires_at_height != null && String(account.expires_at_height) !== "18446744073709551615"
      ? `<div class="explorer-kv"><dt>Expires at height</dt><dd class="num">${escapeHtml(String(account.expires_at_height))}</dd></div>`
      : "";

  const items = Array.isArray(activity) ? activity : [];
  const actRows = items.length
    ? items
        .map((row) => {
          const s = summarizeActivity(/** @type {Record<string, unknown>} */ (row));
          const when = row.height != null ? `h${row.height}` : formatTime(row.timestamp);
          return `<tr>
            <td><span class="tx-pill">${escapeHtml(s.type)}</span></td>
            <td>${escapeHtml(s.primary)}</td>
            <td class="num">${escapeHtml(s.amount)}</td>
            <td class="num">${escapeHtml(String(when))}</td>
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
      <p class="explorer__balance"><strong>${escapeHtml(balanceGuld)}</strong> GULD</p>
      <dl class="explorer-kv-grid">
        <div class="explorer-kv"><dt>Threshold</dt><dd class="num">${escapeHtml(String(account.threshold ?? "—"))}</dd></div>
        <div class="explorer-kv"><dt>Nonce</dt><dd class="num">${escapeHtml(String(account.nonce ?? "—"))}</dd></div>
        <div class="explorer-kv"><dt>Account id</dt><dd><code title="${escapeHtml(String(account.account_id || ""))}">${escapeHtml(shortHash(String(account.account_id || "—"), 14))}</code></dd></div>
        <div class="explorer-kv"><dt>Master hash</dt><dd><code title="${escapeHtml(String(account.master_hash || ""))}">${escapeHtml(shortHash(String(account.master_hash || "—"), 14))}</code></dd></div>
        ${expires}
        ${legacy}
        ${account.parent ? `<div class="explorer-kv"><dt>Parent</dt><dd>${nameLink(String(account.parent))}</dd></div>` : ""}
      </dl>
      ${keys ? `<h3 class="explorer__subhead">Keys</h3><ul class="explorer__keys">${keys}</ul>` : ""}
      <p class="explorer__foot-note"><a href="/wallet/#/account/${encodeURIComponent(name)}">Open in wallet</a></p>
    </section>
    <section class="explorer__panel">
      <header class="explorer__panel-head"><h2>Recent activity</h2></header>
      ${
        actRows
          ? `<div class="explorer__table-wrap"><table class="explorer-table">
              <thead><tr><th>Type</th><th>Detail</th><th class="num">Amount</th><th class="num">When</th></tr></thead>
              <tbody>${actRows}</tbody>
            </table></div>`
          : `<p class="explorer__empty">No activity yet.</p>`
      }
    </section>
  `;
}

route();
