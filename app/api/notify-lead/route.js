/**
 * POST /api/notify-lead
 *
 * Notifica leads de /contact (wearebondy.com) por EMAIL a hello@wearebondy.com.
 * NO postea a Slack — esa responsabilidad la tiene la edge function
 * `notify-new-lead` de Supabase (ver docs/notifications.md).
 *
 * ─────────────────────────────────────────────────────────────────
 * CONTEXTO HISTÓRICO (mayo 2026):
 *
 * Originalmente este endpoint usaba Gmail OAuth (mara@wearebondy.com) para mandar
 * el mail a hello@. Los access tokens expiraban silenciosamente y los leads
 * morían sin notificación. Lo migramos a Resend.
 *
 * En una iteración intermedia este endpoint también intentaba postear a Slack
 * #comercial, lo que duplicaba el post que ya hace la edge function
 * notify-new-lead (disparada por DB trigger on_new_contact_lead). Sacamos esa
 * lógica para evitar el doble post.
 *
 * Pipeline actual de /contact:
 *   1. POST /api/contact (bondy-new-site) → valida Turnstile + inserta en contact_leads
 *   2. POST /api/notify-lead (este archivo) → email a hello@ via Resend
 *   3. DB trigger on_new_contact_lead → edge function notify-new-lead → Slack #comercial
 *      con botones de clasificación (prospect / spam / out_of_scope)
 *
 * Si necesitás cambiar algo del post a Slack, editá la edge function
 * `notify-new-lead`, NO este archivo.
 * ─────────────────────────────────────────────────────────────────
 *
 * Autenticación: header x-notify-secret == NOTIFY_LEAD_SECRET
 * Body: { name, email, message, company?, role?, service?, lang? }
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTIFY_LEAD_SECRET = process.env.NOTIFY_LEAD_SECRET || 'bondy-notify-lead-internal'
const NOTIFY_EMAIL_TO = process.env.NOTIFY_LEAD_EMAIL || 'hello@wearebondy.com'

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function row(label, value) {
  if (!value) return ''
  return `<tr>
    <td style="padding:6px 0; width:130px; font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:1.4px; text-transform:uppercase; color:#7A7874;">${escapeHtml(label)}</td>
    <td style="padding:6px 0; font-size:14px; color:#3A3530;">${escapeHtml(value)}</td>
  </tr>`
}

function buildEmailHtml(lead) {
  const { name, email, company, role, service, message, lang } = lead
  const langLabel = lang === 'en' ? '🇺🇸 English' : '🇦🇷 Español'

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#FEFCF9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:40px 20px; background:#FEFCF9;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="max-width:600px; background:#FFFFFF; border:1px solid #E8E4DE;">
        <tr><td style="padding:36px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding-right:10px;"><span style="display:inline-block; width:18px; height:1px; background:#4A8C40; vertical-align:middle;"></span></td>
              <td style="font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#4A8C40; font-weight:500;">NUEVO LEAD · /contact</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 40px 0 40px;">
          <h1 style="margin:0; font-family:'Special Elite', 'Courier Prime', Georgia, serif; font-size:28px; line-height:1.2; color:#3A3530; font-weight:normal;">${escapeHtml(name)}</h1>
          <p style="margin:6px 0 0 0; font-size:14px; color:#5A5550;"><a href="mailto:${escapeHtml(email)}" style="color:#4A8C40; text-decoration:none;">${escapeHtml(email)}</a></p>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;"><hr style="border:none; border-top:1px solid #E8E4DE; margin:0;"></td></tr>
        <tr><td style="padding:20px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${row('Empresa', company)}
            ${row('Rol', role)}
            ${row('Servicio', service)}
            ${row('Idioma', langLabel)}
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px 0 40px;"><hr style="border:none; border-top:1px solid #E8E4DE; margin:0;"></td></tr>
        <tr><td style="padding:20px 40px 0 40px;">
          <p style="margin:0 0 10px 0; font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:1.6px; text-transform:uppercase; color:#7A7874; font-weight:500;">Mensaje</p>
          <div style="background:#FEFCF9; border-left:2px solid #4A8C40; padding:14px 18px;">
            <p style="margin:0; font-size:14px; line-height:1.7; color:#3A3530; white-space:pre-wrap;">${escapeHtml(message || '—')}</p>
          </div>
        </td></tr>
        <tr><td style="padding:28px 40px 8px 40px;">
          <p style="margin:0; font-size:11px; color:#7A7874;">Reply a este email para responderle al lead directamente.</p>
        </td></tr>
        <tr><td style="padding:8px 40px 40px 40px;">
          <p style="margin:0; font-size:11px; color:#7A7874;">El post en Slack #comercial con botones de clasificación llega aparte (edge function notify-new-lead).</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#7A7874;">BONDY · wearebondy.com</p>
    </td></tr>
  </table>
</body>
</html>`
}

function buildEmailText(lead) {
  const { name, email, company, role, service, message } = lead
  return [
    'NUEVO LEAD · /contact',
    '═══════════════════',
    '',
    name,
    email,
    '',
    company ? `Empresa: ${company}` : null,
    role ? `Rol: ${role}` : null,
    service ? `Servicio: ${service}` : null,
    '',
    'MENSAJE',
    message || '—',
    '',
    '—',
    'Reply a este email para responderle al lead.',
  ].filter((l) => l !== null).join('\n')
}

export async function POST(req) {
  const authHeader = req.headers.get('x-notify-secret')
  if (authHeader !== NOTIFY_LEAD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let lead
  try {
    lead = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, email, message } = lead
  if (!name || !email || !message) {
    return NextResponse.json(
      { error: 'Missing required fields: name, email, message' },
      { status: 400 }
    )
  }

  // Email a hello@ via Resend. NO postea a Slack — eso lo hace la edge function.
  const subject = `🟢 Nuevo lead: ${name}${lead.company ? ` (${lead.company})` : ''}`
  const html = buildEmailHtml(lead)
  const text = buildEmailText(lead)

  const emailRes = await sendEmail({
    to: NOTIFY_EMAIL_TO,
    subject,
    html,
    text,
    headers: {
      'Reply-To': email,
      'X-Entity-Ref-ID': `lead-${Date.now()}`,
    },
    tags: [
      { name: 'campaign', value: 'lead-notification' },
      { name: 'source', value: 'contact_form' },
    ],
  })

  if (emailRes.skipped) {
    console.error('[notify-lead] Resend skipped:', emailRes.reason)
    return NextResponse.json({ error: 'email_service_not_configured' }, { status: 503 })
  }
  if (!emailRes.ok) {
    console.error('[notify-lead] send failed:', emailRes)
    return NextResponse.json({ error: 'send_failed', detail: emailRes }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email_id: emailRes.id })
}
