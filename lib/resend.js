/**
 * Minimal Resend client. We don't pull in the SDK — direct fetch keeps the
 * Vercel function cold-start tiny.
 *
 * Required env: RESEND_API_KEY
 *
 * If the key is missing, sendEmail returns { skipped: true } and logs to
 * stderr. The cron should still complete (so we don't have a noisy alert
 * loop while DNS is being verified).
 */

const RESEND_API = 'https://api.resend.com/emails'

export const FROM_ADDRESS = process.env.RESEND_FROM || 'Bondy Jobs <jobs@wearebondy.com>'
export const REPLY_TO = process.env.RESEND_REPLY_TO || 'hello@wearebondy.com'

export async function sendEmail({ to, subject, html, text, headers, tags, from, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn('[resend] RESEND_API_KEY not set — skipping send to', to)
    return { skipped: true, reason: 'no_api_key' }
  }
  if (!to || !subject || !html) {
    return { ok: false, error: 'missing_fields' }
  }

  const payload = {
    from: from || FROM_ADDRESS,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    reply_to: replyTo || REPLY_TO,
    headers,
    tags,
  }
  if (text) payload.text = text

  const res = await fetch(RESEND_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[resend] send failed', res.status, body)
    return { ok: false, error: 'send_failed', status: res.status, body }
  }
  const data = await res.json()
  return { ok: true, id: data.id }
}
