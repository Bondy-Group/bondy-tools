/**
 * POST /api/newsletter/issues/[id]/send-test
 * Body: { email: string }
 *
 * Manda el issue a un email único de prueba (default: la sesión).
 * No actualiza status del issue. No logea en newsletter_sends.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getIssue } from '@/lib/newsletter-issues'
import { sendEmail } from '@/lib/resend'
import { renderIssue, renderIssueText } from '@/lib/email/thinking-newsletter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

export async function POST(req, { params }) {
  const session = await getServerSession(authOptions)
  const sessionEmail = (session?.user?.email || '').toLowerCase()
  if (!sessionEmail || !ADMIN_EMAILS.includes(sessionEmail)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  let body
  try {
    body = await req.json().catch(() => ({}))
  } catch {
    body = {}
  }

  const to = (body?.email || sessionEmail).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }

  const issue = await getIssue(params.id)
  if (!issue) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  // Subject "[TEST]" para distinguir
  const subject = `[TEST] ${issue.subject || issue.title}`
  const html = renderIssue({
    issue,
    unsubscribeUrl: 'https://wearebondy.com/es/newsletter/unsubscribe?token=test',
    webViewUrl: null,
  })
  const text = renderIssueText({
    issue,
    unsubscribeUrl: 'https://wearebondy.com/es/newsletter/unsubscribe?token=test',
  })

  const res = await sendEmail({
    to,
    subject,
    html,
    text,
    tags: [
      { name: 'campaign', value: 'newsletter-test' },
      { name: 'issue_id', value: String(params.id).slice(0, 36) },
    ],
  })

  if (res.skipped) {
    return NextResponse.json({ error: 'email_service_not_configured' }, { status: 503 })
  }
  if (!res.ok) {
    return NextResponse.json({ error: 'send_failed', detail: res }, { status: 500 })
  }
  return NextResponse.json({ ok: true, to, resend_id: res.id })
}
