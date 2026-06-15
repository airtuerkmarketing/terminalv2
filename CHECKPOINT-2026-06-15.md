# terminalv2 — CHECKPOINT 2026-06-15 23:15

Dieses Dokument ist der komplette Stand am Ende von Phase 3.5.
Buhara kann es zu Beginn jeder neuen Claude-Session hochladen oder
den relevanten Teil pasten um sofort weiterzumachen.

---

## Status: Phase 3.5 ABGESCHLOSSEN

Alles was bis hierhin geplant war, ist umgesetzt und verifiziert.

---

## 1. Identifiers (kopier-bereit)

| Was | Wert |
|---|---|
| Supabase Projekt | `zkydrymygjrscjbhusxp` |
| Supabase URL | `https://zkydrymygjrscjbhusxp.supabase.co` |
| Supabase Region | `eu-central-1` (Frankfurt) |
| Supabase Publishable Key | `sb_publishable_4NyK1uHUk1bn4wjCCQ7-HA_1u8ahU1I` |
| Vercel Team ID | `team_FMX1ogLzmEr9yp9BtTgJRIy0` |
| Vercel Team Name | airtuerk Service GmbH's projects |
| GitHub Repo | `github.com/airtuerkmarketing/terminalv2` (private) |
| Letzer Commit auf main | `ba65e81` — "feat: phase 3.5 - design system + brand hierarchy" |
| Backup-Tag | `pre-phase-3.5-backup` (lokal + remote) |
| Admin Email | `dev@airtuerk.de` |
| Lokaler Pfad | `D:\terminal V2\` |
| Stack | Next.js 16.2.9 + Tailwind 4.3.1 + Supabase Pro + Vercel |
| Node | 24.16.0, pnpm 11.7.0, git 2.54.0.windows.1 |

---

## 2. Datenbank — verifizierter Stand

Alle 9 Migrationen angewandt:

| Migration | Name | Status |
|---|---|---|
| 0001 | initial_schema | OK |
| 0002 | rls_policies | OK |
| 0003 | storage_buckets | OK |
| 0004 | seed_brands | OK |
| 0005 | seed_pages | OK |
| 0006 | profiles_trigger | OK |
| 0007 | brand_hierarchy_and_sidebar | OK (Phase 3.5) |
| 0008 | restructure_brands | OK (Phase 3.5) |
| 0009 | design_system_settings | OK (Phase 3.5) |

### Aktuelle Zaehler (verifiziert via SQL 2026-06-15 23:10)

| Tabelle | Anzahl | Bemerkung |
|---|---|---|
| **brands** | **15** | 8 Top-Level + 7 IBE Products |
| **pages** | **52** | 13 Top-Level + 39 Sub-Pages |
| assets | 759 | Bilder/SVGs/WebP aus Webflow |
| documents | 47 | PDFs, DOCXs, ZIPs |
| settings | 19 | Design Tokens, Sidebar, Orbs, Downloads |
| team_members | 0 | Wird in Phase 5 befuellt |
| blocks | 0 | Wird in Phase 4/5 befuellt |
| Hidden Pages | 2 | /playground + /ibe-product-suite/airlounge |

### Brand-Hierarchie

```
Top-Level Brands (parent_id IS NULL):
  10  airtuerk-service       #ED1C24  (Torch Red)
  20  airtuerk-holidays      #FF8A00  (Orange)
  30  atbeds                 #2DBE60  (Green)
  40  service-center-antalya #C0392B  (Burnt Red)
  50  ibe-product-suite      #0A82DF  (Quantum Blue)
  60  internal-branding      #6B46C1  (Purple)
  70  airtuerk-apix          #00868C  (Teal)
  200 presentation-hub       sidebar_section='resources'

IBE Product Sub-Brands (parent_id = IBE, is_product = true):
  51  multicheck   #6B46C1
  52  cockpit      #0A82DF
  53  mytransfer   #2DBE60
  54  mybooking    #E8B900
  55  rentalcar    #00868C
  56  mystats      #C0392B
  57  airlounge    #8B5A35  (hidden_in_sidebar)
```

---

## 3. GitHub Repo — Dateistruktur nach Phase 3.5

```
D:\terminal V2\
|-- .env.example
|-- .env.local              (NICHT im Repo — .gitignore)
|-- .gitignore
|-- README.md               (Phase 3.5 Version)
|-- next.config.ts
|-- package.json
|-- pnpm-lock.yaml
|-- tsconfig.json
|-- push.ps1                (Einmal-Script, kann spaeter raus)
|
|-- src/
|   |-- proxy.ts            (Next.js 16 — ersetzt middleware.ts)
|   |-- lib/
|   |   |-- utils.ts
|   |   |-- supabase/
|   |       |-- client.ts   (Browser Client)
|   |       |-- server.ts   (Server Client)
|   |       |-- middleware.ts (refreshSession Helper)
|   |-- app/
|       |-- login/
|       |   |-- page.tsx
|       |   |-- login-form.tsx
|       |   |-- actions.ts
|       |-- admin/
|           |-- layout.tsx  (Auth-Gate via redirect)
|           |-- page.tsx    (Dashboard mit Live-Stats)
|
|-- spec/
|   |-- ARCHITECTURE.md     (Phase 3.5 — 15 Brands, 52 Pages)
|   |-- BUILD_LOG.md        (Phase 0-3.5 komplett)
|   |-- CONTRIBUTING.md     (unveraendert)
|   |-- DECISIONS.md        (D-001 bis D-046)
|   |-- DESIGN_SYSTEM.md    (NEU — iOS 18 Liquid Glass)
|   |-- EMBEDS_INVENTORY.md (NEU — 224 KB Webflow Embeds)
|   |-- PHASE_PLAN.md       (Phase 4 als naechstes)
|   |-- PRE_FLIGHT.md       (historisch)
|   |-- SOURCE_INVENTORY.md (52 Pages, 15 Brands)
|   |-- embeds/             (NEU — 12 Webflow Custom Code Files + README)
|   |-- mockups/            (NEU — v3-01-dashboard.html + README)
|
|-- supabase/
    |-- migrations/
        |-- 0001_initial_schema.sql
        |-- 0002_rls_policies.sql
        |-- 0003_storage_buckets.sql
        |-- 0004_seed_brands.sql
        |-- 0005_seed_pages.sql
        |-- 0006_profiles_trigger.sql
        |-- 0007_brand_hierarchy_and_sidebar.sql   (Phase 3.5)
        |-- 0008_restructure_brands.sql             (Phase 3.5)
        |-- 0009_design_system_settings.sql         (Phase 3.5)
```

---

## 4. Design System — was ist gelockt

| Aspekt | Entscheidung |
|---|---|
| System | iOS 18 Liquid Glass (D-034) |
| Themes | ios18-light (default) + ios18-dark (D-035) |
| UI Accent | Quantum Blue #0A82DF light / #0A9EFF dark (D-036) |
| Brand Colors in UI | VERBOTEN — nur in Brand Content Blocks |
| Document Downloads | 3 Styles, Default = preview_cards (D-037) |
| Sidebar | Collapsible 252px/64px, IBE expandable (D-038) |
| Brand Hierarchy | parent_id, 2 Ebenen (D-039) |
| Presentation Hub | Resources-Section, hardcoded, sectioned docs (D-040) |
| Card Hover | KEIN bouncy translateY, nur soft bg+shadow change |
| Shadows | +5% ueber v2 Baseline, sichtbar aber subtil |
| Orbs | Toggleable, ON auf Dashboard, OFF auf Detail |
| Reference Mockup | spec/mockups/v3-01-dashboard.html |
| Reference Tokens | spec/DESIGN_SYSTEM.md |

---

## 5. Sidebar Struktur (final)

```
Dashboard
--- divider ---
airtuerk Service
airtuerk Holidays
atBeds
Service Center Antalya
IBE Product Suite          >  (expandable chevron)
   multicheck
   cockpit
   myTransfer
   myBooking
   rentalCar
   myStats
   (airLounge: hidden)
Internal Branding
airtuerk APIX
--- divider ---
Asset Library
Document Library
Team
Presentation Hub
```

---

## 6. Was in jeder Phase passiert ist

| Phase | Was | Wann | Status |
|---|---|---|---|
| 0 | Specs geschrieben (15 Files) | 15.06. | DONE |
| 1 | Supabase + Vercel + GitHub | 15.06. | DONE |
| 2 | 759 Assets + 47 Docs + 4 Videos hochgeladen | 15.06. | DONE |
| 3 | Next.js 16 Scaffold + Login + Admin Shell | 15.06. | DONE |
| 3.5 | Design System + Brand Hierarchy + Embeds | 15.06. | DONE |
| **4** | **Public Frontend** | **naechste Session** | **NEXT** |
| 5 | Admin CMS | spaeter | TODO |
| 6 | Interactives (Embeds ported to React) | spaeter | TODO |
| 7 | Polish + DNS Cutover | spaeter | TODO |
| 8 | RAG Search | spaeter | TODO |

---

## 7. Phase 4 — was genau gebaut wird

### Ziel
Seite sieht visuell 1:1 aus wie spec/mockups/v3-01-dashboard.html.
Jede der 52 URLs liefert eine funktionierende Seite.

### Reihenfolge

1. **Theme Tokens** — Port von inline-Style aus v3-01-dashboard.html
   nach src/styles/theme.css. Tailwind 4 Bridge via CSS Custom Properties.

2. **App Shell**
   - src/components/shell/sidebar.tsx
   - src/components/shell/topbar.tsx
   - src/components/shell/ambient.tsx (Orbs)
   - src/components/shell/theme-toggle.tsx
   - src/app/(public)/layout.tsx

3. **Block Renderer**
   - src/lib/blocks/registry.ts
   - src/lib/blocks/schemas.ts (Zod)
   - src/lib/blocks/types.ts
   - src/components/blocks/ (15 Typen)

4. **Catch-All Route**
   - src/app/(public)/[...slug]/page.tsx

5. **Hardcoded Route Shells** (UI-Platzhalter, volle Logik in Phase 6)
   - /team, /asset-library, /documents-library
   - /presentation-hub (NEU)
   - /search (Platzhalter)

6. **Mobile Responsive** — Sidebar wird Drawer unter 768px

### Exit-Kriterien Phase 4
- Jede URL der 52-Page-Tree rendert
- Sidebar korrekt mit IBE expandable
- Orbs toggleable, Theme toggleable, Sidebar collapsible
- Visuell akzeptabel vs Mockup v3
- pnpm typecheck + pnpm lint passieren

---

## 8. Webflow Embeds gesichert (224 KB)

In spec/embeds/ liegen 12 Original-Webflow-Custom-Code Files die
in Phase 6 zu React portiert werden:

| Embed | Phase 6 Component |
|---|---|
| apix-page-embeds.html (34KB) | APIXWorkflow + APIXGlobalNetwork |
| apix-additional.css/js (88KB) | APIX Support |
| ibe-tools-showcase.html (15KB) | /ibe-product-suite Body |
| jersey-customizer.html+css+js (17KB) | JerseyCustomizer |
| signature-generator.html | SignatureGenerator (4 Brand-Routes) |
| out-of-office-generator.html | OutOfOfficeGenerator |
| color-strip-pattern.html | Reference fuer color_palette Block |
| service-page-support.css/js (66KB) | Shared Phase 6 Styles |

---

## 9. Was NICHT gemacht wurde (bewusst offen)

- Blocks-Tabelle ist leer (wird in Phase 4/5 befuellt)
- Team-Members-Tabelle ist leer (wird in Phase 5 befuellt via Admin)
- push.ps1 liegt noch im Repo (harmlos, kann spaeter raus)
- README.md zeigt noch 3 KB (alte Groesse) — Datei ist tatsaechlich aktuell
- .env.local ist nicht im Repo (korrekt, steht in .gitignore)
- Fonts noch nicht in public/fonts/ (Phase 4 Schritt)
- Vercel-Projekt "terminalv2" war in der Vercel MCP nicht sichtbar —
  moeglicherweise unter anderem Account oder Name "terminal" statt "terminalv2".
  Buhara sollte in Vercel Dashboard pruefen ob auto-deploy von ba65e81
  funktioniert hat.

---

## 10. Prompt fuer naechste Claude Session

Kopier das hier als ersten Text in die naechste Session:

```
terminalv2 — Phase 4 Start

Projekt: Next.js 16.2.9 + Tailwind 4.3.1 + Supabase + Vercel
Repo: github.com/airtuerkmarketing/terminalv2 (main, commit ba65e81)
Supabase: zkydrymygjrscjbhusxp (Frankfurt, 9 Migrationen applied)
Lokal: D:\terminal V2\
DB-Stand: 15 Brands, 52 Pages, 759 Assets, 47 Documents, 19 Settings

Phase 3.5 ist abgeschlossen. Bitte starte Phase 4 — Public Frontend.

Design-Referenz: spec/mockups/v3-01-dashboard.html
Design-Tokens: spec/DESIGN_SYSTEM.md
Architektur: spec/ARCHITECTURE.md
Sidebar-Struktur: spec/ARCHITECTURE.md Section 3

Schritt 1: Theme Tokens aus dem Mockup HTML nach src/styles/theme.css portieren
Schritt 2: App Shell (Sidebar, Topbar, Ambient Orbs, Theme Toggle)
Schritt 3: Block Renderer (Registry + 15 Block Types)
Schritt 4: Catch-All Route fuer DB-driven Pages
Schritt 5: Hardcoded Route Shells (team, asset-library, documents-library, presentation-hub, search)

Wichtige Regeln:
- Quantum Blue (#0A82DF) ist der einzige UI Accent
- Torch Red nur in Brand Content, NIE in UI Chrome
- Kein bouncy translateY auf Card Hover
- Sidebar collapsible 252px zu 64px
- IBE Product Suite expandable im Sidebar
- Orbs toggleable, ON auf Dashboard, OFF auf Detail
- Dark Mode muss funktionieren
```

---

## 11. Rollback-Optionen

Falls irgendwas kaputtgeht:

| Problem | Loesung |
|---|---|
| Code-Rollback | `git reset --hard pre-phase-3.5-backup` in D:\terminal V2\ |
| DB-Rollback | Supabase PITR (Point-in-Time Recovery) in Studio > Settings > Database > Backups |
| Einzelne Migration rueckgaengig | SQL manuell schreiben (DROP COLUMN etc.) |

---

*Erstellt: 2026-06-15 23:15 UTC*
*Naechster Schritt: Phase 4 in neuer Claude Session*
