/** Landing-only: the globe story in the hero. Loaded lazily so other pages never fetch it. */
export function mountHeroGlobe() {
  const section = document.querySelector(".hero--globe");
  if (!(section instanceof HTMLElement)) return;
  void import("./lib/hero-globe.js").then((m) => m.mountHeroGlobe(section));
}
