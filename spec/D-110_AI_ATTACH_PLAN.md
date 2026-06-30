# AI-Attach (PDF/DOCX) — Phase-B Implementation Plan (REVIEW DRAFT)

> **Status:** Plan for review — **no code written yet** (Buhara's plan-first pattern).
> **Numbering:** **D-110** (owner-locked 2026-06-30). The brief's "D-108" was contested — "D-108"
> is an informal code-comment label (typography) and "D-109c" is in BUILD_LOG; **D-110** is the next
> clean formal DECISIONS number.
> **Scope:** enable the disabled `.ai-search-attach` / `.ai-chat-attach` plus-button so a user can
> attach **one** PDF or DOCX, send it with the prompt to Claude (translate / summarize / ask),
> ephemerally (no storage). PDF + DOCX only; one file; no persistence; no embedding.
>
> Method: a read-only recon → per-layer plan → 3-lens adversarial-verify workflow ground-truthed
> every brief claim against `main`. Findings below are cited to `file:line` from that pass.

---

## 0. Decisions (RESOLVED — owner-locked 2026-06-30)

The brief's 6 Buhara-confirmed decisions stand. Recon surfaced **5 new forks** the brief didn't
cover or got wrong against reality. **All resolved to the recommended option** (Q1–Q4 via owner;
Q5 proceeds as an implementation detail).

| # | Question | Decision (LOCKED) | Why it's a fork (evidence) |
|---|----------|-------------------|----------------------------|
| **Q1** | **Decision number** — D-108, D-110, or defer? | **D-110** | `spec/DECISIONS.md` tops at **D-107** (no D-108/D-109 entries). But `D-108` is already used as an **informal code label** for a chat-typography pass (`theme.css:33/45/95/141`, `dashboard-hero.css:756/771/849`, `AIAnswerBlock.tsx:202`) and **`D-109c`** is the in-progress web-search work in `BUILD_LOG.md:25`. So as *formal DECISIONS entries* D-108 and D-110 are free, D-109 is taken. D-110 avoids every collision. (This corrects my earlier "next free = D-108" — that missed the informal label + D-109c.) |
| **Q2** | **Filename logging** — where? Brief Decision #4 says `ai_chat_messages.metadata`. | **Synthetic `attached_file` entry in `retrieved_chunks` (filename only, no migration)** | `ai_chat_messages` has **no `metadata` column** (`20260623060259_rag_foundation.sql:138-152`; `20260629140000` added only `mode/tool_calls/ttft_ms`). Adding one = a migration in commit 1, breaking the migration-free atomicity. The synthetic-chunk path reuses the existing `web_search`/`team_directory` synthetic-chunk pattern and is **verified not to crash the client**: `ragToAiSource` (`client.ts:272`) passes `s.source` through with no switch/throw, and `chunksToSources` wraps it in try/catch. |
| **Q3** | **Multi-turn** — re-attach each turn, or persist the file across the thread? | **Re-attach per turn (V1)** | The file is cleared on send; a follow-up with no re-attached file silently runs **full RAG** (`index.ts:248+`), not document Q&A — the model has zero memory of the PDF (only assistant *text* is in `conversation_history`, `SearchAIBox.tsx:311-316`). V1 = re-attach per document turn; the chip's absence communicates "no file attached." |
| **Q4** | **Fork-6 model-gating** — is it real for V1? | **Keep the cheap `disabled={model !== 'claude'}` expression; drop the tooltip/"edit-localStorage-to-test" theater** | `model` is **structurally always `'claude'`** today: `SearchAIBox.tsx:108` inits to `DEFAULT_MODEL_ID='claude'`, the only other write is the `localStorage` hydration (`:167-168`), there is **no `localStorage.setItem(LS_MODEL,…)` anywhere**, and `ModelSelector.tsx` is **never rendered**. The gate is inert until a model-picker actually ships. Wiring `ModelSelector` + persistence is scope creep (out of brief). |
| **Q5** | **Attach × web-search interaction** | **Clear the attached file when web-search fires** | `handleWebSearch` (`SearchAIBox.tsx:423-431`) re-invokes `submitAi(turn.question,{webSearch:true})` with **no** `attachedFile` key; the plan's fallback-to-state resolution would then ship ~13 MB of base64 into a web-search request that **ignores `attached_file`** (gated on `mode==='default'`). Implementation detail, but must be handled or it wastes a 13 MB upload. |

**Locked:** Q1 = **D-110** · Q2 = **synthetic `attached_file` chunk, no migration** · Q3 = **re-attach
per turn (V1)** · Q4 = **cheap `model!=='claude'` gate, no tooltip/test theater** · Q5 = **clear the
file on web-search**. The layers below implement these.

---

## 1. Brief claims — ground-truth verdict

| Brief claim | Verdict | Note |
|-------------|---------|------|
| `.ai-search-attach` disabled w/ `title="Attachments coming in stage 2"` | ✅ confirmed | `SearchAIBox.tsx:608-616` |
| `.ai-chat-attach` disabled, "identical" | ✅ confirmed | `AIChatWindow.tsx:341-349`; CSS is a literal copy (`dashboard-hero.css` 208-231 vs 1198-1221) |
| RAG_BYPASS_MODES = pattern for file-bypass | ✅ confirmed | `index.ts:205-222`; new branch slots after it, before web-search (`:228`) |
| PDF doc block `{type:document,source:{base64,application/pdf}}` before text | ✅ confirmed | claude-api skill: GA, base64 must have **no newlines** |
| Limits 32 MB / 600 pages (100 on 200k models) | ✅ confirmed; **600 applies** | `claude-sonnet-4-6` is a **1M-context** model → 600-page cap, not 100 |
| **PDF needs `anthropic-beta: pdfs-2024-09-25`** | ❌ **WRONG** | PDF base64 is **GA on `anthropic-version: 2023-06-01`, NO beta header** (claude-api skill). `index.ts:33` already sends `2023-06-01`; **drop the guessed header entirely** — don't make it conditional. |
| DOCX not native → client-side Mammoth | ✅ confirmed | `mammoth` absent from `package.json` |
| Filename in `ai_chat_messages.metadata` | ❌ **column doesn't exist** | see Q2 |
| `streamClaudeResponse` accepts content blocks? | ⚠️ **string-only today** | `index.ts:700` types `content: string`; **must widen to `unknown`** (matches `convo` at `:737`) — minimal, safe (string ⊆ unknown, all callers still compile) |
| `allowTools:false` breaks streaming/citations? | ✅ **no** | already used by RAG_BYPASS (`:220`) + web-search (`:243`); attach branch sets `retrievedChunks:[]` so there are no RAG citations to lose |
| `RagQueryOptions` needs extending | ✅ confirmed | `client.ts:46-55` |
| `EXT_TO_MIME`/`MAX_BYTES`/`normalizeLanguage` reusable | ✅ confirmed | `documents-constants.ts` — note `MAX_BYTES` there is **15 MB** (library bucket); attach needs its own 10 MB const |

**Unverified, must resolve before coding:** Supabase Edge Function **inbound body-size limit** for a
~13.3 MB base64 JSON body (`await req.json()` at `index.ts:173`). If the platform rejects the body
*before* the handler runs, a server-side 413 never fires. → **pre-implementation spike** (see §5).

---

## 2. Layer 1 — Backend (commit 1): `rag-query` branch + types

**Edits**

1. **`src/lib/rag/client.ts`**
   - `RagQueryOptions` (`:46-55`): add `attachedFile?: { kind:'pdf'|'docx-text'; filename:string; contentBase64?:string; contentText?:string; sizeBytes:number }` (optional → all callers compile). This is the **single source of truth** for the type; Layer 2 re-derives `AttachedFile = NonNullable<RagQueryOptions['attachedFile']>`.
   - Destructure (`:63`): add `attachedFile`.
   - Body (`:81-86`): conditional spread `...(attachedFile ? { attached_file: attachedFile } : {})` — top-level `attached_file` snake_case (matches `session_id`/`conversation_history`), inner keys camelCase. No-file path stays byte-identical.
2. **`supabase/functions/rag-query/index.ts`**
   - `RagQueryRequest` (`:147-152`): add `attached_file?` mirror.
   - Handler destructure (`:174`): add `attached_file`; after the empty-question guard (`:176-178`) add validation — reject bad `kind` / missing matching content field (400) and oversized body (**413**, guard on **base64 length**, not just `sizeBytes`).
   - **New branch** after RAG_BYPASS (ends `:222`), before web-search (`:228`): `if (mode === 'default' && attached_file) { … }` — call `ensureSessionAndLog(…, question, attached_file.filename)` with the **RAW question only**, build messages via `buildAttachmentConversation(...)`, call `streamClaudeResponse({ … retrievedChunks:[], allowTools:false, attachedFilename })`. Use a **focused system prompt** (new small const) — do NOT reuse `buildSystemPrompt` (injects RAG chunks).
   - **`buildAttachmentConversation(history, question, file)`** near `buildConversation` (`:671-677`):
     - PDF → `[...history.slice(-10), { role:'user', content:[ {type:'document',source:{type:'base64',media_type:'application/pdf',data:file.contentBase64}}, {type:'text',text:question} ] }]` (document **before** text).
     - DOCX → prepend extracted text with **language-neutral** scaffolding (XML-ish `<document name="…">…</document>` + bare question), **NOT** German `Dokument:`/`Frage:` — the latter fights D-106 strict language-mirroring (`BUILD_LOG.md:26`).
     - Return type `Array<{role; content: unknown}>`.
   - **`streamClaudeResponse`** (`:688-709`): widen `messages` param `content: string` → `unknown` (`:700`); add optional `attachedFilename?`. `convo` at `:737` already `unknown` → assignment type-checks.
   - **`callClaude` headers** (`:749-755`): **no change** — PDF is GA, no beta header (see §1). *(Drops the brief's `pdfs-2024-09-25` step entirely.)*
   - **Filename logging** (finally-block `retrieved_chunks` update, `:1039-1075`): when `attachedFilename` set, push `{ source:'attached_file', source_id:filename, metadata:{ title:filename, source_type:'attached_file' }, combined_score:1 }` — **filename only**, mirrors the `team_directory` synthetic chunk (`:1059-1074`). No schema change (Q2).
   - **Trap to avoid:** `ensureSessionAndLog` writes `content: question` (`:472-476`) — it must receive the **raw** question, never the DOCX-prepended string, or full file text lands in the DB (violates "no storage").

**Verification (this layer)**
- `pnpm typecheck` + `pnpm build` (the real gates) — widened `messages` compiles with both `buildConversation` (string) and `buildAttachmentConversation` (block-array) callers.
- `deno check supabase/functions/rag-query/index.ts` if available (Next typecheck doesn't cover Deno edge).
- grep gate: `contentBase64`/`contentText` **and** the DOCX-concatenated string never reach any `.insert`/`.update`.
- Deferred to integration (needs Layer 2 + a real PDF + the §5 spike).

**Reversibility:** fully additive — optional fields, branch gated on `mode==='default' && attached_file`, `string→unknown` is a strict superset. No migration. Revert = `git revert` + redeploy prior `index.ts`. Inert in prod until Layer 2 ships a client that sends the field.

---

## 3. Layer 2 — Client (commit 2): enablement + picker + chip + mammoth

**Edits**

1. **`package.json`** — add `mammoth` (runtime dep), `pnpm install` in the same commit. ⚠️ **Check the `minimumReleaseAge` dependency-age policy** (referenced `SearchAIBox.tsx:282`) — pin a version old enough to pass it. Import **dynamically** (`await import('mammoth')`, ~180 KB gzip) so it's off the dashboard initial bundle.
2. **`src/lib/attachment.ts` (NEW)** — shared helper both surfaces consume (avoids the drift CLAUDE.md warns about; ~50 lines of async I/O shouldn't be duplicated):
   - `export type AttachedFile = NonNullable<RagQueryOptions['attachedFile']>` (re-derived — single source of truth).
   - `ATTACH_ACCEPT='.pdf,.docx'`, `ATTACH_MAX_BYTES=10*1024*1024` (distinct from `documents-constants.MAX_BYTES`=15 MB).
   - `readAttachment(file) → {ok,file} | {ok:false,error}`: validate ext (reuse `extFromFilename`) + size; PDF via `FileReader.readAsDataURL` then strip the `data:…;base64,` prefix (**newline-free** — mandate readAsDataURL, forbid any 76-char-wrapping encoder; assert `/^[A-Za-z0-9+/]+=*$/`); DOCX via `mammoth.extractRawText`. **DOCX failure handling:** try/catch on throw (corrupt / renamed-`.doc` OLE2) **and** treat `result.value.trim()===''` as failure ("Could not extract text").
   - `attachmentChipMeta(f)` for identical chip display.
3. **`SearchAIBox.tsx`** — imports (`:15` add `FileText`,`X`; new `@/lib/attachment` import); state after `:116` (`attachedFile`,`attachError`,`fileInputRef`); `onPickFile`/`onFileChosen`(reset `e.target.value=''`)/`removeAttachment`; enable button (`:608-616` drop `disabled`+stage-2 title, add `onClick`); hidden `<input … hidden>`; chip + error above textarea (`:591`); thread into `submitAi` (sig `:291` add `attachedFile?` to opts; resolve `opts?.attachedFile !== undefined ? opts.attachedFile : attachedFile`; add to `ragQueryStream` opts `:335`; clear on send `:299`; dep array `:403`).
   - **Q5:** in `handleWebSearch` (`:423-431`) / the `submitAi` resolution, ensure a web-search re-trigger **clears/ignores** `attachedFile` so it never ships base64 into web-search.
4. **`AIChatWindow.tsx`** — import (`:4` add `FileText`, keep `ArrowUp,ChevronDown,Edit3,History,Plus,X` — additive edit, don't drop names); `onSubmit` (`:27`) widen to `(text, opts?:{attachedFile?:AttachedFile|null})=>void` (still satisfied by `onSubmit={submitAi}` at `SearchAIBox.tsx:656`); own attachment state + handlers; `send()` (`:164-169`) → `if(!t && !attachedFile) return; onSubmit(t,{attachedFile})` (attachment-only send needs a **non-empty** instruction string — server rejects empty `question` at `:176`); enable button + chip mirroring SearchAIBox.
5. **`src/lib/search/types.ts`** — add `attachedFile?: { kind; filename; sizeBytes }` (**filename + metadata ONLY, never content**) to `AiTurn` (`:54-78`). Set it at turn creation; map it back in `messagesToTurns` (`SearchAIBox.tsx:451`) from the synthetic chunk so the chip survives reopen/reload. The structural shape (no content field) **is** the ephemeral guarantee — heavy `contentBase64`/`contentText` live only in transient request state, never in the object handed to `setTurns`/`LS_HISTORY` (`SearchAIBox.tsx:221-232`).

**Shared-vs-duplicate decision:** logic → `lib/attachment.ts` (shared); state ownership stays per-component (SearchAIBox owns `submitAi`/the dashboard textarea; AIChatWindow owns its composer). Import the opts type from one place so a shape drift becomes a compile error, not a silent dropped attachment.

**Verification:** `pnpm install` (lockfile parity) → `pnpm typecheck` (PREREQ: Layer 1 landed) → `pnpm build` (mammoth code-splits). Manual: PDF/DOCX chip renders; Network POST body carries `attached_file` (PDF→`contentBase64`, DOCX→`contentText`, no HTML); >10 MB & wrong-ext friendly errors; remove-X re-picks same filename; AIChatWindow attach not double-sent; **reload test** — `LS_HISTORY` holds filename, **zero** base64/text.

**Reversibility:** delete `lib/attachment.ts`, revert `package.json`+lockfile, revert the two components. No schema, no persisted data (in-memory React state only).

---

## 4. Layer 3 — Polish (commit 3): pills + gating + CSS + docs

**Edits**

1. **Quick-action pills** (EN: **Summarize / Translate EN / Key Points**), rendered `{attachedFile && chatMode==='default' && …}` below the chip in both surfaces.
   - ⚠️ **BLOCKER fix:** each pill **keeps `mode='default'`** and encodes the instruction in the **question text only** (`"Summarize this document."` / `"Translate this document to English."` / `"Extract the key points…"`), then calls `submitAi(prompt,{attachedFile})`. A pill must **never** arm a RAG_BYPASS `chatMode` (summarize/translate) — that branch (`index.ts:205-222`) is attachment-unaware and **silently drops the file** (user clicks "Summarize" → Claude summarizes nothing). "Key Points" has no ChatMode and rides the same default+attach branch.
2. **Fork-6 gating (Q4):** `disabled={model !== 'claude'}` on both buttons (cheap, forward-compat). **AIChatWindow must receive `model` as a prop** — if it doesn't, `model` is `undefined` → `undefined !== 'claude'` is `true` → button **permanently disabled** on the chat surface (real bug). Per Q4 recommendation, drop the "edit `localStorage` to test" step and the disabled-tooltip styling work (inert until a model-picker ships); keep only the gate expression.
3. **CSS** (`dashboard-hero.css`) — add `.ai-search-attached-chip`/`-pills`/`-pill` after `:231` and chat-surface twins after `:1221` (prefer a **grouped selector** to avoid a third copy). Light/dark parity comes **entirely from `theme.css` tokens** (the file has no media queries / `.dark` selectors) — use `var(--surface-muted)`/`--text-1/2/3`/`--hairline`/`--accent-soft`, no hardcoded hex. **A11y:** after `removeAttachment`, move focus back to the attach button (don't strand focus on a vanished node); logical tab order chip → pills → textarea → toolbar.
4. **Docs (same commit, per CLAUDE.md "keep derived docs honest"):**
   - `spec/DECISIONS.md`: new entry at the chosen number (Q1) using the skeleton in §6.
   - `spec/BUILD_LOG.md`: new Current State bullet; bump `:51` "Highest decision: D-107".
   - **Consistency sweep (verified anchors):** `README.md:22-23` + `:91`; `ARCHITECTURE.md` §17 (`:580-591`, both the snapshot header and "Highest decision"/"Highest applied migration"); `ARCHITECTURE.md:547` (**already stale at D-104** — fix or flag); `RUNBOOK` `:126` (**stale at D-104**). No migration ships → leave migration counts untouched.

**Verification:** `pnpm typecheck` + `pnpm build`; manual pill submit (each routes default+attach, file actually sent); pills hidden when a ModeChip is armed; light/dark chip+pills legible; `grep -rn '<chosen D-NNN>'` shows no stray collision and every "Highest decision" line is consistent.

**Reversibility:** additive polish — pills/gating/CSS appended (no existing selector modified). Docs: a DECISIONS entry is a log — supersede/mark rather than delete if rolled back post-merge.

---

## 5. Pre-implementation spike (do BEFORE Layer 1)

One cheap check that gates the whole PDF half:
- **Supabase Edge body limit** — confirm a ~13.3 MB base64 JSON body reaches `await req.json()` and isn't rejected pre-handler. If the platform cap is < ~14 MB → lower the client cap or switch transport to multipart/FormData (the brief's base64-in-JSON is a *decision*, not a constraint). Method: `mcp__Supabase__get_logs` after a real ~10 MB POST, or check the project's function config.
- PDF go/no-go is already resolved (GA, no beta header) — but the integration smoke (real PDF → 200, not 400) stays a Layer-1-done gate.

---

## 6. DECISIONS.md skeleton (House format — to fold in on completion)

```markdown
## D-110 — AI-Attach for PDF/DOCX (Dashboard SearchAIBox + AIChatWindow)
**Date:** 2026-__-__
**Status:** <PLANNED | IN PROGRESS | COMPLETE, deployed (edge rag-query vNN + Vercel <sha>)>
**Summary:** Enable the disabled `.ai-search-attach`/`.ai-chat-attach` plus-button so a user can
attach ONE PDF or DOCX, sent ephemerally with the prompt to Claude (translate/summarize/ask). No
storage, no embedding. PDF as a base64 document block (GA, no beta header); DOCX text-extracted
client-side via mammoth. New server attach-branch bypasses RAG when `mode==='default' && attached_file`.

**Scope:**
- **Layer 1 — backend** (`<sha>`): `rag-query` attach-branch + `RagQueryOptions.attachedFile` type;
  `streamClaudeResponse` content widened to `unknown`; filename-only logging via synthetic
  `attached_file` retrieved_chunks entry (no migration); base64-body size guard.
- **Layer 2 — client** (`<sha>`): plus-button enablement + picker + 10 MB/ext validation + chip +
  mammoth (dynamic import) in both surfaces; `lib/attachment.ts` shared helper; `AiTurn.attachedFile`
  marker (filename only) for reopen/reload continuity.
- **Layer 3 — polish** (`<sha>`): EN quick-action pills (Summarize/Translate EN/Key Points, all on
  default+attach); Fork-6 `model!=='claude'` gating; chip/pills CSS (token-based light/dark); docs.

**Sub-decisions:**
- **A — Filename logging via synthetic `retrieved_chunks` entry, not a `metadata` column** (Q2). The
  column doesn't exist; the synthetic `attached_file` chunk (filename only) keeps commit-1 migration-free
  and is verified not to crash `ragToAiSource`/`chunksToSources`.
- **B — Numbered D-110, not the brief's D-108** (Q1). "D-108" is an informal code-comment label
  (typography pass) and D-109c is the in-progress web-search work in BUILD_LOG; D-110 is the next clean
  formal DECISIONS number.
- **C — Multi-turn = re-attach per turn (V1)** (Q3). File cleared on send; a follow-up without a
  re-attached file runs full RAG, so document turns require re-attaching.
- **D — Fork-6 gating kept as a cheap `model!=='claude'` expression, inert until a model-picker ships**
  (Q4). No `ModelSelector` wiring / `localStorage` persistence in scope; `model` is threaded into
  AIChatWindow so its button isn't permanently disabled.
- **E — Pills stay `mode='default'`** so the attach-branch handles them (a RAG_BYPASS mode drops the file).
- **F — DOCX scaffolding language-neutral** (D-106 strict-mirroring), PDF GA (no `anthropic-beta`).
- **G — Web-search clears the attached file** (Q5) so a web-search re-trigger never ships base64 into a
  branch that ignores it.

**Production state at completion:** <edge rag-query vNN sha…; Vercel dpl…; smoke: PDF summarize / DOCX translate / 11 MB → 413 / .xlsx → 400 / light+dark>

**Reversibility / rollback:** all additive — optional types, gated branch, `string→unknown` superset,
no migration. Edge: redeploy prior `index.ts`. Frontend: Vercel promote prior deploy. DB: nothing.

**Pending (out of scope):** multi-file; library-bucket persistence; TXT/RTF/ODT/images; vector
embedding; GPT/Gemini routing; `ModelSelector` wiring (Fork-6 inert until then).

**References:** predecessor D-104 (search badges, `826b48a`). Plan: `spec/D-110_AI_ATTACH_PLAN.md`.
Commits: `<l1>`, `<l2>`, `<l3>`.
```
