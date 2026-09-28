/** Landing-only: keyring redirect + globe story. */
import { keyring } from "./lib/keyring.js";

/**
 * Returning users (local keyring) skip the marketing hero and open the wallet.
 * Hash deep-links (`/#developers`, `/#operators`) stay on the landing page;
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
