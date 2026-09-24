#!/usr/bin/env node
/**
 * Regenerate data/docs-tree.json from markdown under docs/.
 * Usage: node scripts/update-docs-tree.mjs
 */
import { readdirSync, writeFileSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = join(root, "docs");

/** @param {string} dir @returns {{ name: string, path?: string, children?: unknown[] }[]} */
function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith("."))
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  /** @type {{ name: string, path?: string, children?: unknown[] }[]} */
  const out = [];
  for (const ent of entries) {
    const full = join(dir, ent.name);
    if (ent.isDirectory()) {
      const children = walk(full);
      if (children.length) out.push({ name: ent.name, children });
    } else if (ent.name.endsWith(".md")) {
      const path = relative(docsRoot, full).split("\\").join("/");
      out.push({ name: ent.name, path });
    }
  }
  return out;
}

const tree = {
  generated: new Date().toISOString().slice(0, 10),
  extras: [{ name: "README.md", fetch: "/README.md", label: "Repository README" }],
  tree: walk(docsRoot),
};

writeFileSync(join(root, "data/docs-tree.json"), JSON.stringify(tree, null, 2) + "\n");
console.log(`Wrote data/docs-tree.json (${JSON.stringify(tree).match(/"path"/g)?.length ?? 0} files)`);
