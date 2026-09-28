/**
 * Shared recent-blocks fetch + table HTML for explorer and landing (GIP-19).
 */

import {
  escapeHtml,
  formatTime,
  quantaToGuld,
  rpcCall,
} from "./rpc.js";

/**
 * @param {string} rpcUrl
 * @param {number} height
 * @param {Map<number, object>} [cache]
 */
export async function fetchBlockByNumber(rpcUrl, height, cache) {
  if (cache?.has(height)) return cache.get(height);
  const block = await rpcCall(rpcUrl, "guld_getBlockByNumber", [height]);
  if (block && cache) cache.set(height, block);
  return block;
}

/**
 * Newest-first block rows from tip down.
 * @param {string} rpcUrl
 * @param {number} tipHeight
 * @param {number} limit
 * @param {Map<number, object>} [cache]
 * @returns {Promise<{ height: number, block: object }[]>}
 */
export async function fetchRecentBlockRows(rpcUrl, tipHeight, limit, cache) {
  const tip = Math.max(0, Number(tipHeight) || 0);
  const n = Math.max(1, Math.min(50, Number(limit) || 8));
  const from = tip;
  const to = Math.max(0, tip - n + 1);
  const heights = [];
  for (let h = from; h >= to; h -= 1) heights.push(h);
  const blocks = await Promise.all(
    heights.map((h) => fetchBlockByNumber(rpcUrl, h, cache)),
  );
  return heights
    .map((h, i) => ({ height: h, block: blocks[i] }))
    .filter((x) => x.block);
}

/**
 * @param {{ height: number, block: object }[]} rows
 * @param {{
 *   ticker?: string,
 *   blockHref?: (height: number | string) => string,
 *   accountHref?: (name: string) => string,
 *   legacyHref?: string,
 * }} [opts]
 */
export function blocksTableHtml(rows, opts = {}) {
  const ticker = opts.ticker || "GULD";
  const blockHref = opts.blockHref || ((h) => `#/block/${h}`);
  const accountHref =
    opts.accountHref ||
    ((name) => `#/account/${encodeURIComponent(String(name || "").toLowerCase())}`);
  const legacyHref = opts.legacyHref || "/explorer/legacy/";

  if (!rows.length) {
    return `<p class="explorer__empty">No blocks yet.</p>`;
  }

  const body = rows
    .map(({ height, block }) => {
      const h = block.header || {};
      const txCount = Array.isArray(block.txs) ? block.txs.length : 0;
      const fees = quantaToGuld(h.inclusion_fees || "0");
      const miner = String(h.miner || "—").trim() || "—";
      const minerCell =
        miner === "—"
          ? escapeHtml(miner)
          : `<a href="${accountHref(miner)}"><code>${escapeHtml(miner)}</code></a>`;
      const legacy =
        height === 0
          ? ` <a class="explorer-inline-link" href="${escapeHtml(legacyHref)}">legacy</a>`
          : "";
      return `<tr>
        <td class="num"><a href="${blockHref(height)}">${escapeHtml(String(height))}</a>${legacy}</td>
        <td>${escapeHtml(formatTime(h.timestamp))}</td>
        <td>${minerCell}</td>
        <td class="num">${txCount}</td>
        <td class="num">${escapeHtml(fees)}</td>
      </tr>`;
    })
    .join("");

  return `<div class="explorer__table-wrap"><table class="explorer-table">
    <thead><tr>
      <th class="num">Height</th><th>Time</th><th>Miner</th><th class="num">Txs</th><th class="num">Fees (${escapeHtml(ticker)})</th>
    </tr></thead>
    <tbody>${body}</tbody>
  </table></div>`;
}
