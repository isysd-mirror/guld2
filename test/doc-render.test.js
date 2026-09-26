import test from "node:test";
import assert from "node:assert/strict";
import { parseSimpleYaml, slugifyHeading, splitFrontMatter } from "../src/js/lib/doc-render.js";

test("slugifyHeading matches docs viewer anchors", () => {
  assert.equal(slugifyHeading("12. Roadmap"), "12-roadmap");
  assert.equal(slugifyHeading("12.1 Shipped — Simba public testnet"), "12-1-shipped-simba-public-testnet");
  assert.equal(slugifyHeading("9.1 State growth (keys + hashes)"), "9-1-state-growth-keys-hashes");
});

test("splitFrontMatter extracts GIP yaml", () => {
  const md = `---
gip: 19
title: Mempool visualizer
status: Accepted
type: Standards
---

## Abstract

Hello.
`;
  const { body, meta } = splitFrontMatter(md);
  assert.equal(meta?.gip, "19");
  assert.equal(meta?.title, "Mempool visualizer");
  assert.match(body.trim(), /^## Abstract/);
  assert.doesNotMatch(body, /^---/);
});

test("splitFrontMatter ignores non-GIP leading hr blocks", () => {
  const md = `Some intro

---

## Section
`;
  const { body, meta } = splitFrontMatter(md);
  assert.equal(meta, null);
  assert.equal(body, md);
});

test("parseSimpleYaml reads flat keys", () => {
  const fields = parseSimpleYaml("gip: 1\ntitle: Test\ndiscussions-to: ../gips/README.md\n");
  assert.equal(fields.gip, "1");
  assert.equal(fields["discussions-to"], "../gips/README.md");
});
