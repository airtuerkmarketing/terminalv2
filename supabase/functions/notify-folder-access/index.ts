// ====================================================================
// notify-folder-access — transactional "you've been granted folder access"
// email, via the Resend HTTP API (mirrors notify-correction-event).
//
// POST /functions/v1/notify-folder-access
// Body: {
//   kind: 'document' | 'presentation',
//   folderId: string,
//   teamMemberId: string,
//   probe?: boolean        // health check: report key presence, send nothing
// }
//
// Looks up the team member's email + name and the folder's name + path with the
// service role (so it works regardless of the grantee's RLS), then sends a short
// branded email with a deep link to the folder.
//
// Best-effort: the caller (saveFolderAccess) invokes this fire-and-forget and
// swallows failures, so a mail problem never fails the grant. Returns
// { ok:false, skipped:true } (200) when RESEND_API_KEY is not configured.
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
const BASE_URL = 'https://terminal.airtuerk.ai'

function esc(s: string): string {
  return (s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
}

function shell(title: string, bodyHtml: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#18181b">
    <h2 style="font-size:18px;margin:0 0 12px">${esc(title)}</h2>
    ${bodyHtml}
    <p style="margin-top:24px;font-size:12px;color:#8a8a8a">airtuerk · terminal</p>
  </div>`
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
    const { kind, folderId, teamMemberId, probe } = await req.json()
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
    if (kind !== 'document' && kind !== 'presentation') {
      return new Response(JSON.stringify({ ok: false, error: 'kind must be document|presentation' }), { status: 400, headers: H })
    }
    if (!folderId || !teamMemberId) {
      return new Response(JSON.stringify({ ok: false, error: 'folderId and teamMemberId required' }), { status: 400, headers: H })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: member, error: mErr } = await supabase
      .from('team_members')
      .select('first_name, last_name, email')
      .eq('id', teamMemberId)
      .single()
    if (mErr || !member) throw new Error(`team member not found: ${teamMemberId}`)
    const to = (member.email ?? '').trim()
    if (!to) {
      // No address on file — nothing to send, but not an error (grant still stands).
      return new Response(JSON.stringify({ ok: false, skipped: true, error: 'no email on file' }), { headers: H })
    }

    const table = kind === 'document' ? 'document_folders' : 'presentation_folders'
    const { data: folder, error: fErr } = await supabase
      .from(table)
      .select('name, path')
      .eq('id', folderId)
      .single()
    if (fErr || !folder) throw new Error(`folder not found: ${folderId}`)

    const prefix = kind === 'document' ? '/documents-library/' : '/presentation-hub/'
    const link = `${BASE_URL}${prefix}${String(folder.path)
      .split('/')
      .map(encodeURIComponent)
      .join('/')}`

    const firstName = (member.first_name ?? '').trim()
    const greeting = firstName ? `Dear ${esc(firstName)},` : 'Hello,'
    const folderName = esc(folder.name ?? 'a folder')

    const html = shell('You have been granted folder access', `
      <p>${greeting}</p>
      <p>you have been granted access to <b>${folderName}</b> on terminal.</p>
      <p><a href="${link}" style="display:inline-block;background:#0A82DF;color:#fff;text-decoration:none;padding:9px 16px;border-radius:8px">Open folder</a></p>
      <p style="font-size:12px;color:#8a8a8a">Or paste this link into your browser:<br>${esc(link)}</p>`)

    const result = await sendEmail(resendKey, [to], 'You have been granted folder access on terminal', html)
    return new Response(JSON.stringify({ ok: true, id: (result as { id?: string })?.id ?? null }), { headers: H })
  } catch (err) {
    console.error('notify-folder-access error:', err)
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: H })
  }
})
