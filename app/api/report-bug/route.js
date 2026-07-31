/**
 * POST /api/report-bug
 *
 * Endpoint público del "bichito" reporta-bugs que vive en todas las páginas de
 * tools.wearebondy.com (ver app/_components/BugReporter.js).
 *
 * Cualquier visitante (candidato incluido) puede mandar un reporte. Se envía por
 * EMAIL a hello@wearebondy.com via Resend, reusando el mismo helper que
 * /api/notify-lead. NO toca Supabase ni Slack.
 *
 * Body: { message, email?, pageUrl?, userAgent?, hp? }
 *   - message  : descripción del bug (requerido, 3–4000 chars)
 *   - email    : email opcional de quien reporta (se usa como Reply-To)
 *   - pageUrl  : URL donde ocurrió (la manda el cliente automáticamente)
 *   - userAgent: navegador (lo manda el cliente automáticamente)
 *   - hp       : honeypot anti-spam (si viene con contenido, se descarta en silencio)
 *
 * No requiere secret: es un endpoint público de feedback. Protección: honeypot,
 * validación de longitud y caps de tamaño.
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const REPORT_EMAIL_TO = process.env.BUG_REPORT_EMAIL || 'hello@wearebondy.com'
const MAX_MESSAGE = 4000

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
    <td style="padding:6px 0; width:120px; font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:1.4px; text-transform:uppercase; color:#7A7874; vertical-align:top;">${escapeHtml(label)}</td>
    <td style="padding:6px 0; font-size:13px; color:#3A3530; word-break:break-word;">${escapeHtml(value)}</td>
  </tr>`
}

function buildEmailHtml({ message, email, pageUrl, userAgent }) {
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
              <td style="font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#4A8C40; font-weight:500;">🐛 BUG REPORTADO · tools.wearebondy.com</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 40px 0 40px;">
          <p style="margin:0 0 10px 0; font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:1.6px; text-transform:uppercase; color:#7A7874; font-weight:500;">Qué pasó</p>
          <div style="background:#FEFCF9; border-left:2px solid #4A8C40; padding:14px 18px;">
            <p style="margin:0; font-size:14px; line-height:1.7; color:#3A3530; white-space:pre-wrap;">${escapeHtml(message)}</p>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;"><hr style="border:none; border-top:1px solid #E8E4DE; margin:0;"></td></tr>
        <tr><td style="padding:16px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            ${row('Página', pageUrl)}
            ${row('Reporta', email || 'Anónimo')}
            ${row('Navegador', userAgent)}
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px 40px 40px;">
          <p style="margin:0; font-size:11px; color:#7A7874;">${email ? 'Reply a este email para responderle a quien reportó.' : 'El reporte es anónimo (no dejó email).'}</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#7A7874;">BONDY · wearebondy.com</p>
    </td></tr>
  </table>
</body>
</html>`
}

function buildEmailText({ message, email, pageUrl, userAgent }) {
  return [
    '🐛 BUG REPORTADO · tools.wearebondy.com',
    '═══════════════════',
    '',
    'QUÉ PASÓ',
    message,
    '',
    `Página:    ${pageUrl || '—'}`,
    `Reporta:   ${email || 'Anónimo'}`,
    `Navegador: ${userAgent || '—'}`,
  ].join('\n')
}

export async function POST(req) {
  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Honeypot: los bots suelen completar todos los campos. Si viene lleno,
  // devolvemos ok sin mandar nada (no le damos pistas al bot).
  if (body.hp) {
    return NextResponse.json({ ok: true })
  }

  const message = (body.message || '').toString().trim().slice(0, MAX_MESSAGE)
  const email = (body.email || '').toString().trim().slice(0, 200)
  const pageUrl = (body.pageUrl || '').toString().trim().slice(0, 500)
  const userAgent = (body.userAgent || '').toString().trim().slice(0, 400)

  if (message.length < 3) {
    return NextResponse.json({ error: 'Contanos un poco más qué pasó.' }, { status: 400 })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'El email no parece válido.' }, { status: 400 })
  }

  const payload = { message, email, pageUrl, userAgent }
  const emailRes = await sendEmail({
    to: REPORT_EMAIL_TO,
    subject: `🐛 Bug reportado en tools${email ? ` — ${email}` : ''}`,
    html: buildEmailHtml(payload),
    text: buildEmailText(payload),
    replyTo: email || undefined,
    headers: { 'X-Entity-Ref-ID': `bug-${Date.now()}` },
    tags: [
      { name: 'campaign', value: 'bug-report' },
      { name: 'source', value: 'tools_bichito' },
    ],
  })

  if (emailRes.skipped) {
    console.error('[report-bug] Resend skipped:', emailRes.reason)
    return NextResponse.json({ error: 'email_service_not_configured' }, { status: 503 })
  }
  if (!emailRes.ok) {
    console.error('[report-bug] send failed:', emailRes)
    return NextResponse.json({ error: 'send_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, email_id: emailRes.id })
}
