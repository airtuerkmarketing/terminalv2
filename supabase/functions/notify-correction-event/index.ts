// ====================================================================
// notify-correction-event — transactional emails for the correction loop
// (Wissensbasis Reviews), via the Resend HTTP API.
//
// POST /functions/v1/notify-correction-event
// Body: {
//   type: 'submitted' | 'approved' | 'edited_approved' | 'rejected',
//   correctionId: string,
//   reason?: string,        // for 'rejected'
//   probe?: boolean         // health check: report key presence, send nothing
// }
//   submitted        → email the reviewers (Selin + Murat)
//   approved/edited  → email the submitter ("übernommen")
//   rejected         → email the submitter ("abgelehnt: reason")
//
// Best-effort: callers (submitCorrection / approveCorrection / rejectCorrection)
// invoke fire-and-forget and swallow failures, so email never blocks the loop.
// Returns { ok:false, skipped:true } (200) if RESEND_API_KEY is not configured.
// ====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
}
const H = { ...CORS, ...JSON_HEADERS }

const FROM = 'airtuerk Intelligence <terminal@airtuerk.ai>'
const REVIEWERS = ['skoeroglu@airtuerk.de', 'msinim@airtuerk.de']
const REVIEWS_URL = 'https://terminal.airtuerk.ai/admin/knowledge?tab=reviews'

function esc(s: string): string {
  return (s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

// Shared branded shell — kept pixel-consistent with the GoTrue auth email
// templates (spec/AUTH_EMAIL_TEMPLATES.md): all-black monochrome, real terminal
// wordmark in the header (hosted PNG — Outlook can't render SVG), black accents.
const FONT = '-apple-system,Segoe UI,Helvetica,Arial,sans-serif'
const LOGO = 'https://terminal.airtuerk.ai/logos/terminal/wordmark-email.png'
function shell(title: string, bodyHtml: string, footnote = 'airtuerk · terminal — Wissensbasis'): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;margin:0;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb;overflow:hidden">
      <tr><td style="padding:28px 32px 4px">
        <img src="${LOGO}" width="200" height="36" alt="airtuerk terminal" style="display:block;border:0;outline:none;text-decoration:none;height:36px;width:200px;font-family:${FONT};font-size:22px;font-weight:700;color:#0b0b0b;line-height:36px">
      </td></tr>
      <tr><td style="padding:20px 32px 28px;font-family:${FONT};color:#18181b">
        <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;font-weight:700;color:#0b0b0b">${esc(title)}</h1>
        ${bodyHtml}
      </td></tr>
      <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #ececee">
        <p style="font-family:${FONT};font-size:12px;line-height:1.5;color:#9aa0a6;margin:0">${esc(footnote)}</p>
      </td></tr>
    </table>
  </td></tr>
</table>`
}

async function sendEmail(resendKey: string, to: string[], subject: string, html: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Resend ${res.status}: ${JSON.stringify(data)}`)
  return data
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  try {
    const { type, correctionId, reason, probe, to_override } = await req.json()
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''
    // One-shot verification override: when set, ALL mail goes to this address
    // instead of the normal recipients (used to test the pipeline without
    // emailing the real reviewers). Authenticated-internal only (verify_jwt).
    const overrideTo: string[] | null =
      typeof to_override === 'string' && to_override ? [to_override] : null

    if (probe) {
      return new Response(
        JSON.stringify({ ok: true, hasResendKey: !!resendKey, reviewers: REVIEWERS }),
        { headers: H },
      )
    }
    if (!resendKey) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, error: 'RESEND_API_KEY not configured' }),
        { headers: H },
      )
    }
    if (!type || !correctionId) {
      return new Response(JSON.stringify({ ok: false, error: 'type and correctionId required' }), {
        status: 400,
        headers: H,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data: corr, error } = await supabase
      .from('ai_corrections')
      .select('original_question, proposed_correction, final_content, submitted_by')
      .eq('id', correctionId)
      .single()
    if (error || !corr) throw new Error(`correction not found: ${correctionId}`)

    const question = esc(corr.original_question ?? '')
    let result: { id?: string } | undefined

    if (type === 'submitted') {
      const proposed = esc(corr.proposed_correction ?? '')
      const html = shell('Neue Wissens-Korrektur wartet auf Review', `
        <p><b>Frage:</b> ${question}</p>
        <p style="background:#f7f7f7;border-radius:8px;padding:12px"><b>Vorgeschlagene Korrektur:</b><br>${proposed}</p>
        <p><a href="${REVIEWS_URL}" style="display:inline-block;background:#0b0b0b;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px">Review öffnen</a></p>`)
      result = await sendEmail(resendKey, overrideTo ?? REVIEWERS, 'Neue Wissens-Korrektur wartet', html)
    } else {
      const { data: prof } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', corr.submitted_by)
        .single()
      const to = (prof as { email?: string } | null)?.email
      if (!to) throw new Error('submitter email not found')

      if (type === 'approved' || type === 'edited_approved') {
        const finalText = esc(corr.final_content ?? corr.proposed_correction ?? '')
        const html = shell('Deine Korrektur wurde übernommen ✓', `
          <p><b>Frage:</b> ${question}</p>
          <p style="background:#e9f7ee;border-radius:8px;padding:12px">${finalText}</p>
          <p>Die KI nutzt diese Information ab sofort. Danke für deinen Beitrag!</p>`)
        result = await sendEmail(resendKey, overrideTo ?? [to], 'Deine Korrektur wurde übernommen', html)
      } else if (type === 'rejected') {
        const html = shell('Deine Korrektur wurde nicht übernommen', `
          <p><b>Frage:</b> ${question}</p>
          <p><b>Begründung:</b> ${esc(reason ?? '—')}</p>
          <p>Bei Rückfragen melde dich bei Murat oder Selin.</p>`)
        result = await sendEmail(resendKey, overrideTo ?? [to], 'Deine Korrektur wurde abgelehnt', html)
      } else {
        return new Response(JSON.stringify({ ok: false, error: `unknown type: ${type}` }), {
          status: 400,
          headers: H,
        })
      }
    }

    return new Response(JSON.stringify({ ok: true, id: result?.id ?? null }), { headers: H })
  } catch (err) {
    console.error('notify-correction-event error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: H })
  }
})
