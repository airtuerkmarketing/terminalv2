# terminalv2 — Operational Runbook (D-101)

Demo-day + day-to-day incident playbook. **Demo: 2026-08-01**, stakeholders Ümit
Tenekeci (CEO) + Ahmet Özbek (CFO). Written 2026-06-28. Keep concrete — this is the
"something broke, what do I do" doc, not architecture (that's `ARCHITECTURE.md`).

> Ground truth always wins: if a command/version here disagrees with the live system,
> trust live and fix this doc. Counts/versions below were verified 2026-06-28.

---

## 0. Quick facts

| | |
|---|---|
| Prod URL | https://www.airtuerk.dev (login: `/login`) |
| Hosting | Vercel project `terminalv2` (`prj_hUiCkTyZSxVbxoHAvRpUjlnFQAKr`), team `airtuerk-service-gmbhs-projects`, functions in **fra1** |
| Database | Supabase `terminalv2` (`zkydrymygjrscjbhusxp`, eu-central-1, Postgres 17) |
| Edge fns | 8 ACTIVE — `rag-query` **v18** (D-104 F3 breadth + D-106 Sonnet/web-search + D-107 `max_uses` 3 / `web_search_tool_result` citations / observability — writes `mode`/`tool_calls`/`ttft_ms` per turn), `embed-knowledge` v12, `notify-correction-event` v2, `notify-folder-access` v1, `tag-classify-chunks` v1, 3× confluence |
| Cron | 4 active — `warmup-rag-query` `*/4`, `refresh-chunk-retrieval-stats` `15 3`, `purge-expired-trashed-{documents,presentations}` `30/45 3` |
| Test account | `dev@airtuerk.de` (super_admin) — creds in `CLAUDE.local.md` |
| Latency budget (p50, post-fra1 D-095) | login ≈ 0.21s · folder-tree TTFB ≈ 0.27s · signed-URL ≈ 0.30s · **RAG warm TTFB ≈ 3–5s** (cold ≈ 8s) |

**Secrets that gate features** (Supabase → Edge Functions → Secrets): `VOYAGE_API_KEY`
+ `ANTHROPIC_API_KEY` (RAG), `RESEND_API_KEY` (emails), `SUPABASE_SERVICE_ROLE_KEY`.

---

## 1. Pre-demo checklist

**T–1 week**
- [ ] `pnpm e2e` green vs prod (5 demo flows). If pnpm flakes, run `node_modules/.bin/playwright test`.
- [ ] RAG smoke: `node --env-file=.env.local scripts/rag-eval.ts --limit 5` — expect non-empty answers, ~3–5s each.
- [ ] Reset the **temp password** on the 6 seeded accounts (Ümit + Oruc/Selin/Tim/Hakan/Murat) via Supabase Dashboard → Auth, and decide each demo login. (Seed used a shared printed temp, no emails sent.)
- [ ] **Decide Emirkan Erkara's role** — currently `user` (D-055 super-admin-only change). Either promote, or keep as the live `user`-role demo account.
- [ ] Swap Invite + Recovery **email templates** (`spec/AUTH_EMAIL_TEMPLATES.md`) — the one outstanding D-071 go-live step (only if invite flow is demoed).
- [ ] Set GitHub repo secrets `TEST_USER_EMAIL`/`TEST_USER_PASSWORD` (+ optional `PROD_URL`) so E2E CI runs.

**T–1 day**
- [ ] `git log origin/main -1` = expected HEAD; Vercel shows that deploy **Ready**.
- [ ] `get_advisors security` → 0 ERROR (16 known WARN ok). `get_advisors performance` → 0 ERROR.
- [ ] Confirm `warmup-rag-query` cron `active=true` and its last `cron.job_run_details` rows = `succeeded`.
- [ ] Walk the 5 demo flows manually on prod while logged in as the demo account.

**T–1 hour**
- [ ] Fire 2–3 real AI questions to confirm warm + good answers (e.g. "Was bietet airtuerk?", a Konti/Storno question). Genuine quality ≈ 84% — operational lookups may say "I don't have that specific detail → ask X"; that's graceful, not a crash.
- [ ] Open the Document Library, open one file (confirms signed-URL serving).
- [ ] Keep the Supabase + Vercel dashboards open in tabs for live triage.

---

## 2. Demo-critical flows & their dependencies

| Flow | Path | Breaks if… |
|---|---|---|
| Home AI box renders | `/` `.ai-search-textarea` | frontend build broken |
| AI answer streams | `rag-query` v18 | Voyage/Anthropic key, cold start, embed timeout |
| Library folder + file list | `/documents-library/...` | DB / RLS |
| File opens (signed URL) | `/api/library/file/*` → 302 | storage bucket private-read, region |
| Login / logout | `/login`, `user-block` → Sign out | auth db pool, Supabase auth |

---

## 3. Incident playbook (symptom → diagnose → fix)

### AI chat is down / errors / "Embedding service unavailable"
1. **Symptom 503** = Voyage embed failed (5s timeout). **500** = internal (check below).
2. Diagnose: Supabase MCP `get_logs service=edge-function` (or Dashboard → Edge Functions → rag-query → Logs). Check `VOYAGE_API_KEY` / `ANTHROPIC_API_KEY` are set + valid (provider status, quota).
3. **Slow first answer (~8s)** = cold start. The `warmup-rag-query` `*/4` cron prevents this; if it's disabled, re-enable it, or just fire one throwaway question to warm the isolate before demoing.
4. Last resort: AI is **not** load-bearing for the library/presentation demo — pivot to those flows and note "AI is warming up."

### File won't open / signed-URL 500 or no redirect
1. Expected: `/api/library/file/<id>` returns **302/307** to a signed `storage` URL. A 500 = the 2 sequential Supabase calls (read row → mint signed URL) failed.
2. Diagnose: `get_logs service=api` + `service=storage`. Confirm the `library`/`presentations` buckets exist and are private (read via signed URL only).
3. Confirm functions are in **fra1** (`vercel.json regions:["fra1"]`) — a region regression re-introduces transatlantic latency, not 500s, but check if "slow" is the real complaint.

### Login fails / "permission denied"
1. Diagnose: `get_logs service=auth`. Check Supabase Auth is up + the db connection pool (set to percentage 60 via Management API; if exhausted, raise temporarily).
2. A **seeded account** can't log in → it still has the shared temp password (no email sent). Reset via Dashboard → Auth → user → "Send recovery" or set password.
3. `permission denied for function …` on a public page = a SECDEF anon-revoke regression (D-089 keeps `is_admin`/`can_*_document_folder` anon-executable for the public library — don't revoke those).

### A page 500s / blank
1. Vercel → Deployments → the live one → Runtime Logs (or `get_runtime_logs`). Identify the route.
2. If it started with the latest deploy → **roll back** (§4).

---

## 4. Rollback procedures

### Vercel app (fastest, demo-safe)
- Vercel Dashboard → Project → Deployments → pick the last known-good **Ready** deployment → **⋯ → Promote to Production** (instant alias swap, no rebuild).
- Or revert the offending commit on `main` and push (triggers a fresh deploy — slower).

### Edge function (e.g. a bad `rag-query` deploy)
- Redeploy the previous version from its source: `npx supabase functions deploy rag-query --project-ref zkydrymygjrscjbhusxp` from a checkout at the prior commit, OR via the Supabase MCP `deploy_edge_function`.
- Edge fns are independent of the Vercel deploy — a frontend rollback does **not** roll them back.

### Database / migration
- Schema changes ship as migrations (file + `schema_migrations` registry at a controlled timestamp). To reverse: write a new forward migration that undoes it (don't delete history). Recovery method when MCP is down: Management API + `SUPABASE_ACCESS_TOKEN` (see `CLAUDE.md` + memory `supabase-migration-apply-method`).
- Data fix (e.g. revert a `company_context` change): targeted `UPDATE` via `execute_sql` (prod write — sign-off). D-100's F1 revert is the worked example.

### RAG corpus / embeddings
- Embeddings are regenerable: `embed-knowledge {source:'context'|'confluence'|'all', force:true}` (call with a valid JWT). Re-embedding is idempotent.

---

## 5. Verify-after-fix
- App: re-walk the affected demo flow on prod.
- RAG: `node --env-file=.env.local scripts/rag-eval.ts --limit 5`.
- DB: `get_advisors` (0 ERROR), ledger parity (`md5(string_agg(version,',' ORDER BY version))` over `schema_migrations` == repo `ls supabase/migrations | sed 's/_.*//' | sort | md5sum`).

---

## 6. Escalation / who knows what
- **Buhara Demir** — CMO + solo dev, owns the whole stack.
- **Ahmet Özbek** — CFO + M365 admin (email/DNS/Microsoft side).
- Providers: Vercel (hosting), Supabase (DB/auth/storage/edge/cron), Voyage (embeddings/rerank), Anthropic (LLM), Resend (email). Check their status pages first when a whole capability is down.

---

## 7. Known-good baseline (2026-06-28, for "is this normal?")
- Ledger: 82 migrations, hash `6355f130c92519af0bc106d9938939ae`, highest `20260628120000`.
- Advisors: security 0 ERROR / 16 WARN (all by-design), performance 0 ERROR.
- Profiles: 10 (4 super_admin / 5 admin / 1 user), 10 auth users.
- RAG: corpus ~406 chunks; genuine answer quality **86.9%** after F3 (harness `scripts/rag-eval.ts`, D-104).
- Highest decision: D-110.
