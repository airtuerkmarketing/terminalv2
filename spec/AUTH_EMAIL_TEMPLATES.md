# Auth email templates — invite, recovery, confirmation, email-change, magic-link

All five Supabase Auth (GoTrue) email templates, redesigned **2026-06-30** into a
single consistent, English, Outlook-safe branded shell (blue header bar + white
card + footer, bulletproof VML button). Every template links to the SSR-correct,
PKCE-safe `/auth/confirm?token_hash={{ .TokenHash }}&type=<type>` route
(`src/app/auth/confirm/route.ts` verifies the OTP server-side and sets the SSR
cookies). Recipients are M365/Outlook, hence the table layout + VML roundrect.

Live Auth config (verified 2026-06-30): `site_url = https://terminal.airtuerk.ai`,
SMTP = Resend (`smtp.resend.com:465`, sender `airtuerk terminal
<terminal@airtuerk.ai>`), `smtp_max_frequency = 60`, `mailer_otp_exp = 3600`
(links expire in 60 min), `mailer_autoconfirm = false`.

The two transactional edge-function emails (`notify-correction-event`,
`notify-folder-access`) share the same shell — see each function's `shell()`.

## Rollback snapshot (templates BEFORE 2026-06-30 redesign)

### RECOVERY (forgot-password) — subject: `Reset your password`

```html
<h2>Reset your password</h2>
<p>We received a request to reset your password. Follow the link below to choose a new one.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery">Reset password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
```

### INVITE (staff onboarding) — subject: `You've been invited`

```html
<h2>You've been invited</h2>
<p>You've been invited to create an account. Follow the link below to accept.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite">Accept invitation</a></p>
```

### CONFIRMATION (signup) — subject: `Willkommen bei airtuerk Terminal`

```html
<h2>Willkommen bei airtuerk Terminal</h2>

<p>Hallo {{ .Email }},</p>

<p>du wurdest zum airtuerk Brand- und Wissens-Hub eingeladen. Hier findest du Markenrichtlinien, Dokumente, Präsentationen und einen KI-Assistenten der Fragen zu unseren Marken und Produkten beantwortet.</p>

<p><a href="{{ .ConfirmationURL }}" style="background:#0A82DF;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Account aktivieren</a></p>

<p>Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:<br>
<a href="{{ .ConfirmationURL }}">{{ .ConfirmationURL }}</a></p>

<p>Bei Fragen melde dich gerne direkt.</p>

<p>Beste Grüße<br>
airtuerk Terminal Team</p>
```

### EMAIL CHANGE — subject: `Confirm your new email address`

```html
<h2>Confirm your new email address</h2>

<p>Follow the link below to confirm {{ .NewEmail }} as your new email address.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm new email address</a></p>

<p>If you didn't request this change, you can safely ignore this email.</p>
```

### MAGIC LINK — subject: `Your sign-in link`

```html
<h2>Your sign-in link</h2>

<p>Follow the link below to sign in. This link expires shortly and can only be used once.</p>
<p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
```

## New templates (current)

### RECOVERY (forgot-password) — subject: `Reset your password`

```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0">Use the link inside to choose a new password.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;margin:0;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb;overflow:hidden">
      <tr><td style="padding:28px 32px 4px">
        <img src="{{ .SiteURL }}/logos/terminal/wordmark-email.png" width="200" height="36" alt="airtuerk terminal" style="display:block;border:0;outline:none;text-decoration:none;height:36px;width:200px">
      </td></tr>
      <tr><td style="padding:20px 32px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
        <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;font-weight:700;color:#0b0b0b">Reset your password</h1>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b;">We received a request to reset the password for your airtuerk terminal account. Click the button below to choose a new one.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
          <tr><td align="center" bgcolor="#0b0b0b" style="border-radius:8px">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#0b0b0b"><w:anchorlock/><center style="color:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">Reset password</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- --><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery" style="display:inline-block;padding:12px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">Reset password</a><!--<![endif]-->
          </td></tr>
        </table>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">Button not working? Copy and paste this link into your browser:</p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;word-break:break-all;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery" style="color:#0b0b0b;text-decoration:underline">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery</a></p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">This link expires in 60 minutes and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #ececee">
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9aa0a6;margin:0">airtuerk · terminal — Brand &amp; Knowledge Hub</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### INVITE (staff onboarding) — subject: `You're invited to airtuerk terminal`

```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0">Activate your account and set your password.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;margin:0;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb;overflow:hidden">
      <tr><td style="padding:28px 32px 4px">
        <img src="{{ .SiteURL }}/logos/terminal/wordmark-email.png" width="200" height="36" alt="airtuerk terminal" style="display:block;border:0;outline:none;text-decoration:none;height:36px;width:200px">
      </td></tr>
      <tr><td style="padding:20px 32px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
        <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;font-weight:700;color:#0b0b0b">Welcome to airtuerk terminal</h1>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b;">You've been invited to airtuerk terminal — the airtuerk Brand &amp; Knowledge Hub, with brand guidelines, documents, presentations and an AI assistant for questions about our brands and products.</p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b;">Click below to activate your account and set your password.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
          <tr><td align="center" bgcolor="#0b0b0b" style="border-radius:8px">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#0b0b0b"><w:anchorlock/><center style="color:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">Activate account</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- --><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite" style="display:inline-block;padding:12px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">Activate account</a><!--<![endif]-->
          </td></tr>
        </table>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">Button not working? Copy and paste this link into your browser:</p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;word-break:break-all;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite" style="color:#0b0b0b;text-decoration:underline">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite</a></p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">This link expires in 60 minutes. If it has expired, ask your admin to resend the invitation. If you didn't expect this invitation, you can ignore this email.</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #ececee">
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9aa0a6;margin:0">airtuerk · terminal — Brand &amp; Knowledge Hub</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### CONFIRMATION (signup) — subject: `Confirm your email address`

```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0">Confirm your email to finish setting up your account.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;margin:0;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb;overflow:hidden">
      <tr><td style="padding:28px 32px 4px">
        <img src="{{ .SiteURL }}/logos/terminal/wordmark-email.png" width="200" height="36" alt="airtuerk terminal" style="display:block;border:0;outline:none;text-decoration:none;height:36px;width:200px">
      </td></tr>
      <tr><td style="padding:20px 32px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
        <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;font-weight:700;color:#0b0b0b">Confirm your email address</h1>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b;">Please confirm this is your email address to finish setting up your airtuerk terminal account.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
          <tr><td align="center" bgcolor="#0b0b0b" style="border-radius:8px">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#0b0b0b"><w:anchorlock/><center style="color:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">Confirm email</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- --><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup" style="display:inline-block;padding:12px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">Confirm email</a><!--<![endif]-->
          </td></tr>
        </table>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">Button not working? Copy and paste this link into your browser:</p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;word-break:break-all;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup" style="color:#0b0b0b;text-decoration:underline">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup</a></p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">This link expires in 60 minutes and can only be used once. If you didn't create an account, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #ececee">
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9aa0a6;margin:0">airtuerk · terminal — Brand &amp; Knowledge Hub</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### EMAIL CHANGE — subject: `Confirm your new email address`

```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0">Confirm the new email address for your account.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;margin:0;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb;overflow:hidden">
      <tr><td style="padding:28px 32px 4px">
        <img src="{{ .SiteURL }}/logos/terminal/wordmark-email.png" width="200" height="36" alt="airtuerk terminal" style="display:block;border:0;outline:none;text-decoration:none;height:36px;width:200px">
      </td></tr>
      <tr><td style="padding:20px 32px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
        <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;font-weight:700;color:#0b0b0b">Confirm your new email address</h1>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b;">We received a request to change the email address on your airtuerk terminal account to <strong>{{ .NewEmail }}</strong>. Click below to confirm this change.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
          <tr><td align="center" bgcolor="#0b0b0b" style="border-radius:8px">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#0b0b0b"><w:anchorlock/><center style="color:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">Confirm new email</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- --><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" style="display:inline-block;padding:12px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">Confirm new email</a><!--<![endif]-->
          </td></tr>
        </table>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">Button not working? Copy and paste this link into your browser:</p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;word-break:break-all;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change" style="color:#0b0b0b;text-decoration:underline">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change</a></p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">This link expires in 60 minutes and can only be used once. If you didn't request this change, you can safely ignore this email — your address will stay {{ .Email }}.</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #ececee">
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9aa0a6;margin:0">airtuerk · terminal — Brand &amp; Knowledge Hub</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

### MAGIC LINK — subject: `Your sign-in link`

```html
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;color:transparent;height:0;width:0">Your one-time link to sign in to airtuerk terminal.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f5f7;margin:0;padding:24px 12px">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;background:#ffffff;border-radius:14px;border:1px solid #e6e8eb;overflow:hidden">
      <tr><td style="padding:28px 32px 4px">
        <img src="{{ .SiteURL }}/logos/terminal/wordmark-email.png" width="200" height="36" alt="airtuerk terminal" style="display:block;border:0;outline:none;text-decoration:none;height:36px;width:200px">
      </td></tr>
      <tr><td style="padding:20px 32px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#18181b">
        <h1 style="font-size:20px;line-height:1.3;margin:0 0 16px;font-weight:700;color:#0b0b0b">Sign in to airtuerk terminal</h1>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 14px;color:#18181b;">Click below to sign in to your airtuerk terminal account.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0">
          <tr><td align="center" bgcolor="#0b0b0b" style="border-radius:8px">
            <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink" style="height:44px;v-text-anchor:middle;width:240px;" arcsize="18%" stroke="f" fillcolor="#0b0b0b"><w:anchorlock/><center style="color:#ffffff;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;">Sign in</center></v:roundrect><![endif]-->
            <!--[if !mso]><!-- --><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink" style="display:inline-block;padding:12px 28px;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">Sign in</a><!--<![endif]-->
          </td></tr>
        </table>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">Button not working? Copy and paste this link into your browser:</p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;word-break:break-all;"><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink" style="color:#0b0b0b;text-decoration:underline">{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink</a></p>
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:13px;line-height:1.6;margin:0 0 14px;color:#6b7280;">This link expires in 60 minutes and can only be used once. If you didn't request this link, you can safely ignore this email.</p>
      </td></tr>
      <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #ececee">
        <p style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;font-size:12px;line-height:1.5;color:#9aa0a6;margin:0">airtuerk · terminal — Brand &amp; Knowledge Hub</p>
      </td></tr>
    </table>
  </td></tr>
</table>
```

## Apply command (Management API)

Requires `SUPABASE_ACCESS_TOKEN`. Project ref `zkydrymygjrscjbhusxp`. The PATCH
body is the `{ mailer_subjects_*, mailer_templates_*_content }` map for all five
templates above. Generate the payload from the shared shell (single source of
truth) rather than hand-editing the HTML, then:

```bash
curl -s -X PATCH "https://api.supabase.com/v1/projects/zkydrymygjrscjbhusxp/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @auth-templates-payload.json
```

Verify after applying by re-reading the config and confirming each body contains
`/auth/confirm?token_hash=` and the blue header bar markup.
