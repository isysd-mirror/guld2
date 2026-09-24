/**
 * Resolve which Paymento desk a registrant should pay.
 * Priority: invite query (?pay=) → local OTC override → peer bootstrap desk.
 */

import { apiGet } from "./api.js";
import { isGatewayConfigured, loadGatewaySettings } from "./gateway-settings.js";

/**
 * @typedef {{
 *   source: "invite" | "local" | "peer",
 *   paymentLink: string,
 *   feeUsd: number,
 *   sponsor: string | null,
 *   apiKey: string,
 * }} DeskCheckout
 */

/**
 * @param {string} apiBase
 * @returns {Promise<DeskCheckout | null>}
 */
export async function resolveRegistrationDesk(apiBase) {
  const params = new URLSearchParams(location.search);
  const pay = (params.get("pay") || "").trim();
  const sponsor = (params.get("sponsor") || "").trim().toLowerCase() || null;
  const feeParam = Number(params.get("fee"));

  if (pay.startsWith("http://") || pay.startsWith("https://")) {
    return {
      source: "invite",
      paymentLink: pay,
      feeUsd: Number.isFinite(feeParam) && feeParam > 0 ? feeParam : 10,
      sponsor,
      apiKey: "",
    };
  }

  const local = loadGatewaySettings();
  // Selling to yourself from the same browser is rare; prefer peer for first-time signup
  // unless ?mine=1 or local is enabled AND user is already registered (OTC operator testing).
  if (isGatewayConfigured(local) && params.get("mine") === "1" && local.paymentLink) {
    return {
      source: "local",
      paymentLink: local.paymentLink,
      feeUsd: local.feeUsd,
      sponsor: local.registrarName,
      apiKey: local.apiKey,
    };
  }

  try {
    const info = await apiGet(apiBase, "/registrar");
    if (info.enabled && info.paymentLink) {
      return {
        source: "peer",
        paymentLink: String(info.paymentLink),
        feeUsd: Number(info.feeUsd) || 10,
        sponsor: null,
        apiKey: "",
      };
    }
    // Peer has OTC desks published — use first if no bootstrap link (dev).
    const desks = info.desks || [];
    if (Array.isArray(desks) && desks[0]?.paymentLink) {
      return {
        source: "peer",
        paymentLink: String(desks[0].paymentLink),
        feeUsd: Number(desks[0].feeUsd) || 10,
        sponsor: desks[0].registrarName ? String(desks[0].registrarName) : null,
        apiKey: "",
      };
    }
  } catch {
    /* fall through */
  }

  if (isGatewayConfigured(local) && local.paymentLink) {
    return {
      source: "local",
      paymentLink: local.paymentLink,
      feeUsd: local.feeUsd,
      sponsor: local.registrarName,
      apiKey: local.apiKey,
    };
  }

  return null;
}
