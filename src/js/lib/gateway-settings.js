/**
 * Local OTC desk config — any funded name can sell GULD via Paymento on this peer.
 * Overrides the peer’s published bootstrap desk when enabled.
 */

const KEY = "guld.gatewaySettings.v1";
export const GATEWAY_SETTINGS_EVENT = "guld:gateway-settings";

/**
 * @typedef {{
 *   enabled: boolean,
 *   provider: "paymento",
 *   paymentLink: string,
 *   apiKey: string,
 *   webhookSecret: string,
 *   registrarName: string,
 *   feeUsd: number,
 *   pollMs: number,
 *   published: boolean,
 * }} GatewaySettings
 */

/** @returns {GatewaySettings} */
export function defaultGatewaySettings() {
  return {
    enabled: false,
    provider: "paymento",
    paymentLink: "",
    apiKey: "",
    webhookSecret: "",
    registrarName: "",
    feeUsd: 10,
    pollMs: 12_000,
    published: false,
  };
}

/** @returns {GatewaySettings} */
export function loadGatewaySettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultGatewaySettings();
    return { ...defaultGatewaySettings(), ...JSON.parse(raw) };
  } catch {
    return defaultGatewaySettings();
  }
}

/** @param {Partial<GatewaySettings>} partial */
export function saveGatewaySettings(partial) {
  const next = { ...loadGatewaySettings(), ...partial };
  next.enabled = Boolean(next.enabled);
  next.published = Boolean(next.published);
  next.paymentLink = String(next.paymentLink || "").trim();
  next.apiKey = String(next.apiKey || "").trim();
  next.webhookSecret = String(next.webhookSecret || "").trim();
  next.registrarName = String(next.registrarName || "")
    .trim()
    .toLowerCase();
  next.feeUsd = Math.max(1, Math.min(10_000, Number(next.feeUsd) || 10));
  next.pollMs = Math.max(5_000, Number(next.pollMs) || 12_000);
  localStorage.setItem(KEY, JSON.stringify(next));
  document.dispatchEvent(new CustomEvent(GATEWAY_SETTINGS_EVENT));
  return next;
}

/** Gateway desk is usable when enabled and a payment link (or API key) is set. */
export function isGatewayConfigured(settings = loadGatewaySettings()) {
  return Boolean(
    settings.enabled && (settings.paymentLink || settings.apiKey) && settings.registrarName,
  );
}

/**
 * Invite URL so a friend pays YOUR desk on this peer (guld.io or local).
 * @param {GatewaySettings} [settings]
 * @param {string} [origin]
 */
export function deskInviteUrl(settings = loadGatewaySettings(), origin = location.origin) {
  if (!isGatewayConfigured(settings) || !settings.paymentLink) return null;
  const u = new URL("/register/", origin);
  u.searchParams.set("pay", settings.paymentLink);
  u.searchParams.set("sponsor", settings.registrarName);
  u.searchParams.set("fee", String(settings.feeUsd));
  return u.toString();
}
