/**
 * Network mode from the connected node (`/chain/status`).
 * Testnet and mainnet stay distinct forever — same UI tree, different peers.
 */

import { apiGet, resolveApiBase } from "./api.js";

/** @typedef {{ mode: "testnet"|"mainnet", network: string|null, chainId: number, faucet: object|null }} NetworkInfo */

/** @type {NetworkInfo|null} */
let cached = null;

/**
 * @returns {Promise<NetworkInfo>}
 */
export async function loadNetworkInfo(apiBase = resolveApiBase()) {
  try {
    const st = await apiGet(apiBase, "/chain/status");
    const mode = st?.mode === "mainnet" ? "mainnet" : "testnet";
    cached = {
      mode,
      network: typeof st?.network === "string" ? st.network : null,
      chainId: Number(st?.chainId ?? (mode === "mainnet" ? 1 : 2)),
      faucet: st?.faucet && typeof st.faucet === "object" ? st.faucet : null,
    };
  } catch {
    cached = {
      mode: "testnet",
      network: null,
      chainId: 2,
      faucet: null,
    };
  }
  return cached;
}

/** @returns {NetworkInfo|null} */
export function getCachedNetworkInfo() {
  return cached;
}

/**
 * Presets for Settings — point the browser at a different peer.
 * Same-origin `/api/v1` is whatever node serves this tree.
 */
export const NETWORK_PRESETS = [
  {
    id: "same-origin",
    label: "This peer (same-origin)",
    apiBase: "/api/v1",
    hint: "Use when guld-node serves this site (`--http-static`).",
  },
  {
    id: "simba",
    label: "Simba testnet (guld.io)",
    apiBase: "https://guld.io/api/v1",
    hint: "Public testnet — faucet + free registration when the peer enables it.",
  },
  {
    id: "main",
    label: "Mainnet (guld.io)",
    apiBase: "https://guld.io/api/v1",
    hint: "After mainnet launch: point at the mainnet peer URL (update when live).",
  },
];

/**
 * Banner copy for site chrome.
 * @param {NetworkInfo} info
 */
export function bannerText(info) {
  if (info.mode === "mainnet") {
    return {
      html: `<strong>Guld mainnet.</strong> Real value — verify the peer before sending.`,
      label: "Mainnet",
    };
  }
  const net = info.network ? escapeHtml(info.network) : "testnet";
  return {
    html: `<strong>Guld 2.0 testnet</strong> (<code>${net}</code>, chain ${info.chainId}). Not mainnet — faucets may fund registration and drips.`,
    label: "Testnet",
  };
}

/** @param {string} s */
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
