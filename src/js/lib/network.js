/**
 * Network mode from the connected node (`/chain/status`).
 * Testnet and mainnet stay distinct forever — same UI tree, different peers.
 */

import { apiGet, persistApiBase, resolveApiBase } from "./api.js";

/** @typedef {{ mode: "testnet"|"mainnet", network: string|null, chainId: number, faucet: object|null }} NetworkInfo */

/**
 * Known chains for the footer switcher. Only Simba is live today;
 * add entries (and apiBase) as more networks come online.
 * @type {ReadonlyArray<{ id: string, label: string, chainId: number, mode: "testnet"|"mainnet", apiBase: string, available: boolean }>}
 */
export const NETWORK_OPTIONS = [
  {
    id: "simba",
    label: "Simba",
    chainId: 2,
    mode: "testnet",
    apiBase: "https://guld.io/api/v1",
    available: true,
  },
  {
    id: "main",
    label: "Mainnet",
    chainId: 1,
    mode: "mainnet",
    apiBase: "https://guld.io/api/v1",
    available: false,
  },
];

/** Fired on `document` after api base / network cache changes. */
export const NETWORK_EVENT = "guld:network";

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

export function clearNetworkCache() {
  cached = null;
}

/**
 * Native currency ticker for display. Protocol amounts stay GULD quanta;
 * testnet UI shows tGULD so balances are never confused with mainnet.
 * @param {NetworkInfo|null|undefined} [info]
 */
export function currencyTicker(info = cached) {
  return info?.mode === "mainnet" ? "GULD" : "tGULD";
}

/**
 * Match a switcher option to the connected peer (by network name, then chain id).
 * @param {NetworkInfo} info
 */
export function matchNetworkOption(info) {
  if (info.network) {
    const byName = NETWORK_OPTIONS.find((o) => o.id === info.network);
    if (byName) return byName;
  }
  return NETWORK_OPTIONS.find((o) => o.chainId === info.chainId) ?? null;
}

/**
 * Switch the browser to a known network peer and reload.
 * Same-origin stays if the peer already reports that network.
 * @param {string} optionId
 */
export function selectNetwork(optionId) {
  const opt = NETWORK_OPTIONS.find((o) => o.id === optionId);
  if (!opt || !opt.available) return false;

  const current = cached;
  const already =
    current &&
    (current.network === opt.id || current.chainId === opt.chainId);
  const base = resolveApiBase();
  if (already && (base === "/api/v1" || base === opt.apiBase)) {
    return false;
  }

  persistApiBase(opt.apiBase);
  clearNetworkCache();
  try {
    document.dispatchEvent(new CustomEvent(NETWORK_EVENT, { detail: { id: opt.id } }));
  } catch {
    /* ignore */
  }
  globalThis.location.reload();
  return true;
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
