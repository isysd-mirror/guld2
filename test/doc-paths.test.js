import test from "node:test";
import assert from "node:assert/strict";
import {
  curatedDocHref,
  docsSrcHref,
  docsViewerHref,
  isAllowedDocFetch,
  isSafeDocsRelPath,
  resolveMarkdownLink,
} from "../src/js/lib/doc-paths.js";

test("isSafeDocsRelPath rejects traversal", () => {
  assert.equal(isSafeDocsRelPath("HOSTING.md"), true);
  assert.equal(isSafeDocsRelPath("specs/00-overview.md"), true);
  assert.equal(isSafeDocsRelPath("../HOSTING.md"), false);
  assert.equal(isSafeDocsRelPath("foo/../../etc/passwd.md"), false);
  assert.equal(isSafeDocsRelPath("HOSTING.txt"), false);
  assert.equal(isSafeDocsRelPath(""), false);
});

test("isAllowedDocFetch allowlist", () => {
  assert.equal(isAllowedDocFetch("/README.md"), true);
  assert.equal(isAllowedDocFetch("/docs/HOSTING.md"), true);
  assert.equal(isAllowedDocFetch("/docs/specs/00-overview.md"), true);
  assert.equal(isAllowedDocFetch("/etc/passwd.md"), false);
  assert.equal(isAllowedDocFetch("https://evil.example/x.md"), false);
});

test("viewer hrefs", () => {
  assert.equal(docsViewerHref("HOSTING.md"), "/docs/?doc=HOSTING.md");
  assert.equal(docsSrcHref("/README.md"), "/docs/?src=%2FREADME.md");
});

test("resolveMarkdownLink and curated routes", () => {
  const host = resolveMarkdownLink("HOSTING.md", "/docs/PACKAGES.md");
  assert.equal(host?.fetch, "/docs/HOSTING.md");
  assert.equal(host?.viewer, "/docs/?doc=HOSTING.md");

  const rel = resolveMarkdownLink("../HOSTING.md", "/docs/specs/00-overview.md");
  assert.equal(rel?.fetch, "/docs/HOSTING.md");

  const wp = resolveMarkdownLink("guld-2.0-draft.md", "/docs/whitepaper/guld-2.0-draft.md");
  assert.equal(curatedDocHref(wp.fetch), "/whitepaper/");

  const spec = resolveMarkdownLink("15-ledger-import.md", "/docs/specs/00-overview.md");
  assert.equal(curatedDocHref(spec.fetch), "/specs/?doc=15-ledger-import");

  const readme = resolveMarkdownLink("/README.md", "/docs/HOSTING.md");
  assert.equal(readme?.viewer, "/docs/?src=%2FREADME.md");
});
