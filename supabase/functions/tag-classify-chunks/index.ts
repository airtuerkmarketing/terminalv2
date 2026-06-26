// ====================================================================
// tag-classify-chunks — classify company_context chunks into the approved
// tag vocabulary using Claude Haiku 4.5 (D-067). Writes company_context.tags
// (only values that exist in tag_vocabulary — hallucination-guarded) and routes
// genuinely-new proposals to tag_suggestions for super_admin review (Tab 4).
// Tags do NOT affect retrieval (admin-view organisation only).
//
// POST /functions/v1/tag-classify-chunks
// Body: { mode?: 'company'|'single', chunk_id?: string, force?: boolean }
//   company (default): all active company_context rows; untagged only unless force
//   single: one row by chunk_id
// Response: { ok, processed, tagged, suggestions_created, errors[] }
// ====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
}
const H = { ...CORS, ...JSON_HEADERS }
const MODEL = 'claude-haiku-4-5-20251001'
const AXES = ['topics', 'airlines', 'departments', 'providers', 'brands'] as const
const SINGULAR: Record<string, string> = {
  topics: 'topic',
  airlines: 'airline',
  departments: 'department',
  providers: 'provider',
  brands: 'brand',
}

async function classify(
  apiKey: string,
  vocab: Record<string, string[]>,
  title: string,
  content: string,
): Promise<Record<string, unknown>> {
  const vocabBlock = AXES.map((a) => `${a.toUpperCase()}: ${vocab[a].join(', ') || '(keine)'}`).join('\n')
  const prompt =
    `Du bist Tagging-Engine für airtuerks Wissensbasis. Klassifiziere den Chunk NUR in das vorgegebene Vokabular.\n\n` +
    `VOKABULAR (nur diese Werte erlaubt):\n${vocabBlock}\n\n` +
    `REGELN:\n- Max 3 Werte pro Achse.\n- Nur 100% passende Werte taggen, lieber leer als raten.\n` +
    `- Klar passende Werte, die im Vokabular fehlen → in suggested_new.\n- Antworte NUR mit kompaktem JSON.\n\n` +
    `CHUNK:\nTitel: ${title}\nText: """${content.slice(0, 2000)}"""\n\n` +
    `JSON-Format:\n{"topics":[],"airlines":[],"departments":[],"providers":[],"brands":[],` +
    `"suggested_new":{"topics":[],"airlines":[],"departments":[],"providers":[],"brands":[]}}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: 400, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const text: string = data.content?.[0]?.text ?? '{}'
  return JSON.parse(text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim())
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  try {
    const body = await req.json().catch(() => ({}))
    const mode: string = body.mode ?? 'company'
    const force: boolean = body.force ?? false
    const chunkId: string | undefined = body.chunk_id

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ ok: false, error: 'ANTHROPIC_API_KEY not configured' }), { status: 500, headers: H })
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: vocabRows } = await supabase.from('tag_vocabulary').select('axis, value').not('approved_at', 'is', null)
    const vocab: Record<string, string[]> = { topics: [], airlines: [], departments: [], providers: [], brands: [] }
    const allowed: Record<string, Set<string>> = {
      topic: new Set(), airline: new Set(), department: new Set(), provider: new Set(), brand: new Set(),
    }
    for (const r of (vocabRows ?? []) as Array<{ axis: string; value: string }>) {
      const plural = AXES.find((a) => SINGULAR[a] === r.axis)
      if (plural) {
        vocab[plural].push(r.value)
        allowed[r.axis].add(r.value)
      }
    }

    const { data: rows, error } = await supabase
      .from('company_context')
      .select('id, topic, content, tags')
      .eq('is_active', true)
    if (error) throw error

    let targets = (rows ?? []) as Array<{ id: string; topic: string; content: string; tags: Record<string, unknown> | null }>
    if (mode === 'single' && chunkId) targets = targets.filter((c) => c.id === chunkId)
    else if (!force) targets = targets.filter((c) => !c.tags || Object.keys(c.tags).length === 0)

    let tagged = 0
    let suggestionsCreated = 0
    const seenSug = new Set<string>()
    const errors: Array<{ id: string; error: string }> = []
    const CONC = 6

    for (let i = 0; i < targets.length; i += CONC) {
      const batch = targets.slice(i, i + CONC)
      await Promise.all(
        batch.map(async (c) => {
          try {
            const out = await classify(apiKey, vocab, c.topic, c.content)
            const tags: Record<string, string[]> = {}
            for (const a of AXES) {
              const arr = Array.isArray(out[a]) ? (out[a] as string[]) : []
              const valid = arr.filter((v) => allowed[SINGULAR[a]].has(v)).slice(0, 3)
              if (valid.length) tags[a] = valid
            }
            await supabase.from('company_context').update({ tags }).eq('id', c.id)
            tagged++

            const sn = (out.suggested_new ?? {}) as Record<string, unknown>
            for (const a of AXES) {
              const arr = Array.isArray(sn[a]) ? (sn[a] as string[]) : []
              for (const v of arr) {
                const singular = SINGULAR[a]
                const key = `${singular}:${v}`
                if (typeof v === 'string' && v && !allowed[singular].has(v) && !seenSug.has(key)) {
                  seenSug.add(key)
                  await supabase.from('tag_suggestions').insert({
                    axis: singular,
                    suggested_value: v,
                    source_chunk_id: c.id,
                    source_chunk_table: 'company_context',
                    context_excerpt: c.topic,
                  })
                  suggestionsCreated++
                }
              }
            }
          } catch (err) {
            errors.push({ id: c.id, error: String(err) })
          }
        }),
      )
    }

    return new Response(
      JSON.stringify({ ok: true, processed: targets.length, tagged, suggestions_created: suggestionsCreated, errors }),
      { headers: H },
    )
  } catch (err) {
    console.error('tag-classify-chunks error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: H })
  }
})
