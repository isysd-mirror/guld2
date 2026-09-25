---
gip: 6
title: Docs browser
description: Static-site markdown viewer with file tree so humans never land on raw .md URLs.
author: Guld contributors
discussions-to: ./README.md
status: Accepted
type: Standards
category: Application
created: 2026-09-25
---

## Abstract

Static-site markdown viewer with file tree so humans never land on raw .md URLs.

## Goal

Stop linking humans at raw `.md` URLs (browser plain text). Ship a **docs browser** on the static site: framework-less JS, same stack as wallet / software — one HTML shell, reusable components, fetch markdown from `/docs/…` (and allowlisted roots like `/README.md`).

## User stories

1. Open `/docs/` → see a **file tree** of operator docs and a short landing.
2. Open `/docs/?doc=HOSTING.md` (footer **Hosting**) → HTML-rendered markdown + on-this-page TOC.
3. Follow in-doc `.md` links → stay in the viewer (or curated `/whitepaper/` / `/specs/` when those remain the featured URL).
4. Authors keep writing markdown under `docs/`; no per-doc HTML page required.

## Surfaces

| Piece | Role |
|-------|------|
| `/docs/index.html` | Shell (directory index for `/docs/`) |
| `<guld-doc-view>` | File tree + document host |
| `<guld-md-doc>` | Thin markdown host (`src` attribute → `renderMarkdownDoc`) |
| `data/docs-tree.json` | Manifest of browsable paths (no directory-listing API) |
| `src/js/lib/doc-render.js` | Shared GFM render (existing) |

Curated routes **`/whitepaper/`**, **`/specs/`**, **`/help/paymento/`** stay as featured entry points; they keep using `renderMarkdownDoc`. The docs browser is the **generic** explorer and the fix for stray raw links.

## Serving

- Markdown SoT remains files under `docs/*.md` (and nested folders).
- Viewer is `docs/index.html` served at `/docs/` via `ServeDir` + `append_index_html_on_directories`.
- Raw `/docs/HOSTING.md` stays fetchable for the viewer (and tools); **UI hrefs** must not point humans there.

## Non-goals

- Full-text search
- Editing / CMS
- Replacing the software package tree (`guld-repo-view`)
- Rendering arbitrary URLs off-origin

## Acceptance

- [x] Footer Hosting and other site UI `.md` hrefs open HTML in `/docs/?…`
- [x] `/docs/` shows a file tree from `data/docs-tree.json`
- [x] Selecting a doc renders via marked + existing TOC / mermaid / xychart polish
- [x] In-document `.md` links resolve to the viewer (or curated whitepaper/specs URLs)
- [x] Brand / chrome tests cover the shell and nav hrefs

## History

Supersedes: `docs/intents/docs-browser.md`
