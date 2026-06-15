# terminalv2 — Embeds Inventory

Inventory of the custom HTML/CSS/JS embeds extracted from the original
Webflow site (`airtuerk-terminal_webflow.zip`). These are preserved verbatim
and will be ported to React components in Phase 6.

**Extracted:** Phase 3.5 (2026-06-15)
**Location in repo:** `spec/embeds/`
**Total size:** ~224 KB of custom code

---

## Why preserve these

The original site has hand-written interactive components that don't fit any
block type. Rather than rebuild them from scratch — risking visual or
behavioral drift — we keep the originals and port them 1:1 into React.

---

## File listing

| File | Size | Source page | Phase 6 target |
|---|---|---|---|
| `apix-page-embeds.html` | 34 KB | airtuerk-apix.html | `<APIXWorkflow />` + `<APIXGlobalNetwork />` |
| `apix-additional.css` | 22 KB | airtuerk-apix.html | Phase 6 CSS for APIX components |
| `apix-additional.js` | 67 KB | airtuerk-apix.html | Phase 6 JS for APIX components |
| `ibe-tools-showcase.html` | 15 KB | ibe-product-suite.html | The `/ibe-product-suite` page body |
| `jersey-customizer.html` | 0.4 KB | internal-branding.html | `<JerseyCustomizer />` JSX |
| `jersey-customizer-full.css` | 8.5 KB | internal-branding.html | `<JerseyCustomizer />` styles |
| `jersey-customizer-full.js` | 7.5 KB | internal-branding.html | `<JerseyCustomizer />` logic |
| `signature-generator.html` | 0.6 KB | airtuerk-service.html | `<SignatureGenerator brand="..."/>` |
| `out-of-office-generator.html` | 0.4 KB | airtuerk-service.html | `<OutOfOfficeGenerator brand="..."/>` |
| `color-strip-pattern.html` | 0.7 KB | airtuerk-service.html | Sample for `color_palette` block (D-005) |
| `service-page-support.css` | 35 KB | airtuerk-service.html | Phase 6 shared CSS |
| `service-page-support.js` | 31 KB | airtuerk-service.html | Phase 6 shared JS |

---

## Component breakdown

### 1. APIX Workflow + Global Network (largest, most complex)

**Source:** `airtuerk-apix.html` (7 embed blocks total)

The two largest blocks:

- **APIX Workflow Visualization** — interactive node graph showing how requests
  flow through the API platform. Uses CSS animations + pure JS. ~12 KB CSS + ~7 KB JS.
- **APIX Global Network** — animated world map / cards showing partner locations
  and POPs. ~10 KB combined CSS + JS.

Additional pieces:
- PowerPoint embed pattern (OneDrive/Office Online integration) — 652 chars
- Inter font preconnect + load — shared with Webflow's regular page chrome
- Several smaller animation blocks

**Phase 6 plan:**
- One React component per major widget: `<APIXWorkflow />`, `<APIXGlobalNetwork />`
- CSS lifted into CSS modules or styled-components
- JS converted to React hooks (`useState`, `useEffect`)
- Mounted by the hardcoded routes `/airtuerk-apix/workflow` and
  `/airtuerk-apix/global-network` (D-006)

### 2. IBE Tools Showcase

**Source:** `ibe-product-suite.html` (1 large embed, ~15 KB)

A standalone HTML block (`<!doctype html>` self-contained) that renders all
six IBE products as a tools showcase grid. Currently the entire page body.

**Phase 6 plan:**
- This becomes the body of the `/ibe-product-suite` landing page
- Renders the six products as `<ProductCard />` components reading from
  the new IBE sub-brand records (added in migration `0008_restructure_brands.sql`)
- Each card links to the product detail page (e.g. `/ibe-product-suite/multicheck`)

### 3. Jersey Customizer

**Source:** `internal-branding.html`

Interactive form-driven preview of branded swag (jerseys, badges). User
picks brand + size + name + number, sees mockup update.

**Phase 6 plan:**
- One React component `<JerseyCustomizer />`
- Mounted at `/internal-branding/configurator` (hardcoded route per D-006, D-025)
- Templates / mockup images stored as assets in Supabase Storage
- Form state in React, no backend needed (preview only — generates a
  download or print order via separate flow later)

### 4. Signature Generator

**Source:** `airtuerk-service.html` (also used on Holidays, atBeds, Service Center Antalya)

Form that captures name/email/phone/role and generates a downloadable HTML
email signature in airtuerk brand styling.

**Phase 6 plan:**
- One React component `<SignatureGenerator brand="..." />`
- Mounted at four routes:
  - `/airtuerk-service/email-signature`
  - `/airtuerk-holidays/email-signature`
  - `/atbeds/email-signature`
  - `/service-center-antalya/email-signature`
- Brand prop selects template variant (logo, colors, copy)
- Templates stored in DB so admin can edit them via CMS

### 5. Out-of-Office Generator

**Source:** `airtuerk-service.html` (only on Service)

Form for generating a German+English Out-of-Office reply. Outputs plain text
ready for Outlook/Gmail paste.

**Phase 6 plan:**
- One React component `<OutOfOfficeGenerator brand="..." />`
- Mounted at `/airtuerk-service/out-of-office` (new hardcoded route, ARCHITECTURE D-006)
- Same architecture as Signature Generator

### 6. Color Strip Pattern

**Source:** `airtuerk-service.html` (used 6× across Service + Holidays + atBeds + Service Center Antalya)

The actual implementation of the color-palette panel with hover-expand from
the videos.

**Phase 6 plan:**
- This is **the reference implementation** for the `color_palette` block
  type (D-005). The block renderer matches this CSS/animation exactly.
- Not a separate component — gets absorbed into `src/components/blocks/brand/color-palette.tsx`

---

## Page-level mapping

| Original Webflow page | terminalv2 equivalent | How embeds map |
|---|---|---|
| airtuerk-service.html | `/airtuerk-service` + 6 sub-pages | Color blocks → `color_palette` block. Signature & OOO → hardcoded routes. |
| airtuerk-holidays.html | `/airtuerk-holidays` + 5 sub-pages | Color blocks → `color_palette` block. Signature → hardcoded route. |
| atbeds.html | `/atbeds` + 6 sub-pages | Same schablone as airtuerk Service. |
| service-center-antalya.html | `/service-center-antalya` + 5 sub-pages | Same schablone (note URL rename). |
| ibe-product-suite.html | `/ibe-product-suite` (hardcoded) | Embed becomes the page body. Product sub-pages = new brand records. |
| internal-branding.html | `/internal-branding` + 2 sub-pages | Configurator embed → `/internal-branding/configurator` hardcoded route. |
| airtuerk-apix.html | `/airtuerk-apix` + 8 sub-pages | Workflow + Global Network embeds → 2 hardcoded routes. |

---

## How to use these in Phase 6

1. **Read the embed file.** It's the original HTML/CSS/JS.
2. **Identify the boundary** between Webflow page chrome (sidebar, footer, etc.)
   and the actual custom widget.
3. **Port to React** preserving DOM structure, class names, and behavior.
4. **CSS goes either** to a CSS module next to the component or to
   `src/styles/embeds/{name}.css` if shared.
5. **JS becomes React** — wrap event handlers, replace direct DOM ops with
   refs, lift state into hooks.
6. **Verify visually** against the original on a sample page.

---

## Anti-pattern

**Don't rebuild from scratch.** These are battle-tested visual components.
Recreating them from a screenshot loses subtle details (timing, easing,
specific shadow values, font fallbacks).

If a component is too complex to port (rare), document the decision in
`DECISIONS.md` and write a replacement spec.
