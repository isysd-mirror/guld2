/**
 * Render Mermaid `xychart-beta` fences as inline SVG (no Mermaid runtime).
 * Supports the subset used in the Guld whitepaper: title, x-axis list,
 * y-axis label + range, and a single line series.
 */

/**
 * @param {HTMLElement} root
 */
export function renderXyCharts(root) {
  root.querySelectorAll("pre code.language-mermaid").forEach((code) => {
    const src = code.textContent || "";
    if (!/^\s*xychart-beta\b/m.test(src)) return;
    const chart = parseXyChart(src);
    if (!chart) return;
    const figure = document.createElement("figure");
    figure.className = "doc-chart";
    figure.append(buildSvg(chart));
    if (chart.title) {
      const cap = document.createElement("figcaption");
      cap.className = "doc-chart__caption";
      cap.textContent = chart.title;
      figure.append(cap);
    }
    const pre = code.closest("pre");
    (pre || code).replaceWith(figure);
  });
}

/**
 * @param {string} src
 * @returns {{ title: string, xLabels: string[], yLabel: string, yMin: number, yMax: number, values: number[] } | null}
 */
export function parseXyChart(src) {
  const lines = src
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("%%"));
  if (!lines.length || !lines[0].startsWith("xychart-beta")) return null;

  let title = "";
  /** @type {string[]} */
  let xLabels = [];
  let yLabel = "";
  let yMin = 0;
  let yMax = 100;
  /** @type {number[]} */
  let values = [];

  for (const line of lines.slice(1)) {
    if (line.startsWith("title ")) {
      title = line.slice(6).trim();
      continue;
    }
    const xMatch = line.match(/^x-axis\s+\[(.*)\]\s*$/);
    if (xMatch) {
      xLabels = splitList(xMatch[1]);
      continue;
    }
    const yMatch = line.match(/^y-axis\s+(?:"([^"]*)"|'([^']*)')?\s*([-\d.]+)\s*-->\s*([-\d.]+)\s*$/);
    if (yMatch) {
      yLabel = yMatch[1] || yMatch[2] || "";
      yMin = Number(yMatch[3]);
      yMax = Number(yMatch[4]);
      continue;
    }
    const lineMatch = line.match(/^line\s+\[(.*)\]\s*$/);
    if (lineMatch) {
      values = splitList(lineMatch[1]).map(Number);
    }
  }

  if (!values.length || !Number.isFinite(yMin) || !Number.isFinite(yMax) || yMax === yMin) {
    return null;
  }
  if (!xLabels.length) {
    xLabels = values.map((_, i) => String(i + 1));
  }
  return { title, xLabels, yLabel, yMin, yMax, values };
}

/** @param {string} inner */
function splitList(inner) {
  return inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {{ title: string, xLabels: string[], yLabel: string, yMin: number, yMax: number, values: number[] }} chart
 */
function buildSvg(chart) {
  const { xLabels, yLabel, yMin, yMax, values, title } = chart;
  const W = 640;
  const H = 280;
  const pad = { t: 28, r: 16, b: 40, l: 52 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const n = values.length;
  const xAt = (i) => pad.l + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yAt = (v) => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const points = values
    .map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
    .join(" ");

  const yTicks = 5;
  /** @type {string[]} */
  const grid = [];
  for (let i = 0; i <= yTicks; i++) {
    const v = yMin + ((yMax - yMin) * i) / yTicks;
    const y = yAt(v);
    grid.push(
      `<line class="doc-chart__grid" x1="${pad.l}" y1="${y.toFixed(1)}" x2="${(pad.l + plotW).toFixed(1)}" y2="${y.toFixed(1)}" />`,
      `<text class="doc-chart__tick" x="${pad.l - 8}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle">${formatTick(v)}</text>`,
    );
  }

  const xStep = n <= 10 ? 1 : Math.ceil(n / 10);
  /** @type {string[]} */
  const xTickEls = [];
  for (let i = 0; i < n; i += xStep) {
    const x = xAt(i);
    xTickEls.push(
      `<text class="doc-chart__tick" x="${x.toFixed(1)}" y="${H - 12}" text-anchor="middle">${escapeXml(xLabels[i] ?? "")}</text>`,
    );
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.setAttribute("class", "doc-chart__svg");
  if (title) svg.setAttribute("aria-label", title);
  svg.innerHTML = `
    ${yLabel ? `<text class="doc-chart__ylabel" x="14" y="${(pad.t + plotH / 2).toFixed(1)}" text-anchor="middle" transform="rotate(-90 14 ${(pad.t + plotH / 2).toFixed(1)})">${escapeXml(yLabel)}</text>` : ""}
    ${grid.join("\n")}
    <line class="doc-chart__axis" x1="${pad.l}" y1="${pad.t}" x2="${pad.l}" y2="${pad.t + plotH}" />
    <line class="doc-chart__axis" x1="${pad.l}" y1="${pad.t + plotH}" x2="${pad.l + plotW}" y2="${pad.t + plotH}" />
    <polyline class="doc-chart__line" fill="none" points="${points}" />
    ${values
      .map(
        (v, i) =>
          `<circle class="doc-chart__point" cx="${xAt(i).toFixed(1)}" cy="${yAt(v).toFixed(1)}" r="2.5"><title>${escapeXml(xLabels[i] ?? String(i + 1))}: ${v}</title></circle>`,
      )
      .join("\n")}
    ${xTickEls.join("\n")}
  `;
  return svg;
}

/** @param {number} v */
function formatTick(v) {
  if (Math.abs(v) >= 100 || Number.isInteger(v)) return String(Math.round(v));
  return v.toFixed(1);
}

/** @param {string} s */
function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
