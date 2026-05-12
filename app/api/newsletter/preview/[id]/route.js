/**
 * GET /api/newsletter/preview/[id]
 *
 * Devuelve el HTML del issue renderizado, para mostrarlo en un <iframe>
 * dentro del editor. Admin-only.
 */
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getIssue } from '@/lib/newsletter-issues'
import { renderIssue } from '@/lib/email/thinking-newsletter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

export async function GET(_req, { params }) {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return new Response('Forbidden', { status: 403 })
  }
  const issue = await getIssue(params.id)
  if (!issue) return new Response('Not found', { status: 404 })

  const html = renderIssue({
    issue,
    unsubscribeUrl: 'https://wearebondy.com/es/newsletter/unsubscribe?token=preview',
    webViewUrl: null,
  })
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
