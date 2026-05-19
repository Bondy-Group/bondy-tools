/**
 * Audiencia — agregados read-only para el panel /internal/audiencia.
 *
 * Unifica los tres públicos de Bondy del lado oferta:
 *   - tech       → job_subscribers.source IN (busco-trabajo, busco-trabajo-candidates)
 *   - hr         → job_subscribers.source = busco-trabajo-recruiters
 *   - newsletter → newsletter_subscribers (Bondy Thinking)
 *
 * NO escribe nada. Mismo patrón REST + service role que job-subscribers-admin.js.
 */

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co').trim()
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function headers() {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  }
}

const TECH_SOURCES = ['busco-trabajo', 'busco-trabajo-candidates']
const HR_SOURCES = ['busco-trabajo-recruiters']

// Argentina = UTC-3 fijo (sin DST). Devuelve hora local 0-23.
function artHour(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return ((d.getUTCHours() - 3) % 24 + 24) % 24
}

function emptyHours() {
  return Array.from({ length: 24 }, () => 0)
}

function tallyArray(map, arr) {
  if (!Array.isArray(arr)) return
  for (const v of arr) {
    if (v == null || v === '') continue
    map[v] = (map[v] || 0) + 1
  }
}

function summarizeJobRows(rows) {
  const out = {
    total: 0,
    active: 0,
    unsubscribed: 0,
    bounced: 0,
    no_filters: 0,
    never_sent: 0,
    last_sent: null,
    send_count_max: 0,
    by_hour: emptyHours(),
    areas: {},
    modalities: {},
    seniorities: {},
  }
  for (const r of rows) {
    out.total++
    if (r.status === 'active') out.active++
    else if (r.status === 'unsubscribed') out.unsubscribed++
    else if (r.status === 'bounced') out.bounced++

    const h = artHour(r.subscribed_at)
    if (h != null) out.by_hour[h]++

    if (r.status === 'active') {
      const p = r.preferences || {}
      const a = Array.isArray(p.areas) ? p.areas : []
      const m = Array.isArray(p.modalities) ? p.modalities : []
      const s = Array.isArray(p.seniorities) ? p.seniorities : []
      if (a.length === 0 && m.length === 0 && s.length === 0) out.no_filters++
      tallyArray(out.areas, a)
      tallyArray(out.modalities, m)
      tallyArray(out.seniorities, s)
      if (!r.last_sent_at) out.never_sent++
    }

    if ((r.send_count || 0) > out.send_count_max) out.send_count_max = r.send_count || 0
    if (r.last_sent_at && (!out.last_sent || r.last_sent_at > out.last_sent)) out.last_sent = r.last_sent_at
  }
  return out
}

async function fetchJobSubscribers() {
  const url = `${SUPABASE_URL}/rest/v1/job_subscribers?select=status,source,preferences,subscribed_at,last_sent_at,send_count&limit=5000`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    console.error('[audiencia] job_subscribers fetch failed', await res.text())
    return []
  }
  return res.json()
}

async function fetchNewsletter() {
  const subsUrl = `${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=lang,source,confirmed_at,unsubscribed_at,subscribed_at&limit=5000`
  const issuesUrl = `${SUPABASE_URL}/rest/v1/newsletter_issues?select=status,sent_at,sent_count`
  const [sRes, iRes] = await Promise.all([
    fetch(subsUrl, { headers: headers(), cache: 'no-store' }),
    fetch(issuesUrl, { headers: headers(), cache: 'no-store' }),
  ])
  const subs = sRes.ok ? await sRes.json() : []
  const issues = iRes.ok ? await iRes.json() : []

  const out = {
    total: subs.length,
    confirmed: 0,
    pending: 0,
    unsubscribed: 0,
    es: 0,
    en: 0,
    by_hour: emptyHours(),
    issues_total: issues.length,
    issues_sent: 0,
    last_issue_sent: null,
    by_source: {},
  }
  for (const r of subs) {
    const h = artHour(r.subscribed_at || r.confirmed_at)
    if (h != null) out.by_hour[h]++
    if (r.source) out.by_source[r.source] = (out.by_source[r.source] || 0) + 1
    if (r.unsubscribed_at) { out.unsubscribed++; continue }
    if (r.confirmed_at) {
      out.confirmed++
      if (r.lang === 'en') out.en++
      else out.es++
    } else {
      out.pending++
    }
  }
  for (const it of issues) {
    if (it.status === 'sent') out.issues_sent++
    if (it.sent_at && (!out.last_issue_sent || it.sent_at > out.last_issue_sent)) out.last_issue_sent = it.sent_at
  }
  return out
}

// ─────────────────────────────────────────────────────────────
// Email events (Resend webhook → tabla email_events)
//   Funnel por público: el tag `audience` del weekly-digest mapea
//   candidates→tech, recruiters→hr; el resto cae en newsletter/otros.
// ─────────────────────────────────────────────────────────────
function emptyFunnel() {
  return {
    sent: 0, delivered: 0, opened: 0, clicked: 0,
    bounced: 0, complained: 0, total_events: 0, last_event_at: null,
  }
}

function bucketForRow(r) {
  const aud = String(r.audience || '').toLowerCase()
  if (aud === 'candidates') return 'tech'
  if (aud === 'recruiters') return 'hr'
  const camp = String(r.campaign || '').toLowerCase()
  if (camp.includes('newsletter') || camp.includes('thinking')) return 'newsletter'
  return 'otros'
}

function addEvent(f, type) {
  f.total_events++
  if (type === 'email.sent') f.sent++
  else if (type === 'email.delivered') f.delivered++
  else if (type === 'email.opened') f.opened++
  else if (type === 'email.clicked') f.clicked++
  else if (type === 'email.bounced') f.bounced++
  else if (type === 'email.complained') f.complained++
}

async function fetchEmailEvents() {
  const url = `${SUPABASE_URL}/rest/v1/email_events?select=event_type,audience,campaign,event_at,received_at&order=received_at.desc&limit=20000`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    console.error('[audiencia] email_events fetch failed', await res.text())
    return null // null → el panel deja la sección en estado "pendiente"
  }
  const rows = await res.json()
  const b = {
    tech: emptyFunnel(), hr: emptyFunnel(),
    newsletter: emptyFunnel(), otros: emptyFunnel(), all: emptyFunnel(),
  }
  for (const r of rows) {
    if (!String(r.event_type || '').startsWith('email.')) continue // ignora ruido/debug
    const k = bucketForRow(r)
    addEvent(b[k], r.event_type)
    addEvent(b.all, r.event_type)
    const at = r.event_at || r.received_at
    if (at) {
      if (!b[k].last_event_at || at > b[k].last_event_at) b[k].last_event_at = at
      if (!b.all.last_event_at || at > b.all.last_event_at) b.all.last_event_at = at
    }
  }
  return { total_rows: rows.length, ...b }
}

export async function audienciaOverview() {
  const [jobRows, newsletter, email] = await Promise.all([
    fetchJobSubscribers(),
    fetchNewsletter(),
    fetchEmailEvents(),
  ])
  const tech = summarizeJobRows(jobRows.filter((r) => TECH_SOURCES.includes(r.source)))
  const hr = summarizeJobRows(jobRows.filter((r) => HR_SOURCES.includes(r.source)))
  // por si aparece un source nuevo no mapeado
  const otros = jobRows.filter((r) => !TECH_SOURCES.includes(r.source) && !HR_SOURCES.includes(r.source))
  return {
    generated_at: new Date().toISOString(),
    tech,
    hr,
    newsletter,
    email,
    unmapped_sources: [...new Set(otros.map((r) => r.source || 'null'))],
  }
}
