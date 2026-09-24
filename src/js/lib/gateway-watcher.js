/**
 * Poll registrar orders while a gateway desk is configured; toast on new payments.
 */

import { apiGet, resolveApiBase } from "./api.js";
import { GATEWAY_HREF } from "./auth.js";
import { isGatewayConfigured, loadGatewaySettings } from "./gateway-settings.js";
import { showToast } from "./toast.js";

const SEEN_KEY = "guld.gateway.seenPayments";

function loadSeen() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

/** @param {Set<string>} seen */
function saveSeen(seen) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen].slice(-200)));
}

let timer = /** @type {ReturnType<typeof setInterval> | null} */ (null);

export function startGatewayPaymentWatcher() {
  stopGatewayPaymentWatcher();
  const settings = loadGatewaySettings();
  if (!isGatewayConfigured(settings)) return;

  const tick = async () => {
    if (!isGatewayConfigured()) return;
    if (location.pathname.startsWith("/gateway")) return;
    try {
      const apiBase = resolveApiBase();
      const body = await apiGet(apiBase, "/registrar/orders");
      const items = body.items || [];
      const seen = loadSeen();
      let changed = false;
      for (const order of items) {
        if (order.status !== "payment_received") continue;
        const key = `${order.id}:payment_received`;
        if (seen.has(key)) continue;
        seen.add(key);
        changed = true;
        showToast({
          title: "Payment received",
          body: `Sponsorship for “${order.name}” is ready to sign.`,
          href: `${GATEWAY_HREF}#order=${encodeURIComponent(order.id)}`,
          hrefLabel: "Open gateway",
        });
      }
      if (changed) saveSeen(seen);
    } catch {
      /* offline / node down — silent */
    }
  };

  tick();
  timer = setInterval(tick, settings.pollMs || 12_000);
}

export function stopGatewayPaymentWatcher() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}
