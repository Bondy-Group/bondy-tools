/**
 * GET/POST /api/cron/weekly-digest
 *
 * Triggered by Vercel Cron on Mon + Tue at 10:00 ART (13:00 UTC). Each run
 * processes up to `DAILY_CAP` "due" subscribers (those who haven't received a
 * digest in the last 6 days) — so Monday catches the first batch, Tuesday
 * catches whatever didn't fit. No explicit partitioning by id; the `dueOnly`
 * filter handles it. To add more days, just add cron entries in vercel.json.
 *
 * Vercel sends GET requests with the header:
 *   Authorization: Bearer ${CRON_SECRET}
 *
 * What it does:
 *   1. Fetches active subscribers due for a digest (capped at DAILY_CAP)
 *   2. Fetches roles collected in the last 7 days (both tech + recruiting)
 *   3. For each subscriber, filters roles by their preferences (if any)
 *   4. Sends a personalized digest via Resend
 *   5. Updates last_sent_at
 *   6. Counts remaining due subscribers and surfaces overflow in the response
 *
 * Failure model: per-subscriber failures are logged but don't abort the run.
 * The endpoint always returns a summary so the cron log shows totals.
 *
 * Dry-run mode: append `?dry_run=1` (or pass header `x-dry-run: 1`) to
 * exercise the whole pipeline — fetch roles, build subscriber lists, render
 * HTML, apply filters — WITHOUT calling Resend and WITHOUT touching
 * last_sent_at. The response includes `dryRun: true` and `wouldSend` instead
 * of `sent`. Use this to validate after deploys or schema changes.
 */

import { NextResponse } from 'next/server'
import { fetchOpenRoles, fetchRecruitingRoles } from '@/lib/scraper-jobs'
import { listActiveSubscribers, markSent, countDueActive } from '@/lib/subscribers'
import { sendEmail } from '@/lib/resend'
import { renderWeeklyDigest, renderWeeklyDigestText } from '@/lib/email/weekly-digest'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const HOST = 'https://tools.wearebondy.com'
const MAX_ROLES_PER_EMAIL = 25

// How many subscribers can be processed in a single cron run. The cron is
// scheduled multiple days per week (see vercel.json); each day picks up the
// next batch of "due" subscribers, so any single-day overflow rolls into the
// next day automatically. Tuned conservatively below Resend free (100/day)
// and Vercel `maxDuration: 60` (~80–100 sequential Resend calls).
// Override via `WEEKLY_DIGEST_DAILY_CAP` env var if needed.
const DAILY_CAP = (() => {
  const n = Number(process.env.WEEKLY_DIGEST_DAILY_CAP)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 80
})()

// `dueDays = 6` lets a Tuesday cron correctly exclude subs that received on
// Monday, and the following Monday correctly includes them again. Tied to the
// weekly cadence — do not change without revisiting the cron schedule too.
const DUE_DAYS = 6

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${secret}`
}

// ─────────────────────────────────────────────────────────────
// Filtering
// ─────────────────────────────────────────────────────────────
function filterRolesForSubscriber(roles, prefs) {
  const p = prefs || {}
  const areas = Array.isArray(p.areas) ? p.areas : []
  const modalities = Array.isArray(p.modalities) ? p.modalities : []
  const seniorities = Array.isArray(p.seniorities) ? p.seniorities : []

  // No filters = receive everything.
  if (!areas.length && !modalities.length && !seniorities.length) return roles

  return roles.filter((r) => {
    if (areas.length && !areas.includes(r.area)) return false
    if (modalities.length && !modalities.includes(r.modality)) return false
    if (seniorities.length && !seniorities.includes(r.seniority)) return false
    return true
  })
}

function weekLabel() {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 6)
  const fmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })
  return `Semana del ${fmt.format(start)} al ${fmt.format(now)}`
}

// ─────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────
async function run(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // Dry-run: do everything except actually call Resend / mutate the DB.
  // Accept either `?dry_run=1` or header `x-dry-run: 1`. Anything truthy works.
  const url = new URL(request.url)
  const qpDry = url.searchParams.get('dry_run')
  const hdrDry = request.headers.get('x-dry-run')
  const isDryRun = isTruthy(qpDry) || isTruthy(hdrDry)

  // Pull the last 7 days of roles from BOTH pools. Tech pool feeds the
  // `busco-trabajo` subscribers; recruiting pool feeds the
  // `busco-trabajo-recruiters` ones. We don't mix them — a tech subscriber
  // never sees recruiter roles and vice-versa.
  const [techRes, recRes] = await Promise.all([
    fetchOpenRoles({ days: 7, limit: 500 }),
    fetchRecruitingRoles({ days: 7, limit: 500 }),
  ])
  const techRoles = sortNewest(techRes.roles || [])
  const recRoles = sortNewest(recRes.roles || [])

  // Process recruiters first (smaller audience, must not get crowded out by
  // the candidates batch competing for the same DAILY_CAP slots). Each query
  // is gated by `dueOnly` so reruns within `DUE_DAYS` don't double-send.
  const recSubs = await listActiveSubscribers({
    limit: DAILY_CAP,
    dueOnly: true,
    dueDays: DUE_DAYS,
    source: 'busco-trabajo-recruiters',
  })
  const candCap = Math.max(0, DAILY_CAP - recSubs.length)
  const candSubs = candCap > 0
    ? await listActiveSubscribers({
        limit: candCap,
        dueOnly: true,
        dueDays: DUE_DAYS,
        source: 'busco-trabajo',
      })
    : []
  const subscribers = [...recSubs, ...candSubs]
  const week = weekLabel()

  const results = { sent: 0, wouldSend: 0, skippedEmpty: 0, skippedNoKey: 0, failed: 0, byAudience: { candidates: 0, recruiters: 0 } }

  for (const sub of subscribers) {
    try {
      // Pick the role pool based on the subscriber's source.
      const isRecruiters = sub.source === 'busco-trabajo-recruiters'
      const audience = isRecruiters ? 'recruiters' : 'candidates'
      const pool = isRecruiters ? recRoles : techRoles

      const filtered = filterRolesForSubscriber(pool, sub.preferences).slice(0, MAX_ROLES_PER_EMAIL)
      const unsubscribeUrl = `${HOST}/api/newsletter/unsubscribe?token=${encodeURIComponent(sub.unsubscribe_token)}`

      // Don't send empty digests — but DO bump last_sent_at so the subscriber
      // doesn't stay permanently "due" and crowd out fresher subs on the next
      // cron run. They simply wait for the next weekly cycle. Without this,
      // subs with overly strict filters (e.g. Junior + Recruiting + Remote)
      // get re-tried every day and never advance off the queue head.
      if (filtered.length === 0) {
        results.skippedEmpty++
        if (!isDryRun) await markSent(sub.id)
        continue
      }

      const html = renderWeeklyDigest({ roles: filtered, unsubscribeUrl, weekLabel: week, audience })
      const text = renderWeeklyDigestText({ roles: filtered, unsubscribeUrl, weekLabel: week, audience })
      const noun = isRecruiters
        ? (filtered.length === 1 ? 'rol de recruiting nuevo' : 'roles de recruiting nuevos')
        : (filtered.length === 1 ? 'rol tech nuevo' : 'roles tech nuevos')
      const subject = `${filtered.length} ${noun} · Bondy`

      // Dry-run: render + filter were exercised above; stop short of Resend
      // and don't bump last_sent_at. Count the would-have-been send.
      if (isDryRun) {
        results.wouldSend++
        results.byAudience[audience] = (results.byAudience[audience] || 0) + 1
        continue
      }

      const send = await sendEmail({
        to: sub.email,
        subject,
        html,
        text,
        headers: {
          'List-Unsubscribe': `<${unsubscribeUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
        tags: [
          { name: 'campaign', value: 'weekly-digest' },
          { name: 'audience', value: audience },
        ],
      })

      if (send.skipped) {
        results.skippedNoKey++
        continue
      }
      if (!send.ok) {
        results.failed++
        continue
      }

      await markSent(sub.id)
      results.sent++
      results.byAudience[audience] = (results.byAudience[audience] || 0) + 1
    } catch (err) {
      console.error('[cron] subscriber failed', sub.email, err)
      results.failed++
    }
  }

  // Overflow check: if there are still due subs after this run, the daily
  // cap is being exceeded. On the last cron day of the week this means real
  // pending subscribers will roll into next week. Surfaced in the response
  // and logs so an alerter can pick it up.
  // Skipped on dry-run because it'd return the same as before the (no-op)
  // run and be noisy.
  const pendingAfter = isDryRun ? null : await countDueActive({ dueDays: DUE_DAYS })
  const overflow = typeof pendingAfter === 'number' && pendingAfter > 0

  console.log('[cron] weekly digest done', {
    dryRun: isDryRun,
    totalTechRoles: techRoles.length,
    totalRecruitingRoles: recRoles.length,
    subscribers: subscribers.length,
    dailyCap: DAILY_CAP,
    pendingAfter,
    overflow,
    ...results,
  })

  return NextResponse.json({
    ok: true,
    dryRun: isDryRun,
    week,
    totalTechRoles: techRoles.length,
    totalRecruitingRoles: recRoles.length,
    subscribers: subscribers.length,
    dailyCap: DAILY_CAP,
    pendingAfter,
    overflow,
    ...results,
  })
}

function isTruthy(v) {
  if (v == null) return false
  const s = String(v).toLowerCase().trim()
  return s === '1' || s === 'true' || s === 'yes' || s === 'on'
}

// Sort newest first by collected_at (when WE saw it), fallback to published_at.
function sortNewest(roles) {
  return [...roles].sort((a, b) => {
    const ka = a.collectedAt || a.date || ''
    const kb = b.collectedAt || b.date || ''
    return kb.localeCompare(ka)
  })
}

export async function GET(request) {
  return run(request)
}
export async function POST(request) {
  return run(request)
}
