/** Landing-only: the globe story in the hero. Loaded lazily so other pages never fetch it. */
export function mountHeroGlobe() {
  const section = document.querySelector(".hero--globe");
  if (!(section instanceof HTMLElement)) return;
  void import("./lib/hero-globe.js").then((m) => m.mountHeroGlobe(section));
}

/**
 * Keep the struck key on one line: full 64-hex when it fits, otherwise
 * middle-truncated like the activity log (0x7f3a9c…5f3a1b28). The full key
 * stays in the title attribute.
 */
export function mountHeroKey() {
  const key = document.querySelector(".hero__key");
  const lead = document.querySelector(".hero__lede-lead");
  // The copy column shrinks to its content, so measure the stage's content box.
  const stage = key?.closest(".hero__stage");
  if (!(key instanceof HTMLElement) || !(lead instanceof HTMLElement) || !(stage instanceof HTMLElement)) return;
  // The bottom row is shared with "Get started" (left) and the activity log
  // (right): while those are shown, the centered line must stay clear of both.
  const log = document.querySelector(".hero__log");
  const room = () => {
    const cs = getComputedStyle(stage);
    // The hero section is always full-bleed; the stage grid item may shrink to content.
    const hero = stage.closest(".hero") || stage;
    const width = hero.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!(log instanceof HTMLElement) || getComputedStyle(log).display === "none") return width;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return width - 2 * (log.getBoundingClientRect().width + 1.5 * rem);
  };
  const full = key.textContent.trim();
  key.title = full;

  const probe = document.createElement("span");
  probe.textContent = "0".repeat(20);
  probe.style.visibility = "hidden";
  probe.style.position = "absolute";

  const fit = () => {
    key.classList.remove("hero__key--own-line");
    key.textContent = full;
    key.append(probe);
    const charW = probe.getBoundingClientRect().width / 20;
    probe.remove();
    if (!charW) return;
    const gap = parseFloat(getComputedStyle(key).marginLeft) || 0;
    const width = room();
    let avail = width - lead.getBoundingClientRect().width - gap;
    // Too narrow to share the line with "Send to alice, not": the key takes its
    // own (bottom) line, still clear of the log and "Get started".
    if (avail < charW * 16) {
      key.classList.add("hero__key--own-line");
      avail = width;
    }
    const fits = Math.floor(avail / charW);
    if (fits >= full.length) return;
    const keep = Math.max(10, fits - 1); // 1 char for the ellipsis
    const head = Math.ceil(keep / 2);
    const tail = keep - head;
    key.textContent = `${full.slice(0, head)}…${full.slice(full.length - tail)}`;
  };
  new ResizeObserver(fit).observe(stage.closest(".hero") || stage);
  fit();
}
