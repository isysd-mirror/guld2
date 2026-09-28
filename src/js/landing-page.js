/** Landing-only: keyring redirect + globe story + Simba live blocks (GIP-19). */
import { keyring } from "./lib/keyring.js";
import { startChainLive } from "./lib/chain-events.js";
import {
  blocksTableHtml,
  fetchRecentBlockRows,
} from "./lib/recent-blocks.js";
import { resolveRpcUrl, rpcCall } from "./lib/rpc.js";
import { currencyTicker, loadNetworkInfo } from "./lib/network.js";

const LANDING_BLOCK_LIMIT = 4;

/** @type {(() => void) | null} */
let stopLandingLive = null;
/** @type {ReturnType<typeof setTimeout> | null} */
let landingBlocksTimer = null;
/** @type {Map<number, object>} */
const landingBlockCache = new Map();
/** @type {number} */
let landingTip = 0;
/** @type {string} */
let landingTicker = "tGULD";

/**
 * Returning users (local keyring) skip the marketing hero and open the wallet.
 * Hash deep-links (`/#developers`, `/#operators`, `/#simba`) stay on the landing page;
 * signup/login CTAs are still hidden when a keyring is present.
 */
export function mountLanding() {
  const hasKeyring = keyring.load().accounts.length > 0;
  if (hasKeyring) {
    hideLandingAuth();
    if (!location.hash) {
      location.replace("/wallet/");
      return;
    }
  }
  mountHeroGlobe();
  mountSimbaLive();
}

function hideLandingAuth() {
  for (const el of document.querySelectorAll("[data-landing-auth]")) {
    if (el instanceof HTMLElement) el.hidden = true;
  }
}

/** The globe story in the hero. Loaded lazily so other pages never fetch it. */
export function mountHeroGlobe() {
  const section = document.querySelector(".hero--globe");
  if (!(section instanceof HTMLElement)) return;
  void import("./lib/hero-globe.js").then((m) => m.mountHeroGlobe(section));
}

async function refreshLandingBlocks() {
  const slot = document.querySelector("[data-landing-blocks]");
  if (!(slot instanceof HTMLElement)) return;
  const rpcUrl = resolveRpcUrl();
  try {
    if (!landingTip) {
      const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
      landingTip = Number(info.height || 0);
    }
    const rows = await fetchRecentBlockRows(
      rpcUrl,
      landingTip,
      LANDING_BLOCK_LIMIT,
      landingBlockCache,
    );
    slot.innerHTML = blocksTableHtml(rows, {
      ticker: landingTicker,
      blockHref: (h) => `/explorer/#/block/${h}`,
      accountHref: (name) =>
        `/explorer/#/account/${encodeURIComponent(String(name || "").toLowerCase())}`,
      legacyHref: "/explorer/legacy/",
    });
  } catch (err) {
    console.warn("landing blocks", err);
    slot.innerHTML = `<p class="explorer__empty">Could not load blocks — is the node reachable?</p>`;
  }
}

function scheduleLandingBlocks() {
  if (landingBlocksTimer != null) clearTimeout(landingBlocksTimer);
  landingBlocksTimer = setTimeout(() => {
    landingBlocksTimer = null;
    landingBlockCache.clear();
    refreshLandingBlocks().catch(() => {});
  }, 400);
}

/** Compact live block table under the hero (same SSE bus as explorer). */
export function mountSimbaLive() {
  const root = document.querySelector("[data-landing-blocks]");
  if (!(root instanceof HTMLElement)) return;

  if (stopLandingLive) {
    stopLandingLive();
    stopLandingLive = null;
  }

  void (async () => {
    try {
      const net = await loadNetworkInfo();
      landingTicker = currencyTicker(net);
    } catch {
      /* keep default ticker */
    }
    const rpcUrl = resolveRpcUrl();
    try {
      const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
      landingTip = Number(info.height || 0);
    } catch (err) {
      console.warn("landing tip", err);
    }
    await refreshLandingBlocks();

    stopLandingLive = startChainLive(rpcUrl, {
      onHello(data) {
        if (data?.tip_height != null) landingTip = Number(data.tip_height);
      },
      onNewHeads(data) {
        if (data?.height != null) landingTip = Number(data.height);
        scheduleLandingBlocks();
      },
      async onPollSnapshot() {
        try {
          const info = await rpcCall(rpcUrl, "guld_nodeInfo", []);
          landingTip = Number(info.height || landingTip);
        } catch {
          /* ignore */
        }
        landingBlockCache.clear();
        await refreshLandingBlocks();
      },
    });
  })();
}
