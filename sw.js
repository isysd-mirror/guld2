/* Guld.io service worker — offline shell, network-first for pages. */
const CACHE = "guld-io-v16";
const PRECACHE = [
  "/",
  "/index.html",
  "/whitepaper/index.html",
  "/docs/",
  "/docs/index.html",
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
  "/claim/",
  "/claim/index.html",
  "/gateway/",
  "/gateway/index.html",
  "/demo/login/",
  "/demo/login/index.html",
  "/demo/ttt/",
  "/demo/ttt/index.html",
  "/src/css/wallet.css",
  "/src/js/lib/api.js",
  "/src/js/lib/auth.js",
  "/src/js/lib/cosign.js",
  "/src/js/lib/contacts.js",
  "/src/js/lib/crypto.js",
  "/src/js/lib/hex.js",
  "/src/js/lib/key-export.js",
  "/src/js/lib/keyring.js",
  "/src/js/lib/keyring-crypto.js",
  "/src/js/lib/qr.js",
  "/src/js/lib/rpc.js",
  "/src/js/lib/sponsor.js",
  "/src/js/lib/tx-feedback.js",
  "/src/js/lib/wallet-session.js",
  "/src/js/lib/wallet-nav.js",
  "/src/js/lib/site-login.js",
  "/src/js/lib/site-nav.js",
  "/src/js/lib/network.js",
  "/src/js/lib/toast.js",
  "/src/js/lib/profile-menu.js",
  "/src/js/lib/gateway-settings.js",
  "/src/js/lib/gateway-watcher.js",
  "/src/js/lib/doc-paths.js",
  "/src/js/lib/claim.js",
  "/src/js/components/guld-header.js",
  "/src/js/components/guld-footer.js",
  "/src/js/vendor/ed25519.js",
  "/src/js/vendor/qrcodegen.js",
  "/src/js/wallet-page.js",
  "/src/js/register-page.js",
  "/src/js/login-page.js",
  "/src/js/settings-page.js",
  "/src/js/claim-page.js",
  "/src/js/gateway-page.js",
  "/src/js/demo-login-page.js",
  "/src/js/demo-ttt-page.js",
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
  "/src/js/specs-page.js",
  "/src/js/explorer-page.js",
  "/src/js/legacy-explorer-page.js",
  "/src/js/lib/doc-render.js",
  "/src/js/lib/xychart.js",
  "/src/js/lib/mermaid-render.js",
  "/vendor/marked/marked.esm.js",
  "/vendor/mermaid/mermaid.min.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (c) => {
      // Prefer per-URL add so one 404 does not abort the whole install.
      await Promise.all(
        PRECACHE.map((url) =>
          c.add(url).catch((err) => {
            console.warn("[sw] precache skip", url, err);
          }),
        ),
      );
    }),
  );
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

/**
 * Never SPA-fallback HTML for scripts/styles — that leaves pages stuck on
 * "Loading…" with a module parse error when the network blips.
 * @param {Request} request
 */
function isNavigation(request) {
  return request.mode === "navigate" || request.destination === "document";
}

/**
 * @param {Request} request
 */
function isCodeAsset(request) {
  const dest = request.destination;
  if (dest === "script" || dest === "style" || dest === "worker") return true;
  const path = new URL(request.url).pathname;
  return (
    path.endsWith(".js") ||
    path.endsWith(".css") ||
    path.endsWith(".mjs") ||
    path.endsWith(".map")
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        if (isCodeAsset(request)) {
          return new Response("/* offline — asset not cached */", {
            status: 503,
            statusText: "Service Unavailable",
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }
        if (isNavigation(request)) {
          return (await caches.match("/index.html")) || Response.error();
        }
        return Response.error();
      }),
  );
});
