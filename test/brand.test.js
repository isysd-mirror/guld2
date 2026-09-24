import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { HEADER_NAV, FOOTER_NAV, isNavActive, normalizePath } from "../src/js/lib/site-nav.js";
import { initialsForName } from "../src/js/lib/wallet-session.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("index has brand-level logo and signup/login CTAs", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.match(html, /assets\/logo\.svg/);
  assert.match(html, /Address by name/i);
  assert.match(html, /hard fork/i);
  assert.match(html, /Guld 2\.0|2\.0/);
  assert.match(html, /guld-header/);
  assert.match(html, /guld-footer/);
  assert.match(html, /Sign up/);
  assert.match(html, /Log in/);
  assert.match(html, /id="install"/);
  assert.match(html, /cargo run -p guld-node/);
  assert.doesNotMatch(html, /site-header__nav/);
  assert.doesNotMatch(html, /Coming soon/);
  assert.doesNotMatch(html, /cdn\.jsdelivr|googleapis\.com\/css/i);
});

test("pages share guld-header and guld-footer chrome", () => {
  for (const page of [
    "wallet/index.html",
    "register/index.html",
    "login/index.html",
    "settings/index.html",
    "claim/index.html",
    "gateway/index.html",
    "help/index.html",
    "help/paymento/index.html",
    "explorer/index.html",
    "explorer/legacy/index.html",
    "whitepaper/index.html",
    "specs/index.html",
    "docs/index.html",
  ]) {
    const html = readFileSync(join(root, page), "utf8");
    assert.match(html, /<guld-header/, page);
    assert.match(html, /<guld-footer/, page);
    assert.doesNotMatch(html, /site-header__nav/, page);
  }
  assert.ok(existsSync(join(root, "src/js/components/guld-header.js")));
  assert.ok(existsSync(join(root, "src/js/components/guld-footer.js")));
  assert.ok(existsSync(join(root, "src/js/chrome.js")));
});

test("header nav is product; docs live in footer", () => {
  assert.deepEqual(
    HEADER_NAV.map((i) => i.label),
    ["Wallet", "Explorer"],
  );
  assert.deepEqual(
    FOOTER_NAV.map((i) => i.label),
    ["Install", "Legacy claim", "Whitepaper", "Specs", "Help", "Software", "Docs"],
  );
  assert.equal(FOOTER_NAV.find((i) => i.label === "Install")?.href, "/#install");
  assert.equal(FOOTER_NAV.find((i) => i.label === "Docs")?.href, "/docs/");
  assert.ok(!FOOTER_NAV.some((i) => /\.md$/i.test(i.href)));
  assert.ok(!HEADER_NAV.some((i) => /whitepaper|specs/i.test(i.label)));
});

test("docs browser shell exists and does not expose raw md in site UI", () => {
  assert.ok(existsSync(join(root, "docs/index.html")));
  assert.ok(existsSync(join(root, "data/docs-tree.json")));
  assert.ok(existsSync(join(root, "src/js/components/guld-doc-view.js")));
  assert.ok(existsSync(join(root, "src/js/components/guld-md-doc.js")));
  const html = readFileSync(join(root, "docs/index.html"), "utf8");
  assert.match(html, /guld-doc-view/);
  assert.match(html, /docs-page\.js/);
  const index = readFileSync(join(root, "index.html"), "utf8");
  assert.match(index, /\/docs\/\?src=\/README\.md/);
  assert.doesNotMatch(index, /href="\/README\.md"/);
  const software = readFileSync(join(root, "software/index.html"), "utf8");
  assert.match(software, /\/docs\/\?doc=REPO_LAYOUT\.md/);
  assert.doesNotMatch(software, /href="\/docs\/REPO_LAYOUT\.md"/);
});

test("isNavActive and normalizePath", () => {
  assert.equal(normalizePath("/wallet/index.html"), "/wallet");
  assert.equal(isNavActive("/wallet/", "/wallet/"), true);
  assert.equal(isNavActive("/explorer/", "/explorer/legacy/"), true);
  assert.equal(isNavActive("/#install", "/", "#install"), true);
  assert.equal(isNavActive("/#install", "/wallet/"), false);
  assert.equal(initialsForName("isysd"), "IS");
});

test("whitepaper page and synced markdown exist", () => {
  assert.ok(existsSync(join(root, "whitepaper/index.html")));
  assert.ok(existsSync(join(root, "docs/whitepaper/guld-2.0-draft.md")));
  const html = readFileSync(join(root, "whitepaper/index.html"), "utf8");
  assert.match(html, /data-doc-host/);
  assert.match(html, /whitepaper-page\.js/);
});

test("specs index lists drafts", () => {
  assert.ok(existsSync(join(root, "specs/index.html")));
  assert.ok(existsSync(join(root, "docs/specs/00-overview.md")));
  const html = readFileSync(join(root, "specs/index.html"), "utf8");
  assert.match(html, /specs-page\.js/);
});

test("explorer lists blocks and links legacy block 0", () => {
  assert.ok(existsSync(join(root, "explorer/index.html")));
  const html = readFileSync(join(root, "explorer/index.html"), "utf8");
  assert.match(html, /explorer-page\.js/);
  assert.match(html, /data-explorer-host/);
  assert.match(html, /\/explorer\/legacy\//);
  assert.match(html, /connect-src[^"]*http:/);
  assert.doesNotMatch(html, /Claim state/i);
});

test("legacy block 0 details and snapshot exist", () => {
  assert.ok(existsSync(join(root, "explorer/legacy/index.html")));
  assert.ok(existsSync(join(root, "data/legacy-accounts.json")));
  const html = readFileSync(join(root, "explorer/legacy/index.html"), "utf8");
  assert.match(html, /legacy-explorer-page\.js/);
  assert.match(html, /Claim state/i);
  assert.match(html, /Legacy block 0/i);
  const snap = JSON.parse(readFileSync(join(root, "data/legacy-accounts.json"), "utf8"));
  assert.ok(Array.isArray(snap.accounts_rows));
  assert.ok(snap.accounts_rows.length > 0);
  assert.ok(snap.accounts_rows[0].name);
  assert.ok("claim_state" in snap.accounts_rows[0]);
});

test("tokens expose legacy palette", () => {
  const css = readFileSync(join(root, "src/css/tokens.css"), "utf8");
  assert.match(css, /--guld-primary:\s*#274175/);
  assert.match(css, /--guld-navy:\s*#264175/);
  assert.match(css, /--guld-ink:\s*#353e55/);
});
