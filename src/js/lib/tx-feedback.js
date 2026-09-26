/**
 * Explorer deep-links and success copy for submitted txs.
 */

import { escapeHtml } from "./rpc.js";

/**
 * @param {unknown} txid
 * @returns {string} absolute path + hash
 */
export function explorerPendingTxHref(txid) {
  const raw = String(txid || "").trim();
  if (!raw || raw === "ok") return "/explorer/#/mempool";
  const hex = raw.startsWith("0x") || raw.startsWith("0X") ? raw : `0x${raw}`;
  return `/explorer/#/tx/pending/${encodeURIComponent(hex.toLowerCase())}`;
}

/**
 * Pull tx_id from guld_sendTransaction / faucet / sponsor API shapes.
 * @param {unknown} result
 * @returns {string}
 */
export function extractTxId(result) {
  if (typeof result === "string") return result.trim();
  if (!result || typeof result !== "object") return "";
  const r = /** @type {Record<string, unknown>} */ (result);
  const nested =
    r.result && typeof r.result === "object"
      ? /** @type {Record<string, unknown>} */ (r.result)
      : null;
  const id = r.tx_id ?? nested?.tx_id ?? "";
  return id != null ? String(id).trim() : "";
}

/**
 * Status HTML: label + explorer link when a tx id is present.
 * @param {string} label
 * @param {unknown} result
 */
export function formatTxSubmittedHtml(label, result) {
  const id = extractTxId(result);
  if (!id || id === "ok") return escapeHtml(label);
  const href = explorerPendingTxHref(id);
  const short = id.length > 20 ? `${id.slice(0, 18)}…` : id;
  return `${escapeHtml(label)} · <a href="${href}">${escapeHtml(short)}</a>`;
}

/** Inline status line for forms (place after submit actions). */
export function statusSlotHtml() {
  return `<p class="wallet__panel-status" data-panel-status hidden aria-live="polite"></p>`;
}
