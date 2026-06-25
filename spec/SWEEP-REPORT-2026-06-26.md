# Comprehensive Sweep Report — Pre-Demo Reality Check

**Recon ausgeführt:** 2026-06-25 (Dateiname trägt das im Auftrag genannte Datum 2026-06-26)
**Prod-HEAD (Ist):** `77d14a6` — *nicht* `3815761` (Auftrag ging von 3815761 aus; prod ist eine Commit weiter)
**Branch:** `main` == `origin/main`, working tree clean
**Demo-Termin:** 2026-08-01 (~5 Wochen)
**Modus:** strikt read-only Advisor. Keine git/SQL/Code/Memory-Mutation. Einziger Write = dieses Report-File.
**Recon-Dauer:** ~50 Min

---

## Executive Summary

Der Stand ist **gesünder als der Auftrag befürchtet**. Die Hauptsorge — Selin-Namens-Drift und
`airtuerk.online`-Reste in der Wissensbasis — ist in allen **kuratierten** Layern (company_context,
brand_chunks, gold_set_answers) **sauber**, ebenso im gesamten `src/`-Code. Typecheck ist grün,
Lint ist exakt auf der dokumentierten 19-Problem-Baseline (kein Drift), alle 10 geprüften
Public-Routen antworten gesund, und die RAG-Pipeline ist vollständig (voyage-4-large, claude-opus-4-8,
Audit-Logging, Feedback + Korrektur-Capture).

Die echten Lücken sind **demo-narrativ und doku-hygienisch**, nicht "kaputt":

**Findings nach Severity:**
- 🔴 **Critical:** 0
- 🟠 **High:** 0
- 🟡 **Medium:** 5 (SWEEP-001, -003, -004, -005, -006)
- 🟢 **Low/Info:** 6 (SWEEP-002, -007, -008, -009, -010, -011)

**Top-3 Demo-Risiken:**
1. **SWEEP-001 — Keine echten User für die User-Management-Demo.** Prod hat nur **4 auth-User /
   4 profiles, alle `super_admin`** (3 Mitarbeiter + dev@). Der Stage-8-9-Key-Seed (`684d67f`)
   erreichte prod nie; 6 von 10 `user_role_defaults`-Personen (5 admins + Ümit) haben **kein**
   Konto. Eine User-Verwaltung lässt sich zeigen — aber ohne Rollen-Vielfalt (admin/user) und mit
   überwiegend "not invited"-Zeilen. *(BUARA bereits als V1-Blocker im BUILD_LOG vermerkt.)*
2. **SWEEP-003 — "Lernende KI" ist nur halb verdrahtet.** Capture funktioniert (CorrectionModal →
   `ai_corrections`, 1 pending row; 4 Nachrichten mit 👍/👎). Aber es gibt **keine Admin-UI**, um
   Korrekturen zu reviewen/freizugeben und in Chunks zu promoten. Die "Lern"-Hälfte (approve →
   wird `confluence_chunk` mit `source_type='correction'`) geht nur per Hand-SQL. Genau das ist die
   Demo-Story.
3. **SWEEP-006 — Keine Error-Boundary / kein Custom-404 / keine Loading-States.** `src/app` hat
   **null** `error.tsx`, `not-found.tsx`, `loading.tsx`. Ein einziger Runtime-Fehler in der
   Live-Demo → Next-Default-Error-Screen (Whitescreen). Billigste Versicherung überhaupt.

**Empfohlene Sofort-Aktionen (Tag 1, alle low-effort):** BUILD_LOG Current State auf Realität
ziehen (SWEEP-004), `(public)/error.tsx` + `not-found.tsx` ergänzen (SWEEP-006), Begrüßung auf
echten Namen verdrahten (SWEEP-009), `/admin`-Stub auf `/admin/users` redirecten (SWEEP-008).

---

## Phase 1 — Meta-Status

**Repo-Sanity:** ✅
- `git status` clean auf `main`; HEAD `77d14a6` == `origin/main` `77d14a6`.
- Untracked nur `.claude/` + `spec/demos/` (Dev-Helfer, erwartet).
- Branches: `main` (+ remote `feature/ui-redesign`, bereits in main gemergt via `c2b12a1` —
  stale, kann nach Demo gelöscht werden).

**Vercel:** ✅
- Letzter Production-Deploy `dpl_3cGBaC38…` = Commit `77d14a6`, **state READY**, target production.
- Letzte 20 Deployments durchgesehen: **kein FAILED**. Production-HEAD auf Vercel == git-HEAD.

**DB-Counts (Ist) vs. BUILD_LOG Current State (Doku-Stand 2026-06-25, HEAD 14c0b86):**

| Tabelle | Doku | Ist | Drift |
|---|---|---|---|
| profiles | 3 | **4** | +1 (Ahmet `aoezbek` auth dazugekommen) |
| auth.users | 3 | **4** | +1 |
| ai_chat_sessions | 53 | **58** | +5 (normale Nutzung) |
| ai_chat_messages | 144 | **186** | +42 (normale Nutzung) |
| ai_corrections | 0 | **1** | +1 (eine Korrektur eingereicht) |
| Migrationen | 59 | **60** | +1 (Selin-Cleanup) |
| team_members | 63 | 63 | ok |
| assets | 718 | 718 | ok |
| blocks | 43 | 43 | ok |
| gold_set_answers | 84 | 84 | ok |
| RAG-Chunks (confl+brand) | 410 | 410 | ok (367+43) |
| company_context | 36 | 36 | ok |

→ Drift ist erwartbarer Doku-Lag (Phase-5-Merge + Selin-Fixes nach dem letzten BUILD_LOG-Update);
siehe **SWEEP-004**. Keine unerklärten Counts.

---

## Phase 2 — Daten-Drift-Findings

| ID | Tabelle | Drift | Severity | Fix-Typ | Demo-Risk |
|---|---|---|---|---|---|
| SWEEP-002 | confluence_chunks | 2× `sthoss@airtuerk.de` in encoded SafeLinks-URL; 1× AERCONSO-Embed-Placeholder | Low | DB / re-embed | low |
| — | company_context | sauber (0 Thoß/thoss/gmx/airtuerk.online/aerconso) | ✅ | — | — |
| — | brand_chunks | sauber (0 Treffer) | ✅ | — | — |
| — | gold_set_answers | sauber (0 Treffer) | ✅ | — | — |
| — | assets.public_url | `airtuerk.online` = **0** (Cleanup-Welle 2 verifiziert) | ✅ | — | — |
| — | team_members (Selin) | `skoeroglu` / `Köroglu` / `SK` durchgängig | ✅ | — | — |
| — | initials (alle 63) | **0** Inkonsistenzen zu Vorname+Nachname | ✅ | — | — |
| — | pages | 55 alle `published`; **0** slug↔full_path-Mismatch | ✅ | — | — |
| — | avatars Storage↔assets | 6 ↔ 6, **0 Orphans** | ✅ | — | — |

**Detail SWEEP-002:** Die einzigen "thoss"-Reste sind `confluence_chunks` id 276 + 277 (beide
`page_id 444008121`), wo `sthoss@airtuerk.de` **innerhalb eines URL-kodierten Outlook-SafeLinks-Strings**
steht (`…%7Csthoss%40airtuerk.de%7C…`), im Kontext Airline-Online-Check-in-Links (Edelweiss/Nouvelair).
id 231 ist ein `[Embed] Smart link to AERCONSO`-Platzhalter. **Kein** Personen-/Kontakt-Eintrag →
RAG-Surfacing-Risiko niedrig (opakes URL-Fragment, kein "Wer ist Selin"-Treffer). Curated Layer,
aus dem die KI tatsächlich zitiert, ist sauber — inkl. weiss-nicht-Fallback, der korrekt
"Selin Köroglu — skoeroglu@airtuerk.de" nennt ([rag-query/index.ts:544](supabase/functions/rag-query/index.ts)).

**Auth-Kohärenz:** auth.users 4 = profiles 4 (alle `super_admin`); 0 orphan profiles; 0 auth ohne
profile; 1 profile ohne team_member (= `dev@`, korrekt). team_members.auth_user_id NOT NULL = 3 (die
3 Mitarbeiter; dev@ ist Test-Konto ohne team_member). Alles kohärent. **Aber** nur 4 Konten total →
siehe SWEEP-001.

**user_role_defaults (10):** 5 admin (`hakan, msinim, odemir, skoeroglu, tsahin`) + 5 super_admin
(`aoezbek, bdemir, dev, eerkara, utenekeci`). `skoeroglu@airtuerk.de` = `admin` ✅. `dev@` weiterhin
drin (DEFERRED-Removal nach Demo, erwartet).

**Component-Keys:** 15 hardcoded Pages → 12 distinct keys (email-signature ×4). **Alle 12 lösen auf**
echte Komponenten auf ([page-view.tsx:209](src/components/page-view.tsx)); `document-library` bewusst
über die Shadow-Route `(public)/documents-library/[[...folder]]/page.tsx` (existiert ✅). 2 Pages
`hidden_in_sidebar`: `/gold-set` (intern, gewollt) + `/ibe-product-suite/airlounge` (IBE-Child, gewollt).

---

## Phase 3 — Code-Wirklichkeits-Drift

- **Typecheck (`tsc --noEmit`):** ✅ **exit 0, clean.**
- **Lint (`eslint .`):** **19 Probleme (18 errors, 1 warning)** — exakt die dokumentierte Baseline,
  **kein Drift**. Alles `react-hooks/set-state-in-effect` + `static-components` + `immutability`
  (Effekt-Muster) + 1 `no-img-element` warning. `next build` überspringt ESLint → **nicht
  build-blockierend**. *(Hinweis: die Background-Task-Notification meldete "exit 0", weil `tee` in
  der Pipe den eslint-Exit maskierte; echter eslint-Exit = 1 wegen error-severity, aber non-gating.)*
- **`console.log`/`console.debug` in src:** **0** ✅ (nur `console.error/warn` server-side in der
  Edge-Function — legitim).
- **TODO/FIXME/HACK/XXX:** 4 Treffer in 4 Files (`shell.css`, `cloud-orbit.tsx`, `hero-data.ts`,
  `GreetingOrbit.tsx`). Sehr niedrig/gesund. Der `GreetingOrbit`-TODO = "Begrüßungsname verdrahten"
  → SWEEP-009.
- **`@ts-ignore`/`@ts-expect-error`:** **0**. 1× `as any` (`apix-network.tsx:446`, topojson-Typing,
  minor). Alle `eslint-disable` sind dokumentierte `no-img-element`-Ausnahmen für Supabase-Storage-URLs
  (bewusstes Repo-Muster) + 1 `exhaustive-deps` in `view-toggle.tsx`. Gesund.
- **Stale-Patterns in src:** `voyage-3-large` = **0**, `Thoß`/`thoss` = **0**, `airtuerk.online` = **0**.
  Einziger "AERCONSO"-Treffer ist eine legitime Gold-Set-Testfrage ([ai-test-data.ts:121](src/components/hardcoded/ai-test-data.ts))
  über einen Airline-Kontakt — kein Drift. Memory-Sorge "voyage-3-large" ist damit gegenstandslos.

---

## Phase 4 — Routen + Struktur

**Routen-Inventar:**

| Route | Gruppe | Gate | Komponente | error/loading/404 |
|---|---|---|---|---|
| `/` | (public) | login-gate | dashboard (`renderPage`) | — |
| `/[...slug]` | (public) | login-gate | catch-all → `renderPage` | — |
| `/account/profile` | (public) | authed | profile scaffold | — |
| `/documents-library/[[...folder]]` | (public) | authed | File-System v2 | — |
| `/presentation-hub/[[...folder]]` | (public) | authed | Presentation Hub (leer, SWEEP-007) | — |
| `/admin/users` | (public) | super_admin (`notFound()`) | UserAdminPanel | — |
| `/admin` | **admin/** | admin-layout | **Placeholder-Stub** (SWEEP-008) | — |
| `/login`, `/login/forgot-password`, `/login/update-password` | login | public | auth forms | — |

- **Health-Checks (live www.airtuerk.dev):** alle gesund — `/` 307→200, `/login` 200, brand-Routen
  (`airtuerk-service`, `airtuerk-apix`, `team`, `airtuerk-holidays`, `atbeds`,
  `airtuerk-apix/global-network`, `documents-library`, `gold-set`) je 307 (login-gate) → 200 gefolgt.
  **Kein 4xx/5xx.** *(Authenticated-Render der Brand-Sektionen nicht im Browser verifiziert — kein
  Login in diesem read-only Lauf; konsistent mit Memory "authenticated visual user-verified only".)*
- **Strukturbeobachtung:** `/admin` (Gruppe `admin/`) und `/admin/users` (Gruppe `(public)/`) leben
  in **verschiedenen Layout-Bäumen** — `/admin/users` erbt die Public-Shell, nicht das Admin-Layout.
  Gewollt (Memory: admin/users in (public) für Shell + `getAllTeamMembers`), aber `/admin` selbst ist
  damit ein Waise → SWEEP-008.
- **Sidebar/Nav:** DB-getrieben (`getSidebarChildren`, [pages.ts:160](src/lib/pages.ts)); Sidebar-Links
  == pages == Routen per Konstruktion (catch-all rendert jede Page). Spezial-App-Routen
  (documents-library, presentation-hub, admin/users, account/profile) sind separat verdrahtet.

---

## Phase 5 — Demo-Pfad-Check

**5.1 Dashboard (`/`):** GreetingOrbit (Begrüßung **hardcoded "Kollege"** → SWEEP-009) + SearchAIBox
+ QuickGrabs-Carousel + RadialKit-FAB. Lädt gesund.

**5.2 AI-Chat-Workflow:** ✅ vollständig verdrahtet.
- `SearchAIBox` → `AIChatWindow` → `AIAnswerBlock`, Stream via `src/lib/rag/client.ts` →
  Edge-Function `rag-query`.
- Feedback 👍/👎 (`onFeedbackChange`, `ai_chat_messages.user_feedback`, 4 Rows vorhanden) +
  **`CorrectionModal` existiert** ([components/dashboard/hero/CorrectionModal.tsx](src/components/dashboard/hero/CorrectionModal.tsx))
  → schreibt `ai_corrections`.
- ⚠️ Memory-Pfad `src/components/ai/` ist **veraltet** — AI-Komponenten liegen unter
  `src/components/dashboard/hero/`.
- ❗ **Es fehlt die Review/Approve-Seite** für `ai_corrections` → SWEEP-003.

**5.3 Admin User-Management (`/admin/users`):** Phase 5 live (Multi-Select, Bulk-Actions, CSV-Export
— commit `6419849`). Phasen 7–12 (per-section bulk-invite, density toggle, permissions matrix, …)
laut BUILD_LOG **noch offen**. Demo-Substanz hängt an echten Usern → SWEEP-001.

**5.4 Brand-Pages (`/airtuerk-service` etc.):** D-064 typed-TSX-Sektionen für 4 Brands; Route
HTTP-gesund (login-gate). DB-Block-Backup-Rows bleiben (D-064 deferred cleanup) → SWEEP-010.

**5.5 RAG-Sicherheit / Nachvollziehbarkeit:** ✅ **Ja, nachvollziehbar.** `rag-query` verlangt JWT
(401 ohne), erstellt/nutzt `ai_chat_sessions` mit `user_id = auth.user.id`, loggt User- *und*
Assistant-Nachrichten in `ai_chat_messages` (inkl. `retrieved_chunks`, tokens, latency). "Wer hat was
gefragt" ist über `ai_chat_sessions.user_id` rekonstruierbar. Modelle: `voyage-4-large` (embed) +
`rerank-2.5` + `claude-opus-4-8`. Identity-reserved Rerank + Telefon-Politik + exakte
Out-of-Scope-Phrase im System-Prompt.

---

## Phase 6 — Docs-Drift

**6.1 BUILD_LOG Current State:** stale (Stand HEAD `14c0b86`). Veraltet: HEAD, Migrationszahl
(59→60) + höchste Migration (`…080714`→`…140402`), profiles (3→4), auth (3→4), ai_chat (53/144→58/186),
ai_corrections (0→1). Korrekt geblieben: 410 Chunks, 36 context, 63 team_members, 718 assets, 84 gold_set.
→ **SWEEP-004** (CLAUDE.md-Regel "derived docs im selben Change aktualisieren" wurde beim Phase-5-Merge
+ Selin-Commits nicht eingehalten).

**6.2 DECISIONS.md:** Höchste **geschriebene** Decision = **D-064** (Brand→TSX). `D-065` taucht nur als
**reservierte Forward-Reference** in D-058 auf ("separate decisions D-059–D-065 as those stages land" —
gemeint ist die RAG-Email/Notify-Stufe). **Antwort auf die Auftragsfrage:** Selins Cleanup-Migration
braucht **kein** D-065 — sie ist ein Chore unter **D-056** (direkter execute_sql → Reproduzierbarkeits-Migration)
und ist bereits geshippt (`77d14a6`). D-064 hat einen dokumentierten Follow-up (Title-Rename, no new D)
und einen **deferred** optionalen Cleanup (ungenutzte Brand-Section-Backup-Rows retiren).

**6.3 Migration-Parität:** Lokale Files = **60**, DB `schema_migrations` = **60** → Anzahl stimmt.
**ABER** — die neueste Migration hat **Timestamp-Drift**: lokales File
`20260625135558_selin_stammdaten_db_cleanup.sql` ist im Ledger als Version `20260625140402`
(gleicher Name, ~5 Min Differenz) registriert. → **SWEEP-005**. Plus die aus Memory bekannte
33×-Legacy-`00NN`-vs-Timestamp-Differenz im Ledger. `supabase db push` bleibt unzuverlässig.

---

## Findings-Liste (detailliert)

### SWEEP-001 — Keine echten/diversen User in prod (9-Key-Seed nie deployt) 🟡 Medium · Demo-Impact: high
Prod hat **4 auth.users / 4 profiles, alle `super_admin`** (Buhara, Emirkan, Ahmet, dev@). Der
Stage-8-Seed `684d67f` (9 Key-User + bidi-Links) erreichte prod nie. 6 der 10
`user_role_defaults`-Personen (5 admins + Ümit) haben kein Konto; team_members.auth_user_id ist nur
bei 3 gesetzt. Die User-Management-Demo zeigt damit keine `admin`/`user`-Rollen und überwiegend
"not invited"-Zeilen.
**Fix-Typ:** DB/Seed (+ Invite-Entscheidung; Memory: resend funktioniert, generateLink sendet nicht).
**Aufwand:** M (hängt an Invite/Email-Stufe). **Bekannt** (BUILD_LOG ⚠️ V1-Blocker).
**Reihenfolge:** Woche 1; vor jeder User-Mgmt-Demo-Probe.

### SWEEP-002 — Selin/AERCONSO-Reste in confluence_chunks (encoded URL) 🟢 Low · Demo-Impact: low
3 raw-Chunks (`page_id 444008121` ×2 SafeLinks-URL mit `sthoss@…`, `page_id 446989123` AERCONSO-Embed).
Kein Personen-Eintrag; RAG zitiert aus dem kuratierten Layer, der sauber ist.
**Fix-Typ:** DB (Seite re-chunken/scrubben) — am besten beim nächsten RAG-Re-Embed mitnehmen.
**Aufwand:** S. **Reihenfolge:** Woche 1–2, gebündelt mit Re-Embed. Optional.

> **REVISED 2026-06-26 (Welle C1, read-only audit):** Der **AERCONSO-Teil ist false
> positive** gegen das kuratierte Design — `embed-knowledge` hat keinen `bereich`-Filter,
> AERCONSO wird per `confluence-extend` bewusst auf **eine** Seite kuratiert. Chunk 230
> (`16165417` "Airline Kontakte") backt Gold-Set **Q26** (`wiki_info@aer.de` — einzige
> Quelle) → behalten; Chunk 231 (`446989123`) ist ein harmloser 25-Token-Pointer →
> behalten. Tatsächlich **2** AERCONSO-Chunks (nicht 3; die literal-text-search übersah
> 230). Der **sthoss-Teil** ist real, aber **post-demo deferred** (SafeLinks-Telemetrie,
> RAG-Surfacing-Risk vernachlässigbar; Source-Fix = eigener AP). Keine DB-/Code-Änderung.
> Details: BUILD_LOG History 2026-06-26 — Welle C1.

### SWEEP-003 — "Lernende KI": Korrektur-Review/Approve-UI fehlt 🟡 Medium · Demo-Impact: high
`CorrectionModal` + Feedback schreiben `ai_corrections` (1 pending) / `user_feedback` (4). Aber es
gibt **keine Admin-Oberfläche** zum Reviewen/Freigeben → Promotion zu `confluence_chunks`
(`source_type='correction'`) geht nur per Hand-SQL. Die "Lern-Schleife schließt sich live" lässt sich
ohne diese UI nicht zeigen.
**Fix-Typ:** Code (RAG WS2). **Aufwand:** M–L. **Bekannt** (BUILD_LOG Remaining: "RAG WS2 feedback+CorrectionModal finish").
**Reihenfolge:** Woche 1 — Kern der Demo-Story; früh entscheiden.

### SWEEP-004 — BUILD_LOG Current State stale 🟡 Medium · Demo-Impact: low
HEAD/Migrationen/profiles/auth/ai_chat/ai_corrections veraltet (Details Phase 6.1). Verstößt gegen
CLAUDE.md "derived docs honest in the same change".
**Fix-Typ:** Docs. **Aufwand:** S. **Reihenfolge:** Tag 1.

### SWEEP-005 — Migration-Ledger Timestamp-Drift 🟡 Medium · Demo-Impact: low (Build-Risk: med)
Lokal `20260625135558_selin_stammdaten_db_cleanup.sql` ↔ Ledger-Version `20260625140402`. `db push`
würde das File als unapplied sehen und re-applien wollen. Verstärkt die bekannte 33×-`00NN`-Drift.
**Fix-Typ:** Migration/Ledger-Reconcile (File auf Ledger-Version umbenennen ODER Ledger angleichen).
**Aufwand:** S–M. **Reihenfolge:** Woche 1–2, **vor** dem Schreiben neuer Migrationen (sonst Landmine).

### SWEEP-006 — Keine error.tsx / not-found.tsx / loading.tsx 🟡 Medium · Demo-Impact: med
`src/app` hat keine Error-Boundary, kein Custom-404, keine Loading-UI. Ein Runtime-Fehler in der
Live-Demo → Next-Default-Whitescreen.
**Fix-Typ:** Code (mind. `(public)/error.tsx` + `not-found.tsx`). **Aufwand:** S. **Reihenfolge:** Tag 1
(billigste Live-Demo-Versicherung).

### SWEEP-007 — Presentation Hub leer (0 Dateien/Folder) 🟢 Low · Demo-Impact: med
Hub gebaut (Route + Components + Migration 0033), aber `presentation_files` = 0, `presentation_folders`
= 0 → rendert Empty-State. Kein PDF/PPTX-Upload-Pipeline (Memory: V1.1 / Stufe 5).
**Fix-Typ:** Content seeden ODER Demo-Pfad um den Hub herum führen (Document Library hat 8 Files).
**Aufwand:** S (seed) / 0 (vermeiden). **Reihenfolge:** Woche 1 entscheiden.

### SWEEP-008 — `/admin`-Root ist veralteter Placeholder-Stub 🟢 Low · Demo-Impact: low
[src/app/admin/page.tsx](src/app/admin/page.tsx): "placeholder admin shell — full CMS UI ships in
Phase 5", raw-Tailwind (inkonsistent mit Token/CSS-Module-Stil), eigenes Layout, nicht aus der Nav
verlinkt. Risiko nur bei direkter Navigation zu `/admin`.
**Fix-Typ:** Code (entfernen oder redirect → `/admin/users`). **Aufwand:** S. **Reihenfolge:** Tag 1.

### SWEEP-009 — Dashboard-Begrüßung hardcoded "Kollege" 🟢 Low · Demo-Impact: low–med
`GreetingOrbit.tsx` zeigt statisch "Kollege" statt des eingeloggten Namens (TODO + commit `a513ab1`).
**Fix-Typ:** Code (`getIdentity()`-Name verdrahten). **Aufwand:** S. **Reihenfolge:** Tag 1 (Demo-Politur).

### SWEEP-010 — D-064 Brand-Section-Backup-Rows nicht aufgeräumt 🟢 Info · Demo-Impact: none
Ungenutzte DB-Block-/Child-Page-Rows der 4 TSX-Brands bleiben als Backup (D-064 bewusst deferred).
Harmlos.
**Fix-Typ:** Migration (optional). **Aufwand:** S. **Reihenfolge:** Post-Demo.

### SWEEP-011 — Lint-Baseline 19 (non-gating) 🟢 Info · Demo-Impact: none
18 errors (react-hooks) + 1 warning (no-img-element), unverändert zur Doku. `next build` überspringt
ESLint. Typecheck grün.
**Fix-Typ:** Code (Cleanup). **Aufwand:** M. **Reihenfolge:** Post-Demo.

---

## Verifiziert gesund (keine Aktion)

- Curated RAG-Layer (company_context/brand_chunks/gold_set) frei von Selin/Thoß/airtuerk.online.
- `assets.public_url` airtuerk.online = 0; storage_path null = 0; avatars 6↔6 ohne Orphans.
- Selin durchgängig `skoeroglu`/`Köroglu`/`SK`; weiss-nicht-Fallback nennt korrekten Namen.
- Alle 63 initials konsistent; 55 pages published; 0 slug/full_path-Mismatch.
- Alle 12 component_keys lösen auf echte Komponenten auf (document-library via Shadow-Route).
- 10/10 Public-Routen HTTP-gesund; Vercel ohne FAILED-Deploys.
- Code: 0 console.log, 0 stale-strings, 0 @ts-ignore; typecheck clean; RAG-Audit-Logging vorhanden.

---

## Empfehlungen

**TAG 1 (low-effort, Doku-Wahrheit + Live-Demo-Versicherung):**
- SWEEP-004 BUILD_LOG Current State aktualisieren
- SWEEP-006 `(public)/error.tsx` + `not-found.tsx` ergänzen
- SWEEP-009 Begrüßungsname verdrahten
- SWEEP-008 `/admin` → `/admin/users` redirect (oder Stub entfernen)

**WOCHE 1 (Demo-Narrativ):**
- SWEEP-003 Korrektur-Review/Approve-UI (RAG WS2) — *höchster Story-Wert, größter Build; zuerst
  entscheiden, ob es in die Demo soll*
- SWEEP-001 Echte User seeden/einladen (hängt an Invite/Email-Entscheidung)
- SWEEP-007 Presentation Hub: Content seeden ODER Demo-Pfad darum herum

**WOCHE 1–2 (Integrität, vor neuem Migrations-Bau):**
- SWEEP-005 Migration-Ledger reconcilen (**vor** der ersten neuen Migration der Pflicht-Items)
- SWEEP-002 confluence page 444008121 scrubben (mit nächstem Re-Embed bündeln)

**POST-DEMO:**
- SWEEP-010 D-064 Backup-Rows retiren · SWEEP-011 Lint-Cleanup · stale `feature/ui-redesign` löschen

**Abhängigkeiten:**
- SWEEP-003 ist das Herz der "lernenden KI"-Demo → Entscheidung zuerst, blockt den WS2-Bau.
- SWEEP-001 hängt an der Invite/Email-Entscheidung (generateLink sendet nicht; resend funktioniert).
- SWEEP-005 **vor** allen neuen Migrationen erledigen, sonst `db push`-Landmine bei den Pflicht-Items.

---

*Ende des Berichts. STOP für Buharas Review — keine Mutationen vorgenommen. Buhara entscheidet,
welche Findings in Tag 1, welche als eigenes Item und welche post-Demo laufen.*
