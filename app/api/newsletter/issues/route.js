/**
 * GET  /api/newsletter/issues       — list all (drafts + sent)
 * POST /api/newsletter/issues       — create draft
 *
 * Admin-only. Usa next-auth session, restringe a ADMIN_EMAILS.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listIssues, createIssue } from '@/lib/newsletter-issues'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return { ok: false, email: null }
  }
  return { ok: true, email }
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const issues = await listIssues({ limit: 100 })
  return NextResponse.json({ ok: true, issues })
}

export async function POST(req) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { title, subject, preheader, lang, content } = body || {}
  if (!title || typeof title !== 'string') {
    return NextResponse.json({ error: 'title_required' }, { status: 400 })
  }

  const result = await createIssue({
    title: title.trim(),
    subject: (subject || title).trim(),
    preheader: preheader || null,
    lang: lang === 'en' ? 'en' : 'es',
    content: content || { sections: [{ kind: 'intro', text: '' }] },
    createdBy: auth.email,
  })

  if (!result.ok) {
    return NextResponse.json({ error: 'create_failed', detail: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, issue: result.issue })
}
