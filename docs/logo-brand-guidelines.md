# Logo & Brand Usage Guidelines

Design specification for issue #54. Defines the visual identity system so downstream work (SVG assets, sidebar header, favicon) can be implemented consistently.

**Canonical app name:** **Family Expenses**

Use this name everywhere the product is shown to users alongside the logo: sidebar header, mobile chrome, marketing copy, and the browser `<title>`. Retire alternate labels such as “Family Expense Manager” (current `index.html` title) and treat “Cost Tracking Family” as repository/API naming only.

---

## Brand palette

All colors map to tokens in [`src/global_styles.css`](../src/global_styles.css).

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Mark (primary) | `--color-primary` | `#2563eb` | Icon glyph on light backgrounds; filled mark background |
| Mark (hover) | `--color-primary-hover` | `#1d4ed8` | Interactive hover states on the logo link |
| Mark tint | `--color-primary-light` | `#dbeafe` | Optional soft badge behind mark-only in sidebar |
| Wordmark | `--color-text` | `#1e293b` | “Family Expenses” text on light surfaces |
| Muted wordmark | `--color-muted` | `#64748b` | Subtitle/tagline only—not part of the logo lockup |
| Light surface | `--color-surface` | `#ffffff` | Preferred full-logo background |
| Sidebar surface | `--color-sidebar` | `#e8edf3` | Sidebar header background |
| Page background | `--color-bg` | `#f1f5f9` | General app canvas |

**Do not** use semantic transaction colors (`--color-income`, `--color-expense`) in the logo—they are reserved for data visualization.

---

## Logo concept: Family Ledger Mark

The mark combines two ideas that fit a family expense tracker:

1. **Family** — three dots in a gentle arc (parents + child / household members).
2. **Ledger** — two horizontal bars below (expense rows in a register).

The geometry is intentionally minimal: circles and rounded rectangles only, no thin strokes, so it stays crisp as SVG and when rasterized at favicon sizes. Corner radius on the optional container square uses `--radius` (8px at 32×32 scale).

### Reference assets

| File | Description |
|------|-------------|
| [`docs/assets/logo-mark-filled.svg`](assets/logo-mark-filled.svg) | Filled mark (primary square + white glyph)—favicon & app icon |
| [`docs/assets/logo-mark-line.svg`](assets/logo-mark-line.svg) | Line mark (primary glyph on transparent)—sidebar & light UI |
| [`docs/assets/logo-full.svg`](assets/logo-full.svg) | Full lockup (line mark + wordmark) |

---

## Logo variants

### 1. Full logo (mark + wordmark)

Horizontal lockup for sidebar header, login screens, and any place where the product name should be readable.

```
[ Mark 24×24 ]  Family Expenses
     ↑ 8px gap      ↑ wordmark
```

| Property | Value |
|----------|-------|
| Mark size | 24×24 px (height drives alignment) |
| Gap between mark and wordmark | 8px (`--space-sm`) |
| Wordmark type | System UI stack: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif` |
| Wordmark weight | 600 (`--font-weight-semibold`) |
| Wordmark size | 18px (`--font-size-lg`, 1.125rem) |
| Wordmark color | `#1e293b` (`--color-text`) |
| Baseline alignment | Vertically center mark with cap height of wordmark |
| Minimum width | **120px** total lockup width |
| Minimum height | **24px** |

**Sidebar usage:** Place inside `.sidebar-header` above the “Filter transactions” subtitle. Subtitle remains muted helper text and is not part of the logo.

### 2. Compact mark-only

Square icon without wordmark for favicons, mobile tab bar, collapsed sidebar, and tight toolbars.

| Property | Value |
|----------|-------|
| Standard size | 32×32 px |
| UI minimum (in-app) | 20×20 px |
| Absolute minimum | 16×16 px (favicon only—use simplified filled variant) |
| Form | 1:1 square; use filled variant below 20px |

---

## Clear space

Protect legibility by keeping surrounding content outside the exclusion zone.

- **Full logo:** clear space = **1× mark height** (24px when mark is 24px) on all sides of the entire lockup (mark + wordmark bounding box).
- **Mark-only:** clear space = **1× mark width** on all sides.

Nothing else (text, icons, borders) may enter this zone except the sidebar header divider, which sits below the clear-space area.

---

## Color variants

| Variant | Mark | Wordmark | Background | When to use |
|---------|------|----------|------------|-------------|
| **Primary on light** | `#2563eb` glyph (line mark) or filled square | `#1e293b` | `#ffffff`, `#f1f5f9`, or `#e8edf3` | Default—sidebar, page headers |
| **Primary filled** | `#2563eb` square + white glyph | — | Transparent or any light surface | Favicon, PWA icon, mark-only under 20px |
| **Monochrome** | `#1e293b` | `#1e293b` | Light surfaces | Print, grayscale, high-contrast fallback |
| **Reversed** | White glyph | `#ffffff` | `#2563eb` or `#1d4ed8` | Primary buttons, marketing hero (future) |

**Light-background rules**

- Prefer the **line mark** on `--color-sidebar` and `--color-surface`; the filled square is not required on these surfaces.
- Do not place the primary-blue wordmark on `--color-sidebar` without the mark—always use the full lockup or mark-only.
- Avoid drop shadows on the logo; elevation tokens (`--shadow`) are for cards, not brand marks.

---

## Favicon treatment

Serve a single SVG favicon (`logo-mark-filled.svg`) plus PNG fallbacks generated from it.

| Size | Treatment |
|------|-----------|
| **32×32** | Full filled mark: 8px corner radius, three 5px white dots (arc), two white ledger bars (16px and 12px wide). Matches reference SVG 1:1. |
| **16×16** | Same artwork scaled down—do **not** remove the ledger bars or reduce to a single letter. At this size the filled primary square provides contrast; white glyph elements stay ≥2px thick after rasterization. |

**Implementation notes for downstream issues**

- Add `<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">` and PNG siblings at 16×16 and 32×32.
- Prefer SVG for modern browsers; PNG for Safari pinned-tab and legacy caches.
- `theme-color` meta may use `#2563eb` to match the filled mark.

---

## Typography & naming

| Context | Value |
|---------|-------|
| Logo wordmark | **Family Expenses** (title case, two words) |
| Browser `<title>` | `Family Expenses` |
| Sidebar `.sidebar-title` | Replace current “Family Expenses” plain text with full logo lockup; keep subtitle “Filter transactions” separate |
| API / repo | “Cost Tracking Family API” / `cost-tracking-family`—no change required |

Do not abbreviate to “FE” or “FEM” in user-facing UI.

---

## Implementation checklist (future issues)

- [ ] Add optimized SVG/PNG assets under `src/assets/brand/`
- [ ] Update `src/index.html` title and favicon links
- [ ] Replace sidebar plain-text title with full logo component
- [ ] Add optional `aria-label="Family Expenses home"` on logo link if mark becomes clickable
