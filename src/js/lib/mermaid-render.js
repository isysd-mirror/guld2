/**
 * Render Mermaid fences (flowchart, sequence, …) as SVG.
 * Leaves `xychart-beta` alone for the custom xychart renderer.
 */

let mermaidPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing && window.mermaid) {
      resolve(window.mermaid);
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => {
      if (!window.mermaid) {
        reject(new Error("mermaid global missing after load"));
        return;
      }
      resolve(window.mermaid);
    };
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Light high-contrast: white nodes, dark ink text/borders on white canvas. */
const HIGH_CONTRAST = {
  darkMode: false,
  background: "#ffffff",
  fontFamily: '"Avenir Next", "Trebuchet MS", sans-serif',
  fontSize: "16px",
  primaryColor: "#ffffff",
  primaryTextColor: "#1a2332",
  primaryBorderColor: "#1a2332",
  secondaryColor: "#eef2f8",
  secondaryTextColor: "#1a2332",
  secondaryBorderColor: "#1a2332",
  tertiaryColor: "#dce3f0",
  tertiaryTextColor: "#1a2332",
  tertiaryBorderColor: "#1a2332",
  lineColor: "#1a2332",
  textColor: "#1a2332",
  mainBkg: "#ffffff",
  nodeBkg: "#ffffff",
  nodeBorder: "#1a2332",
  nodeTextColor: "#1a2332",
  clusterBkg: "#eef2f8",
  clusterBorder: "#1a2332",
  titleColor: "#1a2332",
  edgeLabelBackground: "#ffffff",
  actorBkg: "#ffffff",
  actorBorder: "#1a2332",
  actorTextColor: "#1a2332",
  actorLineColor: "#1a2332",
  signalColor: "#1a2332",
  signalTextColor: "#1a2332",
  labelBoxBkgColor: "#ffffff",
  labelBoxBorderColor: "#1a2332",
  labelTextColor: "#1a2332",
  loopTextColor: "#1a2332",
  noteBkgColor: "#fff8dc",
  noteTextColor: "#1a2332",
  noteBorderColor: "#1a2332",
  activationBkgColor: "#dce3f0",
  activationBorderColor: "#1a2332",
  sequenceNumberColor: "#ffffff",
};

async function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = loadScript("/vendor/mermaid/mermaid.min.js").then((mermaid) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "base",
        themeVariables: HIGH_CONTRAST,
        flowchart: {
          curve: "basis",
          htmlLabels: false,
          padding: 16,
          nodeSpacing: 48,
          rankSpacing: 56,
          diagramPadding: 12,
        },
        sequence: {
          mirrorActors: false,
          actorMargin: 24,
          messageMargin: 40,
          noteMargin: 12,
        },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/**
 * Mermaid sometimes paints edge-label plates dark; force readable plates.
 * @param {HTMLElement} root
 */
function forceLabelPlates(root) {
  root.querySelectorAll(".edgeLabel rect, .edgeLabel polygon, g.edgeLabel rect, .label > rect").forEach((el) => {
    el.setAttribute("fill", "#ffffff");
    el.style.fill = "#ffffff";
    if (!el.getAttribute("stroke") || el.getAttribute("stroke") === "none") {
      el.setAttribute("stroke", "#1a2332");
    }
  });
  root.querySelectorAll(".edgeLabel text, .edgeLabel tspan, .edgeLabel span").forEach((el) => {
    el.setAttribute("fill", "#1a2332");
    el.style.fill = "#1a2332";
    el.style.color = "#1a2332";
  });
}

/**
 * @param {HTMLElement} root
 */
export async function renderMermaidDiagrams(root) {
  const blocks = [...root.querySelectorAll("pre code.language-mermaid")].filter(
    (code) => !/^\s*xychart-beta\b/m.test(code.textContent || ""),
  );
  if (!blocks.length) return;

  const mermaid = await loadMermaid();
  let n = 0;
  for (const code of blocks) {
    const pre = code.closest("pre");
    if (!pre) continue;
    const src = (code.textContent || "").trim();
    if (!src) continue;
    const id = `doc-mmd-${++n}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      const { svg } = await mermaid.render(id, src);
      const wrap = document.createElement("div");
      wrap.className = "doc-mermaid";
      wrap.setAttribute("role", "img");
      wrap.innerHTML = svg;
      forceLabelPlates(wrap);
      pre.replaceWith(wrap);
    } catch (err) {
      console.warn("mermaid render failed:", err);
      pre.classList.add("doc-pre", "doc-pre--mermaid-error");
    }
  }
}
