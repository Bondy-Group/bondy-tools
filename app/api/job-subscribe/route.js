/**
 * POST /api/job-subscribe
 *
 * Body: { email: string, preferences?: { areas, modalities, seniorities } }
 * Returns: { ok: true, isNew: boolean } on success
 *
 * Idempotent: re-submitting an existing email re-activates and updates prefs.
 * Generously rate-limited at the IP level (10/min) to deter scripted abuse.
 */

import { NextResponse } from 'next/server'
import { upsertSubscriber, isValidEmail, normalizeEmail } from '@/lib/subscribers'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Naive in-memory rate limiter — best-effort, resets on cold start. Good
// enough for a public form; revisit if we see real abuse.
const HITS = new Map() // ip -> [timestamps]
const WINDOW_MS = 60_000
const LIMIT = 10

function rateLimited(ip) {
  if (!ip) return false
  const now = Date.now()
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  arr.push(now)
  HITS.set(ip, arr)
  return arr.length > LIMIT
}

export async function POST(request) {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      ''
    if (rateLimited(ip)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
    }

    const body = await request.json().catch(() => ({}))
    const email = normalizeEmail(body.email)
    if (!isValidEmail(email)) {
      return NextResponse.json({ ok: false, error: 'invalid_email' }, { status: 400 })
    }

    const result = await upsertSubscriber({
      email,
      preferences: body.preferences || {},
      source: 'busco-trabajo',
    })

    if (!result.ok) {
      console.error('[subscribe] failed', result)
      return NextResponse.json({ ok: false, error: result.error || 'unknown' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, isNew: result.isNew })
  } catch (err) {
    console.error('[subscribe] crash', err)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
