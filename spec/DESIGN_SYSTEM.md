# terminalv2 — Design System

The visual and interaction language of terminalv2.

**Adopted:** Phase 3.5 (2026-06-15) — see D-034 in `DECISIONS.md`.
**Source:** Adapted from the `airtuerk_intelligence` repository's iOS 18 Liquid Glass implementation.
**Reference mockup:** `spec/mockups/v3-01-dashboard.html`

---

## Core principle

terminalv2 uses a **liquid-glass material system** with two themes
(`ios18-light`, `ios18-dark`). Surfaces stack via translucent materials and
subtle ambient orbs. The visual language is calm, premium, and gets out of
the way of the content.

**Three rules:**

1. **Content first.** The brand portal is for assets and documents. Chrome
   is invisible by default.
2. **One accent color.** Quantum Blue. Used sparingly for the active state,
   focus rings, and primary calls to action.
3. **Brand colors stay in brand content.** Torch Red, Orient Blue, etc.,
   appear only when displaying the actual brand palette or a brand logo.
   Never in UI chrome.

---

## 1. Color tokens

### Theme: `ios18-light` (default)

| Token | Value | Use |
|---|---|---|
| `--bg` | `#F7F8FC` | Page background |
| `--surface` | `rgba(255,255,255,0.78)` | Glass card background |
| `--surface-strong` | `rgba(255,255,255,0.92)` | Glass card on hover |
| `--surface-flat` | `#FFFFFF` | Solid white for opaque areas |
| `--surface-muted` | `#F1F2F6` | Logo-display backgrounds, secondary surfaces |
| `--hairline` | `rgba(0,0,0,0.08)` | Card borders |
| `--separator` | `rgba(60,60,67,0.10)` | Inline dividers |
| `--text-1` | `rgba(0,0,0,0.92)` | Primary text |
| `--text-2` | `rgba(60,60,67,0.62)` | Secondary text |
| `--text-3` | `rgba(60,60,67,0.38)` | Tertiary text, captions |
| `--accent` | `#0A82DF` | Quantum Blue — links, focus, active state |
| `--accent-soft` | `rgba(10,130,223,0.08)` | Active item background |
| `--accent-border` | `rgba(10,130,223,0.22)` | Active item border |

### Theme: `ios18-dark`

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0b0e14` | Page background |
| `--surface` | `rgba(28,30,36,0.68)` | Glass card background |
| `--surface-strong` | `rgba(38,40,46,0.85)` | Glass card on hover |
| `--surface-flat` | `#16181D` | Solid surface |
| `--surface-muted` | `#1A1C22` | Secondary surfaces |
| `--hairline` | `rgba(255,255,255,0.08)` | Card borders |
| `--separator` | `rgba(200,200,210,0.08)` | Inline dividers |
| `--text-1` | `rgba(255,255,255,0.95)` | Primary text |
| `--text-2` | `rgba(235,235,245,0.62)` | Secondary text |
| `--text-3` | `rgba(235,235,245,0.38)` | Tertiary text |
| `--accent` | `#0A9EFF` | Quantum Blue (slightly brighter) |
| `--accent-soft` | `rgba(10,158,255,0.14)` | Active background |
| `--accent-border` | `rgba(10,158,255,0.30)` | Active border |

### Brand content colors

These are **never** UI chrome. They appear only when rendering brand
identity content (color palette blocks, brand logo marks).

| Token | Value | Brand |
|---|---|---|
| `--torch` | `#ED1C24` | airtuerk Service primary |
| `--orient` | `#17479E` | airtuerk Service accent / Holidays |
| `--tiara` | `#C7C6C5` | airtuerk Service neutral |
| `--quantum` | `#0A82DF` | UX/UI primary (also Service Center) |
| `--jet` | `#222222` | UX/UI neutral |
| `--ghost` | `#F7F7F7` | UX/UI surface |

### Brand-card colors (Dashboard / Brand Cards)

Each brand card has its own mark color. These come from the brand record in
the database, NOT from CSS tokens.

| Brand | Color |
|---|---|
| airtuerk Service | `#ED1C24` (Torch Red) |
| airtuerk Holidays | `#FF8A00` (Orange) |
| atBeds | `#2DBE60` (Green) |
| Service Center Antalya | `#C0392B` (Burnt Red) |
| IBE Product Suite | `#0A82DF` (Quantum Blue) |
| Internal Branding | `#6B46C1` (Purple) |
| airtuerk APIX | `#00868C` (Teal) |
| Presentation Hub | (no card — resources section) |

### IBE Product colors (sub-products)

| Product | Color |
|---|---|
| multicheck | `#6B46C1` |
| cockpit | `#0A82DF` |
| myTransfer | `#2DBE60` |
| myBooking | `#E8B900` |
| rentalCar | `#00868C` |
| myStats | `#C0392B` |
| airLounge | `#8B5A35` (hidden in sidebar) |

---

## 2. Typography

| Role | Family | Sizes |
|---|---|---|
| Sans (default) | **Inter** (self-hosted via `next/font`), then `system-ui, -apple-system, sans-serif` fallback | 11–44px |
| Mono | **Inter** — `--font-mono` aliases the sole Inter family (no separate monospace) | numerals, color values |

### Type scale (tracks landing page hero down to fine print)

| Token | Size | Weight | Line height | Letter spacing |
|---|---|---|---|---|
| `h1` | 38–44px | 600 | 1.05–1.10 | -0.022em |
| `h2` | 22px | 600 | 1.15 | -0.012em |
| `h3` | 16px | 600 | 1.30 | -0.010em |
| `body-lg` | 17px | 400 | 1.55 | 0 |
| `body` | 14px | 400 | 1.50 | 0 |
| `caption` | 13px | 400 | 1.50 | 0 |
| `eyebrow` | 11px | 600 | 1 | 0.08em uppercase |
| `mono-sm` | 11–13px | 500 | 1.40 | 0.04em |

---

## 3. Spacing

8-px scale, named tokens:

| Token | px |
|---|---|
| `--space-1` | 4 |
| `--space-2` | 8 |
| `--space-3` | 12 |
| `--space-4` | 16 |
| `--space-5` | 20 |
| `--space-6` | 24 |
| `--space-8` | 32 |
| `--space-10` | 40 |
| `--space-12` | 48 |
| `--space-16` | 64 |
| `--space-20` | 80 |

---

## 4. Radius

| Token | px | Use |
|---|---|---|
| `--radius-sm` | 8 | Buttons, nav items |
| `--radius-md` | 12 | Inputs, search field |
| `--radius-lg` | 16 | Small cards |
| `--radius-xl` | 20 | Standard cards, glass panels |
| `--radius-full` | 9999 | Pills, chips |

---

## 5. Shadows

**+5% stronger than initial proposal** — verified visible-but-subtle.

### Light theme

```
--shadow-rest:  0 1px 2px rgba(0,0,0,0.05), 0 3px 10px -1px rgba(0,0,0,0.06);
--shadow-hover: 0 1px 3px rgba(0,0,0,0.07), 0 6px 18px -2px rgba(0,0,0,0.10);
```

### Dark theme

```
--shadow-rest:  0 1px 2px rgba(0,0,0,0.35), 0 3px 10px -1px rgba(0,0,0,0.45);
--shadow-hover: 0 1px 3px rgba(0,0,0,0.40), 0 6px 18px -2px rgba(0,0,0,0.50);
```

---

## 6. Glass materials

### `.card` — standard glass surface

```css
background-color: var(--surface);
backdrop-filter: saturate(180%) blur(18px);
border: 1px solid var(--hairline);
border-radius: 20px;
box-shadow: var(--shadow-rest);
transition: box-shadow 250ms, background-color 250ms;
```

On hover: background-color goes to `--surface-strong`, shadow to
`--shadow-hover`. **No translate-Y bounce** — the change is calm.

### `.sidebar-inner` — sidebar glass panel

Same as `.card` but with `blur(24px)` for stronger frosted effect since the
sidebar is sticky against ambient orbs.

---

## 7. Ambient orbs

Three orbs render in `.ambient`:

- 3 radial gradients in the body background, plus
- 3 absolutely positioned blurred orbs that animate slowly (70–90s loops)

**Toggleable.** Stored as user preference (cookie) and brand-level default:

| Page type | Default |
|---|---|
| Dashboard / Landing | ON |
| Brand detail page | OFF |
| Asset Library, Document Library, Team | OFF |
| Admin | OFF |

Respect `prefers-reduced-motion` — orbs go static.

---

## 8. Layout grid

### App shell

```
┌────────────┬────────────────────────────────────────────────┐
│  sidebar   │  main                                          │
│  252px     │  padding: 24px 32px                            │
│  collapsi- │  max-width: 100%                               │
│  ble       │                                                │
│  to 64px   │  ┌─ topbar ─┐                                  │
│            │  │ search   │  notifications | site link      │
│            │  └──────────┘                                  │
│            │                                                │
│            │  ┌─ content (hero / sections / blocks) ──┐    │
│            │  └────────────────────────────────────────┘    │
└────────────┴────────────────────────────────────────────────┘
```

### Brand detail page two-column

Sections within brand-detail pages use a two-column grid:
- Left column ~30% — section label, index number (e.g. "02.01"), description
- Right column ~70% — actual content (logo block, color palette, downloads)

Matches the original Webflow `.two-blocks-content-grid` pattern.

---

## 9. Component library (data-driven from blocks)

The block types in `ARCHITECTURE.md §4` get rendered with these visual rules:

### `color_palette` block

**Tall color panels with hover-expand effect.**

- Each color = full-height panel (320px tall minimum)
- Panel header: `01 / 02 / 03` index + role tag (Primary/Neutral/Accent)
- Center: color name in 26px semibold
- Bottom: HEX + RGB/CMYK in mono font
- Hover: hovered panel expands, others compress. 600ms ease-out transition.
- Click: copy HEX to clipboard, show toast

### `logo_showcase` block

**Webflow-style large logo display.**

- Light-grey muted background (`--surface-muted`)
- Logo centered, large (56px–96px for monogram)
- "Download" link top-right (subtle)
- Below: optional logo-package card with outline CTA button

### `document_list` block — three style options

Block content includes a `style` field: `list_rows` | `preview_cards` | `image_outline_button`.

If not set, falls back to `settings.documents.download_style.default` (= `preview_cards`).

**Option 1: List rows** — compact list, filetype badge + filename + meta + download icon.
**Option 2: Preview cards (default)** — document thumbnail card with filetype-pill download links below.
**Option 3: Image + outline button** — photographed document on wood/colored background, full CTA button + caption.

### `asset_block`

Big preview image + downloads list, matches Webflow original.

---

## 10. Animation rules

- Default ease: `cubic-bezier(0.16, 1, 0.3, 1)` (smooth-out)
- Default duration: 150ms (small UI), 250ms (state changes), 600ms (large layout shifts)
- **No bouncy translate-Y on card hover.** Subtle background-color + shadow swap only.
- Honor `prefers-reduced-motion` everywhere

---

## 11. Mobile

Sidebar collapses to a top-bar burger menu under 768px. The toggle button
becomes a slide-out drawer trigger. Brand cards stack to single column.

Full mobile spec lives in Phase 4 implementation.

---

## 12. Where this lives in code

| Layer | Location |
|---|---|
| Design tokens | `src/styles/theme.css` |
| Tailwind config bridge | `tailwind.config.ts` reads tokens via CSS vars |
| Material components | `src/components/ui/material-card.tsx` etc. |
| Block renderers | `src/components/blocks/*` |
| Sidebar | `src/components/shell/sidebar.tsx` |

The token CSS originated as an inline `<style>` block in the reference mockup
(`spec/mockups/v3-01-dashboard.html`) and has since been ported to
`src/styles/theme.css`, which is now the canonical source.

---

## 13. Decision references

| Decision | About |
|---|---|
| D-010 | Original "Vercel-style admin aesthetic" — superseded by D-034 |
| D-011 | Dark mode deferred — superseded by D-035 (dark mode allowed) |
| D-034 | Adopt iOS 18 Liquid Glass design system |
| D-035 | Dark mode allowed (was deferred) |
| D-036 | Quantum Blue as UI accent |
| D-037 | Three document download styles |
| D-038 | Sidebar structure & expandable IBE |
| D-039 | Brand hierarchy with parent_id |
| D-040 | Presentation Hub as resources |
