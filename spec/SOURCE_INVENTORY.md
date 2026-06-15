# terminalv2 — Source Inventory

Complete inventory of the Webflow static export (`airtuerk-terminal_webflow.zip`)
that seeds terminalv2. Generated from the actual zip contents, not estimated.

**Zip size:** 270 MB
**Total files:** 802
**Last published by Webflow:** 2026-06-15 12:21:22 UTC

---

## 1. HTML pages (21 files)

The zip contains 21 HTML files. Mapping to terminalv2 routes:

### Maps to a content page (16 files)

| Source file | Target URL | Type |
|---|---|---|
| `index.html` | `/` | Landing |
| `airtuerk-service.html` | `/airtuerk-service` | Brand overview |
| `airtuerk-holidays.html` | `/airtuerk-holidays` | Brand overview |
| `atbeds.html` | `/atbeds` | Brand overview |
| `service-center-antalya.html` | `/service-center` | Brand overview (renamed) |
| `ibe-product-suite.html` | `/ibe-product-suite` | Brand overview |
| `internal-branding.html` | `/internal-branding` | Brand overview |
| `airtuerk-apix.html` | `/airtuerk-apix` | Brand overview |
| `presentation-hub.html` | `/presentation-hub` | Utility |
| `asset-library.html` | `/asset-library` | Utility (hardcoded UI) |
| `documents-library.html` | `/documents-library` | Utility (hardcoded UI) |
| `team.html` | `/team` | Utility (hardcoded UI) |
| `playground.html` | `/playground` | Utility/sandbox |
| `budget26.html` | `/budget26` | Standalone page |
| `ops.html` | `/ops` | Standalone page (duty cards) |
| `image-grid.html` | `/image-grid` | Standalone page |
| `focus-mgzn.html` | `/focus-mgzn` | Standalone page |
| `preview.html` | (development scratch — skipped) | — |

### System pages (3 files)

| Source file | Target | Type |
|---|---|---|
| `404.html` | Next.js `not-found.tsx` | Reused as template |
| `401.html` | Replaced by `/login` redirect | Not needed |
| `search.html` | `/search` | Becomes RAG chat in Phase 8 |

**Important correction:** Earlier counts said "48 pages." The accurate total is
**56 pages**: 13 top-level + 39 sub-pages + 4 standalone (budget26, ops,
image-grid, focus-mgzn). See ARCHITECTURE.md §2 for the canonical list.

---

## 2. Sub-pages (extracted from sidebar anchors)

These are the hash-anchors that today exist within parent pages. They become
real nested routes in terminalv2.

### airtuerk Service (6)
- `#logo-airtuerk` → `/airtuerk-service/logos`
- `#colors` → `/airtuerk-service/colors`
- `#ux` → `/airtuerk-service/ux`
- `#master-deck` → `/airtuerk-service/master-deck`
- `#email-airtuerk-service` → `/airtuerk-service/email-signature`
- `#letterhead` → `/airtuerk-service/letterhead`

### airtuerk Holidays (5)
- `#logos` → `/airtuerk-holidays/logos`
- `#colors` → `/airtuerk-holidays/colors`
- `#master` → `/airtuerk-holidays/master-deck`
- `#email-airtuerk-holidays` → `/airtuerk-holidays/email-signature`
- `#letterhead` → `/airtuerk-holidays/letterhead`

### atBeds (6)
- `#logo-atbeds` → `/atbeds/logos`
- `#colors-logo` → `/atbeds/colors`
- `#ux` → `/atbeds/ux`
- `#master` → `/atbeds/master-deck`
- `#email-atbeds` → `/atbeds/email-signature`
- `#letterhead` → `/atbeds/letterhead`

### Service Center (5)
- `#logo` → `/service-center/logo`
- `#colors` → `/service-center/colors`
- `#master` → `/service-center/master-deck`
- `#email-service-center` → `/service-center/email-signature`
- `#letterhead` → `/service-center/letterhead`

### IBE Product Suite (7)
- `#multicheck` → `/ibe-product-suite/multicheck`
- `#rentalCar` → `/ibe-product-suite/rentalcar`
- `#myBooking` → `/ibe-product-suite/mybooking`
- `#myStats` → `/ibe-product-suite/mystats`
- `#myTransfer` → `/ibe-product-suite/mytransfer`
- `#airLounge` → `/ibe-product-suite/airlounge`
- `#cockpit` → `/ibe-product-suite/cockpit`

### Internal Branding (2)
- `#applied` → `/internal-branding/applied-identity`
- `#configurator` → `/internal-branding/configurator`

### airtuerk APIX (8)
- `#present` → `/airtuerk-apix/presentation`
- `#workflow` → `/airtuerk-apix/workflow`
- `#global` → `/airtuerk-apix/global-network`
- `#partner` → `/airtuerk-apix/partner`
- `#agreement` → `/airtuerk-apix/agreement`
- `#doc` → `/airtuerk-apix/documentation`
- `#nda` → `/airtuerk-apix/nda`
- `#master` → `/airtuerk-apix/master-deck`

**Sub-page total: 39.** See ARCHITECTURE.md §2 for full tree.

---

## 3. Assets (`images/` directory — 708 files)

### By type (estimated from extensions)

| Extension | Count | Target bucket |
|---|---|---|
| `.svg` | ~250 | `images/` |
| `.png` | ~140 | `images/` |
| `.jpg` / `.jpeg` | ~210 | `images/` |
| `.webp` | ~108 | `images/` |

### Subcategories (used for bucket subfolders)

| Subfolder in `images/` bucket | Contents |
|---|---|
| `brand-logos/airtuerk/` | airtuerk-Logo.svg + variants (Plain, B, W, SW) |
| `brand-logos/airtuerk-holidays/` | 00.airtuerk-holidays-main-logo.svg + variants |
| `brand-logos/atbeds/` | atBeds logos |
| `brand-logos/multicheck/` | multicheck.svg + variants |
| `brand-logos/mybooking/` | myBooking.svg |
| `brand-logos/mystats/` | myStats.svg |
| `brand-logos/mytransfer/` | myTransfer.svg |
| `brand-logos/rentalcar/` | rentalCar.svg |
| `brand-logos/airlounge/` | (logos to be confirmed during upload) |
| `brand-logos/cockpit/` | (logos to be confirmed during upload) |
| `icons/` | Chevron-Down, Arrow-Left/Right/Up-Right, Menu, Close-Menu, Search, Phone, Calendar, User_02, Steering_Wheel, Luggage, Bell_Ring, Archive, Jet_Engine, Airplane_Mode_On, Air_Traffic_Control_Tower, Pattern, Emblem-Original, download, AaBbCc, etc. |
| `desktop-backgrounds/` | BG_red.png, BG_blue.png, BG_white.png |
| `team-backgrounds/` | call-airtuerk.jpg + similar |
| `stock-photography/` | mohammad-rahmani-*, riccardo-valeriana-*, christian-wiediger-*, nikita-kachanovsky-*, visualsoflukas-*, arif-riyanto-*, majid-rangraz-*, pexels-divinetechygirl-*, clement-m-* |
| `product-shots/` | airtuerk_products.png, TableStand1.png |
| `thumbnails/` | OTA-Framework-Agreement_DE.jpg, document preview thumbnails |
| `misc/` | Notizblock1.jpg, westhafen.jpg, office.jpg, dd5407_* mv2 images, BG generic |
| `favicon/` | airtuerk-Favicon.svg, favicon.png, webclip.png |

The exact mapping per file is built into `asset-manifest.json` during Phase 2.

---

## 4. Documents (`documents/` directory — 47 files)

Categorized for the `documents` table:

### Framework agreements (8 files)

| Filename | Category | Language | Pair |
|---|---|---|---|
| `OTA-Framework-Agreement_DE.pdf` | framework-agreement | de | A |
| `OTA-Framework-Agreement_DE.docx` | framework-agreement | de | A |
| `OTA-Framework-Agreement_EN.pdf` | framework-agreement | en | A |
| `OTA-Framework-Agreement_EN.docx` | framework-agreement | en | A |
| `Tour-Operator-Framework-Agreement_DE.pdf` | framework-agreement | de | B |
| `Tour-Operator-Framework-Agreement_DE.docx` | framework-agreement | de | B |
| `Tour-Operator-Framework-Agreement_EN.pdf` | framework-agreement | en | B |
| `Tour-Operator-Framework-Agreement_EN.docx` | framework-agreement | en | B |

### Partner agreements (4 files)

| Filename | Category | Language |
|---|---|---|
| `Partner_Framework_Agreement_picture.pdf` | partner-agreement | en |
| `Partner_Framework_Agreement_plain.pdf` | partner-agreement | en |
| `Partner_Framework_Agreement_DE-Picture-Version.pdf` | partner-agreement | de |
| `Partner_Framework_Agreement_DE-Plain-Version.pdf` | partner-agreement | de |

### SEPA mandates (10 files)

| Filename | Category | Language | Brand |
|---|---|---|---|
| `SEPA-Firmenlastschrift-Mandat_airtuerk_DE.pdf` | sepa-mandate | de | airtuerk |
| `SEPA-Firmenlastschrift-Mandat_airtuerk_EN.pdf` | sepa-mandate | en | airtuerk |
| `SEPA-Firmenlastschrift-Mandat_-airtuerk_DE.docx` | sepa-mandate | de | airtuerk |
| `SEPA-Firmenlastschrift-Mandat_-airtuerk_EN.docx` | sepa-mandate | en | airtuerk |
| `SEPA-Firmenlastschrift-Mandat_airtuerk-holidays_DE.pdf` | sepa-mandate | de | airtuerk-holidays |
| `SEPA-Firmenlastschrift-Mandat_airtuerk-holidays_EN.pdf` | sepa-mandate | en | airtuerk-holidays |
| `SEPA-Firmenlastschrift-Mandat_aerticket_DE.pdf` | sepa-mandate | de | (legacy) |
| `SEPA-Firmenlastschrift-Mandat_aerticket_EN.pdf` | sepa-mandate | en | (legacy) |
| `SEPA-Firmenlastschrift-Mandat_aerticket_DE.docx` | sepa-mandate | de | (legacy) |
| `SEPA-Firmenlastschrift-Mandat_aerticket_EN.docx` | sepa-mandate | en | (legacy) |

### Master decks (4 files)

| Filename | Category | Language |
|---|---|---|
| `airtuerk_Master_DE.pdf` | master-deck | de |
| `airtuerk_Master_DE.pptx` | master-deck | de |
| `airtuerk_Master_EN.pdf` | master-deck | en |
| `airtuerk_Master_EN.pptx` | master-deck | en |

### Brand logo packages (9 ZIP files)

| Filename | Category | Brand |
|---|---|---|
| `airtuerk-Logo.zip` | logo-package | airtuerk |
| `atBeds-Logo.zip` | logo-package | atbeds |
| `multicheck_Logo.zip` | logo-package | multicheck |
| `myBooking_Logo.zip` | logo-package | mybooking |
| `myStats_Logo.zip` | logo-package | mystats |
| `myTransfer_Logo.zip` | logo-package | mytransfer |
| `rentalCar_Logo.zip` | logo-package | rentalcar |
| `airLounge_Logo.zip` | logo-package | airlounge |
| `Cockpit_Logo.zip` | logo-package | cockpit |

### Other (12 files)

| Filename | Category | Notes |
|---|---|---|
| `airtuerk-NDA.zip` | nda | Standard NDA package |
| `API_Doc_v1.pdf` | api-doc | APIX documentation v1 |
| `Focus-Magazine_June_page.pdf` | magazine | Focus issue |
| `Abweichende-Bankverbindung.pdf` | bank-info | de |
| `Abweichende-Bankverbindung.docx` | bank-info | de |
| `Reisekostenformular-2026.pdf` | hr-form | de, 2026 version |
| `Reisekostenformular-2026.docx` | hr-form | de, 2026 version |
| `Logos.pdf` | reference | Compiled logo reference |
| `airtuerk_Logos.pdf` | reference | airtuerk-specific logo reference |
| `Hauptkonto.zip` | bank-info | Account documents |
| `Nebenkonto01.zip` | bank-info | Account documents |
| `Bayram-2026-Bilder.zip` | misc | Holiday imagery pack |

---

## 5. Videos (`videos/` directory — 4 files)

| Filename | Target bucket subfolder |
|---|---|
| `Design-ohne-Titel-2.mp4` | `videos/master/` |
| `Design-ohne-Titel-2-transcode.mp4` | `videos/master/` |
| `Design-ohne-Titel-2-transcode.webm` | `videos/master/` |
| `Design-ohne-Titel-2-poster-00001.jpg` | `videos/posters/` |

---

## 6. Fonts (`fonts/` directory — 12 files)

| Filename | Target bucket subfolder | Note |
|---|---|---|
| `Inter-Light.woff2` | `fonts/inter/` | Local-hosted, used in CSS |
| `Inter-Regular.woff2` | `fonts/inter/` | |
| `Inter-Medium.woff2` | `fonts/inter/` | |
| `Inter-SemiBold.woff2` | `fonts/inter/` | |
| `Inter-Bold.woff2` | `fonts/inter/` | |
| `GeneralSans-Regular.woff2` | `fonts/general-sans/` | |
| `GeneralSans-Medium.woff2` | `fonts/general-sans/` | |
| `GeneralSans-Semibold.woff2` | `fonts/general-sans/` | |
| `GeneralSans-Bold.woff2` | `fonts/general-sans/` | |
| `fontello.woff` | `fonts/icon-fonts/` | Icon font, may be replaceable by lucide |
| `line-rounded-icon-font-brix.woff` | `fonts/icon-fonts/` | Icon font |
| `social-media-icon-font-brix.woff` | `fonts/icon-fonts/` | Icon font |

**Note:** terminalv2 prefers `lucide-react` for icons. Icon fonts (`fontello`,
`brix-*`) get migrated to Lucide equivalents during Phase 4. They're uploaded
to Storage as a fallback but should not be relied on in new code.

---

## 7. CSS & JS (legacy)

The CSS (`normalize.css`, `components.css`, `airtuerk-terminal.css`) and JS
(`airtuerk-terminal.js`) files from Webflow are **reference material only**.
They are NOT migrated into terminalv2 directly. terminalv2 uses Tailwind +
shadcn/ui from scratch.

The reference files are kept in `/spec/reference/` for design lookup during
the rebuild.

---

## 8. Team data (extracted from `team.html`)

Team data is embedded in an inline JavaScript array (`var EMPLOYEES = [...]`)
in team.html. Confirmed via inspection:

- **Total members: 63**
- Fields per member: `firstName`, `lastName`, `title` (position), `team`
  (department), optional `photo` (asset URL)
- 5 members have photos: Ümit Tenekeci, Ahmet Oezbek, Emre Karakas,
  Hakan Sezen, Oruc Demir
- Remaining 58 use initials-only avatars

Departments observed in screenshot (Image 10):
Management (5), Service (16), Finance (9), HR (3), IT (14), Flugdisposition
(5), Vertrieb (4), Marketing (2), Verwaltung (3), airtuerk Holidays (2).

Some members belong to multiple brands ("airtuerk Holidays 2" appears as
both a department-like filter and a brand). Handled via junction table
`team_member_brands` (D-026).

The full 63-member list is extracted into `team-manifest.json` during Phase 2.

---

## 9. External references in HTML

Things the source HTML loads from outside, that we replace:

| External reference | Replacement |
|---|---|
| `https://cdn.prod.website-files.com/...` (Webflow CDN) | Supabase Storage URLs |
| `https://ajax.googleapis.com/.../webfont.js` (Web Font Loader) | `next/font/local` |
| Google Fonts (DM Mono, Inter, Plus Jakarta Sans) | Self-hosted via `next/font` |
| `https://cdn.jsdelivr.net/gh/airtuerkmarketing/terminal@main/airtuerk-search.js` | Built-in `/api/search` route |
| `https://d3e54v103j8qbb.cloudfront.net/.../jquery-3.5.1.min.js` (Webflow jQuery) | Removed — React replaces it |
| `https://airtuerk.de` | Kept as external link |
| `https://www.linkedin.com/company/airtuerk-service-gmbh/` | Kept as external link |
| `https://www.instagram.com/airtuerk_official/` | Kept as external link |

---

## Summary numbers (canonical)

| Asset class | Count |
|---|---|
| HTML pages in zip | 21 |
| Mapped to content routes | 17 (incl. 4 standalone) |
| Target pages in DB | **56** (13 top-level + 39 sub-pages + 4 standalone) |
| Image files | 708 |
| Document files | 47 |
| Video files | 4 |
| Font files | 12 |
| Team members | 63 |
| Brands | 8 |
| Block types | 15 + raw_html |

If any future inventory disagrees with this document, this document wins —
unless DECISIONS.md or BUILD_LOG.md explicitly supersedes it.
