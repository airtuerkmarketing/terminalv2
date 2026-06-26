# Auth email templates — invite & recovery (go-live step)

The onboarding flow (D-070, AP1) depends on the Supabase Auth **Invite** and
**Recovery** email templates pointing at the app's `/auth/confirm` route using the
SSR-correct `token_hash` + `type` params (PKCE-safe), instead of the stock
`{{ .ConfirmationURL }}` link (which dead-ends with no app handler).

**Apply this change only AFTER the `/auth/confirm` route is deployed to prod**
(i.e. after the branch is merged + Vercel has built `www.airtuerk.dev`). Applying
it earlier would make any invite sent in the gap link to a not-yet-deployed route.

Live Auth config already correct (verified 2026-06-26): `site_url =
https://www.airtuerk.dev`, `uri_allow_list` contains `https://www.airtuerk.dev/**`
(so `/auth/confirm` is allow-listed), SMTP = Resend (live), `mailer_autoconfirm =
false`.

## Rollback snapshot (templates BEFORE the change)

```
INVITE SUBJECT: You've been invited
INVITE BODY:
<h2>You've been invited</h2>
<p>You've been invited to create an account. Follow the link below to accept.</p>
<p><a href="{{ .ConfirmationURL }}">Accept invitation</a></p>

RECOVERY SUBJECT: Reset your password
RECOVERY BODY:
<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .ConfirmationURL }}">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

## New templates (to apply at go-live)

INVITE subject: `Willkommen bei terminal — Konto aktivieren`

INVITE body:
```html
<h2>Willkommen bei terminal</h2>
<p>Du wurdest eingeladen, ein Konto zu erstellen. Klicke auf den Link, um dein Passwort festzulegen und loszulegen.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Einladung annehmen</a></p>
<p>Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>
```

RECOVERY subject: `Passwort zurücksetzen — terminal`

RECOVERY body:
```html
<h2>Passwort zurücksetzen</h2>
<p>Wir haben eine Anfrage erhalten, dein Passwort zurückzusetzen. Klicke auf den Link, um ein neues zu wählen.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Passwort zurücksetzen</a></p>
<p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>
```

## Apply command (Management API)

Requires `SUPABASE_ACCESS_TOKEN`. Project ref `zkydrymygjrscjbhusxp`. Self-contained
(no external payload file — `scripts/` is gitignored):

```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/zkydrymygjrscjbhusxp/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_subjects_invite": "Willkommen bei terminal — Konto aktivieren",
    "mailer_templates_invite_content": "<h2>Willkommen bei terminal</h2>\n<p>Du wurdest eingeladen, ein Konto zu erstellen. Klicke auf den Link, um dein Passwort festzulegen und loszulegen.</p>\n<p><a href=\"{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite\">Einladung annehmen</a></p>\n<p>Falls du diese Einladung nicht erwartet hast, kannst du diese E-Mail ignorieren.</p>",
    "mailer_subjects_recovery": "Passwort zurücksetzen — terminal",
    "mailer_templates_recovery_content": "<h2>Passwort zurücksetzen</h2>\n<p>Wir haben eine Anfrage erhalten, dein Passwort zurückzusetzen. Klicke auf den Link, um ein neues zu wählen.</p>\n<p><a href=\"{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery\">Passwort zurücksetzen</a></p>\n<p>Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>"
  }'
```

Verify after applying by re-reading the config and confirming the bodies contain
`/auth/confirm?token_hash=`.
