/**
 * POST /api/newsletter/send-confirmation
 *
 * Envía el email de confirmación (double opt-in) del newsletter de Bondy Thinking.
 *
 * MIGRACIÓN: pasó de Gmail OAuth (mara@wearebondy.com) a Resend con jobs@wearebondy.com
 * (dominio verificado). Razón: el access token de Gmail OAuth expiraba y los confirms
 * morían silenciosamente, dejando suscriptores en `confirmed_at: null` para siempre.
 *
 * Autenticado con x-notify-secret (mismo secret que notify-lead).
 * Body: { email: string, lang: 'en'|'es', confirm_url: string }
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { renderConfirmation, renderConfirmationText } from '@/lib/email/thinking-newsletter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTIFY_LEAD_SECRET = process.env.NOTIFY_LEAD_SECRET || 'bondy-notify-lead-internal'

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

  const subject =
    safeLang === 'es'
      ? 'Confirmá tu suscripción a Bondy Thinking'
      : 'Confirm your Bondy Thinking subscription'

  const html = renderConfirmation({ lang: safeLang, confirmUrl: confirm_url })
  const text = renderConfirmationText({ lang: safeLang, confirmUrl: confirm_url })

  const res = await sendEmail({
    to: email,
    subject,
    html,
    text,
    headers: {
      'X-Entity-Ref-ID': `newsletter-confirm-${Date.now()}`,
    },
    tags: [
      { name: 'campaign', value: 'newsletter-confirm' },
      { name: 'lang', value: safeLang },
    ],
  })

  if (res.skipped) {
    console.error('[newsletter/send-confirmation] Resend skipped:', res.reason)
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }
  if (!res.ok) {
    console.error('[newsletter/send-confirmation] Send failed:', res)
    return NextResponse.json({ error: 'Send failed', detail: res }, { status: 500 })
  }

  console.log(`[newsletter/send-confirmation] Sent to ${email} resendId=${res.id}`)
  return NextResponse.json({ ok: true, message_id: res.id })
}
