# terminalv2 — Build Log

Running record of what's been built, when. Newest entries on top.

The **Current State** block below is the only present-tense status; everything under
it is append-only history (do not rewrite past entries — add new ones).

---

## Current State (updated 2026-06-26)

- **HEAD:** `e7c5995` (`main`, == origin/main) — **Wissensbasis** `/admin/knowledge` shipped + deployed (Vercel READY, `dpl_4aFWaHbH`). **Demo:** 2026-08-01.
- **Stack:** Next.js 16.2.9, React 19.2.4, Tailwind CSS 4, Supabase Postgres 17,
  pnpm 11. Deployed on Vercel, serving [www.airtuerk.dev](https://www.airtuerk.dev)
  (Webflow/`terminal.airtuerk.de` retired).
- **Database:** 32 tables + the `profiles_v` view (RAG foundation added 6:
  `company_context`, `confluence_chunks`, `brand_chunks`, `ai_chat_sessions`,
  `ai_chat_messages`, `ai_corrections`; Wissensbasis added 4: `tag_vocabulary`,
  `tag_suggestions`, `chunk_edit_log`, `chunk_retrieval_stats` + `company_context.tags`).
  **55 pages** (all published), **15 brands**,
  **9 storage buckets** (public: `images`, `documents`, `videos`, `fonts`, `avatars`;
  private: `library`, `presentations`, `rag-knowledge`, `confluence-attachments`).
  `pgvector 0.8.0` + `pg_trgm 1.6` + `pg_cron` installed. **65 migrations**, highest:
  `20260626093000_chunk_retrieval_stats_job`. Highest decision: **D-068**.
  RAG corpus: **406 chunks** (confluence 363 [page 130 / pdf 159 / office 60 /
  knowledge_base 14] + brand 43) + **37 company_context** entries (all tagged). Edge functions:
  `embed-knowledge` (7 source modes), `rag-query` v8 (persona v2), `notify-correction-event`,
  `tag-classify-chunks` (Haiku), + 3 confluence fns.
  RAG chat live on dashboard hero (turn-based stream, source cards, persona v2).
- **Data counts (2026-06-26):** team_members **63**, profiles **4 (all super_admin,
  0 admin/user)**, active auth users **4**, assets **718**, blocks **43**,
  gold_set_answers **84** (92.9% accuracy baseline), ai_chat_sessions **62** /
  messages **230**, ai_corrections **1**.
- **⚠️ V1 blocker:** prod `profiles` has only **4 rows (all super_admin, 0 admin/0
  user)** — the Stage-8 nine-key-user seed (`684d67f`) never reached prod; must be
  re-run before the 2026-08-01 demo (details in the 2026-06-25 finding below).
- **Auth/roles:** `super_admin | admin | user`; RLS via `is_admin()` /
  `is_super_admin()` / `get_profile_role()`; profile role-changes are
  super-admin-only (D-055).
- **Shipped:** Phases 0–4 + design system; File System v2 (roles + folder Document
  Library); User Panel (admin/users list + detail, role picker, seeded key users,
  profiles↔team_members link, `user_activity_log`); Presentation Hub rebuild (0033);
  all four APIX tool ports (0014–0016); signature + out-of-office generators;
  intelligence/RAG groundwork (0025–0029) + live `/api/search`; dead-code cleanup
  (`c397b29`); `/internal-branding/configurator` removed (D-056); 4 brand pages
  ported to typed TSX section components (D-064); 3 cleanup wellen on 2026-06-25
  (lint+avatars, test-person+domain removal, brand sub-title rename); dashboard
  UI-redesign merge (greeting orbit seal, Quick-Grabs carousel, portal-wide radial
  FAB — `c2b12a1`); AP3 Phase 5 (admin/users multi-select + bulk-actions + CSV
  export — `6419849`); Selin Stammdaten cleanup (Thoß→Köroglu / initials SK /
  gold-set fixture — `77d14a6`); Welle B pre-demo hygiene (migration-ledger rename
  + error/404/loading boundaries + this doc-sync); Welle C korpus-hygiene (C1
  Confluence-stragglers audit, C2 full RAG-corpus audit → `AUDIT-KORPUS-2026-06-26.md`);
  Welle D audit-fixes (D1 RAG secret-purge + `SECRET_PAGE_DENYLIST` guard `e58aeea`;
  D2 Selin disambiguation `dbd67fd`); Voyage ZDR-Opt-Out activated 2026-06-26;
  **Wissensbasis `/admin/knowledge`** (D-065..068 — 4-tab super_admin surface over the
  RAG corpus: Quellen/provenance, correction review-loop with `embed-knowledge` + Resend
  notify + in-app pill, gold-set Qualität, Taxonomie + Haiku auto-tag; corrections-first
  editing per D-A; `cb33469`→`e7c5995`, deployed).
- **Remaining:** AP3 Phases 7–12 (per-section bulk-invite, quick-actions, density toggle,
  permissions matrix, per-user permissions, activity-log integration); RAG WS2
  (feedback+CorrectionModal finish) + WS3/WS4 (web-search) + S5 company-context UI
  + S8 email-notify resend + S9 gold-set re-run + S10 demo polish; Audit fixes
  P0a (cookie-free public-read) + P0c (proxy.ts) + P1 (APIX dynamic + RAG
  robustness, 4 open decisions); Out-of-Office as its own brand section (Block 5b);
  2 non-blocking bulk-invite fixes (`use-bulk-invite.ts`); Welle A (greeting
  first-name + empty-`/admin` redirect — still recon-only); open C2 audit findings
  AUDIT-002 (learning-loop never run) / AUDIT-003 (Hara-Filo source contradiction) /
  AUDIT-004 (Pegasus check-in gen-error) / AUDIT-006 (frozen 2026-06-23 corpus);
  D2 Phase-2 embed of the Selin row (ZDR-gated consistency follow-up).

---

## 2026-06-26 — Wissensbasis (`/admin/knowledge`) — Lernende-KI Admin-Surface

4-tab super_admin page over the RAG corpus (D-065..068), `cb33469`→`e7c5995` (12 commits),
merged to `main` + deployed (Vercel READY). 3 migrations (`20260625190000` foundation +
`20260626090000` vocab-seed + `20260626093000` retrieval-stats `pg_cron`); 2 new edge fns
(`notify-correction-event`, `tag-classify-chunks`). **0 new security advisors.**
- **Quellen:** unified read of the 3 stores; content-shape render (heuristic, no stored col);
  "Abgerufen ×N" (retrieval, not citation); company_context edit-modal + audit drawer.
- **Reviews:** approve / edit&approve / reject → `embed-knowledge('corrections')` (K-6, no
  manual insert) → durable chunk; in-app `ReviewNotifier` pill + Resend email (submitter +
  Selin/Murat); submit-confirmation toast.
- **Qualität:** gold-set 92.9% + per-set bars + failure cluster + hand-rolled SVG sparkline.
- **Taxonomie:** `tag_vocabulary` CRUD + AI-suggestion queue; Haiku initial run 37/37 + 27 suggestions.
- **Editing model (D-A):** only `company_context` editable (durable in-place re-embed);
  confluence/brand are regenerable caches → read-only.
- **Demo dry-run (throwaway data, deleted after):** approve → chunk 609 → `rag-query` retrieved
  it **rank 3/8 (rerank 0.957)**, answer "7.7%" + Korrektur-citation → **no boost needed**.
  Real email send OK (HTTP 200, Resend `614de2ba…`). State restored: 1 pending (Pegasus) + 0
  correction-chunks. (Closes AUDIT-002 learning-loop-never-run.)
- **Open (post-demo polish, not blockers):** submitter "my corrections" view; dynamic reviewer
  recipients (vs hardcoded Selin/Murat); reviews-list realtime (currently 45s poll + click);
  Resend-fail monitoring; modal focus-trap; orphan-cleanup for deleted chunks.

---

## 2026-06-26 — Welle D — Audit-Findings angehen

**D1 — AUDIT-001 RAG secret-purge** (`e58aeea`, Closes AUDIT-001)
- Removed 4 `confluence_chunks` carrying live payment/access data (cards + CVC, account
  passwords, IBANs): page `444009709` "Operativ FAQ" (chunk 228) + page `768213063`
  "Konti 2026 CC" (317) removed whole (by page_id — inherently sensitive); page
  `444007659` "Involatus Genius" (261) + `444007669` "Involatus Konti" (336) only the
  card-bearing chunk (their clean ops chunks 262/263/264 + 335 kept). `confluence_chunks`
  367 → 363; post-scans card/cvc/pw/iban = 0; `confluence_raw` 86/86 untouched.
- Pipeline guard `SECRET_PAGE_DENYLIST` in `embed-knowledge` (deployed v12): PERMANENT
  {FAQ, Konti CC} + TEMPORARY {Involatus×2 — remove after Confluence source-clean +
  re-embed} so the chunks can't return on a future embed run. Migration
  `20260625180604_secret_cleanup_audit_001` + redacted pre-snapshot
  `spec/d1-pre-snapshot-2026-06-26.md`.
- Authority: Buhara Demir (CMO) + Ahmet Özbek (CFO). No card rotation (company shared
  cards). Confluence SOURCE cleanup is a separate track (Buhara/Murat/Selin).
- Deploy `dpl_6mhc2goaUBfLjn88HF6guZSaGUt1` READY.

**D2 — AUDIT-008 Selin disambiguation** (`dbd67fd`, Closes AUDIT-008 functionally)
- D1 live-test surfaced: RAG answered "Selin Ülker" to "Wer ist Selin?" — Selin Köroglu
  was nowhere in the corpus (its only mention was the deleted FAQ chunk 228), while
  `company_context` priority-1 named only Ülker.
- Strategy A: priority-1 `company_context` INSERT disambiguating Selin Köroglu (Service
  Agent, skoeroglu@) vs Selin Ülker (Operative Manager, suelker@), plus Selin vs Ufuk
  Köroglu. Content deliberately WITHOUT "geb. Thoß" or marital/private data.
  `company_context` 36 → 37. Migration `20260625182736_company_context_selin_disambiguation`.
- The apply hit a cosmetic 502 but committed exactly once — verified read-only (count
  36→37, single row, single ledger entry). `rag_hybrid_search` injects priority-1 context
  by the priority filter (embedding-independent — arm 1), so the fix is live on insert;
  the row's embedding is a ZDR-gated Phase-2 consistency follow-up (not yet run).
- **Live-Test (Buhara, Incognito-Browser, 2026-06-26): 7/7 ✅** — KI nennt beide Selins
  mit Kontext-Rückfrage, Köroglu-Disambiguierung proaktiv mitgegeben, Ufuk korrekt
  zugeordnet, Ümit als CEO korrekt.

**Voyage ZDR-Opt-Out aktiviert 2026-06-26** (laut Buhara, irreversibel per
Voyage-Dashboard-Confirm-Dialog). Zukünftige Embeddings sind trainings-frei. Die
initialen Embeds vom 2026-06-23 (Größenordnung confluence_chunks + brand_chunks +
company_context zum Zeitpunkt T0) bleiben laut Buharas Lesart der Voyage ToS Section 3
trainings-subject — nicht reversibel.

---

## 2026-06-26 — Welle C2 — Full RAG-Korpus Audit (read-only)

**Status:** Read-only audit; deliverable `spec/AUDIT-KORPUS-2026-06-26.md`. No DB/code
changes. Inventory + verification of the RAG corpus for demo-readiness — 7 findings:
- 🔴 **AUDIT-001** (Critical) — live payment/access secrets (cards/CVC/passwords/IBANs)
  in 4 RAG chunks, retrievable by the KI → actioned in **D1**.
- 🟠 **AUDIT-002** (High) — the "learning loop" was never exercised: 6 gold-set
  corrections + 1 `ai_corrections` row, **0** applied to the corpus
  (`source_type='correction'` = 0). `gold_set_answers.korrektur` has no path into the
  corpus; the lone `ai_corrections` is a pending test.
- 🟠 **AUDIT-003** (High) — Hara-Filo Confluence source **contradicts** the gold-set
  correction (source says "same price", correct = +20% Servicegebühr) → needs a source
  edit, not just re-embed.
- 🟡 **AUDIT-004** (Med) — Pegasus check-in generation error: corpus has the correct
  "72 Std", RAG had hallucinated "7 Std" (no corpus gap).
- 🟡 **AUDIT-005** (Med) — sthoss stragglers (carried from C1, deferred post-demo).
- 🟢 **AUDIT-006** (Low) — corpus is a frozen single embed run from 2026-06-23 (no
  re-embed/cron → drift risk for later Confluence edits).
- 🟢 **AUDIT-007** (Info) — coverage healthy: 86/86 confluence pages embedded; 12/15
  brands have chunks (apix / ibe-product-suite / presentation-hub = 0, by design).
- Follow-on actions: AUDIT-001 → D1; AUDIT-008 (Selin, surfaced in D1's live-test) → D2.
  AUDIT-002/003/004/006 remain open (Current State Remaining).

---

## 2026-06-26 — Welle C1 — Confluence-Stragglers Audit (read-only)

**Status:** Read-only audit — no DB / edge-function / migration changes. Closes
SWEEP-002 (with revision).

Verified SWEEP-002 (3 reported `confluence_chunks` stragglers) against the actual
Confluence-sync architecture (`confluence-extend` → `confluence_raw` →
`embed-knowledge`).

**AERCONSO part — false positive against the curated design.** `embed-knowledge`
([index.ts:214](supabase/functions/embed-knowledge/index.ts)) has **no `bereich`
filter** — it embeds every `confluence_raw` row with `is_deleted=false` + non-null
`body_text`; AERCONSO is curated at *ingestion*: `confluence-extend` pulls **exactly
one** AERCONSO page on purpose.
- Chunk **230** (page `16165417` "Airline Kontakte", bereich=aerconso): the single
  curated AERCONSO page; its `wiki_info@aer.de` content is the **only** corpus source
  for gold-set **Q26** ("Airline Kontakte → wiki_info@aer.de"). Deleting it would
  degrade the gold set → **kept**.
- Chunk **231** (page `446989123` "[EMBED] Cockpit / GDS Kanal"): a deliberate
  25-token pointer ("real content under 16165417"), harmless → **kept** (code-change
  cost > value).
- Correction: there are **2** AERCONSO-bereich chunks, not the 1 SWEEP-002's
  literal-text search found (230 carries no literal "aerconso" string).

**sthoss part — real, deferred post-demo.** 2 chunks (`276`, `277`, page `444008121`
"Vtours Genius") hold `sthoss@airtuerk.de` URL-encoded inside an Outlook **SafeLinks**
`&data=` tracking blob. `confluence_raw.body_text` still contains it, so a DB scrub
without a Confluence **source** edit returns on the next re-sync. Risk very low
(SafeLinks telemetry is never retrieved as a "who is Selin" answer). **Deferred
post-demo** as a known issue — the source-page fix on the 101k-char Vtours-Genius page
is its own AP (later: Selin/Murat as service mentors).

**Cross-check:** `@gmx.de`=0, `airtuerk.online`=0, `thoß`(ß)=0 in `confluence_chunks`
(367 total) — corpus otherwise clean. Prior OK to delete 230/231 + add a
`bereich=aerconso` exclusion was **withdrawn** after this recon (would have degraded
Q26 / contradicted the design).

---

## 2026-06-26 — Welle B (Pre-Demo Hygiene)

Three isolated pre-demo hygiene items from the 2026-06-26 comprehensive sweep.
Welle A (greeting first-name + empty-`/admin` redirect) was recon-only this
session — no commits; prod-HEAD stayed `77d14a6` going in.

**B1 — Migration-ledger-drift repair** (`6098201`, Closes SWEEP-005)
- Renamed local `20260625135558_selin_stammdaten_db_cleanup.sql` → the ledger
  timestamp `20260625140402_…` (`git mv`, R100, 0 content change).
- Read-only verified first: the two `UPDATE`s are byte-identical to the ledger (only
  the ledger's comment header is condensed) and every effect is already applied +
  idempotent (Selin Köroglu / `SK` / gold-set) → **no DB touch**. Variante α
  (rename); β (ledger `UPDATE`) rejected as needlessly risky. Migrations 59→**60**,
  ledger untouched.
- Surfaced, left by decision: **30 legacy `00NN` version-string drifts** remain →
  `supabase db push` stays non-clean; harmless under the MCP `apply_migration`
  workflow (CLI not installed). Tracked as a separate post-demo AP.
- Deploy `dpl_EMJnUGdkLyHANGStbWy7RU6D239N` READY ~20s.

**B2 — Error boundaries + 404 + loading skeleton** (`4cfd33b`, Closes SWEEP-006)
- 4 new files (`src/app/error.tsx`, `not-found.tsx`, `(public)/loading.tsx`,
  `(public)/error.tsx`) + `src/styles/error-states.css` with self-contained
  `.err-*/.nf-*/.skel-*` from theme tokens (the assumed `.card`/`.btn-primary`
  globals don't exist; CSS imported per-file). `getIdentity` from `@/lib/auth`. Flat
  per the current system (no backdrop-filter, no DM Mono, eckige buttons).
- `not-found.tsx` is identity-aware and builds `ƒ` dynamic (async + cookies) — clean,
  no `force-dynamic`.
- **Finding:** unmatched routes hit the `(public)` catch-all `[...slug]`, whose
  auth-gate **307-redirects anon → `/login` before the 404 renders**. So the branded
  404 shows for **authenticated** users ("Zurück zum Dashboard"); anon get `/login`
  (the not-found anon branch is effectively unreachable). **No bug / no regression** —
  pre-B2 anon were also redirected, then served a default Next 404; authed users now
  get the branded one.
- Verify (honest): branded-404 markup confirmed served live (curl:
  `nf-card`/`nf-code`/`Seite nicht gefunden`); gates green; build flips `/_not-found`
  ○→ƒ. Authed-404 **visual not captured** (no connected browser; scripting a password
  login is out per safety rules). Dark-mode correct by construction (token-only).
  Error-boundary live-trigger skipped (needs a code throw).
- Deploy `dpl_7AhawUATP6z8RDgYXZgZHMw1u8sJ` READY ~22s.

**B3 — Doc sync** (this commit, Closes SWEEP-004)
- Current State refreshed: HEAD `14c0b86`→`4cfd33b`, dated 2026-06-26, **60
  migrations** (highest `20260625140402_selin_stammdaten_db_cleanup`), live counts
  (profiles 3→**4**, auth 3→**4**, ai_chat 53/144→**58/186**, ai_corrections 0→**1**;
  all others unchanged incl. RAG corpus 410).
- Remaining de-staled (AP3 Phase 5 shipped → removed). Shipped gained 3 summary
  bullets for work merged since `14c0b86` (dashboard UI-redesign, AP3 Phase 5, Selin
  cleanups) — no detail backfill.
- DECISIONS.md unchanged (B1/B2 operational; highest stays D-064).

---

## Cleanup-Welle 3 — Brand-page sub-title rename (2026-06-25, `14c0b86`)

**Status:** Shipped + live. Atomic DB+TSX commit (migration `20260625080714` + 3 TSX
files: `brand-data.ts`, `brand-page.tsx`, `linkedin-banner-section.tsx`). Builds on D-064.

Shortened the brand sub-section titles for sidebar/heading consistency. The sidebar
anchor labels read DB `pages.title`; the in-page `<h2>` on the 4 TSX brands is
hardcoded in TSX — so both surfaces were renamed together to stay in sync. **18 rows**
renamed: Logo & Fav Icon→Logos, Colors Logo→Print Colors, Colors UX/UI→UX Colors,
Presentation Master Deck→Master Deck, Email Signature→Signature, LinkedIn Banner→
LinkedIn. Antalya angeglichen (Logo→Logos, Colors→Print Colors); anchor slugs unchanged
(URL-stable). The `email-signature.tsx` generator heading "Your Signature" was
deliberately left untouched (its `title` prop is dead/unused). Out-of-Office as its own
section is a follow-up welle (it exists today embedded in `email-signature.tsx:705`).
Vercel `dpl_ABXRfWLLmcv7K4MrQtWd4vdUsw4Z` READY ~21s.

---

## Cleanup-Welle 2 — Test person + airtuerk.online domain removed (2026-06-25, `66676a8`)

**Status:** Shipped + live. Atomic migration `20260625074531` + `corp-email.ts`.

Removed the test person `287d1b87` (`terminal@airtuerk.online`, "Test Terminal",
role=user) — its linked auth user + profile + activity, in FK-respecting order — and
dropped `airtuerk.online` from `CORP_EMAIL_PATTERN` (incl. the TEMPORARY scaffolding
marker). The two were coupled (the test person was the only `@airtuerk.online` user).
**team_members 64→63, profiles 4→3.** Verified read-only first (0 owned content, 0
`team_member_brands`, role=user not admin). Vercel `dpl_3wvA2x15oMagm94GWVLKnVKN7GY7`
READY ~20s.

---

## Cleanup-Welle 1 — Lint + stale avatars (2026-06-25, `bc51762`)

**Status:** Shipped + live.

Fixed the lone `no-html-link-for-pages` lint error in `login-form.tsx:66` (`<a>` →
`next/link` `<Link>` for client-side nav). Deleted 6 orphaned avatar files in
`images/team/*.png` via the Storage REST API (0 DB refs in `assets`, 0 code refs;
superseded by the `avatars/<uuid>/avatar.<ext>` bucket). Lint baseline 20→19 problems.
Vercel `dpl_E9pUuRmpCLLu3WUCxDjqr3J1M23D` READY ~22s.

---

## Production finding + deferred items (2026-06-25 project-history sweep)

**⚠️ Critical V1 blocker — prod `profiles` = 3 (all super_admin).** A read-only sweep
confirmed prod has only 3 profiles, all super_admin, **0 admins / 0 users**. The Stage-8
nine-key-user pre-seed (`684d67f`) never reached prod — it only ran in a non-prod env.
**Stage-8 pre-seeding must be re-run on prod before the 2026-08-01 demo** for the
User-Management panel to show real data.

**Deferred (non-blocking):**
- `dev@airtuerk.de` row in `user_role_defaults` → remove after **2026-08-02** (post-demo;
  dev@ is load-bearing as the preview test account until then).
- ~30 legacy `00NN`-named migration files → rename to timestamped post-demo (cosmetic;
  md5-identical to the ledger versions; local==DB==**59** count parity holds).
- Lint drift (18 errors + 1 warning) → own task later (Next 16 `build` skips ESLint).
- Dead prop `title="Email Signature"` in `email-signature-section.tsx:12` → cosmetic.
- 2 stale code comments in `brand-palette.ts` + `logos-section.tsx` → cosmetic.

**Stale branch:** `feature/ui-redesign` is 0-ahead / fully merged into `main` →
deletion candidate.

---

## Brand pages → TSX section components (2026-06-24)

**Status:** Done on branch `brand-pages-new`. Decision **D-064**. No DB changes.

The 4 single-page brands (`/airtuerk-service`, `/airtuerk-holidays`, `/atbeds`,
`/service-center-antalya`) now render through typed TSX section components
(`src/components/brand-sections/` + `<BrandPage>`) instead of the DB-block
aggregator. A guarded pre-branch in `page-view.tsx` dispatches only these 4
slugs; `airtuerk-apix` + `internal-branding` still use `getBrandSectionsAll`.

Sections reuse the existing presentational block components (logo_showcase,
logo_grid, color_palette, document_list, asset_block, description) + the
EmailSignature tool, with asset URLs / decks / letterheads hardcoded from the
verified live `blocks.content` (env-driven storage helpers in `src/lib/storage.ts`).
DOM, anchor ids, CSS and client behaviour are byte-identical; ~6 per-section DB
reads dropped per brand page. The 2 universal palettes are now constants
(`src/lib/brand-palette.ts`).

DB untouched — blocks + brand-section child pages kept as backup (a later cleanup
migration can retire them). Verified: typecheck + build green; all 4 pages SSR
200 with section-id order matching the DB child slugs (incl. Antalya's singular
`logo`); two-col `<h2>` direct-child layout + sidebar anchors intact; the
`airtuerk-apix` + `internal-branding` fallback render unchanged.

---

## RAG-airtuerk V2 — File 03 frontend wire + Persona v2 (2026-06-24)

**Status:** Frontend wired to the live pipeline; persona v2 deployed. Decisions **D-062** + **D-063**. Workstream 1. (Demo-date moved to ~2026-07-15–22 for quality — IT-Chef stakeholder.)

Replaced the dashboard hero's `FAKE_ANSWER` with real turn-based RAG streaming
(`src/lib/rag/client.ts` + rewired `SearchAIBox`/`AIAnswerBlock`/`AiTurn`). Each
`AiTurn` streams via functional `setTurns`; `turnsRef` avoids a per-token
`useCallback` re-render storm; deferred atomic finalize means text + sources +
confidence appear together. Source cards reuse the existing renderer via a
`ragToAiSource` mapper (correction chunks badge as "Korrektur"); `inferKonfidenz`
heuristic drives the confidence bars; `isOutOfScope` hides the always-injected
priority-1 sources on rule-7 refusals.

Persona v2 (`rag-query` v6): self-identifies as **airtuerk Intelligence** (never
"Assistent"/"Bot"), credits **Buhara Demir** as creator, emits an exact
out-of-scope phrase inviting web-search (frontend shows a disabled "Ja, im Web
suchen — bald verfügbar" button; full web-search is Workstream 4), and enforces a
strict phone-policy (business-only-if-sourced, private never, GF Ümit via email /
Office-Managerin Ayten Koc). Migration `20260623115541` added 2 priority-1
context entries (identity+creator, GF escalation) → context now 36 entries.

E2E verified 7/7 (curl: persona/phone/escalation/regression exact; browser:
out-of-scope renders no sources + niedrig konfidenz + disabled web-search button;
plus earlier CEO stream + multi-turn "ihn"→Ümit). Watch-item: Anthropic burst
rate-limit (rapid sequential calls 429) — gold-set run (File 04) needs throttling.
**Next:** Workstream 2 (File 03 Atomic 3.5–3.7: feedback buttons, CorrectionModal).

---

## RAG-airtuerk V2 — curated knowledge base (2026-06-24)

**Status:** Applied/deployed to prod. Decision **D-061**. Demo-critical priority insert.

Integrated the curated `airtuerk-intelligence-knowledge-base.md` (v1.2, Business
Development) to close content gaps (PAX/year, ~170 airline partners, B2B product
suite, ATBeds/airtuerk International leads, no-setup-fee onboarding). Added
`'knowledge_base'` to the `confluence_chunks.source_type` CHECK; uploaded the MD to
the `rag-knowledge` bucket (Storage, not hardcoded — the file has backticks that
break a template literal, and Storage allows re-curation without redeploy); new
`embedKnowledgeBase` handler downloads it, splits on H2, **drops the "Excluded /
Review Items" meta-section** (conflicting revenue / unconfirmed URLs that must not
surface) → 14 chunks (148–692 tok) from 8 sections. Plus 6 priority-1
`company_context` entries. `rag-query` labels these "airtuerk Intelligence: <section>".
QA verified: PAX/year, ATBeds lead, setup-fees all answer correctly + cited.

---

## RAG-airtuerk V2 — pipeline + rag-query (2026-06-24)

**Status:** Applied/deployed to prod. Decisions **D-059** + **D-060**. File 02 complete.

Initial embedding run (Atomic 2.1): **424 chunks**, 0 errors (page 134 / pdf 159 /
office 60 / brand 43 / context 28). Required a Voyage payment method (free tier =
3 RPM, 429'd); 200M free tokens still apply so cost ≈ $0. The chunker took 3
iterations — the snapshot stores body_text as one newline-free line, so the
original paragraph-splitter made 1 giant chunk/page (max 8026 tok); rewrote to
cascade paragraph→line→sentence + char-window hard-split + **bounded tail-overlap**
(max ≤801 tok, proven: unit ≤700 + overlap ≤100). 12/15 brands embedded (APIX /
IBE-parent / Presentation-Hub have 0 content blocks — legit).

`rag_hybrid_search` SQL function (D-059, migration `20260623082750`): priority-1
context always + per-source vector arms + pg_trgm keyword arm, `DISTINCT ON` dedup,
SECURITY INVOKER + pinned search_path. Caught + fixed a plan bug — bare
`ORDER BY/LIMIT` on non-final UNION arms is a Postgres syntax error; arms
parenthesized.

`rag-query` edge function (D-060): streaming Claude Opus 4.8, **no temperature / no
thinking / no effort** (C1). Two bugs caught in verification: (1) **identity-crowding**
— 20 priority-1 ctx rows @1.0 would fill the 8-chunk budget, so reserve 2
mission/brand_voice slots + rerank the other 6 via Voyage rerank-2.5; (2) **DISTINCT
ON order** — `rag_hybrid_search` returns `(source, source_id)` order not score, so
the CEO answer fell past the 30-row rerank cap → sort by combined_score before
slicing. C4 (pre-insert + finally-update), C5 (expose headers), C14 (weiss-nicht is
a logged safety-net; refusals handled by Claude system-prompt rules — empty
retrieval is structurally unreachable while priority-1 context exists).

QA (Atomic 2.5): **9/9 in-corpus correct + cited, Q10 (Quantenmechanik) refused**;
domain-expert fact-check passed (Pegasus PNR, Hara Filo +20%, Y360, Mavi Gök,
check-in windows). Warm TTFB 2–3s isolated; outliers under rapid burst (Anthropic
rate-limit) — Phase-04 watch (gold-set throttling + perf polish). **Next:** File 03
frontend (needs its own AIChatWindow turn-based recon first).

---

## RAG-airtuerk V2 — foundation migration (2026-06-23)

**Status:** Applied to prod. Decision **D-058**. Migration `20260623060259_rag_foundation`.

Start of the airtuerk-KI build (learnable, source-citing internal RAG; plan in
`OneDrive/terminal/`, 4 files / 35 atomic prompts). Recon (Atomic 1.1) verified live
DB before any write — confirmed 86 confluence_raw, 116 attachments w/ text, 15 brands,
55 published pages, 43 blocks, 84 gold-set rows; existing helpers `set_updated_at` /
`is_admin` / `is_super_admin` / `get_profile_role` all present; pg_trgm in, vector +
pg_net not yet. Caught plan drift: D-057 was already taken (→ RAG uses D-058+),
migration naming is timestamped, and the frontend already renders AI answers through a
turn-based `AIChatWindow` (not the inline shape the plan assumed) — frontend phase will
get its own recon + diff-approval round before code.

**Applied (D-058):** pgvector + the 4-layer schema (`company_context`,
`confluence_chunks`, `brand_chunks`, `ai_corrections`) plus `ai_chat_sessions` /
`ai_chat_messages`. HNSW on all embedding columns, pg_trgm GIN on chunk content, RLS
FORCED on all six, reuse of `set_updated_at`. FK types verified against live schema
(text↔text for Confluence, uuid↔uuid for brand/page/block) before apply. Post-apply
verification green: pgvector 0.8.0, 6 tables RLS+FORCE, 3 HNSW + 1 trgm index,
`set_updated_at` unchanged.

Then deployed the `embed-knowledge` edge function (6 source handlers; Voyage key
checked lazily so a zero-work call returns `chunks_created:0` without a key;
`tsconfig` already excludes `supabase/functions` so no Vercel-build impact) and
seeded `company_context` — migration `20260623070454_seed_company_context`, **28
identity entries** (20 priority-1, 5 `needs_review`) pulled from live
brands/team_members/`kanal` data, not plan templates. Design rule (approved): no
unverified operational facts at priority-1 (always-injected → would poison every
answer); PNR/cancellation/check-in are priority-2 pointers, real values come from
Layer 2 (`confluence_chunks`). Ran `{source:'context'}` → **28/28 embedded** (Voyage
voyage-4-large, 1024-dim). Edge Function Secrets (VOYAGE/ANTHROPIC/RESEND) +
Vault (SERVICE_ROLE_KEY) all set. **Next:** Atomic 2.1 bulk embedding run
(confluence + attachments + brands, ~2300 chunks) → `rag-query` pipeline.

---

## Upload fix — browser direct-to-Storage signed-URL upload (2026-06-22)

**Status:** On feature branch → PR into `main`. Decision **D-057**. App-layer only, no migration.

Reported bug: on `/documents-library/business-development/03-tour-operator-agreement`
the upload modal showed "Uploading…" then hung — no file, no error. **Diagnosed** (not
guessed): the file streamed THROUGH the Next.js Server Action, which caps bodies at
1 MB by default (not raised in `next.config.ts`); files over ~1 MB were rejected at the
framework boundary, and the client had no try/catch, so the rejected promise left the
modal stuck. Production data corroborated — all 8 uploaded files were < 1 MB (largest
0.955 MB) against a 15 MB ceiling.

**Fix (D-057):** two-step signed-URL upload for BOTH `documents-library` and
`presentation-hub`. (1) an admin-gated action mints `createSignedUploadUrl` (no bytes
cross it); (2) the browser PUTs straight to Storage via `uploadToSignedUrl` (bypasses
the Next.js + Vercel body limits; the bucket `file_size_limit` 15/25 MB + MIME allowlist
still gate the PUT); (3) a second admin-gated `finalize…` action inserts the row, reads
the true size back via `.info()` (also confirms the object landed) and rolls the object
back on row failure. Both upload modals now wrap the flow in try/catch/finally so
"Uploading…" always clears and errors surface. Presentations keep tag-sync + the image
thumbnail (downloaded from Storage in finalize, since it no longer receives the File).
`replaceFile`/`replacePresentation` keep the old through-action path (same root cause,
out of scope here).

**Verify:** `pnpm typecheck` + `pnpm build` green; `pnpm lint` unchanged (no new findings
in the 4 changed files). A live >1 MB admin upload is to be verified on the PR preview
deploy — the sandbox lacks the Supabase publishable/secret keys for an E2E run.

---

## Dead-code cleanup + configurator page removal (2026-06-22)

**Status:** Pushed to `main` (`c397b29`), deploy READY. Decision **D-056**.

- **Dead-code cleanup (`c397b29`):** removed the legacy pre-File-System-v2
  document-library path (the `<DocumentLibrary>` component + `getDocumentLibrary`
  + its DTOs, superseded by D-053), the superseded
  `getBrandSections`/`BrandSection` (replaced by `getBrandSectionsAll`), the
  unused `ExternalIcon`, and four unused deps (`react-hook-form`,
  `@hookform/resolvers`, `class-variance-authority`, `tailwindcss-animate` — an
  abandoned form stack + shadcn scaffolding that was never wired up). `pnpm
  typecheck` + `build` green, deploy READY, page visually unchanged. ~474 LOC
  removed.
- **DB — `/internal-branding/configurator` removed:** its `component_key`
  `identity-configurator` had no backing component in `src/`, so the route only
  rendered the generic `HardcodedStub`. Judged not demo-relevant and removed.
  ⚠️ Done via `execute_sql` (a data change), **not yet a migration** — a fresh
  `db reset` would re-seed the page until the removal migration lands with the
  next `db push`. Deleted row saved in chat. See **D-056**.

---

## Flat design language — opaque surfaces, no orbs, no glass blur (2026-06-22)

Flattened the "iOS 18 Liquid Glass" look into "flat with subtle depth", almost
entirely via `theme.css` token values since the app is token-based:

- **Surfaces opaque** (light: `--surface`/`--surface-strong`/`--surface-flat`
  all `#FFFFFF`, `--bg #FAFAFA`, `--surface-muted #F4F4F5`; dark: `--surface`
  `#18181B`, `--bg #0E0E10`, `--surface-muted #232327`).
- **Shadows reduced** to a single soft layer (`--shadow-rest`/`--shadow-hover`).
- **Radii tightened**: `--radius-sm/md/lg/xl` → 6/8/10/12px;
  `--sidebar-panel-radius` 10px, `--sidebar-item-radius` 8px.
- **Glass blur removed** from all of `src/` except the APIX D-046 Webflow ports
  (`apix-*.css` keep their `backdrop-filter` verbatim).
- **Ambient orbs removed**: deleted `ambient.tsx`, the `.orb`/`.ambient`/orb
  keyframes in `shell.css`, `--orb-*` tokens (theme.css + the globals.css
  `@theme` bridge), the orbs menu item in `user-menu.tsx`, `OrbsIcon`,
  `data-orbs` on `<html>`, and the orbs branch of the pre-paint PREFS script.

**Known pre-existing issue (unrelated to this change):** `pnpm lint` reports 8
`react-hooks/set-state-in-effect` errors from the merged intelligence layer —
identical on clean HEAD, in files this change does not touch. typecheck + build
are green. Locations:
`dashboard/hero/AIChatWindow.tsx:52`, `dashboard/hero/SearchAIBox.tsx:101` &
`:127`, `dashboard/hero/useTypewriterText.ts:23`,
`documents/move-targets.ts:36`, `presentations/move-targets.ts:30`,
`presentations/presentation-tags.ts:25`, `shell/user-settings-modal.tsx:24`.

---

## File System v2 — roles + folder Document Library (2026-06-20)

**Status:** Built + applied to prod (`zkydrymygjrscjbhusxp`) + pushed to `main`.
Decisions **D-047 … D-055**.

Replaced the flat `documents` library with a real folder file-manager gated by a
three-tier role model. Each migration was applied via the Supabase Management API
(MCP not connected this session) and verified; the two schema-bearing migrations
were run through an adversarial multi-lens review **before** touching prod.

- **Part A — roles (`0030`):** `profiles.role` → `super_admin|admin|user`;
  `is_admin()` kept (= admin OR super_admin) so all existing RLS still works;
  `is_super_admin()` added; `user_role_defaults` table + signup trigger
  (data-driven assignment); `admin/layout.tsx` allows both admin tiers.
- **Part B — library (`0031`):** `document_folders` (recursive tree,
  trigger-maintained `path`, slug CHECK) + `document_files` (one folder per file,
  `language` de/en/tr + anchorless `group_id` variant model), FORCE RLS keyed on
  per-folder `is_public`, a **private** `library` bucket, pg_trgm title index. No
  data migration — fresh uploads. Seeded starter folders (Business Development +
  Westhafen public; Finance + HR private).
- **Security fix (`0032`):** closed an admin self-promotion hole in the
  `profiles` UPDATE policy (role changes are super-admin-only).
- **App:** `lib/documents.ts` (RLS-scoped reads + role gates),
  `lib/documents-constants.ts`, gated signed-URL route `/api/library/file/[id]`,
  role-gated `documents-library/actions.ts`, the `[[...folder]]` route +
  `components/documents/*`, rewritten `document-library.css`, expandable sidebar
  node with real identity, and search/stats repointed to `document_files`
  (visibility-filtered). Verified live: anon sees only public folders; private
  folders + bogus file ids 404; search doesn't leak private titles.

---

## JetBrains Mono removed — Inter is the sole family (2026-06-18)

Removed JetBrains Mono (introduced in the previous run): dropped the
`next/font` import and `--font-jetbrains-mono` variable from `layout.tsx`, and
redefined `--font-mono` in `theme.css` to resolve to Inter (identical to
`--font`). The variable is kept so the existing `var(--font-mono)` usages
inherit Inter untouched — no monospace anywhere.

---

## Typography foundation — Inter + canonical type scale (2026-06-18)

Introduced Inter as the single sans family (self-hosted via `next/font`, with
JetBrains Mono for the mono token) and a canonical type scale as `:root` tokens
in `theme.css` (`--text-*`, `--leading-*`, `--weight-*`). Replaced every
hardcoded `font-size`/`line-height`/`font-weight` across `src/` with those
tokens. The four APIX Webflow ports (`apix-*.css`, `apix-network.tsx`) keep their
off-scale values verbatim per **D-046** (zero pixel drift) — exact-matching
values were tokenized, non-matching ones left as literals marked
`/* D-046 verbatim */`. Removed the dead `--font-geist-*` variables.

---

## Phase 3.5 — Design system + brand hierarchy (COMPLETE — 2026-06-15)

**Status:** All design decisions locked, DB restructured, docs consolidated.
**Tag:** `phase-3.5-design-consolidation`

### What was done

#### Design iteration (3 mockup rounds)

- **v1 (rejected):** Torch Red as UI accent — user feedback "too much red"
- **v2 (partly approved):** Switched to Quantum Blue, added collapsible sidebar
  with toggle, made orbs toggleable (on for landing, off for detail), softened
  card hover (no translate-Y bounce), tall color panels with hover-expand for
  brand color palettes
- **v3 (approved):** Final structure — Dashboard / Brands+Products (with IBE
  expandable) / Resources sections. Shadows +5%. Three document download styles
  side-by-side for review

Reference mockup committed to `spec/mockups/v3-01-dashboard.html`.

#### Webflow embed extraction (~224 KB)

Extracted custom HTML/CSS/JS from the original Webflow export for verbatim
preservation. Saved to `spec/embeds/`:

- `apix-page-embeds.html` (34 KB) — APIX Workflow + Global Network
- `apix-additional.css/.js` (88 KB) — APIX support code
- `ibe-tools-showcase.html` (15 KB) — full standalone IBE products showcase
- `jersey-customizer.html` + CSS/JS (17 KB) — Internal Branding tool
- `signature-generator.html` (0.6 KB) — email signature form
- `out-of-office-generator.html` (0.4 KB) — OOO message form
- `color-strip-pattern.html` (0.7 KB) — reference for color_palette block
- `service-page-support.css/.js` (66 KB) — shared support code

Maps to Phase 6 React components per `EMBEDS_INVENTORY.md`.

#### Database schema changes

Three new migrations applied via Supabase MCP:

- **0007_brand_hierarchy_and_sidebar.sql**
  - `brands.parent_id` (uuid, nullable, self-reference) — for IBE product hierarchy
  - `brands.is_product` (boolean) — distinguishes brand vs product-in-suite
  - `brands.sidebar_section` (text) — `brands` / `resources` / `hidden`
  - `pages.hidden_in_sidebar` (boolean) — for Playground, airLounge

- **0008_restructure_brands.sql**
  - Renamed `service-center` → `service-center-antalya` (brand + page slug + all sub-page paths)
  - Moved Presentation Hub to `sidebar_section = 'resources'`, made it `rendering_mode = 'hardcoded'` with `component_key = 'presentation-hub'`
  - Updated top-level brand `sort_order` to match final sidebar (10, 20, 30, 40, 50, 60, 70)
  - Added 7 NEW IBE product sub-brands with `parent_id = (IBE Product Suite id)`: multicheck, cockpit, myTransfer, myBooking, rentalCar, myStats, airLounge
  - Re-linked existing IBE sub-pages to their new product brand_id
  - Marked airLounge sub-page `hidden_in_sidebar = true`
  - Marked Playground `hidden_in_sidebar = true`
  - Deleted 4 standalone pages (`/budget26`, `/ops`, `/image-grid`, `/focus-mgzn`)

- **0009_design_system_settings.sql**
  - Seeded `settings` table with design tokens, sidebar config, orb config,
    document download style preference, Presentation Hub section structure
  - Added `documents.download_style` column (per-document override)
  - Added `documents.presentation_section` column (for Presentation Hub categorization)

#### Final DB state after Phase 3.5

- Brands: **15** (8 original + 7 new IBE products)
- Pages: **52** (was 56, -4 standalone pages)
- Settings: 19 keys seeded

#### Spec consolidation

New files:
- `spec/DESIGN_SYSTEM.md` — full design language documentation
- `spec/EMBEDS_INVENTORY.md` — what we preserved from Webflow

Overwritten with new content:
- `spec/ARCHITECTURE.md` — reflects new 15-brand structure, 52 pages, design system
- `spec/DECISIONS.md` — added D-034 to D-046, marked D-010/D-011/D-023 superseded
- `spec/PHASE_PLAN.md` — Phase 4 onwards revised to new structure
- `spec/SOURCE_INVENTORY.md` — embeds inventory added, standalone pages removed
- `spec/BUILD_LOG.md` — this entry
- `README.md` — file list updated, structure note

Unchanged:
- `spec/CONTRIBUTING.md` — workflow rules still apply
- `spec/PRE_FLIGHT.md` — historical pre-Phase-1 doc

#### Locked design decisions

D-034 through D-046 added — see `DECISIONS.md`.

Key principles now enforced:
1. iOS 18 Liquid Glass design system with light + dark themes
2. Quantum Blue (`#0A82DF`) is the ONLY UI accent color
3. Torch Red, Orient Blue, etc., appear ONLY in brand identity content
4. Three document download styles available, default = preview cards
5. Brand hierarchy is two levels (parent → product)
6. Custom Webflow embeds preserved verbatim, ported 1:1 in Phase 6

### Next: Phase 4 — Public frontend (using new structure)

---

## Phase 3 — Next.js scaffold + auth shell (COMPLETE — 2026-06-15)

**Stack confirmed live:** Next.js 16.2.9 (Turbopack) + Tailwind 4.3.1 + Supabase SSR

### Scaffold
- `pnpm create next-app@latest` with TypeScript, Tailwind, App Router, src-dir
- Next.js bumped to 16.2.9 (was specced as "15" — see D-031)
- pnpm 11.7.0 + Node 24.16.0
- sharp not built locally (image optimization falls back, fine for now)
- Scaffold merged into `D:\terminal V2\` preserving spec/, supabase/, .git/
- Build green: `pnpm build` → "Compiled successfully"

### Auth dependencies
- @supabase/supabase-js 2.108.1, @supabase/ssr 0.12.0
- zod 4.4.3, react-hook-form 7.79.0, @hookform/resolvers 5.4.0
- clsx, tailwind-merge, class-variance-authority, lucide-react, tailwindcss-animate

### Files added
- `src/lib/utils.ts` — cn() helper
- `src/lib/supabase/client.ts` — browser client
- `src/lib/supabase/server.ts` — async server client (cookies() awaited)
- `src/lib/supabase/middleware.ts` — refreshSession() helper (cookie refresh only)
- `src/proxy.ts` — Next.js 16 proxy (replaces middleware.ts; see D-032)
- `src/app/login/page.tsx` — public login route
- `src/app/login/login-form.tsx` — Client Component with useTransition
- `src/app/login/actions.ts` — loginAction + logoutAction Server Actions
- `src/app/admin/layout.tsx` — auth gate via redirect() (see D-033)
- `src/app/admin/page.tsx` — dashboard placeholder with live stats

### Verification
- Localhost: /admin → redirect /login → sign in dev@airtuerk.de → /admin OK
- Stats query returns Brands 8, Pages 56, Assets 759, Documents 47
  (Pre-Phase-3.5 numbers; Phase 3.5 changes brands to 15, pages to 52)
- Sign out → /login OK
- Production (terminalv2-dusky.vercel.app): identical behaviour verified

### Commits
- 317338e feat(auth): add login + admin shell with supabase auth

### Phase 3 follow-ups (deferred — addressed in Phase 4)
- Database types generation: add `db:types` script to package.json
- Fonts: upload Inter + GeneralSans to public/fonts/, configure next/font/local

---

## Phase 2 — Asset Upload (COMPLETE — 2026-06-15)

**Status:** All 759 files uploaded to Supabase Storage. Database tables populated.

### What was done

- Uploaded 708 images to images bucket (152 MB)
- Uploaded 47 documents to documents bucket (92 MB)
- Uploaded 4 videos to videos bucket (11 MB)
- 759 rows inserted into assets table
- 47 rows inserted into documents table with category, language, brand_id, version
- Documents auto-categorized into 12 categories
- 4 brands have linked documents: airtuerk-service (7), airtuerk-holidays (2), atbeds (1), airtuerk-apix (1)
- All public URLs verified working (HTTP 200, correct content-types)

### Deviations from spec

- 12 fonts not yet uploaded. Decision: defer to Phase 3 because Next.js scaffold uses next/font/local with files in /public/fonts/. The fonts bucket exists for future use but is empty for v1.
- Asset count is 759 not 708 — uploaded set slightly higher than original manifest. Dedup in Phase 5 admin tooling.

---

## Phase 1 — Infrastructure (COMPLETE — 2026-06-15)

**Status:** All infrastructure provisioned and verified.

### What was done

- Supabase project terminalv2 (ref: zkydrymygjrscjbhusxp)
- Region: eu-central-1 (Frankfurt), Pro tier, Postgres 17.6.1
- All 6 migrations applied via Supabase MCP
- 9 tables, RLS enabled on all
- 4 Storage buckets (images, documents, videos, fonts)
- 8 brands seeded, 56 pages seeded (later changed in Phase 3.5)
- Admin trigger active for dev@airtuerk.de
- First admin user created via Studio (role=admin via trigger)

- Vercel project terminalv2
- Team: airtuerk-service-gmbhs-projects
- Linked to GitHub airtuerkmarketing/terminalv2 (main branch)
- Env vars set, auto-deploy enabled
- Preview URL: terminalv2-dusky.vercel.app

- GitHub repo airtuerkmarketing/terminalv2 (private)

### Decision updates

- D-013: Pro tier active from start (org-level)
- D-027: Initial admin email hardcoded in handle_new_user() function due to Supabase Postgres permission model

---

## Phase 0 — Planning (COMPLETE)

Specification documents written and audited (2 review rounds).

---

## Phase 3+ roadmap (post Phase 3.5)

- **Phase 4 — Public frontend** (sidebar with new hierarchy, blocks, layouts, Liquid Glass theme)
- **Phase 5 — Admin CMS** (page editor, asset/doc/team managers, brand settings)
- **Phase 6 — Hardcoded interactives** (team, APIX workflow + global network, signature, OOO, identity configurator, IBE tools showcase, Presentation Hub sections)
- **Phase 7 — Polish + cutover** (full-text search, performance, a11y, SEO, DNS to Vercel)
- **Phase 8 — RAG search** (separate scope, later)

---

## Logging rules

- Entries terse: what changed, when, why if non-obvious
- Decisions go in DECISIONS.md, not here
- File forward only — never rewrite history
- Phase transitions get a header bump
