# Guld brand concepts

## Positioning

- **Guld 2.0** — identity-focused DeFi L0 (in progress)
- Thesis: **Address by name. Commit by hash. Authorize by proof.**
- **Hard fork** of Guld 1.0 software and ledger (not a soft upgrade path)
- Public docs: `/whitepaper/`, `/specs/` (HTML; markdown from `/docs/`)
- Legacy 1.0 assets in `archives/` are reference and brand history only

## Copy (locked)

| Role | Line | Where |
|------|------|--------|
| **Marketing tagline** | **Address people by name.** | Landing hero (`h1`), OG/social, ads, Discord bot about, press |
| **Protocol thesis** | Address by name. Commit by hash. Authorize by proof. | Whitepaper, specs, essays — not the first viewport |

The marketing tagline is **locked**. Do not swap it for the thesis, shorten it to “Address by name.” on marketing surfaces, or invent a competing hero line. Supporting lede/meta may continue after it; the tagline itself stays intact (including the period when it stands alone as a headline).

Coined for Guld marketing by contributor **cmejia** (`chrissmejia`). Credit when retelling origin; do not treat as unsettled copy.

## Palette (from legacy guld.io)

| Token | Hex | Use |
|-------|-----|-----|
| `--guld-ink` | `#353e55` | Body text |
| `--guld-navy` | `#264175` | Headings |
| `--guld-primary` | `#274175` | Links, primary actions |
| `--guld-theme` | `#000000` | PWA theme-color / deep chrome |

## Marks

Import from `archives/experiment-Q1-2026/io-http-guld.io/img/`:

- `logo.svg` / `logo.png` — primary wordmark/mark
- `guld.svg` / `guld256x256.png` — icon variants
- `favicon.png` — favicon
- `og.jpg` / `og.svg` — social

## Frontend rules

- Static PWA at repo root; no Bootstrap; no CDN UI kits
- Brand as hero-level signal on the first viewport; hero headline = locked marketing tagline above
- Self-host fonts if used (no hard Google Fonts CDN dependency)
- Edit `docs/whitepaper` or `docs/specs` in place — no sync step
