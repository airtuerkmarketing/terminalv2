# Health Check — 2026-06-28 (D-102, W3 close)

Final-health pass closing the W3 batch (D-099–D-101). Re-snapshots live state, re-verifies
ledger parity, and reconciles the derived docs. Supersedes the day-counts in
`HEALTH_CHECK_2026-06-27.md` (that one's recommended-order is now all shipped — see §16 of
`ARCHITECTURE.md`). **Verdict: 🟢 GO for the 2026-08-01 demo, zero blockers.**

## Live snapshot (Supabase MCP, 2026-06-28)

| metric | value | vs prior doc |
|---|---|---|
| tables / views | 34 / 1 | ✓ |
| functions (public) | **163** | §16 said 167 / HEALTH-06-27 said 167 → corrected to 163 |
| RLS policies | **88** | §16 said 88 ✓ (HEALTH-06-27 said 89) |
| indexes | **165** | §16 said 165 ✓ (HEALTH-06-27 said 139 — that predated D-083's 26 FK indexes) |
| migrations | 82 | ✓ |
| ledger hash | `6355f130c92519af0bc106d9938939ae` | **repo↔registry EXACT** |
| storage buckets | 9 | ✓ |
| cron jobs (active) | 4 | ✓ (incl. `warmup-rag-query */4`, all `succeeded`) |
| auth users / profiles | 10 / 10 | **was 4/4** — V1 blocker resolved (W3 seed) |
| profiles by role | 4 super_admin / 5 admin / 1 user | all roles present |

## Ledger parity (the D-081 discipline)
- Registry: `md5(string_agg(version,',' ORDER BY version))` over `schema_migrations` = `6355f130c92519af0bc106d9938939ae` (82 rows).
- Repo: `ls supabase/migrations | sed 's/_.*//' | sort | md5` = **identical**, 82 files.
- W3 added **zero migrations** (all changes were data/docs), so the ledger is unchanged from the W2 close. ✓

## Advisors
- Security: **0 ERROR**, 16 WARN — all by-design (3 extension-in-public; 3 anon-SECDEF kept for the public Document Library, D-089; 10 authenticated-SECDEF from RLS evaluation). No action.
- Performance: **0 ERROR**, 16 WARN (multiple-permissive-policies, admin-override pattern), 60 INFO (unused indexes — do NOT drop pre-launch, no traffic baseline).

## Derived-doc reconcile (this pass)
- `ARCHITECTURE.md` §16 extended to cover D-091–D-102 + counts refreshed to live (functions 167→163); §1 ASCII "22 tables"→34; §4 "55 pages"→51; highest decision → D-102.
- `BUILD_LOG.md` Current State: highest decision D-102, profiles 4→10, RAG genuine-quality note.
- `DECISIONS.md`: D-099–D-102 appended.

## Demo-readiness state
- 🟢 Ledger parity, advisors, cron, region (fra1), latency budget (D-095), E2E (5 flows), profiles/roles, runbook.
- 🟡 Owner action items (tracked in `RUNBOOK.md` §1): reset the 6 seeded temp passwords; decide Emirkan's role (`user`→super_admin?); email-template swap (D-071); E2E CI repo secrets.
- 🟡 RAG genuine quality **82.1% measured** (D-103 denylist-aware harness) — graceful failure mode (says "ask X" not hallucinate). 14 real gaps (~9 retrieval / ~4 content / 1 phrasing). Improvement levers (F3 retrieval granularity → validated content corrections) are post-decision, not demo-blocking.

## Recommended order (post-demo / when ready)
1. ✅ Denylist-aware harness (D-103, genuine 82.1%). Remaining: add company/identity questions to the gold set.
2. **F3 retrieval granularity** for the ~9 genuine operational-lookup misses (next up).
3. Validated content corrections (Pegasus PNR / Y360 / Mavi Gök) — needs fact sign-off.
4. The kept-anon SECDEF helpers — revisit only if the Document Library loses its public face.
