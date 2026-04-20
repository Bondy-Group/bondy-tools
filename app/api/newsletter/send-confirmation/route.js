/**
 * POST /api/newsletter/send-confirmation
 *
 * Envía el email de confirmación (double opt-in) al suscriptor nuevo del
 * newsletter. Reutiliza el Gmail OAuth de mara@wearebondy.com (mismo sender
 * que /api/notify-lead). El "From" se muestra como "Bondy Thinking".
 *
 * Autenticado con el mismo x-notify-secret que notify-lead. Body:
 *   { email: string, lang: 'en'|'es', confirm_url: string }
 */
import { NextResponse } from 'next/server'
import { getValidAccessToken, sendGmailEmail } from '@/lib/gmail'

const NOTIFY_LEAD_SECRET = process.env.NOTIFY_LEAD_SECRET || 'bondy-notify-lead-internal'
const SENDER_EMAIL = 'mara@wearebondy.com'
const SENDER_NAME = 'Bondy Thinking'

function buildConfirmationHtml({ lang, confirmUrl }) {
  const isES = lang === 'es'

  const L = isES
    ? {
        preheader: 'Confirmá tu suscripción a Bondy Thinking.',
        kicker: 'NEWSLETTER',
        title: 'Confirmá tu suscripción',
        intro: 'Gracias por suscribirte a Bondy Thinking — nuestras notas editoriales sobre recruiting técnico, el mercado de engineering en LATAM y cómo trabajamos.',
        instruction: 'Para completar la suscripción, hacé click acá:',
        cta: 'Confirmar suscripción',
        fallbackText: 'Si el botón no funciona, copiá este link en tu navegador:',
        cadence: 'Una perspectiva cada dos semanas. Sin spam, sin venta.',
        notYou: 'Si no te suscribiste, ignorá este mail — no pasa nada.',
        signoff: 'Mara Schmitman · Founder',
      }
    : {
        preheader: 'Confirm your Bondy Thinking subscription.',
        kicker: 'NEWSLETTER',
        title: 'Confirm your subscription',
        intro: 'Thanks for subscribing to Bondy Thinking — our editorial notes on technical hiring, the LATAM engineering market, and how we work.',
        instruction: 'To complete your subscription, click here:',
        cta: 'Confirm subscription',
        fallbackText: 'If the button doesn\'t work, copy this link in your browser:',
        cadence: 'A perspective every other week. No spam, no sales pitch.',
        notYou: 'If you didn\'t subscribe, just ignore this email.',
        signoff: 'Mara Schmitman · Founder',
      }

  return `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${L.title}</title>
</head>
<body style="margin:0; padding:0; background:#FEFCF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;">
  <span style="display:none; overflow:hidden; line-height:1px; opacity:0; max-height:0; max-width:0;">${L.preheader}</span>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background:#FEFCF9; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" style="max-width:560px; background:#FFFFFF; border:1px solid #E8E4DE;">
          <tr>
            <td style="padding:40px 40px 8px 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-right:10px;">
                    <span style="display:inline-block; width:18px; height:1px; background:#4A8C40; vertical-align:middle;"></span>
                  </td>
                  <td style="font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; font-size:10px; letter-spacing:2.5px; text-transform:uppercase; color:#4A8C40; font-weight:500;">
                    ${L.kicker}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0 40px;">
              <h1 style="margin:0; font-family:'Special Elite', 'Courier Prime', Georgia, serif; font-size:32px; line-height:1.15; color:#3A3530; font-weight:normal;">
                ${L.title}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0; font-size:15px; line-height:1.65; color:#5A5550;">
                ${L.intro}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <p style="margin:0; font-size:15px; line-height:1.65; color:#5A5550;">
                ${L.instruction}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:#4A8C40;">
                    <a href="${confirmUrl}" style="display:inline-block; padding:14px 28px; font-size:11px; letter-spacing:1.4px; text-transform:uppercase; color:#FFFFFF; text-decoration:none; font-weight:500;">
                      ${L.cta} &rarr;
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <p style="margin:0 0 6px 0; font-size:12px; color:#7A7874;">${L.fallbackText}</p>
              <p style="margin:0; font-size:12px; color:#7A7874; word-break:break-all;">
                <a href="${confirmUrl}" style="color:#4A8C40; text-decoration:underline;">${confirmUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px 0 40px;">
              <hr style="border:none; border-top:1px solid #E8E4DE; margin:0;">
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0 40px;">
              <p style="margin:0; font-family:'Special Elite', 'Courier Prime', Georgia, serif; font-size:14px; color:#3A3530; line-height:1.5;">
                ${L.cadence}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 0 40px;">
              <p style="margin:0; font-size:12px; color:#7A7874; line-height:1.6;">
                ${L.notYou}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 40px 40px;">
              <p style="margin:0; font-size:12px; color:#5A5550;">
                ${L.signoff}
              </p>
            </td>
          </tr>
        </table>
        <p style="margin:16px 0 0 0; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:#7A7874;">
          BONDY &middot; wearebondy.com
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export async function POST(req) {
  const authHeader = req.headers.get('x-notify-secret')
  if (authHeader !== NOTIFY_LEAD_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { email, lang, confirm_url } = body
  if (!email || !confirm_url) {
    return NextResponse.json(
      { error: 'Missing required fields: email, confirm_url' },
      { status: 400 }
    )
  }
  const safeLang = lang === 'es' ? 'es' : 'en'

  let accessToken
  try {
    accessToken = await getValidAccessToken(SENDER_EMAIL)
  } catch (err) {
    console.error('[newsletter/send-confirmation] Token error:', err.message)
    return NextResponse.json(
      { error: 'Gmail token not available for sender: ' + err.message },
      { status: 503 }
    )
  }

  const subject =
    safeLang === 'es'
      ? 'Confirmá tu suscripción a Bondy Thinking'
      : 'Confirm your Bondy Thinking subscription'
  const htmlBody = buildConfirmationHtml({ lang: safeLang, confirmUrl: confirm_url })

  try {
    const result = await sendGmailEmail({
      accessToken,
      to: email,
      subject,
      htmlBody,
      fromEmail: SENDER_EMAIL,
      fromName: SENDER_NAME,
    })
    console.log(`[newsletter/send-confirmation] Sent to ${email} messageId=${result.id}`)
    return NextResponse.json({ ok: true, message_id: result.id })
  } catch (err) {
    console.error('[newsletter/send-confirmation] Send failed:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
