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
 * @returns {
 *   | { view: "home" }
 *   | { view: "block", height: number }
 *   | { view: "account", name: string }
 *   | { view: "tx", height: number, index: number }
 * }
 */
function parseRoute() {
  const raw = (location.hash || "#/").replace(/^#/, "") || "/";
  const parts = raw.split("/").filter(Boolean);
  if (parts[0] === "block" && parts[1] != null) {
    const height = Number(parts[1]);
    if (Number.isFinite(height) && height >= 0) return { view: "block", height };
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
    type === "settle_registration"
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
        setStatus("ok", `Pending tx ${shortHash(hex, 10)} (not mined yet)`);
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
  const r = parseRoute();
  if (hostEl instanceof HTMLElement) {
    hostEl.innerHTML = `<p class="doc-status">Loading…</p>`;
  }
  try {
    if (r.view === "block") {
      await renderBlock(r.height);
    } else if (r.view === "tx") {
      await renderTx(r.height, r.index);
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

function lookupFormHtml(placeholder = "alice · 12 · 12:0 · 0x…") {
  return `
    <div class="explorer__lookup">
      <form data-explorer-lookup>
        <label>
          Look up
          <input name="q" type="text" spellcheck="false" autocomplete="off"
            placeholder="${escapeHtml(placeholder)}" required />
        </label>
        <button type="submit" class="btn btn--outline">Open</button>
      </form>
      <p class="explorer__lookup-hint">Name, height, <code>height:index</code>, or block/tx hash</p>
      <div data-explorer-suggest class="explorer__suggest" hidden></div>
    </div>`;
}

function bindLookupForm() {
  const form = hostEl?.querySelector("[data-explorer-lookup]");
  const input = form?.querySelector('input[name="q"]');
  const suggest = hostEl?.querySelector("[data-explorer-suggest]");
  form?.addEventListener("submit", (ev) => {
    ev.preventDefault();
    const fd = new FormData(/** @type {HTMLFormElement} */ (ev.target));
    void navigateLookup(String(fd.get("q") || ""));
  });
  let suggestTimer = 0;
  input?.addEventListener("input", () => {
    window.clearTimeout(suggestTimer);
    suggestTimer = window.setTimeout(() => void updateAccountSuggest(input, suggest), 200);
  });
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
            <span class="explorer__meta">${escapeHtml(String(a.kind || ""))} · ${escapeHtml(quantaToGuld(a.balance || "0"))} GULD</span></li>`,
      )
      .join("")}</ul>`;
  } catch {
    suggest.hidden = true;
  }
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
    ${lookupFormHtml()}
    <div class="explorer__grid">
      <section class="explorer__panel">
        <header class="explorer__panel-head">
          <h2>Blocks</h2>
          <p>Newest ${rows.length} of tip</p>
        </header>
        ${blocksTable(rows)}
        ${older ? `<p class="explorer__more">${blockLink(to - 1, `Older block #${to - 1}`)}</p>` : ""}
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
      ${blockLink(0, "block 0")} →
      <a href="/explorer/legacy/">legacy details</a>.
    </p>
  `;
  bindLookupForm();
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

  /** @type {[string, string, "text"|"name"|"hash"|"block"][]} */
  const fields = [
    ["Height", String(h.height ?? height), "block"],
    ["Time", formatTime(h.timestamp), "text"],
    ["Miner", String(h.miner || "—"), "name"],
    ["Difficulty", String(h.difficulty ?? "—"), "text"],
    ["Nonce", String(h.nonce ?? "—"), "text"],
    ["Inclusion fees", `${quantaToGuld(h.inclusion_fees || "0")} GULD`, "text"],
    ["Prev hash", String(h.prev_hash || "—"), "hash"],
    ["State root", String(h.state_root || "—"), "hash"],
    ["Tx root", String(h.tx_root || "—"), "hash"],
    ["Receipt root", String(h.receipt_root || "—"), "hash"],
    ["Rules hash", String(h.guld_rules_hash || "—"), "hash"],
  ];

  const dl = fields
    .map(([k, v, kind]) => {
      if (kind === "name") {
        return `<div class="explorer-kv"><dt>${escapeHtml(k)}</dt><dd>${nameLink(v)}</dd></div>`;
      }
      if (kind === "block") {
        return `<div class="explorer-kv"><dt>${escapeHtml(k)}</dt><dd class="num">${blockLink(v)}</dd></div>`;
      }
      if (kind === "hash") {
        const prevHint =
          k === "Prev hash" && height > 0
            ? ` <span class="explorer__meta">(${blockLink(height - 1, `block ${height - 1}`)})</span>`
            : "";
        return `<div class="explorer-kv"><dt>${escapeHtml(k)}</dt><dd><code title="${escapeHtml(v)}">${escapeHtml(shortHash(v, 14))}</code>${prevHint}</dd></div>`;
      }
      return `<div class="explorer-kv"><dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd></div>`;
    })
    .join("");

  const txRows = txs.length
    ? txs
        .map((tx, index) => {
          const s = summarizeTx(tx);
          const fee = quantaToGuld(tx.inclusion_fee || "0");
          return `<tr>
            <td class="num">${txLink(height, index, String(index))}</td>
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
                <th class="num">#</th><th>Type</th><th>Detail</th><th class="num">Amount</th><th class="num">Fee</th>
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
  setStatus("ok", `Height ${tipHeight.toLocaleString()} · tx ${height}:${index}`);

  const kvRows = txDetailRows(tx)
    .map(([label, html]) => {
      return `<div class="explorer-kv"><dt>${escapeHtml(label)}</dt><dd>${html}</dd></div>`;
    })
    .join("");

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
        <p>${txLink(height, index)} · ${blockLink(height, `block ${height}`)} · ${escapeHtml(formatTime(header.timestamp))}</p>
      </header>
      <p class="explorer__tx-summary">${linkifyTxPrimary(tx, s.primary)}
        ${s.amount !== "—" ? ` · <strong>${escapeHtml(s.amount)}</strong> GULD` : ""}</p>
      <dl class="explorer-kv-grid">${kvRows}</dl>
      ${siblings}
    </section>
  `;
}

/**
 * Flatten a tx into labeled HTML value rows (with links).
 * @param {Record<string, unknown>} tx
 * @returns {[string, string][]}
 */
function txDetailRows(tx) {
  /** @type {[string, string][]} */
  const rows = [];
  const type = String(tx.type || "unknown");
  rows.push(["Type", `<span class="tx-pill">${escapeHtml(type)}</span>`]);

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
  const skip = new Set(["type", "cosignatures", "keys", "signature", "payer_signature", "registrant_signature", "parent_signature", "sub_signature", "new_key_signature", "legacy_proof"]);

  for (const [key, val] of Object.entries(tx)) {
    if (skip.has(key) || val == null || val === "") continue;
    if (nameFields.has(key)) {
      rows.push([labelize(key), nameLink(String(val))]);
      continue;
    }
    if (key === "label" && tx.parent) {
      rows.push(["Full name", nameLink(`${tx.parent}.${val}`)]);
      rows.push(["Label", `<code>${escapeHtml(String(val))}</code>`]);
      continue;
    }
    if (amountFields.has(key)) {
      rows.push([labelize(key), `${escapeHtml(quantaToGuld(/** @type {string} */ (val)))} GULD`]);
      continue;
    }
    if (key === "memo") {
      rows.push(["Memo", `<code>${escapeHtml(String(val))}</code>`]);
      continue;
    }
    if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
      const s = String(val);
      const shown = s.length > 48 && /^0x[0-9a-fA-F]+$/.test(s) ? shortHash(s, 14) : s;
      rows.push([
        labelize(key),
        `<code title="${escapeHtml(s)}">${escapeHtml(shown)}</code>`,
      ]);
    }
  }

  if (Array.isArray(tx.keys) && tx.keys.length) {
    rows.push([
      "Keys",
      `<ul class="explorer__keys">${tx.keys
        .map((k) => `<li><code>${escapeHtml(shortHash(String(k), 12))}</code></li>`)
        .join("")}</ul>`,
    ]);
  }
  if (tx.threshold != null) {
    rows.push(["Threshold", `<span class="num">${escapeHtml(String(tx.threshold))}</span>`]);
  }

  return rows;
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
      ? `<div class="explorer-kv"><dt>Expires at height</dt><dd class="num">${blockLink(account.expires_at_height)}</dd></div>`
      : "";

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
          const s = summarizeActivity(/** @type {Record<string, unknown>} */ (row));
          const h = row.height != null ? String(row.height) : "";
          const idx = row.tx_index;
          const when = h
            ? blockLink(h, `h${h}`)
            : escapeHtml(formatTime(row.timestamp));
          let txCell = "—";
          if (h && idx != null && Number.isFinite(Number(idx))) {
            const tip = row.tx_id ? String(row.tx_id) : `${h}:${idx}`;
            txCell = txLink(h, idx, shortHash(tip, 8));
          } else if (h && s.type === "coinbase") {
            txCell = blockLink(h, "coinbase");
          } else if (h) {
            txCell = blockLink(h);
          }
          return `<tr>
            <td><span class="tx-pill">${escapeHtml(s.type)}</span></td>
            <td>${linkifyActivityPrimary(/** @type {Record<string, unknown>} */ (row), s)}</td>
            <td class="num">${escapeHtml(s.amount)}</td>
            <td class="num">${txCell}</td>
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
      <p class="explorer__balance"><strong>${escapeHtml(balanceGuld)}</strong> GULD</p>
      <dl class="explorer-kv-grid">
        <div class="explorer-kv"><dt>Threshold</dt><dd class="num">${escapeHtml(String(account.threshold ?? "—"))}</dd></div>
        <div class="explorer-kv"><dt>Nonce</dt><dd class="num">${escapeHtml(String(account.nonce ?? "—"))}</dd></div>
        <div class="explorer-kv"><dt>Account id</dt><dd><code title="${escapeHtml(String(account.account_id || ""))}">${escapeHtml(shortHash(String(account.account_id || "—"), 14))}</code></dd></div>
        <div class="explorer-kv"><dt>Master hash</dt><dd><code title="${escapeHtml(String(account.master_hash || ""))}">${escapeHtml(shortHash(String(account.master_hash || "—"), 14))}</code></dd></div>
        ${expires}
        ${legacy}
        ${parentName ? `<div class="explorer-kv"><dt>Parent</dt><dd>${nameLink(parentName)}</dd></div>` : ""}
      </dl>
      ${keys ? `<h3 class="explorer__subhead">Keys</h3><ul class="explorer__keys">${keys}</ul>` : ""}
      <p class="explorer__foot-note"><a href="/wallet/#/account/${encodeURIComponent(name)}">Open in wallet</a></p>
    </section>
    <section class="explorer__panel">
      <header class="explorer__panel-head"><h2>Recent activity</h2></header>
      ${
        actRows
          ? `<div class="explorer__table-wrap"><table class="explorer-table">
              <thead><tr><th>Type</th><th>Detail</th><th class="num">Amount</th><th class="num">Tx / block</th><th class="num">When</th></tr></thead>
              <tbody>${actRows}</tbody>
            </table></div>`
          : `<p class="explorer__empty">No activity yet.</p>`
      }
    </section>
  `;
}

route();
