/**
 * GIP-19 chain event stream — tip + mempool via Server-Sent Events.
 *
 * Prefer `EventSource`; fall back to polling snapshots when SSE is unavailable.
 */

import { resolveApiBase } from "./api.js";
import { resolveRpcUrl } from "./rpc.js";

/** @typedef {"streaming"|"reconnecting"|"polling"|"offline"} LiveTransport */

/**
 * Resolve SSE URL from the explorer RPC endpoint (or same-origin API).
 * @param {string} [rpcUrl]
 * @returns {string}
 */
export function chainEventsUrl(rpcUrl = resolveRpcUrl()) {
  try {
    const base = new URL(rpcUrl, typeof location !== "undefined" ? location.href : "http://127.0.0.1/");
    if (base.pathname === "/rpc" || base.pathname.endsWith("/rpc")) {
      base.pathname = "/api/v1/chain/events";
      base.search = "";
      base.hash = "";
      return base.href;
    }
    // Bare JSON-RPC host:port → same origin `/api/v1/chain/events` (mounted on RPC + HTTP).
    base.pathname = "/api/v1/chain/events";
    base.search = "";
    base.hash = "";
    return base.href;
  } catch {
    const api = resolveApiBase().replace(/\/$/, "");
    return `${api}/chain/events`;
  }
}

/**
 * @param {string} [rpcUrl]
 * @returns {string}
 */
export function mempoolSnapshotUrl(rpcUrl = resolveRpcUrl()) {
  try {
    const base = new URL(rpcUrl, typeof location !== "undefined" ? location.href : "http://127.0.0.1/");
    if (base.pathname === "/rpc" || base.pathname.endsWith("/rpc")) {
      base.pathname = "/api/v1/chain/mempool";
      base.search = "";
      base.hash = "";
      return base.href;
    }
    // HTTP mempool is on the API port; for :8545-only tooling use RPC `guld_getMempool`.
    base.pathname = "/api/v1/chain/mempool";
    base.search = "";
    base.hash = "";
    return base.href;
  } catch {
    const api = resolveApiBase().replace(/\/$/, "");
    return `${api}/chain/mempool`;
  }
}

/**
 * @typedef {{
 *   onHello?: (data: object) => void,
 *   onNewHeads?: (data: object) => void,
 *   onMempoolAdded?: (data: object) => void,
 *   onMempoolRemoved?: (data: object) => void,
 *   onTransport?: (t: LiveTransport, detail?: string) => void,
 *   onPollSnapshot?: () => void | Promise<void>,
 *   pollMs?: number,
 * }} ChainLiveHandlers
 */

/**
 * Start live chain updates. Returns a stop function.
 * @param {string} rpcUrl
 * @param {ChainLiveHandlers} handlers
 * @returns {() => void}
 */
export function startChainLive(rpcUrl, handlers) {
  let stopped = false;
  /** @type {EventSource | null} */
  let es = null;
  /** @type {ReturnType<typeof setInterval> | null} */
  let pollTimer = null;
  let reconnectAttempt = 0;

  const notify = (/** @type {LiveTransport} */ t, detail) => {
    try {
      handlers.onTransport?.(t, detail);
    } catch {
      /* ignore */
    }
  };

  const stopPoll = () => {
    if (pollTimer != null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  };

  const startPoll = () => {
    stopPoll();
    notify("polling", "EventSource unavailable — snapshot interval");
    const tick = () => {
      if (stopped) return;
      Promise.resolve(handlers.onPollSnapshot?.()).catch(() => {});
    };
    tick();
    pollTimer = setInterval(tick, Math.max(3_000, handlers.pollMs || 8_000));
  };

  const bindSource = () => {
    if (stopped) return;
    if (typeof EventSource === "undefined") {
      startPoll();
      return;
    }
    const url = chainEventsUrl(rpcUrl);
    try {
      es = new EventSource(url);
    } catch {
      startPoll();
      return;
    }

    es.addEventListener("hello", (ev) => {
      reconnectAttempt = 0;
      notify("streaming");
      try {
        handlers.onHello?.(JSON.parse(/** @type {MessageEvent} */ (ev).data));
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("newHeads", (ev) => {
      try {
        handlers.onNewHeads?.(JSON.parse(/** @type {MessageEvent} */ (ev).data));
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("mempoolAdded", (ev) => {
      try {
        handlers.onMempoolAdded?.(JSON.parse(/** @type {MessageEvent} */ (ev).data));
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("mempoolRemoved", (ev) => {
      try {
        handlers.onMempoolRemoved?.(JSON.parse(/** @type {MessageEvent} */ (ev).data));
      } catch {
        /* ignore */
      }
    });

    es.onopen = () => {
      reconnectAttempt = 0;
      stopPoll();
      notify("streaming");
    };

    es.onerror = () => {
      if (stopped) return;
      reconnectAttempt += 1;
      notify("reconnecting", `attempt ${reconnectAttempt}`);
      // Browser auto-reconnects EventSource; after repeated failures, add poll backup.
      if (reconnectAttempt >= 3 && pollTimer == null) {
        startPoll();
      }
    };
  };

  bindSource();

  return () => {
    stopped = true;
    stopPoll();
    if (es) {
      es.close();
      es = null;
    }
  };
}
