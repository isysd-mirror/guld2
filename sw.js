/* Guld.io service worker — offline shell, network-first for pages. */
const CACHE = "guld-io-v10";
const PRECACHE = [
  "/",
  "/index.html",
  "/whitepaper/",
  "/whitepaper/index.html",
  "/specs/",
  "/specs/index.html",
  "/explorer/",
  "/explorer/index.html",
  "/explorer/legacy/",
  "/explorer/legacy/index.html",
  "/wallet/",
  "/wallet/index.html",
  "/register/",
  "/register/index.html",
  "/login/",
  "/login/index.html",
  "/settings/",
  "/settings/index.html",
  "/gateway/",
  "/gateway/index.html",
  "/src/css/wallet.css",
  "/src/js/lib/api.js",
  "/src/js/wallet-page.js",
  "/src/js/register-page.js",
  "/src/js/login-page.js",
  "/src/js/settings-page.js",
  "/src/js/gateway-page.js",
  "/data/legacy-accounts.json",
  "/manifest.webmanifest",
  "/assets/logo.svg",
  "/assets/favicon.png",
  "/assets/guld256x256.png",
  "/src/css/tokens.css",
  "/src/css/base.css",
  "/src/css/layout.css",
  "/src/css/docs.css",
  "/src/css/explorer.css",
  "/src/js/app.js",
  "/src/js/register-sw.js",
  "/src/js/chrome.js",
  "/src/js/whitepaper-page.js",
  "/src/js/specs-page.js",
  "/src/js/explorer-page.js",
  "/src/js/legacy-explorer-page.js",
  "/src/js/lib/doc-render.js",
  "/src/js/lib/xychart.js",
  "/src/js/lib/mermaid-render.js",
  "/src/js/lib/rpc.js",
  "/vendor/marked/marked.esm.js",
  "/vendor/mermaid/mermaid.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request).then((r) => r || caches.match("/index.html"))),
  );
});
