/**
 * Subscriber management for the /busco-trabajo weekly digest.
 *
 * IMPORTANT: subscribers live in the SCRAPER Supabase project
 * (`tchppyxhapxtjemxrbqm`) — same DB as the `jobs` table. This is intentional:
 * the cron job that sends the digest needs to read jobs and subscribers in a
 * single connection, and conceptually "scraped jobs → digest → subscribers"
 * is one bounded context.
 *
 * Service-role key is required for writes/reads (RLS is enabled and locked
 * down). This module is server-only — never import it into client components.
 */

import crypto from 'crypto'

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'

function serviceKey() {
  const key = process.env.SCRAPER_SUPABASE_SERVICE_KEY
  if (!key) throw new Error('SCRAPER_SUPABASE_SERVICE_KEY is not set')
  return key
}

function authHeaders() {
  const key = serviceKey()
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

// ─────────────────────────────────────────────────────────────
// Validation helpers
// ─────────────────────────────────────────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email) {
  if (typeof email !== 'string') return false
  const e = email.trim().toLowerCase()
  return e.length <= 254 && EMAIL_RE.test(e)
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

// ─────────────────────────────────────────────────────────────
// Preferences sanitization
// ─────────────────────────────────────────────────────────────
// Accepted values must match what the UI exposes (lib/scraper-jobs.js exports).
const ALLOWED_AREAS = new Set([
  'Backend / Full Stack',
  'Data & Analytics',
  'ML / AI',
  'DevOps / QA',
  'Design',
  'Product',
  'Recruiting',
])
const ALLOWED_MODALITIES = new Set(['Remote', 'Híbrido', 'Presencial'])
const ALLOWED_SENIORITIES = new Set(['Junior', 'Mid-Senior', 'Senior', 'Lead / Staff'])

function sanitizeList(input, allowed) {
  if (!Array.isArray(input)) return []
  const out = []
  for (const v of input) {
    if (typeof v === 'string' && allowed.has(v) && !out.includes(v)) out.push(v)
    if (out.length >= 10) break // hard cap
  }
  return out
}

export function sanitizePreferences(prefs) {
  const p = prefs && typeof prefs === 'object' ? prefs : {}
  return {
    areas: sanitizeList(p.areas, ALLOWED_AREAS),
    modalities: sanitizeList(p.modalities, ALLOWED_MODALITIES),
    seniorities: sanitizeList(p.seniorities, ALLOWED_SENIORITIES),
  }
}

// ─────────────────────────────────────────────────────────────
// Token generation (URL-safe, 32 bytes → 43 chars base64url)
// ─────────────────────────────────────────────────────────────
function generateToken() {
  return crypto.randomBytes(32).toString('base64url')
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Upsert a subscriber. If the email already exists:
 *   - re-activate if previously unsubscribed
 *   - update preferences (latest wins)
 *   - keep the original unsubscribe_token (so old links still work)
 * Returns { ok, subscriber, isNew, error? }.
 */
export async function upsertSubscriber({ email, preferences, source = 'busco-trabajo' }) {
  const e = normalizeEmail(email)
  if (!isValidEmail(e)) return { ok: false, error: 'invalid_email' }

  const cleanPrefs = sanitizePreferences(preferences)

  // Check if exists first to avoid generating a new token unnecessarily.
  const lookup = await fetch(
    `${SUPABASE_URL}/rest/v1/job_subscribers?email=eq.${encodeURIComponent(e)}&select=id,unsubscribe_token,status`,
    { headers: authHeaders(), cache: 'no-store' }
  )
  if (!lookup.ok) {
    return { ok: false, error: 'lookup_failed', status: lookup.status }
  }
  const existing = (await lookup.json())[0]

  if (existing) {
    const update = await fetch(
      `${SUPABASE_URL}/rest/v1/job_subscribers?id=eq.${existing.id}`,
      {
        method: 'PATCH',
        headers: { ...authHeaders(), Prefer: 'return=representation' },
        body: JSON.stringify({
          status: 'active',
          preferences: cleanPrefs,
          unsubscribed_at: null,
          source,
        }),
      }
    )
    if (!update.ok) return { ok: false, error: 'update_failed' }
    const [row] = await update.json()
    return { ok: true, subscriber: row, isNew: false }
  }

  const insert = await fetch(`${SUPABASE_URL}/rest/v1/job_subscribers`, {
    method: 'POST',
    headers: { ...authHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({
      email: e,
      unsubscribe_token: generateToken(),
      preferences: cleanPrefs,
      source,
    }),
  })
  if (!insert.ok) {
    const txt = await insert.text()
    console.error('[subscribers] insert failed', insert.status, txt)
    return { ok: false, error: 'insert_failed' }
  }
  const [row] = await insert.json()
  return { ok: true, subscriber: row, isNew: true }
}

/** Mark a subscriber as unsubscribed by their token. */
export async function unsubscribeByToken(token) {
  if (!token || typeof token !== 'string') return { ok: false, error: 'invalid_token' }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/job_subscribers?unsubscribe_token=eq.${encodeURIComponent(token)}`,
    {
      method: 'PATCH',
      headers: { ...authHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString(),
      }),
    }
  )
  if (!res.ok) return { ok: false, error: 'patch_failed' }
  const rows = await res.json()
  if (!rows.length) return { ok: false, error: 'not_found' }
  return { ok: true, subscriber: rows[0] }
}

/**
 * Active subscribers, used by the cron.
 *
 * Options:
 *   - `limit`: max rows to return (no cap by default). Use this to stay under
 *     Resend's daily quota and Vercel's `maxDuration` budget.
 *   - `dueOnly`: when true, only return subs that haven't received a digest in
 *     the last `dueDays` days. Combined with `limit`, this lets multiple crons
 *     in the same week pick up where the previous one left off without
 *     re-sending: Monday catches the first batch, Tuesday catches the
 *     overflow, etc. — without any explicit partitioning by id.
 *   - `dueDays`: window for `dueOnly` (default 6 — a Tuesday cron correctly
 *     excludes Monday's sends, and the following Monday correctly includes
 *     them again).
 *
 * Ordering: oldest-waiting first — never-sent (NULL) first, then by
 * subscribed_at ascending. New signups always jump to the front of the queue.
 */
export async function listActiveSubscribers({ limit, dueOnly = false, dueDays = 6 } = {}) {
  const base = `${SUPABASE_URL}/rest/v1/job_subscribers`
  const params = [
    'status=eq.active',
    'select=id,email,preferences,unsubscribe_token,source,last_sent_at',
    'order=last_sent_at.asc.nullsfirst,subscribed_at.asc',
  ]

  if (dueOnly) {
    const cutoff = new Date(Date.now() - dueDays * 24 * 60 * 60 * 1000).toISOString()
    params.push(`or=(last_sent_at.is.null,last_sent_at.lt.${encodeURIComponent(cutoff)})`)
  }

  if (Number.isFinite(limit) && limit > 0) {
    params.push(`limit=${Math.floor(limit)}`)
  }

  const res = await fetch(`${base}?${params.join('&')}`, {
    headers: authHeaders(),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`listActiveSubscribers failed: ${res.status}`)
  return res.json()
}

/**
 * Count of active subscribers that are "due" — i.e. eligible for the next
 * cron run under `dueOnly`. Used after a run to detect overflow: if this
 * returns > 0 on the last cron of the week, the daily cap is too low (or
 * we need to add another cron day).
 *
 * Returns null on failure rather than throwing — callers treat it as
 * "unknown" and skip the alert.
 */
export async function countDueActive({ dueDays = 6 } = {}) {
  try {
    const cutoff = new Date(Date.now() - dueDays * 24 * 60 * 60 * 1000).toISOString()
    const url =
      `${SUPABASE_URL}/rest/v1/job_subscribers` +
      `?status=eq.active` +
      `&or=(last_sent_at.is.null,last_sent_at.lt.${encodeURIComponent(cutoff)})` +
      `&select=id`
    const res = await fetch(url, {
      headers: { ...authHeaders(), Prefer: 'count=exact', Range: '0-0' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const cr = res.headers.get('content-range') || ''
    const m = cr.match(/\/(\d+)$/)
    return m ? Number(m[1]) : null
  } catch (err) {
    console.error('[subscribers] countDueActive failed', err)
    return null
  }
}

/** Bump send counters after a digest goes out. */
export async function markSent(subscriberId) {
  // Increment send_count atomically isn't available via PostgREST without a
  // function, so we read+write. Acceptable for low volume + weekly cadence;
  // revisit (RPC) if the subscriber list grows beyond a few thousand.
  const now = new Date().toISOString()
  let current = 0
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/job_subscribers?id=eq.${subscriberId}&select=send_count`,
      { headers: authHeaders(), cache: 'no-store' }
    )
    if (r.ok) current = Number((await r.json())[0]?.send_count) || 0
  } catch (err) {
    console.error('[subscribers] markSent read failed', err)
  }
  await fetch(`${SUPABASE_URL}/rest/v1/job_subscribers?id=eq.${subscriberId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ last_sent_at: now, send_count: current + 1 }),
  }).catch((err) => console.error('[subscribers] markSent failed', err))
}
