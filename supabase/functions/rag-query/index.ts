// ====================================================================
// rag-query — the airtuerk-KI retrieval+generation pipeline
// Plan: terminal/02-PIPELINE Atomic Prompt 2.3
// Decision: D-060 (Claude Opus 4.8 generation, hybrid retrieval + rerank)
//
// Flow: embed question (Voyage, 5s timeout) -> create/reuse session + log user
// msg (BEFORE retrieval, so weiss-nicht is correctable) -> rag_hybrid_search ->
// identity-reserved rerank (Voyage rerank-2.5) -> stream Claude Sonnet 4.6 (NO
// temperature / NO thinking) with pre-inserted assistant row + finally-update.
//
// Integrated review-corrections:
//   C1  no temperature / no thinking / no output_config.effort in Claude body
//   C4  pre-insert assistant message row, capture id, update in finally
//   C5  Access-Control-Expose-Headers on BOTH success + weiss-nicht responses
//   C14 session + user-log BEFORE the retrieval-empty check; weiss-nicht keeps
//       a valid message_id + X-Weiss-Nicht header so it is correctable
//   Identity-Reservation: 2 slots for mission/brand_voice persona anchors, the
//       remaining 6 filled by rerank. NB: priority-1 ctx rows (now ~31, all @1.0)
//       lead the rerank candidate sort, so RERANK_INPUT_LIMIT must stay well above
//       the priority-1 count or operational chunks get crowded out (raised to 40).
// ====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

// ============ Configuration ============
const VOYAGE_EMBED_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_RERANK_URL = 'https://api.voyageai.com/v1/rerank'
const VOYAGE_EMBED_MODEL = 'voyage-4-large'
const VOYAGE_RERANK_MODEL = 'rerank-2.5'
const EMBED_TIMEOUT_MS = 5000

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'
// Generation model. D-060 originally chose Opus 4.8; switched to Sonnet 4.6 per
// owner request. Sonnet 4.6 keeps the same request surface used here (no
// temperature / thinking / prefill) and supports the web_search_20260209 server
// tool used by the web-search fallback mode below.
const ANTHROPIC_MODEL = 'claude-sonnet-4-6'
const ANTHROPIC_MAX_TOKENS = 4096

const RETRIEVAL_VECTOR_K = 60
const RETRIEVAL_TRGM_K = 30
// Raised 30->40 (Welle D3, D-070), then 40->80 (F3, D-104). The ~31 priority-1
// company_context rows all carry combined_score 1.0 and lead the candidate sort; at 40
// only ~9 operational confluence chunks reached the reranker, starving specific lookups
// (e.g. supplier contacts) that sit just below the priority-1 block. Widening the net
// (VECTOR_K/TRGM_K 20/10->60/30) + the rerank window (40->80) lets the Voyage reranker
// see ~all candidates and surface the specific operational chunk; offline-validated to
// recover real misses (Hara Filo / CIZGI) — D-103 RAG_EVAL_BASELINE. Rerank cost of
// ~100 vs ~67 docs is negligible (rerank-2.5 handles 1000+).
const RERANK_INPUT_LIMIT = 80
const FINAL_CHUNK_LIMIT = 8
const RESERVED_IDENTITY_SLOTS = 2
const IDENTITY_CATEGORIES = ['mission', 'brand_voice']

// Tool-use loop: hard cap on tool-executing rounds (one extra answer turn follows),
// so total Anthropic calls per request is bounded at MAX_TOOL_ITERATIONS + 1.
const MAX_TOOL_ITERATIONS = 3
const TEAM_DIRECTORY_MAX_ROWS = 200

// Live team directory tool. The roster (team_members) is the single source of truth
// for the web app (/team + /admin/users); this gives the KI live read access to it
// so person/department/contact questions are answered from current data instead of
// the embedded corpus (which only covers a handful of people). The executor NEVER
// returns phone or date_of_birth (policy 9d + DSGVO), so privacy is structural.
const TEAM_DIRECTORY_TOOL = {
  name: 'query_team_directory',
  description:
    'Durchsucht das vollständige, autoritative airtuerk Team-Verzeichnis (alle ' +
    'Mitarbeiter) LIVE aus der Datenbank. Nutze dieses Tool für JEDE Frage zu ' +
    'Personen: wer jemand ist, Position, Abteilung, Geschäfts-E-Mail, wer in einer ' +
    'Abteilung arbeitet, Team-Leads, Erreichbarkeit. Es ist die einzige autoritative ' +
    'Quelle für Mitarbeiterdaten. Es enthält KEINE privaten/Handy-Nummern und KEINE ' +
    'Geburtsdaten. Ohne Argumente liefert es den vollständigen Roster.',
  input_schema: {
    type: 'object',
    properties: {
      search: {
        type: 'string',
        description: 'Name- oder E-Mail-Teilstring, z.B. "Selin" oder "demir".',
      },
      department: {
        type: 'string',
        description: 'Exakter Abteilungsname, z.B. "Vertrieb", "Service", "HR".',
      },
    },
  },
}

// Server-side web search (Anthropic-hosted). Used ONLY by the web-search fallback
// mode — fired when the user accepts the rule-7 "Soll ich im Internet recherchieren?"
// offer on an out-of-scope question. web_search_20260209 (dynamic filtering) requires
// Sonnet 4.6+ / Opus 4.6+; no beta header. max_uses bounds searches (and cost) per request.
const WEB_SEARCH_TOOL = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 3,
}

// Language of the user's question — drives the localized verified-sources block in
// web-search mode (#2.5). Word-count primary so an English answer that mentions an
// umlaut loanword ("Malmö") is not misread as German; Turkish letters checked first.
// Mirrors src/lib/rag/preamble.ts:detectLang (can't import across the Next/Deno boundary
// — known-debt D-111 to dedup into a shared helper post-demo).
const DE_WORDS =
  /\b(der|die|das|und|ich|ist|ein|eine|einen|einem|einer|nicht|mit|für|auf|dem|den|von|wie|was|wer|bitte|kannst|du|wir|uns|über|kein|mein|haben|wird)\b/gi
const EN_WORDS =
  /\b(the|and|is|are|a|an|of|to|in|for|you|your|what|who|how|can|could|please|this|that|with|my|we|our|about|need|want)\b/gi
function detectLang(input: string): 'de' | 'en' | 'tr' {
  const raw = input ?? ''
  const t = raw.toLowerCase()
  if (!t.trim()) return 'de'
  if (/[şğı]/.test(t) || /İ/.test(raw)) return 'tr'
  const de = (t.match(DE_WORDS) ?? []).length
  const en = (t.match(EN_WORDS) ?? []).length
  if (en > de) return 'en'
  if (de > en) return 'de'
  return 'de'
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST',
}
const EXPOSE_HEADERS = 'X-Session-Id, X-Message-Id, X-Weiss-Nicht'

// ============ Types ============
// KI sub-modes (mode-chips, D-072). The 3 utility modes operate on the user's
// pasted text only, so they bypass RAG retrieval + the team-directory tool and run
// a focused system prompt; 'default' + 'escalation' keep the full pipeline.
type ChatMode =
  | 'default'
  | 'rewrite-mail'
  | 'translate'
  | 'summarize'
  | 'escalation'
  // Button-triggered fallback when the user accepts the rule-7 "shall I search the
  // web?" offer on an out-of-scope question. Bypasses RAG; uses the web_search tool.
  | 'web-search'
const RAG_BYPASS_MODES: ReadonlySet<ChatMode> = new Set([
  'rewrite-mail',
  'translate',
  'summarize',
])

interface RagQueryRequest {
  question: string
  session_id?: string
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
  mode?: ChatMode
}

interface RetrievedChunk {
  source: 'context' | 'confluence' | 'brand'
  source_id: string
  content: string
  metadata: Record<string, unknown>
  combined_score: number
  rerank_score?: number
}

// ============ Main handler ============
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = (await req.json()) as RagQueryRequest
    const { question, session_id, conversation_history = [], mode = 'default' } = body

    if (!question || question.trim().length === 0) {
      return jsonError('Question required', 400)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return new Response('Unauthorized', { status: 401 })

    // User-scoped client (validates the caller's JWT)
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: { user } } = await supabaseUser.auth.getUser()
    if (!user) return new Response('Unauthorized', { status: 401 })

    // Service client for writes + retrieval (bypasses RLS by design)
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const voyageKey = Deno.env.get('VOYAGE_API_KEY')!
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')!

    // === Mode branch: RAG-bypass utility modes (rewrite-mail / translate / summarize) ===
    // They operate purely on the user's pasted text — no corpus needed — so they skip
    // embed/retrieval/rerank and the team-directory tool, and run a focused system prompt.
    // Session + user-message logging still happen (history/audit + correctable message_id).
    if (RAG_BYPASS_MODES.has(mode)) {
      const activeSessionId = await ensureSessionAndLog(
        supabaseService,
        session_id,
        user.id,
        question,
      )
      return await streamClaudeResponse({
        systemPrompt: buildModeSystemPrompt(mode),
        messages: buildConversation(conversation_history, question),
        anthropicKey,
        supabaseService,
        sessionId: activeSessionId,
        retrievedChunks: [],
        mode,
        allowTools: false,
      })
    }

    // === Mode branch: web-search fallback (out-of-scope -> live internet) ===
    // The corpus has nothing for these questions, so skip embed/retrieval/rerank and
    // the team-directory tool; run Claude with the web_search server tool and a focused,
    // language-mirrored prompt. Session + user-message still logged (correctable id).
    if (mode === 'web-search') {
      const activeSessionId = await ensureSessionAndLog(
        supabaseService,
        session_id,
        user.id,
        question,
      )
      return await streamClaudeResponse({
        systemPrompt: WEB_SEARCH_PROMPT,
        messages: buildConversation(conversation_history, question),
        anthropicKey,
        supabaseService,
        sessionId: activeSessionId,
        retrievedChunks: [],
        mode,
        allowTools: false,
        webSearch: true,
      })
    }

    // === Step 1: Embed question (Voyage, 5s timeout -> 503) ===
    let queryEmbedding: number[]
    try {
      queryEmbedding = await embedQuery(question, voyageKey)
    } catch (err) {
      console.error('embedQuery failed:', err)
      return jsonError('Embedding service unavailable, please retry', 503)
    }

    // === Step 2+3: Get/create session + log user message (C14: BEFORE retrieval) ===
    const activeSessionId = await ensureSessionAndLog(
      supabaseService,
      session_id,
      user.id,
      question,
    )

    // === Step 4: Hybrid retrieval ===
    const { data: rawChunks, error: retrievalError } = await supabaseService.rpc(
      'rag_hybrid_search',
      {
        query_embedding: queryEmbedding,
        query_text: question,
        match_count: RETRIEVAL_VECTOR_K,
        trgm_count: RETRIEVAL_TRGM_K,
      },
    )
    if (retrievalError) throw new Error(`Retrieval failed: ${retrievalError.message}`)

    // === Step 5: Weiss-Nicht branch — SAFETY NET (D-060) ===
    // Structurally unreachable while priority-1 company_context entries exist
    // (rag_hybrid_search always injects them). Refusals are normally handled by
    // Claude via system-prompt rules 7 + 3, producing normal correctable
    // messages. Kept for DB-corruption / accidental DELETE / empty-table edges.
    if (!rawChunks || rawChunks.length === 0) {
      console.warn(
        'UNEXPECTED: rag_hybrid_search returned 0 rows — unreachable while priority-1 context entries exist',
      )
      return await streamWeissNichtResponse(activeSessionId, supabaseService)
    }

    // === Step 6: Identity-reserved rerank ===
    const finalChunks = await rerankWithIdentity(
      question,
      rawChunks as RetrievedChunk[],
      voyageKey,
    )

    // === Step 7: Build prompt + stream Claude ===
    // 'escalation' keeps the full RAG context + team tool and appends a draft-reply
    // instruction; 'default' is the unchanged base prompt.
    let systemPrompt = buildSystemPrompt(finalChunks)
    if (mode === 'escalation') systemPrompt += ESCALATION_SUFFIX
    const messages = buildConversation(conversation_history, question)

    return await streamClaudeResponse({
      systemPrompt,
      messages,
      anthropicKey,
      supabaseService,
      sessionId: activeSessionId,
      retrievedChunks: finalChunks,
      mode,
    })
  } catch (err) {
    console.error('rag-query error:', err)
    return jsonError(`Internal error: ${String(err)}`, 500)
  }
})

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

// ============ Embed query (5s timeout) ============
async function embedQuery(text: string, voyageKey: string): Promise<number[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), EMBED_TIMEOUT_MS)
  try {
    const res = await fetch(VOYAGE_EMBED_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: [text],
        model: VOYAGE_EMBED_MODEL,
        input_type: 'query',
        output_dtype: 'float',
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error(`Voyage embed ${res.status}: ${await res.text()}`)
    const data = await res.json()
    return data.data[0].embedding
  } finally {
    clearTimeout(timer)
  }
}

// ============ Tool executor: live team directory ============
// Service-role read of team_members. Returns ONLY name/position/department/email/
// is_lead — never phone or date_of_birth (policy 9d + DSGVO). Errors degrade to an
// {error} tool_result so Claude can recover (no 500). `search` is sanitized of
// characters that would break the PostgREST or() filter syntax.
async function runTeamDirectoryQuery(
  supabaseService: ReturnType<typeof createClient>,
  input: { search?: string; department?: string },
): Promise<{ count: number; members: unknown[] } | { error: string }> {
  try {
    // Filters first (FilterBuilder), then transforms (order/limit) at await time —
    // applying .eq()/.or() after .order()/.limit() is not valid on the builder.
    let q = supabaseService
      .from('team_members')
      .select('first_name, last_name, position, department, email, is_lead')

    if (input?.department && input.department.trim()) {
      q = q.eq('department', input.department.trim())
    }
    if (input?.search) {
      const cleaned = input.search.replace(/[(),*%]/g, '').trim()
      // Match EVERY whitespace-separated token across name/email (AND of per-token
      // ORs) so a full name like "Selin Köroglu" resolves on the first call instead
      // of returning 0 (each .or() is ANDed with the previous by PostgREST).
      for (const tok of cleaned.split(/\s+/).filter(Boolean)) {
        q = q.or(`first_name.ilike.%${tok}%,last_name.ilike.%${tok}%,email.ilike.%${tok}%`)
      }
    }

    const { data, error } = await q
      .order('department', { ascending: true })
      .order('last_name', { ascending: true })
      .limit(TEAM_DIRECTORY_MAX_ROWS)
    if (error) return { error: error.message }
    return { count: data?.length ?? 0, members: data ?? [] }
  } catch (err) {
    return { error: String(err) }
  }
}

// ============ Identity-reserved rerank ============
// 2 slots reserved for mission/brand_voice (persona anchors), the rest filled by
// Voyage rerank over everything else. Edge cases: <2 identity -> more rerank
// slots; rerank returns fewer -> smaller final set, no padding.
async function rerankWithIdentity(
  query: string,
  chunks: RetrievedChunk[],
  voyageKey: string,
): Promise<RetrievedChunk[]> {
  const identityChunks = chunks
    .filter(
      (c) =>
        c.source === 'context' &&
        IDENTITY_CATEGORIES.includes(String((c.metadata as { category?: string }).category)),
    )
    .slice(0, RESERVED_IDENTITY_SLOTS)

  const identityIds = new Set(identityChunks.map((c) => c.source_id))
  // rag_hybrid_search returns rows ordered by (source, source_id), NOT by score
  // (a side-effect of DISTINCT ON). Sort by combined_score DESC before slicing so
  // priority-1 context (score 1.0, incl. Geschäftsführung) leads the rerank pool
  // instead of being pushed past RERANK_INPUT_LIMIT by alphabetically-earlier
  // brand/confluence rows.
  const candidates = chunks
    .filter((c) => !identityIds.has(c.source_id))
    .sort((a, b) => b.combined_score - a.combined_score)
    .slice(0, RERANK_INPUT_LIMIT)

  // Fill whatever identity didn't claim (handles <2 identity edge case).
  const rerankSlots = FINAL_CHUNK_LIMIT - identityChunks.length
  if (candidates.length === 0 || rerankSlots <= 0) {
    return identityChunks.slice(0, FINAL_CHUNK_LIMIT)
  }

  let rerankedTop: RetrievedChunk[]
  try {
    const res = await fetch(VOYAGE_RERANK_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${voyageKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        documents: candidates.map((c) => c.content),
        model: VOYAGE_RERANK_MODEL,
        top_k: Math.min(rerankSlots, candidates.length),
        return_documents: false,
      }),
    })
    if (!res.ok) throw new Error(`rerank ${res.status}`)
    const data = await res.json()
    const ranked: Array<{ index: number; relevance_score: number }> = data.data
    rerankedTop = ranked
      .map((r) => ({ ...candidates[r.index], rerank_score: r.relevance_score }))
      .slice(0, rerankSlots)
  } catch (err) {
    // Non-fatal: degrade to combined_score order.
    console.error('rerank failed, using combined_score order:', err)
    rerankedTop = candidates.slice(0, rerankSlots)
  }

  return [...identityChunks, ...rerankedTop]
}

// ============ Session + user-message logging (shared by all modes) ============
// C14: create/reuse the session and log the user message BEFORE any retrieval or
// generation, so even a bypass/refusal answer stays correctable (valid message_id).
async function ensureSessionAndLog(
  supabaseService: ReturnType<typeof createClient>,
  sessionId: string | undefined,
  userId: string,
  question: string,
): Promise<string> {
  let activeSessionId = sessionId
  if (!activeSessionId) {
    const { data: newSession, error: sessionErr } = await supabaseService
      .from('ai_chat_sessions')
      .insert({ user_id: userId, title: question.slice(0, 100) })
      .select('id')
      .single()
    if (sessionErr || !newSession) {
      throw new Error(`Session creation failed: ${sessionErr?.message}`)
    }
    activeSessionId = newSession.id as string
  }
  await supabaseService.from('ai_chat_messages').insert({
    session_id: activeSessionId,
    role: 'user',
    content: question,
  })
  return activeSessionId
}

// ============ Mode prompts (mode-chips, D-072) ============
// Focused system prompts for the RAG-bypass utility modes. They share the airtuerk
// Intelligence persona but drop the retrieval/team-directory machinery — the whole
// job is transforming the user's pasted text. Language is handled implicitly: each
// prompt says detect-input-language-and-answer-in-it (Opus 4.8 is reliably
// multilingual across DE/EN/TR), so no UI language toggle is needed.
const MODE_INTRO =
  'Du bist airtuerk Intelligence, die interne KI-Assistenz der airtuerk Service GmbH.'

const REWRITE_MAIL_PROMPT = `${MODE_INTRO} Du arbeitest im **Mail-Polier-Modus**.

Der Nutzer-Input ist Rohtext für eine geschäftliche E-Mail. Deine Aufgabe:
1. Erkenne die Sprache des Inputs (Deutsch, Englisch oder Türkisch) und antworte AUSSCHLIESSLICH in dieser Sprache.
2. Schreibe den Text in einen freundlichen, professionellen Kundenmail-Ton um — warm aber professionell, kein steifes Corporate-Deutsch, kein "Sehr geehrte Damen und Herren", wenn der Kontext informeller ist.
3. Behalte ALLE inhaltlichen Fakten, Zahlen, Daten, Namen und Buchungsdetails exakt bei. Erfinde nichts hinzu und lass nichts Inhaltliches weg.
4. Korrigiere Rechtschreibung, Grammatik und Zeichensetzung.
5. Gib NUR den polierten Mail-Text aus — keine Erklärungen, kein Vorwort, keine Markdown-Überschriften, keine Quellenangaben, keine Anführungszeichen um den Text.`

const TRANSLATE_PROMPT = `${MODE_INTRO} Du arbeitest im **Übersetzungs-Modus**.

Der Nutzer-Input ist ein zu übersetzender Text. Deine Aufgabe:
1. Erkenne die Ausgangssprache. Standard-Zielsprachen: ist der Input Deutsch → übersetze nach Englisch UND Türkisch (beide, klar mit Sprach-Überschrift getrennt). Ist der Input Englisch oder Türkisch → übersetze nach Deutsch. Nennt der Nutzer ausdrücklich eine Zielsprache, befolge stattdessen diese.
2. Übersetze idiomatisch und sinngemäß, nicht wörtlich. Behalte Branchen-Fachbegriffe bei (PNR, NDC, Refund, Konti, Storno).
3. Behalte Zahlen, Eigennamen, Daten und Buchungsdetails exakt bei.
4. Gib NUR die Übersetzung(en) aus — keine Erklärungen, kein Vorwort, keine Quellenangaben.`

const SUMMARIZE_PROMPT = `${MODE_INTRO} Du arbeitest im **Kurzfass-Modus**.

Der Nutzer-Input ist ein längerer Text (E-Mail-Verlauf, Dokument, Notizen). Deine Aufgabe:
1. Erkenne die Sprache des Inputs (Deutsch, Englisch oder Türkisch) und antworte AUSSCHLIESSLICH in GENAU dieser Sprache — niemals in einer anderen. Ist der Input Englisch, ist die Zusammenfassung Englisch; ist er Türkisch, Türkisch.
2. Fasse den Kern in 2–5 prägnanten Punkten zusammen. Gibt es klare To-Dos oder Fristen, liste sie separat unter "Nächste Schritte".
3. Behalte alle entscheidungsrelevanten Fakten, Zahlen, Fristen und Namen exakt bei. Erfinde nichts hinzu.
4. Keine Einleitung wie "Hier ist die Zusammenfassung" — geh direkt in den Inhalt.`

function buildModeSystemPrompt(mode: ChatMode): string {
  switch (mode) {
    case 'translate':
      return TRANSLATE_PROMPT
    case 'summarize':
      return SUMMARIZE_PROMPT
    case 'rewrite-mail':
    default:
      // Only RAG_BYPASS_MODES reach here; mail-polish is the safe fallback.
      return REWRITE_MAIL_PROMPT
  }
}

// Appended to the full RAG system prompt when mode === 'escalation'. Escalation
// KEEPS retrieval + the team-directory tool (it needs real policies/contacts), so
// it's a suffix on buildSystemPrompt rather than a standalone prompt.
const ESCALATION_SUFFIX = `

# Sondermodus: Eskalations-Antwort (für diese Anfrage aktiv)
Der Nutzer-Input ist eine Kunden-Beschwerde oder eine eskalierte Anfrage. Zusätzlich zu allen obigen Regeln:
- Erkenne die Sprache des Inputs (Deutsch, Englisch oder Türkisch) und entwirf die Antwort AUSSCHLIESSLICH in GENAU dieser Sprache — niemals in einer anderen.
- Entwirf eine diplomatische, deeskalierende Kundenmail: zeige Verständnis, übernimm Verantwortung dort wo angebracht, und biete konkrete nächste Schritte oder eine Lösung an — ohne Schuldeingeständnisse über das Belegte hinaus.
- Nutze die bereitgestellten Quellen und das Team-Verzeichnis, um die richtige Zuständigkeit/Eskalationsstufe und reale Kontaktwege zu nennen (beachte die Telefonnummern-Politik).
- Gib den fertigen Antwort-Entwurf aus. Eine kurze Zeile zur empfohlenen internen Eskalation darf vorangestellt werden, klar getrennt vom eigentlichen Mail-Text.`

// Web-search fallback prompt. The user explicitly asked to search the internet after
// an out-of-scope refusal, so RAG/corpus rules don't apply — answer from live results.
const WEB_SEARCH_PROMPT = `${MODE_INTRO} Du arbeitest im **Web-Recherche-Modus**.

Die Frage des Nutzers liegt außerhalb der internen airtuerk-Wissensbasis, daher recherchierst du jetzt im Internet. Erkenne die Sprache der Frage (Deutsch, Englisch oder Türkisch) und antworte AUSSCHLIESSLICH in GENAU dieser Sprache — niemals in einer anderen. Fasse dich präzise.

QUELLENTREUE (verbindlich):
1. Zitiere nur Fakten die WÖRTLICH oder NAH-WÖRTLICH in einem aktuellen Search-Result-Snippet stehen. Erfinde keine "plausibel klingenden" Details.
2. Wenn ein Snippet ein Spielergebnis nennt aber keinen Torschützen: nenne keinen Torschützen. Wenn ein Snippet kein Datum hat: erfinde keins. Fehlende Daten werden als fehlend gemeldet.
3. Wenn Snippets sich widersprechen: mache es transparent — "Quelle A berichtet X, Quelle B berichtet Y". Wähle nicht heimlich eine Seite.
4. Wenn web_search null verwertbare Snippets zur Frage zurückgibt: sage "keine belastbaren Quellen gefunden". Fülle die Lücke NICHT aus Erinnerung.
5. Gehe davon aus dass dein Trainingsdatum vor dem heutigen liegt. Aktuelle Ereignisse sind nur aus den web_search Snippets verlässlich.
5b. Verschmelze keine diskreten Fakten aus verschiedenen Snippets zu einer Aussage. Jeder Fakt muss aus einer einzelnen identifizierbaren Quelle stammen. Wenn eine Aussage Information aus mehreren Quellen kombiniert, mache das transparent: "Quelle A nennt X, Quelle B ergänzt Y."
5c. Drei distinkte Antwort-Modi bei web_search Resultaten: a) Snippets enthalten direkten Bezug zur Frage → antworte basiert auf snippets. b) Snippets sind tangential aber unzureichend → sage "Die Quellen enthalten verwandte Information aber keinen direkten Bezug zu [Frage-Detail]" und liste explizit was verfügbar ist. c) Snippets sind leer ODER enthalten Suchbegriff nicht → sage exakt: "Die aktuellen Quellen enthalten hierzu keine verifizierbaren Informationen." Keine weiteren Erklärungen, keine Fallback-Antwort aus eigenem Wissen. Unterscheide klar zwischen "die Quellen sagen X ist falsch" und "die Quellen enthalten keine Information über X". Schweigen ist nicht Bestätigung der Verneinung.
5d. Wenn ein web_search Tool-Result is_error: true zurückgibt (5xx, timeout, network error): sage exakt "Die Web-Suche ist aktuell nicht verfügbar. Möchten Sie es erneut versuchen?" Antworte NICHT aus parametric memory als Fallback. Schlage Wiederholung nach kurzer Wartezeit vor.

ANTI-SYCOPHANCY (verbindlich):
6. Wenn der User einer vorherigen Antwort widerspricht: konzediere NICHT bevor du re-verifiziert hast. Triggere eine neue web_search mit Terms aus der User-Korrektur. Berichte die neue Evidenz.
7. Wenn neue Evidenz den User stützt → korrigiere dich, benenne was sich geändert hat, zitiere die neue Quelle.
8. Wenn neue Evidenz dem User widerspricht → benenne deine Evidenz, frag den User nach SEINER Quelle. Flippe nicht.
9. Zustimmung mit dem User ist ein Befund, kein Default.

QUELLEN-ZEILE (verbindlich):
10. Schreibe KEINE eigene "Quellen:"-Zeile am Ende. Der Backend hängt einen verifizierten Quellen-Block aus den tatsächlichen Tool-Citations an. Beziehe dich im Fließtext auf Quellen sinngemäß ("laut Sportschau", "die UEFA-Pressemitteilung meldet"), aber gib KEINE URL-Liste am Schluss aus.`

// ============ System prompt ============
function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const isIdentity = (c: RetrievedChunk) =>
    c.source === 'context' &&
    IDENTITY_CATEGORIES.includes(String((c.metadata as { category?: string }).category))

  const identity = chunks.filter(isIdentity).map((c) => c.content).join('\n\n')

  const facts = chunks
    .filter((c) => !isIdentity(c))
    .map((c, idx) => {
      const meta = c.metadata as {
        title?: string; bereich?: string; kanal?: string; source_url?: string
        topic?: string; brand_name?: string; source_type?: string; section_title?: string
      }
      const label =
        c.source === 'confluence'
          ? meta.source_type === 'correction'
            ? `Korrektur: ${meta.title || 'Internes Wissen'}`
            : meta.source_type === 'knowledge_base'
              ? `airtuerk Intelligence: ${meta.section_title || 'KB'}`
              : `Confluence: ${meta.title || meta.bereich || 'Operations'}`
          : c.source === 'brand'
            ? `Brand: ${meta.brand_name || 'Unbekannt'}`
            : `Kontext: ${meta.topic || 'Allgemein'}`
      return `[QUELLE-${idx + 1}: ${label}]\n${c.content}`
    })
    .join('\n\n---\n\n')

  return `Du bist airtuerk Intelligence, die interne KI-Wissens-Assistenz der airtuerk Service GmbH. Buhara Demir hat dich für die airtuerk Gruppe entwickelt, um Mitarbeitern Zugang zu Wissen über Operations, Produkte, Partner und Strukturen zu geben. Du sprichst von dir in der ersten Person als "airtuerk Intelligence" (nicht "der Assistent", nicht "die KI").

# Deine Identität (immer aktiv)
${identity}

# Team-Verzeichnis (Live-Zugriff via Tool)
Du hast das Tool **query_team_directory**, das den vollständigen, autoritativen airtuerk Mitarbeiter-Roster LIVE aus der Datenbank liefert (Name, Position, Abteilung, Geschäfts-E-Mail, Team-Lead). Es ist die einzige verlässliche Quelle für Mitarbeiterdaten — die untenstehenden Text-Quellen decken nur einzelne Personen ab.

- Nutze das Tool bei JEDER Frage zu Personen, Abteilungen, Zuständigkeiten oder Erreichbarkeit (z.B. "Wer ist X?", "Wer arbeitet im Vertrieb?", "Wer leitet HR?", "Wie erreiche ich X?").
- Rufe das Tool auf, BEVOR du antwortest. Schreibe keinen erklärenden Vortext vor dem Tool-Aufruf — erst Tool, dann Antwort.
- Das Tool enthält bewusst KEINE privaten/Handy-Nummern und KEINE Geburtsdaten. Diese kannst du daher nie nennen.

# Verfügbare Quellen für diese Frage
${facts}

# Antwort-Regeln (strikt)

1. **Faktentreue:** Bei konkreten Werten zitiere exakt aus den bereitgestellten Quellen. Konkrete Werte sind insbesondere: PNR-Format; Preise und Beträge (alle Zahlen mit Währung); Provisionen und Provisionsstrukturen; Gewichtsangaben (kg, Freigepäck etc.); Zeitfenster (Stunden, Tage, Fristen); Mailadressen und Telefonnummern; Portal- und Systemnamen (z.B. Atlas-Portal, ATRIP, Log-In Atlas); Personennamen (Ansprechpartner, Funktionen); Daten und Termine. Erfinde NIEMALS konkrete Werte, die nicht wörtlich in den Quellen stehen — auch nicht aus thematisch ähnlichem Kontext. Wenn ein konkreter Wert gefragt wird und nicht in den bereitgestellten Quellen steht, verwende die Unsicherheits-Formulierung aus Regel 3.

2. **Quellen-Zitation:** Nenne nach jeder faktischen Aussage die Quelle in Klammern: [Quelle: <SourceLabel>]. Mehrere: [Quellen: A, B].

3. **Unsicherheit innerhalb der Wissensbasis:** Wenn die Quellen keine eindeutige Antwort enthalten (Frage ist airtuerk-bezogen, aber Details fehlen), sage das explizit — in der Sprache der Frage. Dies gilt auch, wenn du teilweise relevanten oder themennahen Kontext hast — fehlende konkrete Werte werden NIE aus Plausibilität, parametrischem Wissen oder Analogieschlüssen ergänzt. Nutze je nach Frage-Sprache exakt eine dieser Formulierungen:
   - Deutsch: "Das geht aus unseren Quellen nicht eindeutig hervor. Ich empfehle, Murat Sinim (Head of Operations) oder das Service-Team direkt anzusprechen."
   - Englisch: "This is not clearly stated in our sources. I recommend reaching out to Murat Sinim (Head of Operations) or the Service team directly."
   - Türkisch: "Bu, kaynaklarımızda net olarak belirtilmemiş. Doğrudan Murat Sinim (Head of Operations) veya Servis ekibine danışmanızı öneririm."

4. **Sprache (strikt — Spiegelung):** Antworte AUSSCHLIESSLICH in der Sprache, in der die aktuelle Frage des Nutzers gestellt ist (Deutsch, Englisch oder Türkisch). Erkenne die Sprache der aktuellen Frage und antworte in GENAU dieser Sprache — das gilt OHNE AUSNAHME auch für die festen Protokoll-Phrasen in den Regeln 3, 7 und 8 (dort steht je eine Formulierung pro Sprache; wähle die zur Frage-Sprache passende). Die Quellen sind überwiegend auf Deutsch — übertrage die relevanten Fakten in die Antwortsprache. Fachbegriffe (Konti, PNR, Refund, NDC) bleiben in Originalsprache.

5. **Struktur:** Kurze, präzise Antworten. Detaillierte Formatierungsregeln im Abschnitt „Antwort-Formatierung" unten.

6. **Keine Marketing-Sprache.** Professionell und faktisch.

7. **Außerhalb der Wissensbasis (komplett nicht-airtuerk-relevant):** Wenn die Frage komplett außerhalb des airtuerk-Kontextes liegt (Wetter, Geographie, Sport, allgemeine Welt-Fakten, Mathematik, etc.), antworte EXAKT mit der zur Frage-Sprache passenden Phrase:

- Deutsch: "Diese Frage liegt außerhalb meiner Wissensbasis. Ich bin airtuerk Intelligence — die interne KI der airtuerk Service GmbH. Soll ich im Internet recherchieren?"
- Englisch: "This question is outside my knowledge base. I am airtuerk Intelligence — the internal AI of airtuerk Service GmbH. Should I search the web?"
- Türkisch: "Bu soru bilgi tabanımın dışında. Ben airtuerk Intelligence — airtuerk Service GmbH'nin dahili yapay zekâsıyım. İnternette araştırmamı ister misiniz?"

WICHTIG: Verwende EXAKT die passende Formulierung (gleiche Sprache wie die Frage). Das Frontend erkennt sie und bietet einen Button "Ja, im Web suchen" an.

8. **Identitätsfragen:** Bei Fragen wie "Wer hat dich gebaut?", "Wer hat dich entwickelt?", "Wer ist dein Schöpfer?", "Wer steckt hinter dir?", antworte mit der zur Frage-Sprache passenden Phrase:

- Deutsch: "Ich wurde von Buhara Demir für die airtuerk Service GmbH entwickelt — als interne Wissens-KI für das gesamte airtuerk Team."
- Englisch: "I was developed by Buhara Demir for airtuerk Service GmbH — as an internal knowledge AI for the entire airtuerk team."
- Türkisch: "Buhara Demir tarafından airtuerk Service GmbH için geliştirildim — tüm airtuerk ekibi için dahili bir bilgi yapay zekâsı olarak."

9. **Telefonnummern-Politik (strikt):**

   a) Geschäftliche Telefonnummern: NUR weitergeben wenn sie explizit in den bereitgestellten Text-Quellen (Confluence/Kontext) erscheinen. Format: "Die Geschäftsnummer von [Vorname] [Nachname] lautet [Nummer]." Das Team-Verzeichnis-Tool enthält KEINE Telefonnummern.

   b) Wenn keine Geschäftsnummer vorliegt (aber die Person über query_team_directory bekannt ist): "Ich habe die Geschäftsnummer von [Vorname] [Nachname] nicht. Du kannst ihn/sie per Email unter [email aus dem Team-Verzeichnis] erreichen."

   c) Wenn query_team_directory die Person nicht findet: "Diese Person ist mir im airtuerk Team-Verzeichnis nicht bekannt."

   d) Private oder Handy-Nummern: NIEMALS herausgeben, auch wenn sie technisch in den Quellen erscheinen würden. Standard-Antwort: "Private oder Handy-Nummern stehen mir nicht zur Verfügung. Bitte wende dich an die Person direkt per Email."

   e) Geschäftsführung (Ümit Tenekeci): "Die direkte Telefonnummer von Ümit Tenekeci habe ich nicht. Du kannst ihm eine Mail an utenekeci@airtuerk.de schreiben oder über die Office-Managerin Ayten Koc gehen."

# Antwort-Formatierung

- Strukturiere Vergleiche und mehrteilige Daten als Markdown-Tabelle.
- Für sequenzielle Schritte: nutze nummerierte Listen (1. 2. 3.).
- Für Status-Übersichten: nutze Icons (✅ erledigt, 🟡 in Arbeit, 🔴 Problem).
- Maximum 3 Bullet-Points pro Antwort — bei mehr: Tabelle nutzen.
- Vermeide übermäßige Bindestriche (-) — formuliere in vollständigen Sätzen.
- Hauptbegriffe als **fett** markieren (max 3 pro Antwort).
- Bei Kontaktdaten-Listen: nutze Tabelle (Person | Email | Rolle).
- Bei Erreichbarkeit/Eskalation: strukturiere als Tabelle wenn 2+ Personen.

# Beispiele

Frage: "Wer ist der CEO?"
Gut: "Der CEO der airtuerk Service GmbH ist Ümit Tenekeci. [Quelle: Kontext: Geschäftsführung]"

Frage: "Wer hat dich entwickelt?"
Gut: "Ich wurde von Buhara Demir für die airtuerk Service GmbH entwickelt — als interne Wissens-KI für das gesamte airtuerk Team."

Frage: "Was ist die Geschäftsnummer von Oruc Demir?"
Wenn in Quellen: "Die Geschäftsnummer von Oruc Demir lautet +49 69 ... [Quelle: Team-Verzeichnis]"
Wenn nicht: "Ich habe die Geschäftsnummer von Oruc Demir nicht. Du kannst ihn per Email unter odemir@airtuerk.de erreichen."

Frage: "Was ist die private Nummer von Oruc?"
Gut: "Private oder Handy-Nummern stehen mir nicht zur Verfügung. Du kannst Oruc Demir per Email unter odemir@airtuerk.de erreichen."

Frage: "Wie kann ich Ümit Bey erreichen?"
Gut: "Die direkte Telefonnummer von Ümit Tenekeci habe ich nicht. Du kannst ihm eine Mail an utenekeci@airtuerk.de schreiben oder über die Office-Managerin Ayten Koc gehen."

Frage (Deutsch): "Was ist die Hauptstadt von Mars?"
Gut: "Diese Frage liegt außerhalb meiner Wissensbasis. Ich bin airtuerk Intelligence — die interne KI der airtuerk Service GmbH. Soll ich im Internet recherchieren?"
(Bei einer englischen Frage gibst du dieselbe Phrase in der englischen Variante aus, bei einer türkischen in der türkischen — siehe Regel 7.)`
}

// ============ Conversation ============
function buildConversation(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  newQuestion: string,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return [...history.slice(-10), { role: 'user', content: newQuestion }]
}

// ============ Stream Claude with tool-use loop (C1 + C4 + C5) ============
// Tool-use breaks the old raw-SSE passthrough: a turn may return a tool_use block
// instead of text, and emitting Anthropic's per-turn message_stop would make the
// client (rag/client.ts handleLine) fire 'done' prematurely. So instead of passing
// bytes through, we PARSE each turn's SSE and RE-EMIT only text deltas as clean
// content_block_delta events, with a single message_stop at the very end — the exact
// shape the client + the weiss-nicht fallback already speak. Text streams live on
// both the tool and no-tool paths; tool_use turns are intercepted, executed, and the
// conversation continues into the next Anthropic call (bounded by MAX_TOOL_ITERATIONS).
async function streamClaudeResponse({
  systemPrompt,
  messages,
  anthropicKey,
  supabaseService,
  sessionId,
  retrievedChunks,
  mode,
  allowTools = true,
  webSearch = false,
}: {
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  anthropicKey: string
  supabaseService: ReturnType<typeof createClient>
  sessionId: string
  retrievedChunks: RetrievedChunk[]
  // Chat mode for this turn — persisted to ai_chat_messages.mode (D-106 Phase 7b).
  mode: ChatMode
  allowTools?: boolean
  webSearch?: boolean
}): Promise<Response> {
  const startTime = Date.now()

  // C4: pre-insert assistant row to get an id (failure here -> 500 via outer catch)
  const { data: msgRow, error: msgErr } = await supabaseService
    .from('ai_chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: '',
      retrieved_chunks: retrievedChunks.map((c) => ({
        source: c.source,
        source_id: c.source_id,
        metadata: c.metadata,
        combined_score: c.combined_score,
        rerank_score: c.rerank_score,
      })),
      model: ANTHROPIC_MODEL,
    })
    .select('id')
    .single()
  if (msgErr || !msgRow) {
    throw new Error(`Failed to create assistant message row: ${msgErr?.message}`)
  }
  const messageId = msgRow.id as number

  // Conversation grows across tool turns (string content from the caller; block-array
  // content for assistant tool_use turns + user tool_result turns).
  const convo: Array<{ role: 'user' | 'assistant'; content: unknown }> = [...messages]

  // C1: NO temperature, NO thinking, NO output_config.effort. The client-side
  // team-directory tool is offered until the round cap (the final capped turn omits
  // it so Claude must answer with text). The server-side web_search tool, when
  // enabled, is offered on every turn — Anthropic runs it server-side, so it is not
  // bounded by our client-tool round cap (its own cap surfaces as stop_reason
  // 'pause_turn', which the loop treats as the final turn).
  const callClaude = (offerTools: boolean) => {
    const tools: unknown[] = []
    if (offerTools) tools.push(TEAM_DIRECTORY_TOOL)
    if (webSearch) tools.push(WEB_SEARCH_TOOL)
    return fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': ANTHROPIC_VERSION,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_MAX_TOKENS,
        system: systemPrompt,
        messages: convo,
        stream: true,
        ...(tools.length ? { tools } : {}),
      }),
    })
  }

  // First call OUTSIDE the stream so an early API failure still returns a clean HTTP
  // 500 (and deletes the empty row) instead of a half-open stream — preserves the
  // pre-tool error semantics for the common "first call fails" case.
  const firstRes = await callClaude(allowTools)
  if (!firstRes.ok || !firstRes.body) {
    const detail = firstRes.body ? await firstRes.text() : 'no body'
    await supabaseService.from('ai_chat_messages').delete().eq('id', messageId)
    throw new Error(`Claude API error ${firstRes.status}: ${detail}`)
  }

  let fullText = ''
  let tokensIn = 0
  let tokensOut = 0
  const toolCallsLog: Array<Record<string, unknown>> = []
  // Web-search citations (web_search_20260209). Keyed by URL for dedup across the
  // 3–5 web_search_tool_result blocks a single turn can emit; first-write-wins so the
  // earliest (most relevant) occurrence is kept. Shape mirrors the team_directory
  // synthetic entry (title/source_type nested in metadata) so the client's
  // ragToAiSource maps it unchanged. encrypted_content is deliberately dropped (opaque,
  // multi-KB, unused — we don't do tool-continuation); page_age stored, not rendered.
  const webSearchByUrl = new Map<
    string,
    { source: string; source_id: string; metadata: Record<string, unknown>; combined_score: number }
  >()
  // Observability (D-106 Phase 7b). ttftMs: time to first answer token, same origin as
  // latency_ms (startTime) so ttft <= latency always. webSearchUses: count of
  // web_search_tool_result blocks this turn (feeds tool_calls.uses).
  let ttftMs: number | null = null
  let webSearchUses = 0
  const enc = new TextEncoder()

  type TurnBlock =
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: unknown }

  const stream = new ReadableStream({
    async start(controller) {
      const emitText = (t: string) => {
        if (!t) return
        // ttft: first answer token (emitText fires only for content text deltas, not
        // tool blocks). Same origin as latency_ms (startTime) → ttft <= latency.
        if (ttftMs === null) ttftMs = Date.now() - startTime
        fullText += t
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: t } })}\n\n`,
          ),
        )
      }

      // Read one Anthropic turn fully: re-emit text to the client, buffer tool_use
      // blocks, return the turn's stop_reason + reconstructed content blocks.
      const readTurn = async (
        res: Response,
      ): Promise<{ stopReason: string | null; blocks: TurnBlock[] }> => {
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let stopReason: string | null = null
        const blocks: TurnBlock[] = []
        const toolUses: Record<number, { id: string; name: string; jsonBuf: string }> = {}
        let curText: { index: number; text: string } | null = null

        const handle = (line: string) => {
          if (!line.startsWith('data: ')) return
          const payload = line.slice(6).trim()
          if (!payload || payload === '[DONE]') return
          let evt: {
            type?: string
            index?: number
            message?: { usage?: { input_tokens?: number } }
            content_block?: {
              type?: string
              id?: string
              name?: string
              // web_search_tool_result: results arrive here, fully populated, at
              // content_block_start (no deltas — verified via streaming probe).
              content?: Array<{ type?: string; title?: string; url?: string; page_age?: string | null }>
            }
            delta?: { type?: string; text?: string; partial_json?: string; stop_reason?: string }
            usage?: { output_tokens?: number }
          }
          try {
            evt = JSON.parse(payload)
          } catch {
            return // partial JSON across chunk boundary
          }
          switch (evt.type) {
            case 'message_start':
              tokensIn += evt.message?.usage?.input_tokens ?? 0
              break
            case 'content_block_start':
              if (evt.content_block?.type === 'tool_use') {
                toolUses[evt.index!] = {
                  id: evt.content_block.id ?? '',
                  name: evt.content_block.name ?? '',
                  jsonBuf: '',
                }
              } else if (evt.content_block?.type === 'text') {
                curText = { index: evt.index!, text: '' }
              } else if (evt.content_block?.type === 'web_search_tool_result') {
                // Server-tool result block: its content[] is already fully populated
                // at content_block_start (no input_json_delta follows). Collect every
                // web_search_result and dedup by URL (first-write-wins = relevance order).
                webSearchUses++ // one block == one web_search invocation (tool_calls.uses)
                const results = Array.isArray(evt.content_block.content)
                  ? evt.content_block.content
                  : []
                for (const r of results) {
                  if (r?.type !== 'web_search_result' || !r.url) continue
                  if (webSearchByUrl.has(r.url)) continue
                  webSearchByUrl.set(r.url, {
                    source: 'web_search',
                    source_id: r.url,
                    metadata: {
                      title: r.title ?? r.url,
                      source_type: 'web_search',
                      source_url: r.url,
                      page_age: r.page_age ?? null,
                    },
                    combined_score: 1,
                  })
                }
              }
              break
            case 'content_block_delta':
              if (evt.delta?.type === 'input_json_delta') {
                const tu = toolUses[evt.index!]
                if (tu) tu.jsonBuf += evt.delta.partial_json ?? ''
              } else if (typeof evt.delta?.text === 'string') {
                emitText(evt.delta.text)
                if (curText && curText.index === evt.index) curText.text += evt.delta.text
              }
              break
            case 'content_block_stop': {
              const tu = toolUses[evt.index!]
              if (tu) {
                let parsed: unknown = {}
                try {
                  parsed = tu.jsonBuf ? JSON.parse(tu.jsonBuf) : {}
                } catch {
                  parsed = {}
                }
                blocks.push({ type: 'tool_use', id: tu.id, name: tu.name, input: parsed })
              } else if (curText && curText.index === evt.index) {
                if (curText.text) blocks.push({ type: 'text', text: curText.text })
                curText = null
              }
              break
            }
            case 'message_delta':
              if (evt.delta?.stop_reason) stopReason = evt.delta.stop_reason
              tokensOut += evt.usage?.output_tokens ?? 0
              break
            // message_stop is per-turn; we emit our own single message_stop at the end.
          }
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            buffer += decoder.decode()
            if (buffer) for (const line of buffer.split('\n')) handle(line)
            break
          }
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) handle(line)
        }
        return { stopReason, blocks }
      }

      try {
        let res = firstRes
        let toolRounds = 0
        let finalStopReason: string | null = null
        while (true) {
          const { stopReason, blocks } = await readTurn(res)
          finalStopReason = stopReason

          if (stopReason === 'tool_use' && toolRounds < MAX_TOOL_ITERATIONS) {
            toolRounds++
            // Replay the assistant tool_use turn into the conversation verbatim.
            convo.push({ role: 'assistant', content: blocks })

            const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = []
            for (const b of blocks) {
              if (b.type !== 'tool_use') continue
              const result =
                b.name === 'query_team_directory'
                  ? await runTeamDirectoryQuery(
                      supabaseService,
                      (b.input ?? {}) as { search?: string; department?: string },
                    )
                  : { error: `Unknown tool: ${b.name}` }
              toolCallsLog.push({
                tool: b.name,
                input: b.input ?? {},
                row_count: 'count' in result ? result.count : null,
                ...('error' in result ? { error: result.error } : {}),
              })
              toolResults.push({
                type: 'tool_result',
                tool_use_id: b.id,
                content: JSON.stringify(result),
              })
            }
            convo.push({ role: 'user', content: toolResults })

            const offerTools = allowTools && toolRounds < MAX_TOOL_ITERATIONS
            res = await callClaude(offerTools)
            if (!res.ok || !res.body) {
              const detail = res.body ? await res.text() : 'no body'
              throw new Error(`Claude API error ${res.status}: ${detail}`)
            }
            continue
          }
          break // final answer reached
        }

        // TODO(post-demo): Implement resume-with-cap per Anthropic's
        // recommended pattern (re-send conversation with prior tool_use
        // results to continue the turn). Cap retry attempts at 2 to
        // bound worst-case latency. See D-106 follow-up ticket.
        // Hook-point: insert resume logic here BEFORE emitting the
        // 'paused' SSE event below.
        if (finalStopReason === 'pause_turn') {
          controller.enqueue(
            enc.encode(
              `data: ${JSON.stringify({ type: 'paused', reason: 'max_searches_reached' })}\n\n`,
            ),
          )
        }

        controller.enqueue(enc.encode('data: {"type":"message_stop"}\n\n'))
      } catch (err) {
        // Keep whatever text already streamed; emit message_stop so the client
        // unhangs even on a mid-loop failure.
        console.error('tool-loop stream error (partial content kept):', err)
        try {
          controller.enqueue(enc.encode('data: {"type":"message_stop"}\n\n'))
        } catch {
          /* controller already closed */
        }
      } finally {
        // C4: persist content + tokens + tool-call observability (whether complete or
        // partial). retrieved_chunks keeps the RAG sources and appends a synthetic
        // team_directory entry recording the tool invocations.
        // tool_calls (D-106 Phase 7b) is the canonical tool-invocation log: the existing
        // query_team_directory entries (toolCallsLog) + a web_search summary. The
        // retrieved_chunks.metadata.calls entry below is kept for backward-compat (the UI
        // team-directory chip renders from it) but is no longer the source of truth.
        const toolCalls = [
          ...toolCallsLog,
          ...(webSearchUses > 0
            ? [{ tool: 'web_search', uses: webSearchUses, unique_urls: webSearchByUrl.size }]
            : []),
        ]
        await supabaseService
          .from('ai_chat_messages')
          .update({
            content: fullText,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            latency_ms: Date.now() - startTime,
            // D-106 Phase 7b observability columns. Defensive defaults so a capture bug
            // never blocks persistence: mode falls back to 'default', tool_calls is always
            // an array ([] if no tools), ttft_ms is null if no answer token ever streamed.
            mode: mode ?? 'default',
            tool_calls: toolCalls,
            ttft_ms: ttftMs,
            retrieved_chunks: [
              ...retrievedChunks.map((c) => ({
                source: c.source,
                source_id: c.source_id,
                metadata: c.metadata,
                combined_score: c.combined_score,
                rerank_score: c.rerank_score,
              })),
              // Web-search citations. Dedup against the RAG chunks too (a default-RAG
              // turn could in principle invoke web_search), keyed on source_url. For a
              // mode:'web-search' turn retrievedChunks is [] and the team-directory tool
              // is not offered, so these become the ONLY chunks — no anchor/team bleed.
              ...Array.from(webSearchByUrl.values()).filter(
                (w) =>
                  !retrievedChunks.some(
                    (c) =>
                      (c.metadata as { source_url?: string }).source_url ===
                      (w.metadata as { source_url?: string }).source_url,
                  ),
              ),
              ...(toolCallsLog.length
                ? [
                    {
                      source: 'team_directory',
                      source_id: 'tool',
                      // title/source_type so the client source-chip (ragToAiSource)
                      // renders "airtuerk Team-Verzeichnis"; calls = observability.
                      metadata: {
                        title: 'airtuerk Team-Verzeichnis',
                        source_type: 'team_directory',
                        calls: toolCallsLog,
                      },
                      combined_score: 1,
                    },
                  ]
                : []),
            ],
          })
          .eq('id', messageId)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': EXPOSE_HEADERS, // C5
      'X-Session-Id': sessionId,
      'X-Message-Id': String(messageId),
    },
  })
}

// ============ Weiss-Nicht fallback (C14 — correctable) ============
async function streamWeissNichtResponse(
  sessionId: string,
  supabaseService: ReturnType<typeof createClient>,
): Promise<Response> {
  const text = `Zu dieser Frage finde ich in unserer Wissensbasis keine Informationen.

Ich empfehle, die Frage direkt an einen der folgenden Ansprechpartner zu richten:
- **Murat Sinim** (Head of Operations) — msinim@airtuerk.de
- **Selin Köroglu** (Service) — skoeroglu@airtuerk.de

Falls die Information vorliegt, kannst du sie über die Korrektur-Funktion einbringen.`

  // C14: pre-insert the full static answer so feedback/correction has a message_id.
  const { data: msgRow, error: msgErr } = await supabaseService
    .from('ai_chat_messages')
    .insert({
      session_id: sessionId,
      role: 'assistant',
      content: text,
      retrieved_chunks: [],
      model: ANTHROPIC_MODEL,
    })
    .select('id')
    .single()
  if (msgErr || !msgRow) {
    throw new Error(`Failed to create weiss-nicht message: ${msgErr?.message}`)
  }
  const messageId = msgRow.id as number

  // Stream as Anthropic-shaped SSE so the client parser is uniform.
  const enc = new TextEncoder()
  const CHARS_PER_TICK = 4
  const stream = new ReadableStream({
    start(controller) {
      let i = 0
      const timer = setInterval(() => {
        if (i >= text.length) {
          controller.enqueue(enc.encode('data: {"type":"message_stop"}\n\n'))
          controller.close()
          clearInterval(timer)
          return
        }
        const piece = text.slice(i, i + CHARS_PER_TICK)
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({ type: 'content_block_delta', delta: { text: piece } })}\n\n`,
          ),
        )
        i += CHARS_PER_TICK
      }, 30)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': EXPOSE_HEADERS, // C5
      'X-Session-Id': sessionId,
      'X-Message-Id': String(messageId),
      'X-Weiss-Nicht': 'true',
    },
  })
}
