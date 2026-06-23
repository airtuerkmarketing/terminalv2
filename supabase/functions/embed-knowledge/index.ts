// ====================================================================
// embed-knowledge — chunk + embed any knowledge source into the RAG tables
// Plan: terminal/01-FOUNDATION Atomic Prompts 1.5 + 1.6
// Decision: D-058 (RAG Foundation) — embedding stack D-059
//
// POST /functions/v1/embed-knowledge
// Body: {
//   source: 'confluence' | 'attachments' | 'brands' | 'context' | 'corrections' | 'all',
//   force?: boolean   // re-embed even if content_hash already exists
// }
// Response: { source, chunks_created, chunks_skipped, errors[], duration_ms }
// ====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const VOYAGE_API_URL = 'https://api.voyageai.com/v1/embeddings'
const VOYAGE_MODEL = 'voyage-4-large'
const CHUNK_SIZE_TOKENS = 700
const CHUNK_OVERLAP_TOKENS = 100
const VOYAGE_BATCH_SIZE = 128

const JSON_HEADERS = { 'Content-Type': 'application/json' }

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Allow-Methods': 'POST',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { source, force = false } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Lazily required: only handlers that actually embed need it. This lets a
    // zero-work call (e.g. {source:'context'} on an empty table) return
    // chunks_created:0 without a key — embedBatch throws a clear error if a key
    // is genuinely needed but absent.
    const voyageKey = Deno.env.get('VOYAGE_API_KEY') ?? ''

    switch (source) {
      case 'confluence':
        return await embedConfluence(supabase, voyageKey, force)
      case 'attachments':
        return await embedAttachments(supabase, voyageKey, force)
      case 'brands':
        return await embedBrands(supabase, voyageKey, force)
      case 'context':
        return await embedCompanyContext(supabase, voyageKey, force)
      case 'corrections':
        return await embedApprovedCorrections(supabase, voyageKey, force)
      case 'all':
        return await embedAll(supabase, voyageKey, force)
      default:
        return new Response(
          JSON.stringify({ error: `Invalid source: ${source}` }),
          { status: 400, headers: JSON_HEADERS },
        )
    }
  } catch (err) {
    console.error('embed-knowledge error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal error', detail: String(err) }),
      { status: 500, headers: JSON_HEADERS },
    )
  }
})

// ============ Core chunking ============
// The Confluence snapshot stores body_text as a single whitespace-normalized
// line (verified 2026-06-23: 0 of 86 pages contain newline breaks), so
// paragraph-splitting alone leaves a whole page as one oversized chunk. We
// segment by the best boundary that actually exists (paragraph → line →
// sentence), hard-split any segment still over target by a char window, then
// greedily pack segments to ~CHUNK_SIZE_TOKENS carrying one segment as overlap.
function chunkText(
  text: string,
  metadata: Record<string, unknown>,
): Array<{ content: string; token_count: number; metadata: Record<string, unknown> }> {
  const approxTokens = (s: string) => Math.ceil(s.length / 4)
  const TARGET_CHARS = CHUNK_SIZE_TOKENS * 4
  const STRIDE_CHARS = (CHUNK_SIZE_TOKENS - CHUNK_OVERLAP_TOKENS) * 4

  const clean = text.replace(/\r/g, '').trim()
  if (!clean) return []

  // 1) Segment by the most natural boundary present in the text.
  let segments = clean.split(/\n\n+/).map((s) => s.trim()).filter(Boolean)
  if (segments.length <= 1) segments = clean.split(/\n+/).map((s) => s.trim()).filter(Boolean)
  if (segments.length <= 1) segments = clean.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)

  // 2) Hard-split any single segment still larger than target (sliding window).
  const units: string[] = []
  for (const seg of segments) {
    if (approxTokens(seg) <= CHUNK_SIZE_TOKENS) {
      units.push(seg)
      continue
    }
    for (let i = 0; i < seg.length; i += STRIDE_CHARS) {
      const slice = seg.slice(i, i + TARGET_CHARS).trim()
      if (slice) units.push(slice)
    }
  }

  // 3) Greedily pack units to ~CHUNK_SIZE_TOKENS. Overlap = a bounded tail of
  // the just-flushed chunk (~CHUNK_OVERLAP_TOKENS), NOT the whole previous unit
  // — carrying a full unit could nearly double a chunk before the next size
  // check fires (observed max 1401 tok). Tail-overlap caps chunks at ~target +
  // overlap (~800 tok).
  const OVERLAP_CHARS = CHUNK_OVERLAP_TOKENS * 4
  const chunks: ReturnType<typeof chunkText> = []
  let current = ''
  let unitCount = 0
  const flush = () => {
    if (current.trim().length === 0) return
    chunks.push({
      content: current.trim(),
      token_count: approxTokens(current),
      metadata: { ...metadata, segment_count: unitCount },
    })
  }

  for (const u of units) {
    const candidate = current ? current + '\n\n' + u : u
    if (approxTokens(candidate) > CHUNK_SIZE_TOKENS && current) {
      flush()
      const overlap = current.slice(-OVERLAP_CHARS).trim()
      current = overlap ? overlap + '\n\n' + u : u
      unitCount = 1
    } else {
      current = candidate
      unitCount++
    }
  }
  flush()

  return chunks
}

// ============ Voyage embedding (recursive batching) ============
async function embedBatch(
  texts: string[],
  voyageKey: string,
  inputType: 'document' | 'query' = 'document',
): Promise<number[][]> {
  if (texts.length === 0) return []
  if (!voyageKey) {
    throw new Error('VOYAGE_API_KEY not configured as edge function secret')
  }
  if (texts.length > VOYAGE_BATCH_SIZE) {
    const mid = Math.floor(texts.length / 2)
    const [a, b] = await Promise.all([
      embedBatch(texts.slice(0, mid), voyageKey, inputType),
      embedBatch(texts.slice(mid), voyageKey, inputType),
    ])
    return [...a, ...b]
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${voyageKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: texts,
      model: VOYAGE_MODEL,
      input_type: inputType,
      output_dtype: 'float',
    }),
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Voyage API error ${res.status}: ${errorText}`)
  }

  const data = await res.json()
  return data.data.map((d: { embedding: number[] }) => d.embedding)
}

// ============ Handler 1: Confluence pages ============
async function embedConfluence(
  supabase: ReturnType<typeof createClient>,
  voyageKey: string,
  force: boolean,
): Promise<Response> {
  const startTime = Date.now()

  const { data: pages, error } = await supabase
    .from('confluence_raw')
    .select('page_id, title, body_text, bereich, kanal, source_url')
    .eq('is_deleted', false)
    .not('body_text', 'is', null)

  if (error) throw error

  let created = 0, skipped = 0
  const errors: Array<{ source_id: string; error: string }> = []

  for (const page of pages || []) {
    try {
      const chunks = chunkText(page.body_text, {
        page_id: page.page_id,
        title: page.title,
        bereich: page.bereich,
        kanal: page.kanal,
        source_url: page.source_url,
      })

      if (chunks.length === 0) continue

      const embeddings = await embedBatch(chunks.map((c) => c.content), voyageKey)

      for (let i = 0; i < chunks.length; i++) {
        const { error: insertErr } = await supabase
          .from('confluence_chunks')
          .upsert({
            page_id: page.page_id,
            attachment_id: null,
            chunk_index: i,
            content: chunks[i].content,
            token_count: chunks[i].token_count,
            embedding: embeddings[i],
            metadata: chunks[i].metadata,
            source_type: 'page',
          }, { onConflict: 'content_hash', ignoreDuplicates: !force })

        if (insertErr) {
          if (insertErr.code === '23505' && !force) skipped++
          else errors.push({ source_id: page.page_id, error: insertErr.message })
        } else {
          created++
        }
      }
    } catch (err) {
      errors.push({ source_id: page.page_id, error: String(err) })
    }
  }

  return jsonResult('confluence', created, skipped, errors, startTime)
}

// ============ Handler 2: Attachments ============
async function embedAttachments(
  supabase: ReturnType<typeof createClient>,
  voyageKey: string,
  force: boolean,
): Promise<Response> {
  const startTime = Date.now()

  const { data: attachments, error } = await supabase
    .from('confluence_attachments')
    .select('attachment_id, filename, page_id, media_type, extracted_text')
    .not('extracted_text', 'is', null)

  if (error) throw error

  let created = 0, skipped = 0
  const errors: Array<{ source_id: string; error: string }> = []

  for (const att of attachments || []) {
    try {
      const sourceType = att.media_type?.includes('pdf') ? 'pdf' : 'office'

      const chunks = chunkText(att.extracted_text, {
        attachment_id: att.attachment_id,
        filename: att.filename,
        parent_page_id: att.page_id,
        media_type: att.media_type,
      })

      if (chunks.length === 0) continue

      const embeddings = await embedBatch(chunks.map((c) => c.content), voyageKey)

      for (let i = 0; i < chunks.length; i++) {
        const { error: insertErr } = await supabase
          .from('confluence_chunks')
          .upsert({
            page_id: null,
            attachment_id: att.attachment_id,
            chunk_index: i,
            content: chunks[i].content,
            token_count: chunks[i].token_count,
            embedding: embeddings[i],
            metadata: chunks[i].metadata,
            source_type: sourceType,
          }, { onConflict: 'content_hash', ignoreDuplicates: !force })

        if (insertErr) {
          if (insertErr.code === '23505' && !force) skipped++
          else errors.push({ source_id: att.attachment_id, error: insertErr.message })
        } else {
          created++
        }
      }
    } catch (err) {
      errors.push({ source_id: att.attachment_id, error: String(err) })
    }
  }

  return jsonResult('attachments', created, skipped, errors, startTime)
}

// ============ Handler 3: Brands (C9 — verified block columns) ============
// blocks: type/heading/content(jsonb)/position/layout/page_id — confirmed live
// 2026-06-23. No is_published; filter via parent pages.status='published'.
function extractTextFromBlockContent(content: Record<string, unknown> | string): string {
  if (typeof content === 'string') return content
  if (!content || typeof content !== 'object') return ''

  const candidates = ['text', 'plain_text', 'html', 'body', 'content', 'markdown']
  for (const key of candidates) {
    const val = (content as Record<string, unknown>)[key]
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    }
  }

  const parts: string[] = []
  function walk(obj: unknown) {
    if (typeof obj === 'string') parts.push(obj)
    else if (Array.isArray(obj)) obj.forEach(walk)
    else if (obj && typeof obj === 'object') {
      Object.values(obj as Record<string, unknown>).forEach(walk)
    }
  }
  walk(content)
  return parts.join(' ').trim()
}

async function embedBrands(
  supabase: ReturnType<typeof createClient>,
  voyageKey: string,
  force: boolean,
): Promise<Response> {
  const startTime = Date.now()

  const { data: blocks, error } = await supabase
    .from('blocks')
    .select(`
      id,
      page_id,
      type,
      position,
      layout,
      heading,
      content,
      pages!inner (
        id,
        title,
        slug,
        brand_id,
        status
      )
    `)
    .eq('pages.status', 'published')
    .order('page_id')
    .order('position')

  if (error) throw error

  const { data: brands } = await supabase.from('brands').select('id, name, slug')
  const brandNameMap = new Map<string, string>()
  for (const b of brands || []) brandNameMap.set(b.id, b.name)

  let created = 0, skipped = 0
  const errors: Array<{ source_id: string; error: string }> = []

  for (const block of blocks || []) {
    const pageInfo = block.pages as {
      id: string
      title: string
      slug: string
      brand_id: string | null
    }
    const brandId = pageInfo?.brand_id
    if (!brandId) continue

    try {
      const blockTextBody = extractTextFromBlockContent(
        block.content as Record<string, unknown> | string,
      )

      const combinedText = [block.heading, blockTextBody]
        .filter((s) => s && String(s).trim().length > 0)
        .join('\n\n')

      if (!combinedText || combinedText.trim().length < 20) continue

      const chunks = chunkText(combinedText, {
        block_id: block.id,
        block_type: block.type,
        page_id: pageInfo.id,
        page_title: pageInfo.title,
        page_slug: pageInfo.slug,
        brand_id: brandId,
        brand_name: brandNameMap.get(brandId) || 'Unbekannt',
      })

      if (chunks.length === 0) continue

      const embeddings = await embedBatch(chunks.map((c) => c.content), voyageKey)

      for (let i = 0; i < chunks.length; i++) {
        const { error: insertErr } = await supabase
          .from('brand_chunks')
          .upsert({
            brand_id: brandId,
            page_id: pageInfo.id,
            block_id: block.id,
            chunk_index: i,
            content: chunks[i].content,
            token_count: chunks[i].token_count,
            embedding: embeddings[i],
            metadata: chunks[i].metadata,
          }, { onConflict: 'content_hash', ignoreDuplicates: !force })

        if (insertErr) {
          if (insertErr.code === '23505' && !force) skipped++
          else errors.push({ source_id: block.id, error: insertErr.message })
        } else {
          created++
        }
      }
    } catch (err) {
      errors.push({ source_id: block.id, error: String(err) })
    }
  }

  return jsonResult('brands', created, skipped, errors, startTime)
}

// ============ Handler 4: company_context ============
async function embedCompanyContext(
  supabase: ReturnType<typeof createClient>,
  voyageKey: string,
  force: boolean,
): Promise<Response> {
  const startTime = Date.now()

  const query = supabase
    .from('company_context')
    .select('id, category, topic, content, priority')
    .eq('is_active', true)

  if (!force) query.is('embedding', null)

  const { data: entries, error } = await query
  if (error) throw error

  let created = 0
  const errors: Array<{ source_id: string; error: string }> = []

  if (!entries || entries.length === 0) {
    return jsonResult('context', 0, 0, [], startTime)
  }

  // company_context rows are atomic — embed each row's content as one vector.
  const texts = entries.map((e) => e.content)
  const embeddings = await embedBatch(texts, voyageKey)

  for (let i = 0; i < entries.length; i++) {
    const { error: updateErr } = await supabase
      .from('company_context')
      .update({ embedding: embeddings[i] })
      .eq('id', entries[i].id)

    if (updateErr) errors.push({ source_id: entries[i].id, error: updateErr.message })
    else created++
  }

  return jsonResult('context', created, 0, errors, startTime)
}

// ============ Handler 5: approved corrections → confluence_chunks ============
async function embedApprovedCorrections(
  supabase: ReturnType<typeof createClient>,
  voyageKey: string,
  _force: boolean,
): Promise<Response> {
  const startTime = Date.now()

  const { data: corrections, error } = await supabase
    .from('ai_corrections')
    .select(`
      id, status, original_question, proposed_correction, final_content,
      correction_type, applied_to_chunk_id
    `)
    .in('status', ['approved', 'edited_approved'])
    .is('applied_to_chunk_id', null)

  if (error) throw error

  let created = 0
  const errors: Array<{ source_id: string; error: string }> = []

  for (const c of corrections || []) {
    try {
      const content = (c.status === 'edited_approved' && c.final_content)
        ? c.final_content
        : c.proposed_correction

      // Prefix with the original question so retrieval matches same-topic queries.
      const fullContent = `Frage: ${c.original_question}\n\nAntwort: ${content}`

      const chunks = chunkText(fullContent, {
        correction_id: c.id,
        correction_type: c.correction_type,
        original_question: c.original_question,
      })

      if (chunks.length === 0) continue

      const embeddings = await embedBatch(chunks.map((ch) => ch.content), voyageKey)

      const syntheticSourceId = `correction:${c.id}`

      for (let i = 0; i < chunks.length; i++) {
        const { data: inserted, error: insertErr } = await supabase
          .from('confluence_chunks')
          .insert({
            page_id: null,
            attachment_id: null,
            chunk_index: i,
            content: chunks[i].content,
            token_count: chunks[i].token_count,
            embedding: embeddings[i],
            metadata: { ...chunks[i].metadata, synthetic_source_id: syntheticSourceId },
            source_type: 'correction',
          })
          .select('id')
          .single()

        if (insertErr) {
          if (insertErr.code === '23505') continue
          errors.push({ source_id: c.id, error: insertErr.message })
        } else if (inserted && i === 0) {
          await supabase
            .from('ai_corrections')
            .update({
              applied_to_chunk_id: inserted.id,
              applied_at: new Date().toISOString(),
            })
            .eq('id', c.id)
          created++
        }
      }
    } catch (err) {
      errors.push({ source_id: c.id, error: String(err) })
    }
  }

  return jsonResult('corrections', created, 0, errors, startTime)
}

// ============ Handler 6: orchestrator ============
async function embedAll(
  supabase: ReturnType<typeof createClient>,
  voyageKey: string,
  force: boolean,
): Promise<Response> {
  const results: unknown[] = []
  const sources = ['context', 'confluence', 'attachments', 'brands', 'corrections']

  for (const source of sources) {
    try {
      let result: Response
      switch (source) {
        case 'context': result = await embedCompanyContext(supabase, voyageKey, force); break
        case 'confluence': result = await embedConfluence(supabase, voyageKey, force); break
        case 'attachments': result = await embedAttachments(supabase, voyageKey, force); break
        case 'brands': result = await embedBrands(supabase, voyageKey, force); break
        case 'corrections': result = await embedApprovedCorrections(supabase, voyageKey, force); break
        default: continue
      }
      results.push(await result.json())
    } catch (err) {
      results.push({ source, error: String(err) })
    }
  }

  return new Response(JSON.stringify({ source: 'all', results }), { headers: JSON_HEADERS })
}

// ============ Shared response shape ============
function jsonResult(
  source: string,
  created: number,
  skipped: number,
  errors: Array<{ source_id: string; error: string }>,
  startTime: number,
): Response {
  return new Response(
    JSON.stringify({
      source,
      chunks_created: created,
      chunks_skipped: skipped,
      errors,
      duration_ms: Date.now() - startTime,
    }),
    { headers: JSON_HEADERS },
  )
}
