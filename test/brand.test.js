import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("index has brand-level logo and 2.0 thesis", () => {
  const html = readFileSync(join(root, "index.html"), "utf8");
  assert.match(html, /assets\/logo\.svg/);
  assert.match(html, /Address by name/i);
  assert.match(html, /hard fork/i);
  assert.match(html, /Guld 2\.0|2\.0/);
  assert.match(html, /\/whitepaper\//);
  assert.match(html, /\/specs\//);
  assert.match(html, /\/explorer\//);
  assert.doesNotMatch(html, /Coming soon/);
  assert.doesNotMatch(html, /bootstrap/i);
  assert.doesNotMatch(html, /cdn\.jsdelivr|googleapis\.com\/css/i);
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
