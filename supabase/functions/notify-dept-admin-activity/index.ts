// ====================================================================
// notify-dept-admin-activity — D-111 audit notification. Emails all
// super_admins (EXCEPT the dev@ preview account) when a writer role performs a
// high-value action (folder create/delete/grant/revoke, file upload/delete,
// correction approve/reject, source create). Mirrors notify-folder-access.
//
// POST /functions/v1/notify-dept-admin-activity
// Body: {
//   actor_email: string,
//   actor_role: string,
//   action: string,            // e.g. 'folder.create'
//   resource_type: string,
//   resource_id: string,
//   resource_name?: string,
//   metadata?: Record<string, unknown>,
//   timestamp: string,
//   probe?: boolean            // health check: report key presence, send nothing
// }
//
// Best-effort: the caller (auditEvent) invokes this fire-and-forget and swallows
// failures, so a mail problem never fails the user action. Returns
// { ok:false, skipped:true } (200) when RESEND_API_KEY is not configured or there
// are no recipients.
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
const DEV_EMAIL_EXCLUDE = 'dev@airtuerk.de'

const ACTION_LABEL: Record<string, string> = {
  'folder.create': 'created a folder',
  'folder.delete': 'deleted a folder',
  'folder.grantAccess': 'granted folder access',
  'folder.revokeAccess': 'revoked folder access',
  'file.upload': 'uploaded a file',
  'file.delete': 'deleted a file',
  'correction.approve': 'approved an AI correction',
  'correction.reject': 'rejected an AI correction',
  'source.create': 'added a knowledge source',
}

function esc(s: string): string {
  return (s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

// Shared branded shell — kept consistent with notify-folder-access + the GoTrue
// auth templates (all-black monochrome, hosted PNG wordmark — Outlook can't SVG).
const FONT = '-apple-system,Segoe UI,Helvetica,Arial,sans-serif'
const LOGO = 'https://terminal.airtuerk.ai/logos/terminal/wordmark-email.png'
function shell(title: string, bodyHtml: string, footnote = 'airtuerk · terminal — Audit notification'): string {
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

interface Payload {
  actor_email?: string
  actor_role?: string
  action?: string
  resource_type?: string
  resource_id?: string
  resource_name?: string
  metadata?: Record<string, unknown>
  timestamp?: string
  probe?: boolean
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:4px 10px 4px 0;color:#8a8a8a;font-family:${FONT};font-size:13px;white-space:nowrap">${esc(label)}</td><td style="padding:4px 0;color:#18181b;font-family:${FONT};font-size:13px">${value}</td></tr>`
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: CORS })

  try {
    const p: Payload = await req.json()
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

    if (p.probe) {
      return new Response(JSON.stringify({ ok: true, hasResendKey: !!resendKey }), { headers: H })
    }
    if (!resendKey) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, error: 'RESEND_API_KEY not configured' }),
        { headers: H },
      )
    }
    if (!p.action || !p.resource_type || !p.resource_id) {
      return new Response(JSON.stringify({ ok: false, error: 'action, resource_type, resource_id required' }), { status: 400, headers: H })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Recipients: all super_admins EXCEPT the dev@ preview account.
    const { data: recipients, error: rErr } = await supabase
      .from('profiles')
      .select('email')
      .eq('role', 'super_admin')
      .neq('email', DEV_EMAIL_EXCLUDE)
    if (rErr) throw new Error(`recipients fetch failed: ${rErr.message}`)

    const to = (recipients ?? [])
      .map((r) => (r.email ?? '').trim())
      .filter((e) => e.length > 0)
    if (to.length === 0) {
      return new Response(JSON.stringify({ ok: false, skipped: true, error: 'no recipients' }), { headers: H })
    }

    const actionLabel = ACTION_LABEL[p.action] ?? p.action
    const actor = p.actor_email ?? 'A user'
    const subject = `[terminal] ${actor} ${actionLabel}`

    const metaHtml =
      p.metadata && Object.keys(p.metadata).length > 0
        ? `<pre style="background:#f5f5f5;padding:12px;border-radius:8px;font-size:12px;color:#333;overflow:auto;margin:14px 0 0">${esc(JSON.stringify(p.metadata, null, 2))}</pre>`
        : ''

    const html = shell('Activity notification', `
      <p style="font-size:14px;line-height:1.5;margin:0 0 14px">
        <b>${esc(actor)}</b>${p.actor_role ? ` (${esc(p.actor_role)})` : ''} ${esc(actionLabel)}.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%">
        ${row('Actor', `${esc(actor)}${p.actor_role ? ` — ${esc(p.actor_role)}` : ''}`)}
        ${row('Action', esc(p.action))}
        ${row('Resource', `${esc(p.resource_type)}${p.resource_name ? ` — ${esc(p.resource_name)}` : ''}`)}
        ${row('Resource ID', `<code>${esc(p.resource_id)}</code>`)}
        ${row('When', esc(p.timestamp ?? ''))}
      </table>
      ${metaHtml}`)

    const result = await sendEmail(resendKey, to, subject, html)
    return new Response(JSON.stringify({ ok: true, id: (result as { id?: string })?.id ?? null, recipients: to.length }), { headers: H })
  } catch (err) {
    console.error('notify-dept-admin-activity error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: H })
  }
})
