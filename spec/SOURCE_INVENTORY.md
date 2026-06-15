# terminalv2 — Source Inventory

Complete inventory of the Webflow static export (`airtuerk-terminal_webflow.zip`)
that seeds terminalv2.

**Zip size:** 270 MB
**Total files:** 802
**Last published by Webflow:** 2026-06-15 12:21:22 UTC

**Updated for Phase 3.5:** standalone pages removed, embeds catalog added.
See also `EMBEDS_INVENTORY.md` for the custom code preserved from this export.

---

## 1. HTML pages (21 files)

The zip contains 21 HTML files. Mapping to terminalv2 routes:

### Maps to a content page (13 files in final structure)

| Source file | Target URL | Type |
|---|---|---|
| `index.html` | `/` | Dashboard (block-driven) |
| `airtuerk-service.html` | `/airtuerk-service` | Brand overview |
| `airtuerk-holidays.html` | `/airtuerk-holidays` | Brand overview |
| `atbeds.html` | `/atbeds` | Brand overview |
| `service-center-antalya.html` | `/service-center-antalya` | Brand overview (URL renamed) |
| `ibe-product-suite.html` | `/ibe-product-suite` | Hardcoded (Tools Showcase) |
| `internal-branding.html` | `/internal-branding` | Brand overview |
| `airtuerk-apix.html` | `/airtuerk-apix` | Brand overview |
| `presentation-hub.html` | `/presentation-hub` | Hardcoded (sectioned doc list) |
| `asset-library.html` | `/asset-library` | Hardcoded UI |
| `documents-library.html` | `/documents-library` | Hardcoded UI |
| `team.html` | `/team` | Hardcoded UI |
| `playground.html` | `/playground` | Block-driven, hidden_in_sidebar |
| `preview.html` | (development scratch — skipped) | — |

### NOT migrated (removed in Phase 3.5)

These 4 standalone pages from the Webflow export are deleted per D-042:

| Source file | Reason |
|---|---|
| `budget26.html` | Internal scratch page, no recurring use |
| `ops.html` | Duty cards content — superseded by team directory |
| `image-grid.html` | Demo/sandbox |
| `focus-mgzn.html` | One-off magazine embed |

### System pages (3 files)

| Source file | Target | Type |
|---|---|---|
| `404.html` | Next.js `not-found.tsx` | Reused as template |
| `401.html` | Replaced by `/login` redirect | Not needed |
| `search.html` | `/search` | Becomes RAG chat in Phase 8 |

**Final page count: 52** (13 top-level + 39 sub-pages).

---

## 2. Sub-pages (extracted from sidebar anchors)

These hash-anchors become real nested routes.

### airtuerk Service (6) — the Schablone
- `#logo-airtuerk` → `/airtuerk-service/logos`
- `#colors` → `/airtuerk-service/colors`
- `#ux` → `/airtuerk-service/ux`
- `#master-deck` → `/airtuerk-service/master-deck`
- `#email-airtuerk-service` → `/airtuerk-service/email-signature` (hardcoded)
- `#letterhead` → `/airtuerk-service/letterhead`

### airtuerk Holidays (5)
- `#logos` → `/airtuerk-holidays/logos`
- `#colors` → `/airtuerk-holidays/colors`
- `#master` → `/airtuerk-holidays/master-deck`
- `#email-airtuerk-holidays` → `/airtuerk-holidays/email-signature` (hardcoded)
- `#letterhead` → `/airtuerk-holidays/letterhead`

### atBeds (6) — same Schablone as airtuerk Service
- `#logo-atbeds` → `/atbeds/logos`
- `#colors-logo` → `/atbeds/colors`
- `#ux` → `/atbeds/ux`
- `#master` → `/atbeds/master-deck`
- `#email-atbeds` → `/atbeds/email-signature` (hardcoded)
- `#letterhead` → `/atbeds/letterhead`

### Service Center Antalya (5) — URL renamed in Phase 3.5
- `#logo` → `/service-center-antalya/logo`
- `#colors` → `/service-center-antalya/colors`
- `#master` → `/service-center-antalya/master-deck`
- `#email-service-center` → `/service-center-antalya/email-signature` (hardcoded)
- `#letterhead` → `/service-center-antalya/letterhead`

### IBE Product Suite (7 — 6 visible + 1 hidden)
- `#multicheck` → `/ibe-product-suite/multicheck`
- `#cockpit` → `/ibe-product-suite/cockpit`
- `#myTransfer` → `/ibe-product-suite/mytransfer`
- `#myBooking` → `/ibe-product-suite/mybooking`
- `#rentalCar` → `/ibe-product-suite/rentalcar`
- `#myStats` → `/ibe-product-suite/mystats`
- `#airLounge` → `/ibe-product-suite/airlounge` (hidden_in_sidebar = true)

Each IBE product has its own brand record (added in migration 0008) with
`parent_id = (IBE Product Suite id)` and `is_product = true`.

### Internal Branding (2)
- `#applied` → `/internal-branding/applied-identity`
- `#configurator` → `/internal-branding/configurator` (hardcoded — Jersey Customizer)

### airtuerk APIX (8)
- `#present` → `/airtuerk-apix/presentation`
- `#workflow` → `/airtuerk-apix/workflow` (hardcoded — node graph)
- `#global` → `/airtuerk-apix/global-network` (hardcoded — animated map)
- `#partner` → `/airtuerk-apix/partner`
- `#agreement` → `/airtuerk-apix/agreement`
- `#doc` → `/airtuerk-apix/documentation`
- `#nda` → `/airtuerk-apix/nda`
- `#master` → `/airtuerk-apix/master-deck`

**Sub-page total: 39.**

---

## 3. Custom embeds preserved

The Webflow source has hand-written HTML/CSS/JS embeds that don't fit any
block type. **All preserved in `spec/embeds/`** (per D-046), to be ported 1:1
to React in Phase 6. Total ~224 KB:

| File | Source page | Phase 6 target |
|---|---|---|
| `apix-page-embeds.html` (34 KB) | airtuerk-apix.html | `<APIXWorkflow />` + `<APIXGlobalNetwork />` |
| `apix-additional.css` (22 KB) | airtuerk-apix.html | APIX styles |
| `apix-additional.js` (67 KB) | airtuerk-apix.html | APIX logic |
| `ibe-tools-showcase.html` (15 KB) | ibe-product-suite.html | `/ibe-product-suite` body |
| `jersey-customizer.html` (0.4 KB) + CSS/JS (17 KB) | internal-branding.html | `<JerseyCustomizer />` |
| `signature-generator.html` (0.6 KB) | airtuerk-service.html | `<SignatureGenerator />` (4 routes) |
| `out-of-office-generator.html` (0.4 KB) | airtuerk-service.html | `<OutOfOfficeGenerator />` |
| `color-strip-pattern.html` (0.7 KB) | airtuerk-service.html | Reference for `color_palette` block |
| `service-page-support.css/.js` (66 KB) | airtuerk-service.html | Shared Phase 6 styles/scripts |

See `EMBEDS_INVENTORY.md` for the full mapping and port plan.

---

## 4. Assets (`images/` directory — 708 files)

### By type

| Extension | Count | Target bucket |
|---|---|---|
| `.svg` | ~250 | `images/` |
| `.png` | ~140 | `images/` |
| `.jpg` / `.jpeg` | ~210 | `images/` |
| `.webp` | ~108 | `images/` |

### Subcategories (used for bucket subfolders)

| Subfolder | Contents |
|---|---|
| `brand-logos/airtuerk/` | airtuerk-Logo.svg + variants (Plain, B, W, SW) |
| `brand-logos/airtuerk-holidays/` | 00.airtuerk-holidays-main-logo.svg + variants |
| `brand-logos/atbeds/` | atBeds logos |
| `brand-logos/multicheck/` | multicheck.svg + variants |
| `brand-logos/mybooking/` | myBooking.svg |
| `brand-logos/mystats/` | myStats.svg |
| `brand-logos/mytransfer/` | myTransfer.svg |
| `brand-logos/rentalcar/` | rentalCar.svg |
| `brand-logos/airlounge/` | airLounge logos (legacy product) |
| `brand-logos/cockpit/` | Cockpit logos |
| `icons/` | Chevron-Down, Arrow icons, Menu, Search, etc. |
| `desktop-backgrounds/` | BG_red.png, BG_blue.png, BG_white.png |
| `team-backgrounds/` | call-airtuerk.jpg |
| `stock-photography/` | Various photographers |
| `product-shots/` | airtuerk_products.png |
| `thumbnails/` | Document preview thumbnails |
| `misc/` | Generic photos |
| `favicon/` | airtuerk-Favicon.svg, favicon.png, webclip.png |

Per-file mapping is in `asset-manifest.json` (Phase 2 output).

---

## 5. Documents (`documents/` directory — 47 files)

Categorized for the `documents` table.

### Framework agreements (8 files)
OTA + Tour Operator framework agreements, DE + EN, PDF + DOCX

### Partner agreements (4 files)
Picture and plain variants, DE + EN

### SEPA mandates (10 files)
Per-brand (airtuerk, holidays, legacy aerticket), DE + EN, PDF + DOCX

### Master decks (4 files)
airtuerk_Master_DE/EN, PDF + PPTX

### Brand logo packages (9 ZIP files)
One per brand including new IBE products

### Other (12 files)
NDA, API doc, Focus Magazine, bank info, HR forms, reference docs

---

## 6. Videos (`videos/` directory — 4 files)

| Filename | Target bucket subfolder |
|---|---|
| `Design-ohne-Titel-2.mp4` | `videos/master/` |
| `Design-ohne-Titel-2-transcode.mp4` | `videos/master/` |
| `Design-ohne-Titel-2-transcode.webm` | `videos/master/` |
| `Design-ohne-Titel-2-poster-00001.jpg` | `videos/posters/` |

---

## 7. Fonts (`fonts/` directory — 12 files)

Inter (5 weights), GeneralSans (4 weights), icon fonts (3 files).

Phase 3 decision: ship via `next/font/local` from `public/fonts/`. Bucket
exists but is empty for v1.

---

## 8. CSS & JS (legacy)

The Webflow CSS (`normalize.css`, `components.css`, `airtuerk-terminal.css`)
and JS (`airtuerk-terminal.js`) are **reference material only**.

terminalv2 uses Tailwind 4 + iOS 18 Liquid Glass tokens from scratch (D-034).

The reference files are kept in `/spec/reference/` for design lookup. The
custom embeds with real preserved value are in `/spec/embeds/`.

---

## 9. Team data (extracted from `team.html`)

- **Total members: 63**
- Embedded in inline `var EMPLOYEES = [...]` JavaScript array
- Fields: `firstName`, `lastName`, `title`, `team` (department), optional `photo`
- 5 members have photos; 58 use initials-only avatars

Departments observed: Management, Service, Finance, HR, IT, Flugdisposition,
Vertrieb, Marketing, Verwaltung, airtuerk Holidays.

Junction table `team_member_brands` handles multi-brand membership (D-026).

Full 63-member list extracted into `team-manifest.json` during Phase 2.

---

## 10. External references in HTML

| External reference | Replacement |
|---|---|
| `https://cdn.prod.website-files.com/...` (Webflow CDN) | Supabase Storage URLs |
| `https://ajax.googleapis.com/.../webfont.js` | `next/font/local` |
| Google Fonts (DM Mono, Inter, Plus Jakarta Sans) | Self-hosted via `next/font` |
| `https://cdn.jsdelivr.net/gh/airtuerkmarketing/terminal@main/airtuerk-search.js` | Built-in `/api/search` route |
| Webflow jQuery 3.5.1 | Removed — React replaces it |
| `https://airtuerk.de` | Kept as external link |
| `https://www.linkedin.com/...` | Kept |
| `https://www.instagram.com/...` | Kept |

---

## Summary numbers (canonical, post Phase 3.5)

| Asset class | Count |
|---|---|
| HTML pages in zip | 21 |
| Mapped to content routes | 13 |
| Target pages in DB | **52** (13 top-level + 39 sub-pages) |
| Target brands in DB | **15** (8 original + 7 IBE products) |
| Image files | 708 (uploaded 759) |
| Document files | 47 |
| Video files | 4 |
| Font files | 12 |
| Team members | 63 |
| Block types | 15 + raw_html |
| Custom embeds preserved | 12 files, ~224 KB |

If any future inventory disagrees with this document, this document wins —
unless DECISIONS.md or BUILD_LOG.md explicitly supersedes it.
