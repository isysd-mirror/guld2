import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { parseXyChart } from "../src/js/lib/xychart.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("parseXyChart reads whitepaper inflation chart", () => {
  const md = readFileSync(join(root, "docs/whitepaper/guld-2.0-draft.md"), "utf8");
  const fences = [...md.matchAll(/```mermaid\n([\s\S]*?)```/g)];
  const inflation = fences.map((m) => m[1]).find((src) => /title Inflation rate i\(y\)/.test(src));
  assert.ok(inflation, "expected inflation xychart-beta fence");
  const chart = parseXyChart(inflation);
  assert.ok(chart);
  assert.match(chart.title, /Inflation rate/);
  assert.equal(chart.values.length, 20);
  assert.equal(chart.values[0], 100);
  assert.equal(chart.values[19], 4);
  assert.equal(chart.yMin, 0);
  assert.equal(chart.yMax, 100);
  assert.equal(chart.yLabel, "i(y) %");
  assert.equal(chart.xLabels.length, 20);
});

test("parseXyChart rejects non-xychart mermaid", () => {
  assert.equal(parseXyChart("flowchart TD\n  A-->B"), null);
});

test("resolveApiBase exports DEFAULT_API_BASE", async () => {
  const { DEFAULT_API_BASE } = await import("../src/js/lib/api.js");
  assert.equal(DEFAULT_API_BASE, "/api/v1");
});

test("doc-render wires xychart module", () => {
  const src = readFileSync(join(root, "src/js/lib/doc-render.js"), "utf8");
  assert.match(src, /from ["']\.\/xychart\.js["']/);
  assert.match(src, /renderXyCharts/);
});
