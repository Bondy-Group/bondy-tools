/**
 * GET    /api/newsletter/issues/[id]   — fetch one
 * PATCH  /api/newsletter/issues/[id]   — update (drafts only)
 * DELETE /api/newsletter/issues/[id]   — delete (drafts only)
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getIssue, updateIssue, deleteIssue } from '@/lib/newsletter-issues'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) return { ok: false }
  return { ok: true, email }
}

export async function GET(_req, { params }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const issue = await getIssue(params.id)
  if (!issue) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json({ ok: true, issue })
}

export async function PATCH(req, { params }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const existing = await getIssue(params.id)
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status === 'sent') {
    return NextResponse.json({ error: 'cannot_edit_sent' }, { status: 400 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  // Solo dejamos cambiar estos campos por PATCH
  const allowed = {}
  if (typeof body.title === 'string') allowed.title = body.title.trim()
  if (typeof body.subject === 'string') allowed.subject = body.subject.trim()
  if (typeof body.preheader === 'string' || body.preheader === null) allowed.preheader = body.preheader
  if (body.lang === 'en' || body.lang === 'es') allowed.lang = body.lang
  if (body.content && typeof body.content === 'object') allowed.content = body.content

  if (!Object.keys(allowed).length) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  const result = await updateIssue(params.id, allowed)
  if (!result.ok) {
    return NextResponse.json({ error: 'update_failed', detail: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, issue: result.issue })
}

export async function DELETE(_req, { params }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const existing = await getIssue(params.id)
  if (!existing) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  if (existing.status === 'sent') {
    return NextResponse.json({ error: 'cannot_delete_sent' }, { status: 400 })
  }

  const ok = await deleteIssue(params.id)
  if (!ok) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
