// ====================================================================
// notify-password-changed — security notification email sent when a user
// changes their password (forgot-password reset, forced change, or self-serve),
// via the Resend HTTP API. Mirrors notify-folder-access.
//
// POST /functions/v1/notify-password-changed
// Body: {
//   userId: string,        // auth user id whose password changed
//   probe?: boolean        // health check: report key presence, send nothing
// }
//
// Looks up the account's email with the service role (so it works regardless of
// the caller's RLS), then sends a short branded "your password was changed" email
// with a security note. This is the "informing the user" step of the reset flow.
//
// Best-effort: the caller (updatePasswordAction) invokes this fire-and-forget in
// after() and swallows failures, so a mail problem never fails the password save.
// Returns { ok:false, skipped:true } (200) when RESEND_API_KEY is not configured.
// ====================================================================

import { createClient } from 'jsr:@supabase/supabase-js@2'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST',
}
const H = { ...CORS, ...JSON_HEADERS }

const FROM = 'airtuerk terminal <terminal@airtuerk.ai>'
const SUPPORT = 'bdemir@airtuerk.de'
const LOGIN_URL = 'https://terminal.airtuerk.ai/login'
const LOGO = 'https://terminal.airtuerk.ai/logos/terminal/wordmark-email.png'
const FONT = '-apple-system,Segoe UI,Helvetica,Arial,sans-serif'

function esc(s: string): string {
  return (s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

// Shared branded shell — pixel-consistent with the GoTrue auth email templates
// (spec/AUTH_EMAIL_TEMPLATES.md): all-black monochrome, real terminal wordmark
// in the header (hosted PNG — Outlook can't render SVG), black accents.
function shell(title: string, bodyHtml: string, footnote = 'airtuerk · terminal — Brand & Knowledge Hub'): string {
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
    const { userId, probe } = await req.json()
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

    if (probe) {
      return new Response(JSON.stringify({ ok: true, hasResendKey: !!resendKey }), { headers: H })
    }
    if (!resendKey) {
      return new Response(
        JSON.stringify({ ok: false, skipped: true, error: 'RESEND_API_KEY not configured' }),
        { headers: H },
      )
    }
    if (!userId) {
      return new Response(JSON.stringify({ ok: false, error: 'userId required' }), { status: 400, headers: H })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Resolve the account email from the auth user (service role — not RLS-bound).
    const { data: got, error: uErr } = await supabase.auth.admin.getUserById(userId)
    const to = (got?.user?.email ?? '').trim()
    if (uErr || !to) {
      // No address on file — nothing to send, but not an error (password still changed).
      return new Response(JSON.stringify({ ok: false, skipped: true, error: 'no email on file' }), { headers: H })
    }

    // Optional first name for a warmer greeting.
    const { data: prof } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', userId)
      .single()
    const firstName = ((prof as { first_name?: string } | null)?.first_name ?? '').trim()
    const greeting = firstName ? `Hi ${esc(firstName)},` : 'Hi,'

    const html = shell('Your password was changed', `
      <p style="font-family:${FONT};font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b">${greeting}</p>
      <p style="font-family:${FONT};font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b">the password for your airtuerk terminal account (<strong>${esc(to)}</strong>) was just changed. If this was you, you're all set — no further action is needed.</p>
      <p style="font-family:${FONT};font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b">You can sign in here: <a href="${LOGIN_URL}" style="color:#0b0b0b;text-decoration:underline">${LOGIN_URL}</a></p>
      <p style="font-family:${FONT};font-size:13px;line-height:1.6;margin:16px 0 0;color:#6b7280">If you did <strong>not</strong> change your password, your account may be at risk — contact <a href="mailto:${SUPPORT}" style="color:#0b0b0b;text-decoration:underline">${SUPPORT}</a> immediately.</p>`)

    const result = await sendEmail(resendKey, [to], 'Your password was changed', html)
    return new Response(JSON.stringify({ ok: true, id: (result as { id?: string })?.id ?? null }), { headers: H })
  } catch (err) {
    console.error('notify-password-changed error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: H })
  }
})
