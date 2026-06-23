// ====================================================================
// rag-query — the airtuerk-KI retrieval+generation pipeline
// Plan: terminal/02-PIPELINE Atomic Prompt 2.3
// Decision: D-060 (Claude Opus 4.8 generation, hybrid retrieval + rerank)
//
// Flow: embed question (Voyage, 5s timeout) -> create/reuse session + log user
// msg (BEFORE retrieval, so weiss-nicht is correctable) -> rag_hybrid_search ->
// identity-reserved rerank (Voyage rerank-2.5) -> stream Claude Opus 4.8 (NO
// temperature / NO thinking) with pre-inserted assistant row + finally-update.
//
// Integrated review-corrections:
//   C1  no temperature / no thinking / no output_config.effort in Claude body
//   C4  pre-insert assistant message row, capture id, update in finally
//   C5  Access-Control-Expose-Headers on BOTH success + weiss-nicht responses
//   C14 session + user-log BEFORE the retrieval-empty check; weiss-nicht keeps
//       a valid message_id + X-Weiss-Nicht header so it is correctable
//   Identity-Reservation: 2 slots for mission/brand_voice persona anchors, the
//       remaining 6 filled by rerank — prevents 20 priority-1 ctx rows (all @1.0)
//       from crowding operational chunks out of the final context.
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
const ANTHROPIC_MODEL = 'claude-opus-4-8'
const ANTHROPIC_MAX_TOKENS = 4096

const RETRIEVAL_VECTOR_K = 20
const RETRIEVAL_TRGM_K = 10
const RERANK_INPUT_LIMIT = 30
const FINAL_CHUNK_LIMIT = 8
const RESERVED_IDENTITY_SLOTS = 2
const IDENTITY_CATEGORIES = ['mission', 'brand_voice']

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST',
}
const EXPOSE_HEADERS = 'X-Session-Id, X-Message-Id, X-Weiss-Nicht'

// ============ Types ============
interface RagQueryRequest {
  question: string
  session_id?: string
  conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
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
    const { question, session_id, conversation_history = [] } = body

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

    // === Step 1: Embed question (Voyage, 5s timeout -> 503) ===
    let queryEmbedding: number[]
    try {
      queryEmbedding = await embedQuery(question, voyageKey)
    } catch (err) {
      console.error('embedQuery failed:', err)
      return jsonError('Embedding service unavailable, please retry', 503)
    }

    // === Step 2: Get/create session (C14: BEFORE retrieval check) ===
    let activeSessionId = session_id
    if (!activeSessionId) {
      const { data: newSession, error: sessionErr } = await supabaseService
        .from('ai_chat_sessions')
        .insert({ user_id: user.id, title: question.slice(0, 100) })
        .select('id')
        .single()
      if (sessionErr || !newSession) {
        throw new Error(`Session creation failed: ${sessionErr?.message}`)
      }
      activeSessionId = newSession.id
    }

    // === Step 3: Log user message (C14: BEFORE retrieval check) ===
    await supabaseService.from('ai_chat_messages').insert({
      session_id: activeSessionId,
      role: 'user',
      content: question,
    })

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
      return await streamWeissNichtResponse(activeSessionId!, supabaseService)
    }

    // === Step 6: Identity-reserved rerank ===
    const finalChunks = await rerankWithIdentity(
      question,
      rawChunks as RetrievedChunk[],
      voyageKey,
    )

    // === Step 7: Build prompt + stream Claude ===
    const systemPrompt = buildSystemPrompt(finalChunks)
    const messages = buildConversation(conversation_history, question)

    return await streamClaudeResponse({
      systemPrompt,
      messages,
      anthropicKey,
      supabaseService,
      sessionId: activeSessionId!,
      retrievedChunks: finalChunks,
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
        topic?: string; brand_name?: string; source_type?: string
      }
      const label =
        c.source === 'confluence'
          ? meta.source_type === 'correction'
            ? `Korrektur: ${meta.title || 'Internes Wissen'}`
            : meta.source_type === 'knowledge_base'
              ? `airtuerk Intelligence: ${meta.title || 'Wissensbasis'}`
              : `Confluence: ${meta.title || meta.bereich || 'Operations'}`
          : c.source === 'brand'
            ? `Brand: ${meta.brand_name || 'Unbekannt'}`
            : `Kontext: ${meta.topic || 'Allgemein'}`
      return `[QUELLE-${idx + 1}: ${label}]\n${c.content}`
    })
    .join('\n\n---\n\n')

  return `Du bist die airtuerk-KI — der zentrale Wissens-Assistent für die airtuerk Service GmbH.

# Deine Identität (immer aktiv)
${identity}

# Verfügbare Quellen für diese Frage
${facts}

# Antwort-Regeln (strikt)
1. **Faktentreue:** Bei konkreten Werten (PNR-Format, Preise, Zeitfenster, Mailadressen) zitiere exakt aus den Quellen. Niemals halluzinieren.
2. **Quellen-Zitation:** Nenne nach jeder faktischen Aussage die Quelle in Klammern: [Quelle: <SourceLabel>]. Mehrere: [Quellen: A, B].
3. **Unsicherheit:** Wenn die Quellen keine eindeutige Antwort enthalten, sage explizit: "Das geht aus unseren Quellen nicht eindeutig hervor. Ich empfehle, Murat Sinim (Head of Operations) oder das Service-Team direkt anzusprechen."
4. **Sprache:** Antworte auf Deutsch. Türkische/englische Fachbegriffe (Konti, PNR, Refund, NDC) in Originalsprache.
5. **Struktur:** Kurze, präzise Antworten. Listen als Bullets, Vergleiche als Tabelle, sonst Prosa.
6. **Keine Marketing-Sprache.** Professionell und faktisch.
7. **Außerhalb der Wissensbasis (nicht airtuerk-relevant):** "Diese Frage liegt außerhalb meiner Wissensbasis. Ich bin der airtuerk-Assistent."

# Beispiele
Frage: "Wer ist der CEO?"
Gut: "Der CEO der airtuerk Service GmbH ist Ümit Tenekeci. [Quelle: Kontext: Geschäftsführung]"

Frage: "Welche Pizza ist am besten?"
Gut: "Diese Frage liegt außerhalb meiner Wissensbasis. Ich bin der airtuerk-Assistent."`
}

// ============ Conversation ============
function buildConversation(
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  newQuestion: string,
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return [...history.slice(-10), { role: 'user', content: newQuestion }]
}

// ============ Stream Claude (C1 + C4 + C5) ============
async function streamClaudeResponse({
  systemPrompt,
  messages,
  anthropicKey,
  supabaseService,
  sessionId,
  retrievedChunks,
}: {
  systemPrompt: string
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  anthropicKey: string
  supabaseService: ReturnType<typeof createClient>
  sessionId: string
  retrievedChunks: RetrievedChunk[]
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

  // C1: NO temperature, NO thinking, NO output_config.effort.
  const claudeRes = await fetch(ANTHROPIC_URL, {
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
      messages,
      stream: true,
    }),
  })

  if (!claudeRes.ok || !claudeRes.body) {
    const detail = claudeRes.body ? await claudeRes.text() : 'no body'
    // Clean up the empty row before failing.
    await supabaseService.from('ai_chat_messages').delete().eq('id', messageId)
    throw new Error(`Claude API error ${claudeRes.status}: ${detail}`)
  }

  let fullText = ''
  let tokensIn = 0
  let tokensOut = 0

  const stream = new ReadableStream({
    async start(controller) {
      const reader = claudeRes.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      // Server-side accumulation only — client gets the raw bytes untouched.
      const processLine = (line: string) => {
        if (!line.startsWith('data: ')) return
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') return
        try {
          const event = JSON.parse(payload)
          if (event.type === 'content_block_delta' && event.delta?.text) {
            fullText += event.delta.text
          } else if (event.type === 'message_start' && event.message?.usage) {
            tokensIn = event.message.usage.input_tokens ?? 0
          } else if (event.type === 'message_delta' && event.usage?.output_tokens) {
            tokensOut = event.usage.output_tokens
          }
        } catch {
          /* partial JSON across chunk boundary — ignore, server-side only */
        }
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            // Flush any multi-byte char straddling the final boundary + parse residue.
            buffer += decoder.decode()
            if (buffer) for (const line of buffer.split('\n')) processLine(line)
            break
          }

          // Pass Anthropic SSE through to the client untouched.
          controller.enqueue(value)

          // Accumulate server-side for persistence (buffered across reads).
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) processLine(line)
        }
      } catch (err) {
        // Stream error after partial content: keep what we have (updated in finally).
        console.error('stream read error (partial content kept):', err)
      } finally {
        // C4: persist content + tokens whether complete or partial.
        await supabaseService
          .from('ai_chat_messages')
          .update({
            content: fullText,
            tokens_in: tokensIn,
            tokens_out: tokensOut,
            latency_ms: Date.now() - startTime,
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
