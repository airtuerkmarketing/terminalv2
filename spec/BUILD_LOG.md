\# terminalv2 — Build Log



Running record of what's been built, when. Newest entries on top.



\---



\## Phase 1 — Infrastructure (COMPLETE — 2026-06-15)



\*\*Status:\*\* All infrastructure provisioned and verified. Ready for Phase 2.



\### What was done



\- \*\*Supabase project\*\* `terminalv2` (ref: `zkydrymygjrscjbhusxp`)

&#x20; - Region: eu-central-1 (Frankfurt)

&#x20; - Plan: Pro (org-level)

&#x20; - Postgres 17.6.1

&#x20; - All 6 migrations applied via Supabase MCP

&#x20; - 9 tables created, RLS enabled on all

&#x20; - 4 Storage buckets created (images, documents, videos, fonts)

&#x20; - 8 brands seeded

&#x20; - 56 pages seeded (sanity check passed)

&#x20; - Admin trigger active (hardcoded for dev@airtuerk.de)

&#x20; - First admin user created: dev@airtuerk.de (role=admin via trigger)



\- \*\*Vercel project\*\* `terminalv2`

&#x20; - Team: airtuerk-service-gmbhs-projects

&#x20; - Linked to GitHub: airtuerkmarketing/terminalv2 (main branch)

&#x20; - Env vars set: NEXT\_PUBLIC\_SUPABASE\_URL, NEXT\_PUBLIC\_SUPABASE\_PUBLISHABLE\_KEY, SUPABASE\_SECRET\_KEY, INITIAL\_ADMIN\_EMAIL

&#x20; - Auto-deploy enabled on main

&#x20; - First deploy failed as expected (no Next.js code yet — Phase 3)



\- \*\*GitHub repo\*\* `airtuerkmarketing/terminalv2`

&#x20; - Private

&#x20; - First commit: spec + migrations baseline (8c13a93)



\### Decision updates



\- D-013 updated: Pro tier active from start (org-level, not free as originally planned)

\- D-027 updated: Initial admin email is dev@airtuerk.de (not buhara@). Hardcoded in handle\_new\_user() function because ALTER DATABASE SET requires superuser on Supabase managed Postgres.



\### Deviations from spec



\- The 0006 migration's app.initial\_admin\_email approach didn't work due to Supabase Postgres permission model. Replaced with hardcoded email in the trigger function. If admin email changes later, write a new migration with CREATE OR REPLACE FUNCTION.



\---



\## Phase 0 — Planning (COMPLETE)



Specification documents written and audited (2 review rounds).



\*\*Deliverables:\*\*

\- README.md

\- spec/ARCHITECTURE.md

\- spec/DECISIONS.md (D-001 through D-030)

\- spec/SOURCE\_INVENTORY.md

\- spec/PHASE\_PLAN.md

\- spec/PRE\_FLIGHT.md

\- spec/CONTRIBUTING.md

\- spec/BUILD\_LOG.md

\- .env.example

\- supabase/migrations/0001\_initial\_schema.sql

\- supabase/migrations/0002\_rls\_policies.sql

\- supabase/migrations/0003\_storage\_buckets.sql

\- supabase/migrations/0004\_seed\_brands.sql

\- supabase/migrations/0005\_seed\_pages.sql

\- supabase/migrations/0006\_profiles\_trigger.sql



\---



\## Phase 2+ roadmap



\- \*\*Phase 2\*\* — Asset upload (manifests + bulk upload)

\- \*\*Phase 3\*\* — Next.js scaffold (auth, layouts, login)

\- \*\*Phase 4\*\* — Public frontend (sidebar, blocks, layouts)

\- \*\*Phase 5\*\* — Admin CMS (page editor, asset/doc/team managers)

\- \*\*Phase 6\*\* — Hardcoded interactives (team, workflow, signature, configurator)

\- \*\*Phase 7\*\* — Polish + cutover (DNS to Vercel, NEXT\_PUBLIC\_SITE\_URL)

\- \*\*Phase 8\*\* — RAG search (separate scope, later)



\---



\## Logging rules



\- Entries are terse: what changed, when, why if non-obvious

\- Decisions go in DECISIONS.md, not here

\- File forward only — never rewrite history

\- Phase transitions get a header bump

