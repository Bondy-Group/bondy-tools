/**
 * POST /api/newsletter/issues/[id]/send
 *
 * Envía el issue a TODOS los suscriptores confirmados del idioma del issue.
 * - Valida que esté en draft
 * - Itera con rate-limit suave (Resend free = 2 req/seg)
 * - Logea cada envío en newsletter_sends
 * - Marca el issue como `sent` (con auto-number via trigger)
 *
 * Idempotente parcial: si el issue ya está `sent`, devuelve error sin enviar.
 *
 * Admin-only.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getIssue,
  listConfirmedSubscribers,
  logSend,
  markIssueSent,
} from '@/lib/newsletter-issues'
import { sendEmail } from '@/lib/resend'
import { renderIssue, renderIssueText } from '@/lib/email/thinking-newsletter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']
const SITE_HOST = 'https://wearebondy.com'

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function POST(_req, { params }) {
  const session = await getServerSession(authOptions)
  const sessionEmail = (session?.user?.email || '').toLowerCase()
  if (!sessionEmail || !ADMIN_EMAILS.includes(sessionEmail)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const issue = await getIssue(params.id)
  if (!issue) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (issue.status === 'sent') {
    return NextResponse.json({ error: 'already_sent' }, { status: 400 })
  }

  // Validación mínima: subject + alguna sección con texto
  if (!issue.subject?.trim() || !issue.title?.trim()) {
    return NextResponse.json({ error: 'missing_subject_or_title' }, { status: 400 })
  }
  const sections = Array.isArray(issue?.content?.sections) ? issue.content.sections : []
  const hasContent = sections.some(
    (s) => s && (s.text || s.title || s.kind === 'divider')
  )
  if (!hasContent) {
    return NextResponse.json({ error: 'empty_content' }, { status: 400 })
  }

  // Lista de destinatarios — filtramos por lang del issue
  const subscribers = await listConfirmedSubscribers({ lang: issue.lang })
  if (!subscribers.length) {
    return NextResponse.json(
      { error: 'no_subscribers', detail: `No hay suscriptores confirmados en ${issue.lang}` },
      { status: 400 }
    )
  }

  // Send loop con rate-limit suave (450ms entre envíos ≈ 2/seg)
  const results = { sent: 0, failed: 0, total: subscribers.length, errors: [] }
  const subject = issue.subject.trim()

  for (const sub of subscribers) {
    const unsubscribeUrl = `${SITE_HOST}/${issue.lang}/newsletter/unsubscribe?token=${encodeURIComponent(
      sub.unsubscribe_token || ''
    )}`
    const html = renderIssue({ issue, unsubscribeUrl, webViewUrl: null })
    const text = renderIssueText({ issue, unsubscribeUrl })

    try {
      const res = await sendEmail({
        to: sub.email,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          'X-Entity-Ref-ID': `thinking-${issue.id}-${sub.id}`,
        },
        tags: [
          { name: 'campaign', value: 'thinking-newsletter' },
          { name: 'lang', value: issue.lang },
        ],
      })

      if (res.skipped) {
        results.failed++
        results.errors.push({ email: sub.email, reason: 'service_unavailable' })
        await logSend({
          issueId: issue.id,
          subscriberId: sub.id,
          email: sub.email,
          status: 'failed',
          error: 'service_unavailable',
        })
      } else if (!res.ok) {
        results.failed++
        results.errors.push({ email: sub.email, reason: res.error || 'send_failed' })
        await logSend({
          issueId: issue.id,
          subscriberId: sub.id,
          email: sub.email,
          status: 'failed',
          error: JSON.stringify(res).slice(0, 500),
        })
      } else {
        results.sent++
        await logSend({
          issueId: issue.id,
          subscriberId: sub.id,
          email: sub.email,
          resendId: res.id,
          status: 'sent',
        })
      }
    } catch (err) {
      results.failed++
      results.errors.push({ email: sub.email, reason: err.message })
      await logSend({
        issueId: issue.id,
        subscriberId: sub.id,
        email: sub.email,
        status: 'failed',
        error: err.message.slice(0, 500),
      })
    }

    await sleep(450)
  }

  // Marcar el issue como sent (incluso si algunos fallaron — los fallidos quedan en sends log)
  await markIssueSent(issue.id, results.sent)

  return NextResponse.json({ ok: true, results })
}
