/**
 * POST /api/notify-referral
 *
 * Cuando alguien refiere un candidato via /referrals:
 *   1. Email "gracias por referir" al referrer (vía Resend) — explica el flujo y bonus
 *   2. Post a Slack #candidatos-inbound (mismo canal que talent_pool)
 *
 * Autenticado con x-notify-secret.
 * Body: { referral_id, referrer_name, referrer_email, referee_name, referee_linkedin?, message? }
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTIFY_LEAD_SECRET = process.env.NOTIFY_LEAD_SECRET || 'bondy-notify-lead-internal'
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''
const SLACK_CHANNEL = process.env.SLACK_CANDIDATES_CHANNEL_ID || ''

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function thankYouHtml({ referrerName, refereeName }) {
  const firstName = String(referrerName || '').split(' ')[0] || 'amiga'
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"></head>
<body style="margin:0; padding:0; background:#FEFCF9; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="padding:40px 20px; background:#FEFCF9;">
    <tr><td align="center">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; background:#FFFFFF; border:1px solid #E8E4DE;">
        <tr><td style="padding:36px 40px 0 40px;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="padding-right:10px;"><span style="display:inline-block; width:18px; height:1px; background:#4A8C40; vertical-align:middle;"></span></td>
              <td style="font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#4A8C40; font-weight:500;">BONDY · REFERRAL</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:18px 40px 0 40px;">
          <h1 style="margin:0; font-family:'Special Elite', 'Courier Prime', Georgia, serif; font-size:28px; line-height:1.2; color:#3A3530; font-weight:normal;">Gracias por referir a ${escapeHtml(refereeName)}</h1>
        </td></tr>
        <tr><td style="padding:20px 40px 0 40px;">
          <p style="margin:0; font-size:15px; line-height:1.7; color:#5A5550;">Hola ${escapeHtml(firstName)},</p>
          <p style="margin:14px 0 0 0; font-size:15px; line-height:1.7; color:#5A5550;">
            Recibimos tu referencia. Le vamos a escribir en los próximos días para ver si hay match con alguna búsqueda activa.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;">
          <div style="background:rgba(74,140,64,0.06); border-left:2px solid #4A8C40; padding:18px 20px;">
            <p style="margin:0 0 6px 0; font-family:-apple-system, sans-serif; font-size:10px; letter-spacing:1.6px; text-transform:uppercase; color:#4A8C40; font-weight:500;">CÓMO SIGUE</p>
            <ol style="margin:8px 0 0 18px; padding:0; font-size:14px; line-height:1.7; color:#3A3530;">
              <li>Contactamos a ${escapeHtml(refereeName)}.</li>
              <li>Si entra a un proceso y se concreta una contratación, te pagamos <strong>USD 1.000</strong>.</li>
              <li>Te avisamos a vos en cada paso.</li>
            </ol>
          </div>
        </td></tr>
        <tr><td style="padding:24px 40px 0 40px;">
          <p style="margin:0; font-size:13px; line-height:1.7; color:#5A5550;">
            Si tenés más perfiles para referir, podés volver a usar el form en
            <a href="https://wearebondy.com/es/referrals" style="color:#4A8C40;">wearebondy.com/es/referrals</a>.
          </p>
        </td></tr>
        <tr><td style="padding:32px 40px 0 40px;"><hr style="border:none; border-top:1px solid #E8E4DE; margin:0;"></td></tr>
        <tr><td style="padding:22px 40px 40px 40px;">
          <p style="margin:0; font-size:12px; color:#5A5550;">Mara Schmitman · Founder</p>
          <p style="margin:8px 0 0 0; font-size:11px; color:#7A7874;">Si tenés preguntas, respondé este email.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#7A7874;">BONDY · wearebondy.com</p>
    </td></tr>
  </table>
</body>
</html>`
}

function thankYouText({ referrerName, refereeName }) {
  const firstName = String(referrerName || '').split(' ')[0] || ''
  return `BONDY · REFERRAL

Gracias por referir a ${refereeName}

Hola ${firstName},

Recibimos tu referencia. Le vamos a escribir a ${refereeName} en los próximos días para ver si hay match con alguna búsqueda activa.

CÓMO SIGUE
1. Contactamos a ${refereeName}.
2. Si entra a un proceso y se concreta una contratación, te pagamos USD 1.000.
3. Te avisamos a vos en cada paso.

Si tenés más perfiles para referir: https://wearebondy.com/es/referrals

— Mara Schmitman · Founder
Bondy · wearebondy.com`
}

async function postSlack({ referralId, referrerName, referrerEmail, refereeName, refereeLinkedin, message }) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL) {
    console.warn('[notify-referral] SLACK env missing, skipping')
    return { skipped: true }
  }
  const lines = [
    `🤝 *Nuevo referral en /referrals*`,
    `*Refiere:* ${referrerName} (<mailto:${referrerEmail}|${referrerEmail}>)`,
    `*Refiere a:* ${refereeName}${refereeLinkedin ? ` — <${refereeLinkedin}|LinkedIn>` : ''}`,
  ]
  if (message) {
    const trimmed = String(message).slice(0, 400)
    lines.push('', `> ${trimmed.replace(/\n/g, '\n> ')}`)
  }
  if (referralId) lines.push('', `_ID: ${referralId}_`)

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text: lines.join('\n'),
      unfurl_links: false,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) console.error('[notify-referral] slack failed', data)
  return data
}

export async function POST(req) {
  const auth = req.headers.get('x-notify-secret')
  if (auth !== NOTIFY_LEAD_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { referral_id, referrer_name, referrer_email, referee_name, referee_linkedin, message } = body || {}
  if (!referrer_email || !referrer_name || !referee_name) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // Email "gracias" al referrer
  const emailRes = await sendEmail({
    to: referrer_email,
    subject: `Gracias por referir a ${referee_name}`,
    html: thankYouHtml({ referrerName: referrer_name, refereeName: referee_name }),
    text: thankYouText({ referrerName: referrer_name, refereeName: referee_name }),
    headers: { 'X-Entity-Ref-ID': `referral-${referral_id || Date.now()}` },
    tags: [{ name: 'campaign', value: 'referral-thank-you' }],
  })

  // Slack notify
  const slackRes = await postSlack({
    referralId: referral_id,
    referrerName: referrer_name,
    referrerEmail: referrer_email,
    refereeName: referee_name,
    refereeLinkedin: referee_linkedin,
    message,
  })

  return NextResponse.json({
    ok: true,
    email_sent: !!emailRes.ok,
    slack_posted: !slackRes.skipped && slackRes.ok !== false,
  })
}
