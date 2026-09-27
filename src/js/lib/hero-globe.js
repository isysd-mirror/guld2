/**
 * Landing hero — the Guld story as one continuous 3D scene.
 *
 *   isysd alone → names appear around it (tier-colored by letter count) →
 *   the map reveals outward from isysd while the camera zooms out and the
 *   globe starts turning → transfers fly as arcs and a log ticks in the
 *   corner, accelerating → final composition: shield + 2.0 BETA above,
 *   "Address by name. Commit by hash." below.
 *
 * Framework-less canvas 2D, time-based (not frame-based). Pauses off-screen
 * and in background tabs; renders a single static frame under reduced motion.
 * Activity shown is simulated — the log is labeled as such.
 */
import { GLOBE_POINTS_B64, GLOBE_POINTS_COUNT } from "./globe-points.js";

/**
 * Story cast — pinned to the sphere from the first frame, so they turn and
 * zoom with the map as one body. They're scattered 2–5° around isysd at
 * uneven angles — the opening close-up (18×) shows about 6° across, where a
 * land dot is as big as an avatar. Positions are illustrative.
 */
const ACCOUNTS = [
  { name: "isysd", lat: 40.0, lon: -95.0 },
  { name: "chrissmejia", lat: 37.6, lon: -91.2 },
  { name: "rhea", lat: 36.4, lon: -97.9 },
  { name: "x", lat: 43.4, lon: -92.6 },
  { name: "ai", lat: 39.1, lon: -100.9 },
  { name: "bob", lat: 42.7, lon: -98.6 },
  { name: "matteo", lat: 35.9, lon: -93.6 },
  { name: "lena", lat: 44.6, lon: -96.0 },
  { name: "kai", lat: 38.3, lon: -98.0 },
  { name: "amara", lat: 41.9, lon: -89.9 },
  { name: "oren", lat: 39.4, lon: -89.3 },
];

/** Groups (threshold accounts) and example dapps — all fictional. */
const GROUP_NAMES = ["harbor", "atlas-coop", "kinfolk", "northwind"];
const DAPPS = ["tessera.games", "lumen.shop", "notesy.app", "orbit.social", "fieldbook.io"];
/** Event mix once the story is running: transfers, tip commits, group cosigns, dapp sign-ins. */
const EVENT_WEIGHTS = [["send", 0.5], ["commit", 0.26], ["login", 0.14], ["group", 0.1]];

/** Extra names for the activity log once the map is out — each pinned to a land point. */
const EXTRA_NAMES = [
  "mira", "juno", "tomas", "elena", "rafa", "nadia", "yuki", "omar", "sofia", "leo", "ines", "diego",
  "hana", "marco", "zoe", "ivan", "noor", "pablo", "aiko", "ruth", "sam", "vera", "tariq", "luca",
  "ada", "kim", "jorge", "mei", "lucas", "farah",
];

/** Timeline, seconds since the hero became visible. */
const T = {
  isysd: 0.2,
  appearStart: 1.0,
  appearStep: 0.36,
  globeIn: [2.4, 5.4], // halo / disc
  reveal: [2.4, 6.6], // map grows outward from isysd
  zoom: [2.5, 6.8],
  fly: [3.0, 6.2],
  spin: [5.2, 16.9], // starts late in the zoom-out (≈4×); one full turn back to the Americas
  arcsStart: 1.8,
  arcsFast: 6.8,
  final: 7.0,
};

const ZOOM_START = 18; // close enough that one land dot ≈ one avatar
const FINAL_TILT = (22 * Math.PI) / 180;
const AMOUNTS = [1, 1, 2, 2, 5, 5, 10, 10, 25, 50, 100, 250, 1000];
const TAU = Math.PI * 2;
const TRAIL = 0.38; // fraction of the path lit behind the head
const LAND = 0.45; // seconds for the trail to collapse into the destination

/** @param {string} name */
function letterCount(name) {
  return (name.match(/[a-z]/g) || []).length;
}

/** Spec 07 §3.1 ladder → visual tier (1, 2, 3, 5 = 4–5 letters, 6 = floor). */
function tierOf(name) {
  const l = letterCount(name);
  return l <= 3 ? l : l <= 5 ? 5 : 6;
}

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp01 = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t);
const backOut = (t) => {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const c = 1.7;
  const u = t - 1;
  return 1 + u * u * ((c + 1) * u + c);
};
const lerp = (a, b, k) => a + (b - a) * k;
const span = (t, [a, b]) => smooth((t - a) / (b - a));

/** @param {number} lat @param {number} lon → unit vector (x east, y north, z toward lon 0) */
function unit(lat, lon) {
  const a = (lat * Math.PI) / 180;
  const b = (lon * Math.PI) / 180;
  const c = Math.cos(a);
  return [c * Math.sin(b), Math.sin(a), c * Math.cos(b)];
}

/** Decode the baked land points (uint16 LE lat/lon pairs) into unit vectors. */
function decodePoints() {
  const bin = atob(GLOBE_POINTS_B64);
  const n = GLOBE_POINTS_COUNT;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    const lat = ((bin.charCodeAt(o) | (bin.charCodeAt(o + 1) << 8)) / 65535) * 180 - 90;
    const lon = ((bin.charCodeAt(o + 2) | (bin.charCodeAt(o + 3) << 8)) / 65535) * 360 - 180;
    const [x, y, z] = unit(lat, lon);
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}

function slerp(a, b, u) {
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const th = Math.acos(d);
  if (th < 1e-4) return a;
  const s = Math.sin(th);
  const ka = Math.sin((1 - u) * th) / s;
  const kb = Math.sin(u * th) / s;
  return [a[0] * ka + b[0] * kb, a[1] * ka + b[1] * kb, a[2] * ka + b[2] * kb];
}

/** "#rrggbb" / "#rgb" → [r, g, b] (cached; tokens are plain hex). */
const rgbCache = new Map();
function rgbOf(hex) {
  let v = rgbCache.get(hex);
  if (v) return v;
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.replace(/./g, "$&$&");
  const n = parseInt(h, 16);
  v = Number.isFinite(n) ? [(n >> 16) & 255, (n >> 8) & 255, n & 255] : [232, 236, 244];
  rgbCache.set(hex, v);
  return v;
}

function readTokens() {
  const cs = getComputedStyle(document.documentElement);
  const get = (k, fb) => cs.getPropertyValue(k).trim() || fb;
  return {
    tier: {
      1: get("--guld-name-1", "#e6c15c"),
      2: get("--guld-name-2", "#cfd6e0"),
      3: get("--guld-name-3", "#c98d55"),
      5: get("--guld-name-5", "#93a9d2"),
      6: get("--guld-name-6", "#e8ecf4"),
    },
    font: get("--font-display", "sans-serif"),
  };
}

/** @param {HTMLElement} section */
export function mountHeroGlobe(section) {
  const canvas = section.querySelector("canvas.hero__globe");
  const log = section.querySelector(".hero__log");
  if (!(canvas instanceof HTMLCanvasElement) || !(log instanceof HTMLElement)) return;
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 40rem)").matches;
  const nav = /** @type {any} */ (navigator);
  const lowEnd = (nav.hardwareConcurrency || 8) <= 4 || nav.connection?.saveData === true;
  const tokens = readTokens();

  const points = decodePoints();
  let pointCount = mobile || lowEnd ? Math.min(1300, GLOBE_POINTS_COUNT) : GLOBE_POINTS_COUNT;
  const maxArcs = mobile ? 7 : 12;
  const dpr = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2);

  const cast = ACCOUNTS.map((a, i) => ({
    ...a,
    i,
    tier: tierOf(a.name),
    vec: unit(a.lat, a.lon),
    appearAt: i === 0 ? T.isysd : T.appearStart + (i - 1) * T.appearStep,
  }));
  const isysd = cast[0];

  // Snap every cast member onto its nearest land dot, and hide that dot: the
  // avatar *is* the dot, so they line up exactly as the zoom collapses.
  const taken = new Uint8Array(GLOBE_POINTS_COUNT);
  for (const a of cast) {
    let best = -1;
    let bestD = -2;
    for (let i = 0; i < GLOBE_POINTS_COUNT; i++) {
      if (taken[i]) continue;
      const o = i * 3;
      const d = points[o] * a.vec[0] + points[o + 1] * a.vec[1] + points[o + 2] * a.vec[2];
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    taken[best] = 1;
    const o = best * 3;
    a.vec = [points[o], points[o + 1], points[o + 2]];
  }

  // Angular distance of every land point from isysd: the map reveals outward from there.
  const angFromOrigin = new Float32Array(GLOBE_POINTS_COUNT);
  for (let i = 0; i < GLOBE_POINTS_COUNT; i++) {
    const o = i * 3;
    const d = points[o] * isysd.vec[0] + points[o + 1] * isysd.vec[1] + points[o + 2] * isysd.vec[2];
    angFromOrigin[i] = Math.acos(Math.max(-1, Math.min(1, d)));
  }

  /** Pseudo-random with a fixed seed so the story is the same on every visit. */
  let seed = 11;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Extras live on land points spread across the (shuffled) point cloud.
  const extras = EXTRA_NAMES.map((name, k) => {
    let idx = Math.floor(rand() * GLOBE_POINTS_COUNT);
    while (taken[idx]) idx = (idx + 1) % GLOBE_POINTS_COUNT;
    taken[idx] = 1;
    const o = idx * 3;
    return { name, k, idx, tier: tierOf(name), vec: [points[o], points[o + 1], points[o + 2]] };
  });

  // Background community: a sparse scatter of tier-colored names across the
  // world (0 = plain land dot). Short names are rare, like the real fee ladder.
  const COMMUNITY_TIERS = [1, 2, 3, 5];
  const communityTier = new Uint8Array(GLOBE_POINTS_COUNT);
  for (let i = 0; i < GLOBE_POINTS_COUNT; i++) {
    if (rand() >= 0.08) continue;
    const r = rand();
    communityTier[i] = r < 0.05 ? 1 : r < 0.17 ? 2 : r < 0.45 ? 3 : 5;
  }

  let w = 0;
  let h = 0;
  let cx = 0;
  let cy = 0;
  let R = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cx = w / 2;
    cy = h * (mobile ? 0.44 : 0.47);
    R = Math.max(110, Math.min(w * 0.34, h * 0.26));
    if (reduceMotion) renderFrame(T.final + 30, 0);
    else if (stopped) renderFrame(clock, 0); // keep the still frame after a resize
  }

  // ---- Story state -------------------------------------------------------
  let clock = 0; // seconds of *running* time (pauses don't advance the story)
  const LON0 = (-isysd.lon * Math.PI) / 180;
  let lonRot = LON0;
  /** @type {{a:number[], b:number[], from?:any, to?:any, start:number, dur:number}[]} */
  let arcs = [];
  let nextNamed = T.arcsStart;
  let nextAnon = 5.0;
  let namedCount = 0;
  let finalized = false;
  const frameTimes = [];

  // Per-frame camera (set in renderFrame, read by spawners).
  let s = ZOOM_START;
  let sR = 0;
  let fly = 0;
  let reveal = 0;
  let cosL = 1;
  let sinL = 0;
  let cosT = 1;
  let sinT = 0;
  /** @type {({appear:number, z:number, px:number, py:number, vis:number} | null)[]} */
  let pos = [];

  /** Rotate a unit vector by current longitude spin then tilt. */
  function rot(x, y, z) {
    const x1 = x * cosL + z * sinL;
    const z1 = -x * sinL + z * cosL;
    return [x1, y * cosT - z1 * sinT, y * sinT + z1 * cosT];
  }

  /** True when a globe point is on the front face *and* inside the canvas. */
  function onScreen3(x, y, z) {
    const [rx, ry, rz] = rot(x, y, z);
    if (rz < 0.12) return false;
    const sx = cx + sR * rx;
    const sy = cy - sR * ry;
    return sx > 24 && sy > 24 && sx < w - 24 && sy < h - 24;
  }

  function pickAmount() {
    return AMOUNTS[Math.floor(rand() * AMOUNTS.length)];
  }

  /** Who can send/receive right now: appeared cast + extras whose land is revealed, all front-facing and on screen. */
  function visiblePeople(t) {
    const people = cast.filter((a) => {
      if (t < a.appearAt + 0.2) return false;
      const P = pos[a.i];
      return !!P && P.vis > 0.6 && onScreen3(a.vec[0], a.vec[1], a.vec[2]);
    });
    for (const e of extras) {
      if (angFromOrigin[e.idx] <= reveal - 0.12 && onScreen3(e.vec[0], e.vec[1], e.vec[2])) people.push(e);
    }
    return people;
  }

  /** On-chain / off-chain moments that don't travel: rings at a point. */
  /** @type {{vec:number[], start:number, kind:string}[]} */
  let pulses = [];

  function hexTip() {
    let h = "";
    for (let k = 0; k < 8; k++) h += Math.floor(rand() * 16).toString(16);
    return `0x${h.slice(0, 4)}…${h.slice(4)}`;
  }

  function pickKind() {
    let r = rand();
    for (const [k, wgt] of EVENT_WEIGHTS) {
      if ((r -= wgt) <= 0) return k;
    }
    return "send";
  }

  function spawnNamed(t) {
    if (namedCount === 0) {
      if (!pos[0] || !pos[1]) return;
      namedCount++;
      arcs.push({ a: isysd.vec, b: cast[1].vec, from: isysd, to: cast[1], start: t, dur: 1.15 });
      logEntry("send", { from: isysd, to: cast[1], amount: 1000 });
      return;
    }
    const pool = visiblePeople(t);
    if (pool.length < 2) return;
    const who = pool[Math.floor(rand() * pool.length)];
    const kind = namedCount === 1 ? "commit" : pickKind();
    namedCount++;
    if (kind === "send") {
      if (arcs.length >= maxArcs) return;
      let to;
      do to = pool[Math.floor(rand() * pool.length)];
      while (to === who);
      arcs.push({ a: who.vec, b: to.vec, from: who, to, start: t, dur: 1.15 });
      logEntry("send", { from: who, to, amount: pickAmount() });
    } else if (kind === "commit") {
      pulses.push({ vec: who.vec, start: t, kind });
      logEntry("commit", { who, tip: hexTip() });
    } else if (kind === "group") {
      pulses.push({ vec: who.vec, start: t, kind });
      const n = 3 + Math.floor(rand() * 3);
      const m = 2 + Math.floor(rand() * (n - 2));
      logEntry("group", { group: GROUP_NAMES[Math.floor(rand() * GROUP_NAMES.length)], m, n, tip: hexTip() });
    } else {
      pulses.push({ vec: who.vec, start: t, kind });
      logEntry("login", { who, site: DAPPS[Math.floor(rand() * DAPPS.length)] });
    }
  }

  /** A random *revealed*, front-facing, on-screen land point (or -1). */
  function pickPoint() {
    for (let tries = 0; tries < 8; tries++) {
      const i = Math.floor(rand() * pointCount);
      if (angFromOrigin[i] > reveal - 0.12) continue;
      const o = i * 3;
      if (onScreen3(points[o], points[o + 1], points[o + 2])) return o;
    }
    return -1;
  }

  function spawnAnon(t) {
    if (arcs.length >= maxArcs || fly < 0.5) return;
    const i = pickPoint();
    const j = pickPoint();
    if (i < 0 || j < 0 || i === j) return;
    arcs.push({
      a: [points[i], points[i + 1], points[i + 2]],
      b: [points[j], points[j + 1], points[j + 2]],
      start: t,
      dur: 0.9 + rand() * 0.4,
    });
  }

  function schedule(t) {
    const story = t < T.final + 0.5;
    if (t >= nextNamed) {
      spawnNamed(t);
      nextNamed = t + (story ? lerp(1.5, 0.45, span(t, [T.arcsStart, T.arcsFast])) : 1.4 + rand() * 1.6);
    }
    if (t >= nextAnon) {
      spawnAnon(t);
      nextAnon = t + (story ? lerp(0.9, 0.16, span(t, [5, T.arcsFast])) : 0.9 + rand() * 1.4);
    }
  }

  // ---- Log ---------------------------------------------------------------
  const caption = document.createElement("li");
  caption.className = "hero__log-caption";
  caption.textContent = "Simulated activity";
  log.append(caption);

  function nameEl(acct) {
    const el = document.createElement("span");
    el.className = `hero__name hero__name--t${acct.tier}`;
    el.textContent = acct.name;
    return el;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";
  /** Tiny line icons per event kind (DOM-built: no inline styles, CSP-safe). */
  const ICONS = {
    send: "M3 8h9M9 4.5 12.5 8 9 11.5",
    commit: "M6 2.5 4.8 13.5M11.2 2.5 10 13.5M2.5 6h11M2 10h11",
    group: "M5.5 8a2.5 2.5 0 1 0 0 .01M10.5 8a2.5 2.5 0 1 0 0 .01",
    login: "M6.5 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 0H14m-2 0v2.5M10 8v1.8",
  };
  function iconEl(kind) {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("class", `hero__log-icon hero__log-icon--${kind}`);
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", ICONS[kind]);
    svg.append(path);
    return svg;
  }

  function strong(text) {
    const b = document.createElement("strong");
    b.textContent = text;
    return b;
  }

  function codeEl(text) {
    const c = document.createElement("code");
    c.textContent = text;
    return c;
  }

  function logEntry(kind, e) {
    const li = document.createElement("li");
    li.className = `hero__log-item hero__log-item--${kind}`;
    const text = document.createElement("span");
    if (kind === "send") {
      text.append(nameEl(e.from), " sent ", strong(`${e.amount.toLocaleString("en-US")} GULD`), " to ", nameEl(e.to));
    } else if (kind === "commit") {
      text.append(nameEl(e.who), " committed tip ", codeEl(e.tip));
    } else if (kind === "group") {
      const g = document.createElement("span");
      g.className = "hero__name";
      g.textContent = e.group;
      text.append(g, " signed ", strong(`${e.m} of ${e.n}`), " → tip ", codeEl(e.tip));
    } else {
      text.append(nameEl(e.who), " signed in to ", strong(e.site));
    }
    li.append(text, iconEl(kind));
    log.append(li);
    const items = log.querySelectorAll(".hero__log-item");
    const keep = mobile ? 3 : 4;
    for (let i = 0; i < items.length - keep; i++) items[i].remove();
  }

  // ---- Rendering ---------------------------------------------------------
  function pulse(x, y, r, alpha) {
    if (alpha <= 0.01 || r <= 0) return;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.strokeStyle = `rgba(255, 236, 200, ${alpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  /**
   * Flat polished-mirror plate: subtle linear face, a broad light wash that
   * floods every plate in sync (one shared light), a bevelled edge and a
   * tight additive bloom. `k` (0..1) scales every effect.
   */
  function drawGlossyAvatar(x, y, r, color, k, t, i) {
    const rgb = rgbOf(color);
    const c = (m, a = 1) => `rgba(${m[0] | 0}, ${m[1] | 0}, ${m[2] | 0}, ${a})`;
    const mix = (m, to, f) => [lerp(m[0], to[0], f), lerp(m[1], to[1], f), lerp(m[2], to[2], f)];
    const WHITE = [255, 255, 255];
    const INK = [6, 9, 22];
    const a0 = ctx.globalAlpha;

    // 1. Tight bloom behind the sphere (additive, so it reads as light, not fog).
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const bloom = ctx.createRadialGradient(x, y, r * 0.9, x, y, r * 1.9);
    bloom.addColorStop(0, c(rgb, 0.32 * k * a0));
    bloom.addColorStop(1, c(rgb, 0));
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.9, 0, TAU);
    ctx.fill();
    ctx.restore();

    // 2. Face: a flat polished plate — only a gentle linear falloff, no sphere.
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.clip();
    const face = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    face.addColorStop(0, c(mix(rgb, WHITE, 0.22 * k)));
    face.addColorStop(0.55, c(rgb));
    face.addColorStop(1, c(mix(rgb, INK, 0.28 * k)));
    ctx.fillStyle = face;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);

    // 3. Light flood: one shared light source, so every plate is lit at the
    //    same angle and in sync. A broad wash rolls across the whole plate —
    //    brightening it progressively, peaking, then receding — then rests.
    const PASS = 3.6; // seconds for the wash to cross
    const REST = 2.4; // dark pause between passes
    const cyc = (t - 0.6) % (PASS + REST); // first pass once the first names are in
    if (t > 0.6 && cyc < PASS) {
      const u = smooth(cyc / PASS);
      const w = r * 1.15; // wide: the wash covers most of the plate at once
      const off = lerp(-r * 1.2 - w, r * 1.2 + w, u); // fully off-plate at both ends
      ctx.translate(x, y);
      ctx.rotate(-0.62);
      const g = ctx.createLinearGradient(0, off - w, 0, off + w);
      g.addColorStop(0, c(WHITE, 0));
      g.addColorStop(0.25, c(WHITE, 0.3 * k));
      g.addColorStop(0.5, c(WHITE, 0.72 * k));
      g.addColorStop(0.6, c(WHITE, 0.88 * k));
      g.addColorStop(0.7, c(WHITE, 0.4 * k));
      g.addColorStop(1, c(WHITE, 0));
      ctx.fillStyle = g;
      ctx.fillRect(-r * 1.6, off - w, r * 3.2, w * 2);
    }
    ctx.restore();

    // 5. Bevel: bright hairline on the lit edge, dark on the shadow edge.
    const lw = Math.max(0.75, r * 0.05);
    const bevel = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
    bevel.addColorStop(0, c(WHITE, 0.85 * k * a0));
    bevel.addColorStop(0.5, c(mix(rgb, WHITE, 0.2), 0.2 * k * a0));
    bevel.addColorStop(1, c(INK, 0.55 * k * a0));
    ctx.strokeStyle = bevel;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.arc(x, y, r - lw / 2, 0, TAU);
    ctx.stroke();
  }

  function renderFrame(t, dt) {
    // Exponential zoom-out (constant *ratio* per step), timed with an ease-in:
    // it starts barely moving, picks up speed like a camera pulling away, and
    // only softens right at the end so it lands instead of stopping hard.
    const zu = clamp01((t - T.zoom[0]) / (T.zoom[1] - T.zoom[0]));
    const zoomK = smooth(Math.pow(zu, 1.8));
    s = Math.exp(lerp(Math.log(ZOOM_START), 0, zoomK));
    // Tilt follows the same curve, so isysd stays centred while the camera is close.
    const tilt = lerp((isysd.lat * Math.PI) / 180, FINAL_TILT, zoomK);
    const globeA = span(t, T.globeIn);
    
    fly = span(t, T.fly);
    // Names and initials go out early in the zoom (15× → 10×).
    const labelsOut = clamp01((15 - s) / 5);
    // Map frontier: angular radius around isysd, ~1.7° → whole sphere.
    reveal = lerp(0.03, Math.PI + 0.3, span(t, T.reveal));

    // Spin: one full revolution that lands back on the Americas. It eases in
    // (no jolt) and decelerates over a long tail (quartic ease-out), so it
    // settles rather than snaps. Transfers keep flying after it stops.
    {
      const u = clamp01((t - T.spin[0]) / (T.spin[1] - T.spin[0]));
      const easeIn = smooth(u / 0.16);
      const easeOut = 1 - Math.pow(1 - u, 4);
      lonRot = LON0 + TAU * easeIn * easeOut;
    }
    cosL = Math.cos(lonRot);
    sinL = Math.sin(lonRot);
    cosT = Math.cos(tilt);
    sinT = Math.sin(tilt);
    sR = s * R;

    ctx.clearRect(0, 0, w, h);

    // Atmosphere halo + disc.
    if (globeA > 0) {
      const g = ctx.createRadialGradient(cx, cy, sR * 0.85, cx, cy, sR * 1.18);
      g.addColorStop(0, `rgba(80, 120, 200, ${0.16 * globeA})`);
      g.addColorStop(1, "rgba(80, 120, 200, 0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - sR * 1.2, cy - sR * 1.2, sR * 2.4, sR * 2.4);
      ctx.beginPath();
      ctx.arc(cx, cy, sR, 0, TAU);
      ctx.fillStyle = `rgba(6, 10, 24, ${0.55 * globeA})`;
      ctx.fill();
    }

    // Base dot radius in globe units — it scales with the zoom like everything
    // else, so the close-up shows big dots that shrink with the map.
    const rDot = Math.max(0.8, sR * 0.0052);
    const principal = (tier) => rDot * (tier <= 3 ? 1.5 : 1.25);
    // Mirror-plate finish for *every* dot in the close-up (no favourites);
    // it fades out quickly (18× → 8×) and only applies to dots on screen.
    const glossK = clamp01((s - 8) / 7);
    /** @type {[number, number, number, string, number][]} x, y, r, color, alpha */
    const glossy = [];

    // Land dots: revealed outward from isysd with a soft frontier; batched by
    // depth × reveal alpha to keep draw calls low.
    if (reveal > 0.1) {
      const paths = [];
      for (let k = 0; k < 15; k++) paths.push(new Path2D());
      // Colored community dots: tier × 3 depth buckets.
      const tinted = [];
      for (let k = 0; k < 12; k++) tinted.push(new Path2D());
      for (let i = 0; i < pointCount; i++) {
        const ang = angFromOrigin[i];
        if (ang > reveal || taken[i]) continue;
        const rv = clamp01((reveal - ang) / 0.16);
        const o = i * 3;
        const [x, y, z] = rot(points[o], points[o + 1], points[o + 2]);
        if (z <= 0) continue;
        const sx = cx + sR * x;
        const sy = cy - sR * y;
        if (sx < -4 || sy < -4 || sx > w + 4 || sy > h + 4) continue;
        const tier = communityTier[i];
        if (glossK > 0.01 && rDot > 3) {
          const r = rDot * (0.7 + 0.3 * z) * (tier ? 1.1 : 0.6 + 0.4 * rv);
          glossy.push([sx, sy, r, tier ? tokens.tier[tier] : tokens.tier[6], rv * (0.6 + 0.4 * z)]);
          continue;
        }
        if (tier && rv > 0.5) {
          const r = rDot * 1.1 * (0.7 + 0.3 * z);
          const p = tinted[COMMUNITY_TIERS.indexOf(tier) * 3 + Math.min(2, (z * 3) | 0)];
          p.moveTo(sx + r, sy);
          p.arc(sx, sy, r, 0, TAU);
          continue;
        }
        const r = rDot * (0.7 + 0.3 * z) * (0.6 + 0.4 * rv);
        const p = paths[Math.min(4, (z * 5) | 0) * 3 + Math.min(2, (rv * 3) | 0)];
        p.moveTo(sx + r, sy);
        p.arc(sx, sy, r, 0, TAU);
      }
      for (let b = 0; b < 5; b++) {
        for (let q = 0; q < 3; q++) {
          ctx.fillStyle = `rgba(232, 236, 244, ${(0.22 + 0.16 * b) * (0.35 + 0.325 * q)})`;
          ctx.fill(paths[b * 3 + q]);
        }
      }
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = tokens.tier[COMMUNITY_TIERS[k]];
        for (let d = 0; d < 3; d++) {
          ctx.globalAlpha = 0.5 + 0.25 * d;
          ctx.fill(tinted[k * 3 + d]);
        }
      }
      ctx.globalAlpha = 1;

      // Principal names elsewhere in the world — the cast isn't the only one that matters.
      for (const e of extras) {
        const ang = angFromOrigin[e.idx];
        if (ang > reveal) continue;
        const [x, y, z] = rot(e.vec[0], e.vec[1], e.vec[2]);
        if (z <= 0) continue;
        const ex = cx + sR * x;
        const ey = cy - sR * y;
        const ea = clamp01((reveal - ang) / 0.16) * (0.35 + 0.65 * z);
        if (glossK > 0.01 && rDot > 3) {
          if (ex > -40 && ey > -40 && ex < w + 40 && ey < h + 40) glossy.push([ex, ey, principal(e.tier), tokens.tier[e.tier], ea]);
          continue;
        }
        ctx.globalAlpha = ea;
        ctx.beginPath();
        ctx.arc(ex, ey, principal(e.tier), 0, TAU);
        ctx.fillStyle = tokens.tier[e.tier];
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const [gx, gy, gr, gc, ga] of glossy) {
        ctx.globalAlpha = ga;
        drawGlossyAvatar(gx, gy, gr, gc, glossK, t, 0);
      }
      ctx.globalAlpha = 1;
    }

    // Named accounts — always projected from their place on the sphere, so
    // they move with the map as one body. `fly` only drives circle → dot.
    pos = new Array(cast.length).fill(null);
    for (let i = 0; i < cast.length; i++) {
      const a = cast[i];
      const appear = backOut((t - a.appearAt) / 0.45);
      if (appear <= 0) continue;
      const [x, y, z] = rot(a.vec[0], a.vec[1], a.vec[2]);
      pos[i] = { appear, z, px: cx + sR * x, py: cy - sR * y, vis: clamp01(z * 5 + 0.1) };
    }

    // Arcs — shooting-star transfers along lifted great circles. Each one is
    // born with a pulse at its origin and its trail collapses into the
    // destination with a landing pulse — nothing fades out mid-air.
    if (arcs.length) {
      const keep = [];
      ctx.lineCap = "round";
      for (const arc of arcs) {
        const age = t - arc.start;
        if (age > arc.dur + LAND) continue;
        keep.push(arc);
        const head = smooth(Math.min(1, age / arc.dur));
        const land = clamp01((age - arc.dur) / LAND);
        const u0 = lerp(Math.max(0, head - TRAIL), 1, smooth(land));
        const d = Math.acos(Math.max(-1, Math.min(1, arc.a[0] * arc.b[0] + arc.a[1] * arc.b[1] + arc.a[2] * arc.b[2])));
        // Lift relative to the hop length, so short hops in the close-up stay low.
        const lift = Math.min(0.08 + 0.18 * (d / Math.PI), 0.35 * d);
        const steps = 22;
        const at = (u) => {
          const p = slerp(arc.a, arc.b, u);
          const m = 1 + lift * Math.sin(Math.PI * u);
          const [x, y, z] = rot(p[0] * m, p[1] * m, p[2] * m);
          return [cx + sR * x, cy - sR * y, z];
        };

        // One stroke per arc, faded tail → bright head via a gradient (no per-segment seams).
        ctx.beginPath();
        let tail = null;
        let prev = null;
        for (let k = 0; k <= steps; k++) {
          const u = u0 + ((head - u0) * k) / steps;
          const [x, y, z] = at(u);
          if (z > -0.05) {
            if (prev) ctx.lineTo(x, y);
            else ctx.moveTo(x, y);
            if (!tail) tail = [x, y];
            prev = [x, y];
          } else {
            prev = null;
          }
        }
        if (tail && prev && head > u0) {
          const g = ctx.createLinearGradient(tail[0], tail[1], prev[0], prev[1]);
          g.addColorStop(0, "rgba(255, 236, 200, 0)");
          g.addColorStop(1, "rgba(255, 236, 200, 0.92)");
          ctx.strokeStyle = g;
          ctx.lineWidth = Math.min(2.2, Math.max(0.9, sR * 0.0042));
          ctx.stroke();
        }

        const hr = Math.min(3.2, Math.max(1.4, sR * 0.007));
        // Birth pulse at the origin.
        const birth = clamp01(age / 0.35);
        if (birth < 1) {
          const [ox, oy] = at(0);
          pulse(ox, oy, hr * (1 + 4 * birth), 0.6 * (1 - birth));
        }
        // Head glow while travelling; landing pulse at the destination.
        if (prev && land < 1) {
          const [hx, hy] = at(head);
          ctx.beginPath();
          ctx.arc(hx, hy, hr * 2.2, 0, TAU);
          ctx.fillStyle = `rgba(255, 236, 200, ${0.22 * (1 - land)})`;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(hx, hy, hr, 0, TAU);
          ctx.fillStyle = `rgba(255, 246, 225, ${0.95 * (1 - land)})`;
          ctx.fill();
        }
        if (land > 0) {
          const [dx, dy] = at(1);
          pulse(dx, dy, hr * (1 + 4 * land), 0.6 * (1 - land));
        }
      }
      arcs = keep;
    }

    // Commits (single ring), group cosigns (triple ring), dapp sign-ins (steel ring).
    if (pulses.length) {
      const live = [];
      for (const p of pulses) {
        const age = t - p.start;
        if (age > 1.6) continue;
        live.push(p);
        const [x, y, z] = rot(p.vec[0], p.vec[1], p.vec[2]);
        if (z <= 0.05) continue;
        const px = cx + sR * x;
        const py = cy - sR * y;
        const base = Math.max(2, rDot * 1.4);
        const rings = p.kind === "group" ? 3 : 1;
        const col = p.kind === "login" ? "147, 169, 210" : "255, 236, 200";
        for (let k = 0; k < rings; k++) {
          const u = clamp01((age - k * 0.18) / 1.2);
          if (u <= 0) continue;
          ctx.beginPath();
          ctx.arc(px, py, base * (1 + 5 * u), 0, TAU);
          ctx.strokeStyle = `rgba(${col}, ${0.75 * (1 - u) * z})`;
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
        if (p.kind === "commit" && age < 1.1) {
          // A "seal" stamped on the point: a gold diamond that settles in and
          // fades in place. Nothing travels, so it can't read as a transfer.
          const u = clamp01(age / 1.1);
          const r = base * (1.6 + 1.2 * smooth(u));
          ctx.save();
          ctx.translate(px, py);
          ctx.rotate(Math.PI / 4);
          ctx.strokeStyle = `rgba(230, 193, 92, ${0.85 * (1 - u) * z})`;
          ctx.lineWidth = 1.4;
          ctx.strokeRect(-r / 2, -r / 2, r, r);
          ctx.restore();
        }
      }
      pulses = live;
    }

    // Draw the cast on top of everything.
    const labelPx = mobile ? 13 : 15;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let i = 0; i < cast.length; i++) {
      const a = cast[i];
      const P = pos[i];
      if (!P || P.vis <= 0.01) continue;
      const { appear, vis, px, py } = P;
      // Same scale law as every land dot (linear in zoom): an avatar *is* a dot
      // with a ring and an initial — ~27px at 18×, ~1.5px at 1×. isysd starts a little larger.
      const rc = principal(a.tier) * (i === 0 ? lerp(1.35, 1, fly) : 1) * appear;
      const color = tokens.tier[a.tier];

      // Glossy, mirror-like sphere in the close-up; it relaxes into a flat
      // standard dot as the zoom pulls out.
      const gloss = glossK * appear;
      ctx.globalAlpha = vis;
      if (gloss > 0.01 && rc > 3) {
        drawGlossyAvatar(px, py, rc, color, gloss, t, i);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, rc, 0, TAU);
        ctx.fillStyle = color;
        ctx.fill();
      }

      if (labelsOut < 1) {
        // Initial, engraved into the sphere: dark ink with a light lip below.
        const fs = rc * 0.9;
        ctx.font = `600 ${fs}px ${tokens.font}`;
        ctx.globalAlpha = vis * (1 - labelsOut) * appear * 0.45;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(a.name[0], px, py + rc * 0.04 + Math.max(0.6, fs * 0.035));
        ctx.globalAlpha = vis * (1 - labelsOut) * appear;
        ctx.fillStyle = "rgba(8, 12, 28, 0.88)";
        ctx.fillText(a.name[0], px, py + rc * 0.04);
      }
      const la = appear * (1 - labelsOut) * vis;
      if (la > 0.01) {
        ctx.globalAlpha = la;
        ctx.fillStyle = "rgba(255,255,255,0.92)";
        ctx.font = `600 ${labelPx}px ${tokens.font}`;
        ctx.fillText(a.name, px, py + rc + labelPx * 0.95);
      }
      ctx.globalAlpha = 1;
    }

    if (!finalized && t >= T.final) {
      finalized = true;
      section.dataset.phase = "final";
    }
  }

  // ---- Loop, pausing, adaptive quality -----------------------------------
  let raf = 0;
  let last = 0;
  let onScreen = false;
  let running = false;

  // Frame budget: the story runs at ≤60fps (120Hz displays would otherwise
  // repaint a retina-sized canvas twice as often for no visible gain), the
  // ambient tail at 30fps, and the whole thing stops after a while so an idle
  // tab never keeps the GPU busy. The last frame stays on screen.
  const STORY_FPS = 60;
  const AMBIENT_FPS = 30;
  // Rays keep going after the globe settles; stop redrawing after a while.
  const STOP_AT = mobile || lowEnd ? T.spin[1] + 4 : T.spin[1] + 30; // seconds of story time
  let stopped = false;
  let acc = 0;

  function frame(now) {
    raf = 0;
    if (!running) return;
    const elapsed = Math.min(0.05, (now - last) / 1000);
    last = now;
    acc += elapsed;
    const fps = clock < T.spin[1] ? STORY_FPS : AMBIENT_FPS; // smooth deceleration at 60
    if (acc < 1 / fps - 0.002) {
      raf = requestAnimationFrame(frame);
      return;
    }
    const dt = Math.min(0.05, acc);
    acc = 0;
    clock += dt;
    renderFrame(clock, dt);
    schedule(clock);
    if (clock >= STOP_AT) {
      stopped = true;
      running = false;
      section.dataset.globe = "still";
      return;
    }

    // If the device can't hold ~30fps once the map is fully in, drop density once.
    if (clock > T.reveal[1] && frameTimes.length < 90) {
      frameTimes.push(dt);
      if (frameTimes.length === 90) {
        const avg = frameTimes.reduce((p, q) => p + q, 0) / 90;
        if (avg > 0.03) pointCount = Math.floor(pointCount * 0.6);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function sync() {
    const should = onScreen && !document.hidden && !reduceMotion && !stopped;
    if (should && !running) {
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!should && running) {
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  new ResizeObserver(resize).observe(canvas);
  resize();

  if (reduceMotion) {
    section.dataset.phase = "final";
    return;
  }
  new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((e) => e.isIntersecting);
      sync();
    },
    { threshold: 0.05 },
  ).observe(canvas);
  document.addEventListener("visibilitychange", sync);
}
