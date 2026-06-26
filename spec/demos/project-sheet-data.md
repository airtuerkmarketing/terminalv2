# terminal — Project-Sheet-Datensammlung
**Generiert:** 2026-06-25
**Production-HEAD:** `d8905d60579a7e0c7bec3b940d11039ed6eba831` (`d8905d6`) — letztes Deployment mit `target: production` (`dpl_By4eyFj6ayo2Q7yEJASaSyHRBVXd`, READY), Commit *"docs: update BUILD_LOG + DECISIONS to 2026-06-25 state"*
**Production-URL:** https://www.airtuerk.dev
**Repo:** github.com/airtuerkmarketing/terminalv2 (public)

> **Recon-Hinweise (Methodik):** Alle Werte sind live aus Vercel-MCP, Supabase-MCP, echtem Code/DB ermittelt — nicht aus Memory. Wo etwas nicht ermittelbar war, steht es in **Sektion 11**. Working-Tree war zum Zeitpunkt der Recon nicht clean (unrelated WIP in `src/components/admin/*` + `.claude/`); da diese Aufgabe read-only ist und nur eine neue Datei schreibt, wurde fortgefahren — siehe Sektion 11. Memory sagte „voyage-3-large" — der **Code sagt `voyage-4-large`** (gegen DB verifiziert: 1024 dim).

---

## 1. Infrastruktur & Hosting

### 1.1 Vercel
| Feld | Wert |
|---|---|
| Projekt-Name | `terminalv2` |
| Projekt-ID | `prj_hUiCkTyZSxVbxoHAvRpUjlnFQAKr` |
| Team | `airtuerk-service-gmbhs-projects` (`team_FMX1ogLzmEr9yp9BtTgJRIy0`) |
| Framework | Next.js (`nextjs`) |
| Node-Version | **24.x** (im Vercel-Projekt gesetzt; keine `engines` in `package.json`, keine `.nvmrc`) |
| Bundler | Turbopack (`bundler: turbopack` in allen Deployments) |
| Production-Branch | `main` |
| Custom Domains | `www.airtuerk.dev`, `airtuerk.dev` (+ `terminalv2-*.vercel.app` System-Domains) |
| Letztes Prod-Deployment | `dpl_By4eyFj6ayo2Q7yEJASaSyHRBVXd`, Commit `d8905d6`, State READY |
| Compute-Region (beobachtet) | Function lief in **`iad1` (Washington DC, US)**, CDN-Edge **`fra1` (Frankfurt)** — aus `X-Vercel-Id: fra1::iad1::…`. Keine `vercel.json` mit Region-Pin vorhanden → Functions laufen in der Default-Region. **Compliance-relevant, siehe Sektion 6.1 + 11.** |

**Letzte 5 Deployments (alle State READY):**
| # | Commit | Branch | Target | Erstellt (UTC ms) |
|---|---|---|---|---|
| 1 | `d17fd65` (radial menu) | feature/ui-redesign | preview | 1782382457846 |
| 2 | `7c7fd83` (radial kit fix) | feature/ui-redesign | preview | 1782382154563 |
| 3 | `0e65bd3` (radial menu FAB) | feature/ui-redesign | preview | 1782381547029 |
| 4 | `05f1c38` (quick-grabs) | feature/ui-redesign | preview | 1782381247949 |
| 5 | `2c920f7` (quick-grabs carousel) | feature/ui-redesign | preview | 1782380810977 |

> Die neuesten Deployments stammen alle aus `feature/ui-redesign` (Preview). Das aktuelle **Production**-Deployment ist `d8905d6` (`main`).

**Plan / Pricing / Bandwidth:** nicht über MCP ablesbar → **Buhara to provide** (siehe Sektion 11).

### 1.2 Supabase
| Feld | Wert |
|---|---|
| Projekt-Name | `terminalv2` |
| Projekt-ID / Ref | `zkydrymygjrscjbhusxp` |
| **Region** | **`eu-central-1` — EU Central (Frankfurt, Deutschland)** ✅ verifiziert via `get_project` |
| Status | `ACTIVE_HEALTHY` |
| PostgreSQL-Version | **17.6.1.127** (Engine 17, Release-Channel `ga`) |
| DB-Host | `db.zkydrymygjrscjbhusxp.supabase.co` |
| Erstellt | 2026-06-15 |
| Organisation | `airtuerk` (`mzqtzlrteqkvppufrxkk`) |
| **Org-Plan** | **Pro** (`get_organization` → `"plan":"pro"`) |

**Stack-Komponenten:**
- **PostgREST** — aktiv (Standard)
- **Auth** — aktiv (cookie-basiert via `@supabase/ssr`)
- **Storage** — aktiv, **9 Buckets** (Details unten)
- **Edge Functions (Deno)** — 5 aktiv, alle `verify_jwt: true`:
  | Function | Version | verify_jwt |
  |---|---|---|
  | `rag-query` | v8 | true |
  | `embed-knowledge` | v11 | true |
  | `confluence-snapshot` | v8 | true |
  | `confluence-extend` | v7 | true |
  | `confluence-extract-text` | v7 | true |
- **Extensions** (laut BUILD_LOG; nicht separat per `list_extensions` verifiziert): `pgvector 0.8.0` (HNSW) + `pg_trgm 1.6` (GIN)

### 1.3 Database-Size & Storage-Usage
**Database-Size:** **27 MB** (`pg_database_size`)

**Storage (9 Buckets, public/private + Belegung):**
| Bucket | Public | Files | Größe |
|---|---|---|---|
| `avatars` | **public** | 6 | 7156 kB |
| `confluence-attachments` | private | 116 | 15 MB |
| `documents` | public | 0 | — (leer) |
| `fonts` | public | 0 | — (leer) |
| `images` | public | 763 | 155 MB |
| `library` | **private** | 8 | 5483 kB |
| `presentations` | **private** | 0 | — (leer) |
| `rag-knowledge` | **private** | 1 | 28 kB |
| `videos` | public | 4 | 11 MB |

**Storage gesamt:** ~**194 MB** über **898 Objekte** (Summe der belegten Buckets).

---

## 2. Tech-Stack

### 2.1 Frameworks & Major Dependencies
Projekt-Version: **`0.1.0`** (`package.json`). Keine `engines`-Angabe.

**Dependencies (Runtime):**
| Package | Version (Range) |
|---|---|
| `next` | `16.2.9` |
| `react` / `react-dom` | `19.2.4` |
| `@supabase/supabase-js` | `^2.108.1` |
| `@supabase/ssr` | `^0.12.0` |
| `react-markdown` | `^10.1.0` |
| `remark-gfm` | `^4.0.1` |
| `sharp` | `^0.35.2` (Image-Thumbnails; `serverExternalPackages` in `next.config.ts`) |
| `lucide-react` | `^1.18.0` |
| `d3` | `^7.9.0` (APIX Network map) |
| `topojson-client` | `^3.1.0` |
| `leaflet` | `^1.9.4` (APIX Group-Structure) |
| `motion` | `^12.40.0` |
| `zod` | `^4.4.3` |
| `clsx` | `^2.1.1` |
| `tailwind-merge` | `^3.6.0` |
| `server-only` | `^0.0.1` |

> **Nicht installiert** (relevant für die RAG-Frage): `@anthropic-ai/sdk`, `voyageai`, `resend`, `playwright` sind **nicht** in `package.json`. RAG-Generation/Embedding laufen serverseitig in den **Supabase Edge Functions** (direkte `fetch`-Calls an Anthropic/Voyage REST-APIs, kein npm-SDK). E-Mail läuft über Supabase-Auth-SMTP (siehe Sektion 3).

**devDependencies (Highlights):** `tailwindcss ^4.3.1`, `@tailwindcss/postcss ^4.3.1`, `typescript ^5.9.3`, `eslint ^9.39.4`, `eslint-config-next ^16.2.9`, `@types/*` (node 20, react 19, d3, leaflet, topojson).

### 2.2 Build & Package-Management
- **Package-Manager:** pnpm (es existiert `pnpm-lock.yaml`, **6081 Zeilen**). `package.json` enthält einen `pnpm.supportedArchitectures`-Block (os: current+linux, cpu: current+x64).
- **Scripts:** `dev` / `build` (`next build`) / `start` / `lint` (`eslint .`) / `typecheck` (`tsc --noEmit`) / `db:types` (Supabase type-gen).
- **Reale Gates:** `pnpm typecheck` + `pnpm build`. `pnpm lint` ist **kein** Hard-Gate (`next build` überspringt ESLint; Lint ist mit bekannten Pre-existing-Findings rot).

### 2.3 Config-Files-Overview
- `next.config.ts`: nur `serverExternalPackages: ["sharp"]`. Kein `output`-Mode, keine experimental-Flags, kein Region-Setting.
- `tsconfig.json`: `target ES2017`, **`strict: true`**, `moduleResolution: bundler`, `noEmit`, `paths` `@/* → ./src/*`. **`exclude: ["node_modules", "supabase/functions"]`** (Deno-Functions bewusst ausgeschlossen — würden sonst den Vercel-Build brechen).
- `postcss.config.mjs`: vorhanden (Tailwind v4 PostCSS-Plugin).
- **Kein `tailwind.config.*`** — Tailwind v4 wird CSS-basiert konfiguriert: `src/app/globals.css` (`@import "tailwindcss"` + `@theme inline`), das die iOS-18-Liquid-Glass-Tokens aus `src/styles/theme.css` in Tailwind-Utilities bridged. UI-Accent: Quantum Blue `#0A82DF` (D-036).
- **Kein `vercel.json`**, **keine `.nvmrc`**.

---

## 3. API-Keys & Externe Services
> Nur Variable-Namen + Service + Zweck. **Keine Werte.** Aus `.env.example` + `grep process.env.*` (src) + `grep Deno.env.get()` (Edge Functions).

### 3.1 Next.js App (`process.env`, Frontend + Server)
| ENV-Variable | Service | Zweck |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Public DB-URL (Browser + Server) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase | Publishable Key (Browser-safe) |
| `SUPABASE_SECRET_KEY` | Supabase | Server-side Admin/Service-Operations (`src/lib/supabase/admin.ts`) |
| `SHOW_DRAFTS` | App-Config | Draft-Sichtbarkeit der öffentlichen Seiten (server-only) |
| `NEXT_PUBLIC_SITE_URL` | App-Config | Kanonische URL (OG/Sitemap) — in `.env.example` definiert |
| `NODE_ENV` | Node | Runtime-Environment (System) |

### 3.2 Supabase Edge Functions (`Deno.env.get`)
| ENV-Variable | Service | Zweck |
|---|---|---|
| `SUPABASE_URL` | Supabase | DB-URL in der Function (auto-injected) |
| `SUPABASE_ANON_KEY` | Supabase | JWT-scoped Client (validiert Caller-Token, `rag-query`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Service-Client (Writes/Retrieval, bypasst RLS by design) |
| `SUPABASE_SECRET_KEY` | Supabase | Service-Key (modernes Format, in den confluence-Functions) |
| `VOYAGE_API_KEY` | Voyage AI | Embeddings (`voyage-4-large`) + Reranking (`rerank-2.5`) |
| `ANTHROPIC_API_KEY` | Anthropic | RAG-Generation (Claude Opus 4.8) |
| `ATLASIAN` | Atlassian / Confluence | Confluence-API-Token für Snapshot/Extend (Variablen-Name so im Code, inkl. Tippfehler) |

### 3.3 Externe Services ohne App-API-Key
- **GitHub** — Repo-Hosting + Vercel-CI/CD-Integration (Auto-Deploy on push).
- **Vercel** — Hosting / CDN / Serverless-Functions.
- **Resend** — E-Mail-Versand (Invite-/Passwort-Reset-Mails). Läuft als **Custom-SMTP in Supabase Auth**, nicht als App-ENV: Invites gehen über `admin.auth.admin.inviteUserByEmail` (`src/lib/users.ts`); im Code gibt es **kein `RESEND_API_KEY`** (die `resend`-Treffer in `users.ts` sind „re-invite"-Wording). SMTP-Konfiguration im Supabase-Auth-Dashboard → Region/Plan **Buhara to provide**.

---

## 4. Features Inventory
Quellen: `src/app/**/page.tsx` + `route.ts`, `list_tables`, `spec/BUILD_LOG.md`, D-006.

**Routen-Surface (`page.tsx`):** `/` (Dashboard), `/[...slug]` (DB-getriebene Seiten inkl. Brands), `/account/profile`, `/documents-library/[[...folder]]`, `/presentation-hub/[[...folder]]`, `/admin/users`, `/admin`, `/login`, `/login/forgot-password`, `/login/update-password`.
**API-Routen (`route.ts`):** `/api/search`, `/api/library/file/[id]`, `/api/presentations/file/[id]`.
**Hardcoded-Komponenten-Routen (D-006):** `/team`, `/asset-library`, `/documents-library`, `/search`, `/presentation-hub`, `/ibe-product-suite`, `/airtuerk-apix/workflow`, `/airtuerk-apix/global-network`, alle `email-signature`-Pfade.

### 4.1 Content-Layer
- **Brand-Pages — 15 Brand-Records** (8 Top-Level + 7 IBE-Kinder):
  - Top-Level (8): `airtuerk-service`, `airtuerk-holidays`, `atbeds`, `service-center-antalya`, `airtuerk-apix`, `ibe-product-suite`, `internal-branding`, `presentation-hub`.
  - IBE-Kinder (7): `airlounge`, `cockpit`, `multicheck`, `mybooking`, `mystats`, `mytransfer`, `rentalcar`.
  - 4 Brands (`airtuerk-service`, `airtuerk-holidays`, `atbeds`, `service-center-antalya`) rendern über typed TSX-Section-Components (D-064), Rest über den DB-Block-Aggregator. **55 Pages** (alle published), **43 Blocks**.
- **Asset-Library:** 718 Assets (Bilder/Videos/Fonts); Upload via signierte Storage-URLs (D-057, 15 MB Cap).
- **Document-System v2:** 4 Folders + 8 Files; privater `library`-Bucket + signierte URLs; mehrsprachig (language + group_id-Varianten).
- **Team-Directory:** **63** Team-Members (Many-to-many zu Brands).
- **Internal-Branding-Page:** Hero + applied-identity (Configurator entfernt, D-056).
- **APIX-Visualisierungen:** Workflow, Global-Network (d3 + topojson), Group-Structure (Leaflet), Presentation-Player — alle aus Webflow 1:1 nach React portiert (D-046).
- **Presentation-Hub:** Folder/File-Modell + Tabellen vorhanden (aktuell 0 Files/Folders seeded; 5 Tags).

### 4.2 AI-Layer
- **AI-Chat-Window:** Turn-basierter RAG-Chat im Dashboard-Hero (`SearchAIBox` → `AIChatWindow` → `AIAnswerBlock`), Streaming + Source-Cards + Korrektur-Badge (D-062).
- **Search-AI-Box:** Suche via `/api/search` (Admin-Route, Secret-Key).
- **RAG-V1:** Live. Corpus **410 Chunks** (`confluence_chunks` 367 + `brand_chunks` 43) + **36 `company_context`**-Einträge (Priority-1 immer injiziert).
- **Gold-Set-Validation:** **92.9 %** Gesamt-Accuracy (78/84 korrekt) — siehe Sektion 7.5.

### 4.3 Admin-Layer
- **User-Management UI** (`/admin/users`, super_admin-gated): Liste + Detail-Modal, Sortier-/Spalten-Steuerung, Create-Person-Modal, Invite-Flow. Laut BUILD_LOG (25.06): Phasen 0–4 + File-System-v2-Rollen + User-Panel (Liste/Detail/Rollen-Picker/Key-User-Seed/`profiles↔team_members`-Link) **shipped**; AP3 Phase 5 (Multi-Select + Bulk-Actions + CSV) ist **NEXT** (lokal WIP, siehe Working-Tree).
- **Roles-System:** `super_admin` / `admin` / `user`; RLS via `is_admin()` / `is_super_admin()` / `get_profile_role()`; Rollen-Änderung super_admin-only (D-055, Migration 0032).
- **Invite-System:** Supabase Auth + Resend-SMTP, mit Rate-Limit-Fenster (`last_invited_at`).
- **Audit-Logs:** `user_activity_log` vorhanden (8 Zeilen; Writes nur via Service-Role; Retention 13 Monate via pg_cron lt. Tabellen-Kommentar).

### 4.4 Public/Shared
- **Login-Flow:** `/login` (gesamte App ist login-only — `/` redirected 307 → `/login`).
- **Password-Reset:** `/login/forgot-password` + `/login/update-password` (Force-PW-Gate).
- **Public-Routes:** App ist auth-gated; Robots/Sitemap via `NEXT_PUBLIC_SITE_URL`.

---

## 5. Echter Nutzungswert

### 5.1 Daten-Volumina (Counts, exakt aus DB, 2026-06-25)
| Tabelle | Count |
|---|---|
| `team_members` | **63** |
| `profiles` | **4** (alle `super_admin`) |
| `brands` (gesamt) | **15** (8 Top-Level + 7 IBE) |
| `pages` (gesamt = published) | **55** |
| `blocks` | **43** |
| `assets` | **718** |
| `document_folders` / `document_files` | 4 / 8 |
| `confluence_raw` | 86 |
| `confluence_attachments` | 334 |
| `confluence_chunks` | **367** |
| `brand_chunks` | **43** |
| `company_context` | **36** |
| `ai_chat_sessions` / `ai_chat_messages` | **55 / 148** |
| `gold_set_answers` | **84** |
| `user_activity_log` | 8 |
| `ai_corrections` | 0 |
| `settings` | 19 |
| `team_member_brands` | 63 |

> **Drift-Hinweis:** BUILD_LOG „Current State" (Stand `14c0b86`) nennt profiles **3** / ai_chat **53·144** / auth.users **3**. Live (`d8905d6`) sind es **profiles 4 (alle super_admin)** / **auth.users 4** / **ai_chat 55·148**. Cleanup-Welle 2 (`66676a8`) reduzierte profiles 4→3; seither wurde wieder einer angelegt. → Sektion 11.

### 5.2 Adoption-Metriken
- `ai_chat_sessions` letzte 7 Tage: **55** (= alle Sessions; das gesamte Chat-Volumen liegt innerhalb der letzten 7 Tage).
- Distinct aktive User (7d, via `ai_chat_sessions`): **3**.
> **Einordnung:** Das sind **Pre-Launch-Test-Daten** (3 super_admin-Test-Accounts, kein echter End-User-Traffic vor dem V1-Launch). Keine echten Adoption-Zahlen ableitbar — V1 ist noch nicht ausgerollt.

### 5.3 Code-Investment-Indikatoren
| Metrik | Wert |
|---|---|
| LOC (TS/TSX in `src/`) | **22.110** über **166** Dateien |
| React-Components (`src/components/**/*.tsx`) | **104** |
| Edge-Function-Dateien | 5 |
| Supabase-Migrations | **59** (höchste: `20260625080714_rename_brand_section_titles`) |
| Git-Commits gesamt | **246** |
| Repo-Zeitraum | erster Commit **2026-06-15**, letzter **2026-06-25** (~10 Tage) |
| `pnpm-lock.yaml` | 6081 Zeilen |

### 5.4 Vorgängerlösung-Vergleich
- **Webflow** war die Vorgängerlösung (`terminal.airtuerk.de`), nun retired. README + D-001: Ziel war voller Code-Ownership, **null Runtime-Abhängigkeit** von Webflow; der Static-Export (zip) hat nur Content/Assets geseedet. Custom-Embeds (APIX, Signatur, Out-of-Office) wurden 1:1 nach React portiert (D-046), nicht neu gebaut.
- **Konkrete Webflow-Limits/Kosten** sind in DECISIONS/BUILD_LOG **nicht** dokumentiert → **Buhara to provide** (Sektion 11).

---

## 6. Security & Compliance

### 6.1 Daten-Lokation (EU-Server)
| Komponente | Region | Quelle |
|---|---|---|
| **Supabase Postgres (Daten at-rest)** | **EU Central — Frankfurt, Deutschland (`eu-central-1`)** ✅ | `get_project` |
| Supabase Storage | identisch Frankfurt (gleiches Projekt) | abgeleitet |
| Vercel CDN-Edge | **`fra1` (Frankfurt)** beobachtet | `X-Vercel-Id` |
| **Vercel Serverless-Function (Compute)** | **`iad1` (Washington DC, US)** beobachtet | `X-Vercel-Id: fra1::iad1::…` |
| Resend (E-Mail) | nicht aus Config ablesbar | → Buhara |
| Voyage AI (Embeddings/Rerank) | US (allgemein bekannt; nicht aus Code/DB verifizierbar) | → Buhara/ZDR |
| Anthropic API (Generation) | US-Default | → Buhara/ZDR |

> ⚠️ **Wichtig für das Handout:** Die **personenbezogenen Daten liegen in Frankfurt (Supabase)**. Der **Vercel-Compute-Layer (stateless Request-Handling) lief aber in `iad1`/US**, weil **kein Region-Pin** (`vercel.json` fehlt) gesetzt ist. Für eine saubere „alle-Daten-in-der-EU"-Story sollte die Vercel-Function-Region auf `fra1` gepinnt werden. **Buhara to verify/decide** (Sektion 11).

### 6.2 Authentication
- **Provider:** Supabase Auth (cookie-basiert via `@supabase/ssr`; `src/lib/supabase/server.ts` delegiert Cookie-Handling an die Library — `httpOnly`/`secure`/`sameSite` = Library-Defaults auf HTTPS).
- **E-Mail-Provider (Auth):** Resend als Supabase-Auth-Custom-SMTP (Invite/Reset).
- **Password-Policy:** im App-Code nicht gesetzt → Supabase-Auth-Default (im Dashboard konfigurierbar) → **Buhara to provide**.
- **2FA/MFA:** **0 MFA-Faktoren** in `auth.mfa_factors`, **0 User mit verified MFA**. MFA aktuell **nicht genutzt**.
- **Auth-User gesamt:** 4.

### 6.3 Authorization (RLS)
- **28 Tabellen im `public`-Schema, alle 28 mit RLS aktiviert. 0 Tabellen ohne RLS.** ✅
- **74 RLS-Policies** gesamt.
- Rollen: `super_admin` / `admin` / `user` (Helper `is_admin()` / `is_super_admin()` / `get_profile_role()`).

### 6.4 Backups
- Supabase **Pro-Plan**. Pro-Standard sind tägliche Backups; PITR (Point-in-Time-Recovery) ist ein Add-On. Exakte aktive Backup-Konfiguration (PITR an/aus, Retention) **nicht über MCP ablesbar** → **Buhara to provide** (Sektion 11).

### 6.5 Verschlüsselung
- **HTTPS:** ✅ verifiziert auf `https://www.airtuerk.dev` — `Strict-Transport-Security: max-age=63072000` (HSTS, 2 Jahre); `http://` → **308 Permanent Redirect** auf HTTPS.
- **In-transit:** TLS für DB-Connections (Supabase-Standard).
- **At-rest:** Supabase AES-256 (Standard).
- **Storage-Buckets:** privat = `library`, `presentations`, `rag-knowledge`, `confluence-attachments`; public = `images`, `documents`, `videos`, `fonts`, `avatars` (Detail Sektion 1.3).
- **Auth-Cookies:** via `@supabase/ssr` (secure/httpOnly per Library-Default auf HTTPS).

### 6.6 DSGVO-Relevantes
- System speichert **personenbezogene Daten: JA.**
- **PII-Tabellen:** `team_members` (Namen, E-Mails, ggf. Geburtsdaten/Telefon), `profiles` (Auth-Verknüpfung + Rolle), `ai_chat_sessions` / `ai_chat_messages` (Inhalte können PII enthalten), `user_activity_log` (Actor-IDs), `confluence_comments` (Author-Display-Namen).
- **Datenlöschung / Cascade:** **16 FK-Constraints mit `ON DELETE CASCADE`** über 11 Tabellen (`ai_chat_messages`, `blocks`, `brand_chunks`, `confluence_attachments`, `confluence_chunks`, `confluence_comments`, `pages`, `presentation_file_tags`, `presentation_views`, `profiles`, `team_member_brands`) → kaskadierende Löschung von abhängigen Datensätzen möglich.
- **Audit-Log:** `user_activity_log` existiert (Retention 13 Monate via pg_cron lt. Kommentar).

### 6.7 ZDR-Status (Anthropic + Voyage)
- **Anthropic ZDR:** nicht aus Code/DB ableitbar → **Buhara to provide**.
- **Voyage ZDR:** nicht aus Code/DB ableitbar → **Buhara to provide**.
> Beide MÜSSEN für Production-Use mit personenbezogenen Daten geklärt/aktiviert sein.

---

## 7. RAG / AI-Architektur
> Alle Werte aus dem **echten Code** der Edge Function `rag-query/index.ts` (D-060) + DB, nicht aus Memory.

### 7.1 Embedding-Stack
| Komponente | Wert |
|---|---|
| Embedding-Modell | **Voyage `voyage-4-large`** (`input_type=query`, `output_dtype=float`) |
| Embedding-Dimensionen | **1024** (gegen `vector_dims(embedding)` der `confluence_chunks` verifiziert) |
| Embed-Timeout | 5000 ms → bei Timeout HTTP 503 |
| Reranker | **Voyage `rerank-2.5`** |
| Generation-Modell | **Anthropic `claude-opus-4-8`** (`anthropic-version: 2023-06-01`, `max_tokens: 4096`, **kein** temperature / **kein** thinking / **kein** output_config.effort, gestreamt) |

### 7.2 Knowledge-Layers (4-Schichten, D-058)
- **Layer 1 — `company_context`** (36): hand-geseedete Identität; Priority-1-Zeilen immer injiziert.
- **Layer 2 — `confluence_chunks`** (367): Operations-Wissen; Vector (HNSW, cosine) + `pg_trgm`-Keyword-Hybrid; `content_hash` inkl. Source-IDs (idempotentes Re-Embed). Source-Types u.a. `page` / `pdf` / `office` / `knowledge_base` / `correction`.
- **Layer 3 — `brand_chunks`** (43): strukturiertes Brand-Wissen (15 Brands / 55 Pages / 43 Blocks).
- **Layer 4 — `ai_corrections`** (0): User-Korrekturen → admin-approved → werden zu `confluence_chunks` mit `source_type='correction'`.
- Plus `ai_chat_sessions` (55) + `ai_chat_messages` (148) als Retrieval-Logging. RLS FORCED auf allen.

### 7.3 Aktuelle Daten
RAG-Corpus **410 Chunks** (confluence 367 + brand 43) + **36 `company_context`**. (D-059 nennt einen früheren Initial-Run von 424 Chunks; der Live-Stand ist 410 — siehe Counts Sektion 5.1.)

### 7.4 Pipeline-Status
- **Retrieval-Flow:** Frage embedden (Voyage, 5s-Timeout) → Session/User-Msg loggen (vor Retrieval-Check, damit „weiß-nicht" korrigierbar bleibt) → `rag_hybrid_search` (Vector-K **20** + trgm-K **10**, `DISTINCT ON (source, source_id)`) → **Identity-reserved Rerank** (2 Slots für `mission`/`brand_voice`, Rest via `rerank-2.5`, Rerank-Input-Cap **30**, finale **8** Chunks) → Claude streamt; Assistant-Row pre-inserted + im `finally` mit Content/Tokens/Latency aktualisiert (partial-stream-safe).
- **Persona v2 (D-063):** self-ID „airtuerk Intelligence" (1. Person), Creator-Attribution Buhara Demir, strikte Telefon-Policy, exakte Out-of-Scope-Phrase (Frontend erkennt sie → „Ja, im Web suchen"-Button).
- **Edge-Functions** (alle `verify_jwt: true`): `rag-query` (v8), `embed-knowledge` (v11), `confluence-snapshot` (v8), `confluence-extend` (v7), `confluence-extract-text` (v7).

### 7.5 Performance-Metriken (Gold-Set)
| Test-Set | Sessions | Total | Korrekt | Accuracy |
|---|---|---|---|---|
| `ai_test_1` | 1 | 28 | 25 | **89,3 %** |
| `ai_test_2` | 1 | 28 | 26 | **92,9 %** |
| `ai_test_3` | 1 | 28 | 27 | **96,4 %** |
| **Gesamt** | 3 | **84** | **78** | **92,9 %** |

(Bewertungswerte in `gold_set_answers.bewertung`: `richtig` | `falsch`. Spalte ist `test_set`, nicht `session_name`.)

### 7.6 RAG-V2 Roadmap
Aus BUILD_LOG „Remaining": **WS2** (Feedback + CorrectionModal fertigstellen), **WS3/WS4** (Web-Search — die Out-of-Scope-Phrase + Button-Skeleton sind schon angelegt), **S5** (Company-Context-Admin-UI), **S8** (E-Mail-Notify via Resend), **S9** (Gold-Set Re-Run), **S10** (Demo-Polish). Keine separaten `spec/rag-v2/*`-Dateien im Repo (Plan liegt extern in OneDrive/terminal).

---

## 8. Architektur-Overview

### 8.1 Frontend-Layer
- Next.js **16.2.9** (App Router, Turbopack), React **19.2.4**, TypeScript **5.x** strict.
- Styling: **Tailwind CSS 4** (CSS-config via `globals.css` `@theme inline`) + iOS-18-Liquid-Glass-Tokens (`theme.css`), Quantum Blue `#0A82DF` (D-036).
- Custom Design System, **kein Radix UI** (hand-rolled Komponenten, deliberate).

### 8.2 Backend-Layer
- Vercel Serverless/Edge-Functions (CDN-Edge `fra1`/Frankfurt, Function-Compute beobachtet `iad1`/US — kein Region-Pin).
- Supabase PostgreSQL 17 (**Frankfurt**, `eu-central-1`) — **27 MB**.
- Supabase Auth (cookie-basiert, SSR).
- Supabase Storage — **9 Buckets**, ~194 MB / 898 Objekte.
- Supabase Edge Functions (Deno) — 5 (RAG + Confluence-Pipeline).

### 8.3 AI-Layer
- Custom RAG-Pipeline (Multi-Layer Knowledge, D-058–D-063): Voyage `voyage-4-large` (1024d) + `rerank-2.5` + Anthropic `claude-opus-4-8`, hybrid Vector+trgm Retrieval mit Identity-Reservation.

### 8.4 DevOps-Layer
- GitHub (Repo, public) → Vercel Auto-Deploy on push to `main`.
- Resend als Supabase-Auth-SMTP (Transactional Email).
- Solo-Dev-Workflow: `main` = working + deploy (Owner bypasst Branch-Protection); PRs optional.

---

## 9. Roadmap

### 9.1 V1 (Launch 2026-07-01; Demo-Termin laut BUILD_LOG verschoben auf 2026-08-01)
- **Drin (shipped):** Phasen 0–4 + Design-System; Brand-Pages (15 Records, 4 als TSX D-064); Asset-Library; Document-Library v2; Team-Directory (63); APIX-Tools (4 Ports); Signatur- + Out-of-Office-Generatoren; RAG-V1 live (Dashboard-Hero); User-Management-Panel (Liste/Detail/Rollen/Invite); `/api/search`.
- **Offen vor Launch (BUILD_LOG „Remaining"):** AP3 Phase 5 (Multi-Select + Bulk-Actions + CSV) = NEXT; AP3 Phasen 7–12; RAG WS2–WS4 + S5/S8/S9/S10; Audit-Fixes P0a/P0c/P1; Out-of-Office als eigene Brand-Section.
- **⚠️ V1-Blocker (BUILD_LOG):** prod `profiles` = nur super_admins, **0 admins / 0 users** — der Stage-8-Nine-Key-User-Seed (`684d67f`) erreichte prod nie; muss vor dem Demo re-run werden. (Live-Recon: profiles=4, alle super_admin — bestätigt den Blocker.)

### 9.2 V1.1 (Q3 2026)
- Aus Memory: PDF/PPTX-Pipeline für Presentation-Hub, Presentation-Player (Stufe 5), Featured/Search/Sidebar (Stufe 6). **Nicht im Repo-Spec dokumentiert** als formaler Q3-Plan → grob, Detail **Buhara to provide**.

### 9.3 V2 (Q4 2026+)
- RAG-V2 (WS3/WS4 Web-Search, Feedback-Loop), Outlook-Add-In. **Outlook-Add-In:** kein Code/Spec im Repo gefunden → Status **Buhara to provide**.

### 9.4 Strategische Vision
- README: „Internal brand portal … single source of truth for airtuerk's visual identity, brand assets, partner documents, team directory, and product documentation" über 15 Brand-Records. RAG self-ID = **„airtuerk Intelligence"** (interne Wissens-KI). Eine darüber hinausgehende formale Markt-/Vision-Statement-Quelle existiert im Repo nicht → alles Weitere **Buhara to provide** (nicht aus Memory geraten).

---

## 10. Kosten-Struktur

### 10.1 Recurring Monthly Costs
| Posten | Plan-Stufe (ermittelt) | Kosten |
|---|---|---|
| Vercel | nicht via MCP ablesbar | → Buhara to provide |
| Supabase | **Pro** (verifiziert) | → Buhara to provide |
| Voyage AI | — | → Buhara to provide (Embed + Rerank-Volumen) |
| Anthropic API | — | → Buhara to provide (Generation-Volumen) |
| Resend | — | → Buhara to provide (E-Mail-Volumen) |
| GitHub | — | → Buhara to provide |
| Domains (`airtuerk.dev`, ggf. weitere) | — | → Buhara to provide (Registrar) |

### 10.2 Webflow-Vergleich
- Webflow-Kosten/Limits **nicht in DECISIONS/BUILD_LOG dokumentiert** → **Buhara to provide**.

### 10.3 ROI-Indikatoren
- Team-Größe (potenzielle Nutzer): **63** Team-Members.
- Zeit-Ersparnis: nicht ermittelbar → **Buhara to provide** (oder leer lassen).

---

## 11. Offene Punkte / Buhara to Provide

1. **Vercel-Plan/Pricing/Bandwidth:** konnte nicht ermittelt werden, weil `get_project`/MCP keine Plan-Stufe oder Usage liefert. Buhara to provide (Plan Hobby/Pro/Enterprise + monatliche Kosten + Bandwidth letzte 30 Tage).
2. **Vercel-Function-Region / EU-Compute:** beobachtet wurde `iad1` (Washington, US) für die Serverless-Function (CDN-Edge `fra1`/Frankfurt). Es gibt **kein `vercel.json`** mit Region-Pin. Entscheidung nötig: Function-Region auf `fra1` pinnen für eine saubere EU-Compute-Story. Buhara to verify/decide.
3. **Recurring-Kosten (alle):** Vercel, Supabase (Pro), Voyage AI, Anthropic, Resend, GitHub, Domains — Beträge nicht via MCP ablesbar. Buhara to provide.
4. **ZDR-Status Anthropic:** nicht aus Code/DB ableitbar. Buhara to provide (muss für Prod mit PII geklärt sein).
5. **ZDR-Status Voyage AI:** nicht aus Code/DB ableitbar. Buhara to provide.
6. **Voyage- / Anthropic-Daten-Region:** US-Default; exakte Region/EU-Option nicht aus Code/DB verifizierbar. Buhara to provide.
7. **Resend Region + Plan + SMTP-Config:** läuft als Supabase-Auth-Custom-SMTP, nicht als App-ENV; Region/Plan nicht ablesbar. Buhara to provide (Supabase-Auth-Dashboard prüfen).
8. **Supabase-Backup-Konfiguration:** Pro-Plan steht fest, aber PITR an/aus + Retention nicht via MCP ablesbar. Buhara to provide.
9. **Password-Policy:** im App-Code nicht gesetzt (Supabase-Auth-Default, Dashboard-konfigurierbar). Buhara to provide, falls für Handout relevant.
10. **Webflow-Vergleich (Kosten/Limits):** nicht in DECISIONS/BUILD_LOG dokumentiert. Buhara to provide.
11. **Daten-Drift `profiles`/`auth.users`:** Live = **4 (alle super_admin)**; BUILD_LOG „Current State" (`14c0b86`) sagt **3**. Cleanup-Welle 2 senkte 4→3; danach wurde wieder einer angelegt. Bitte bestätigen, welcher Account (vmtl. Re-Test/Preview) und ob gewollt. Ändert nichts am V1-Blocker (0 admins/0 users).
12. **Doc-Drift BUILD_LOG-HEAD:** „Current State" nennt HEAD `14c0b86`; das deployte Prod-HEAD ist `d8905d6` (der Docs-Commit selbst). Kosmetisch — bei nächstem Doc-Update angleichen.
13. **Working-Tree war nicht clean** während der Recon (uncommitted WIP in `src/components/admin/*` + neue `bulk-action-bar.tsx`/`use-selection.ts` + `.claude/`). Read-only-Recon → unkritisch; nur zur Transparenz dokumentiert.
14. **V1.1 / V2 / Outlook-Add-In / Markt-Vision:** im Repo-Spec nicht formal dokumentiert (teils nur in Memory). Bewusst NICHT geraten. Buhara to provide für die Roadmap-/Vision-Abschnitte des Handouts.
15. **ROI / Zeit-Ersparnis:** keine objektive Quelle im Repo. Buhara to provide oder weglassen.
16. **Adoption:** aktuelle Chat-Zahlen (55 Sessions / 3 User, alle <7 Tage) sind Pre-Launch-Test-Daten, keine echte End-User-Adoption. Erst nach V1-Rollout aussagekräftig.
