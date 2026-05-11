/**
 * POST /api/job-subscribe
 *
 * Body: { email: string, preferences?: { areas, modalities, seniorities }, hp_field?: string }
 * Returns: { ok: true, isNew: boolean } on success
 *
 * Idempotent: re-submitting an existing email re-activates and updates prefs.
 * Generously rate-limited at the IP level (10/min) to deter scripted abuse.
 *
 * Bot defense:
 *   - Honeypot field "hp_field": invisible to humans; if filled, we pretend
 *     success but skip everything. Stops dumb form-scrapers without bothering
 *     real users with a CAPTCHA.
 *
 * Welcome email:
 *   - Sent only for NEW subscribers (isNew=true). Reactivating an existing
 *     sub doesn't re-trigger it.
 *   - Sent via Resend (RESEND_API_KEY). If the key is missing, sendEmail
 *     skips silently and the signup still succeeds — we don't want a missing
 *     key to break the funnel.
 */

import { NextResponse } from 'next/server'
import { upsertSubscriber, isValidEmail, normalizeEmail } from '@/lib/subscribers'
import { sendEmail } from '@/lib/resend'
import { renderWelcomeEmail, renderWelcomeEmailText } from '@/lib/email/welcome'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const HOST = 'https://tools.wearebondy.com'

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

async function fireWelcomeEmail({ email, preferences, unsubscribeToken }) {
  try {
    const unsubscribeUrl = `${HOST}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`
    const html = renderWelcomeEmail({ unsubscribeUrl, preferences })
    const text = renderWelcomeEmailText({ unsubscribeUrl, preferences })
    const res = await sendEmail({
      to: email,
      subject: 'Listo. Te sumamos al digest semanal de Bondy.',
      html,
      text,
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [{ name: 'campaign', value: 'welcome' }],
    })
    if (res.skipped) {
      console.warn('[subscribe] welcome email skipped:', res.reason)
    } else if (!res.ok) {
      console.error('[subscribe] welcome email failed:', res)
    }
  } catch (err) {
    // Never let welcome email failure abort the signup response.
    console.error('[subscribe] welcome email crashed:', err)
  }
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

    // Honeypot — if filled, pretend success and do nothing. Real users can't
    // see the field; bots that auto-fill every input get silently dropped.
    if (typeof body.hp_field === 'string' && body.hp_field.trim() !== '') {
      console.log('[subscribe] honeypot triggered', { ip, hp: body.hp_field.slice(0, 30) })
      return NextResponse.json({ ok: true, isNew: false })
    }

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

    // Fire welcome email for new subscribers only. We await because Vercel
    // kills the function after the response is sent; Resend is fast (<300ms).
    if (result.isNew && result.subscriber?.unsubscribe_token) {
      await fireWelcomeEmail({
        email,
        preferences: body.preferences || {},
        unsubscribeToken: result.subscriber.unsubscribe_token,
      })
    }

    return NextResponse.json({ ok: true, isNew: result.isNew })
  } catch (err) {
    console.error('[subscribe] crash', err)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
