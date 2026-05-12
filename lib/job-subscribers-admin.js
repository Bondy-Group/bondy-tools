/**
 * Job Subscribers — admin read-only.
 * El digest semanal usa lib/subscribers.js (no esta lib). Esta es para la UI interna.
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

export async function listJobSubscribers({ status, source, limit = 500 } = {}) {
  const params = new URLSearchParams()
  params.set('select', 'id,email,status,preferences,source,subscribed_at,unsubscribed_at,last_sent_at,send_count')
  params.set('order', 'subscribed_at.desc')
  params.set('limit', String(limit))
  if (status) params.append('status', `eq.${status}`)
  if (source) params.append('source', `eq.${source}`)
  const url = `${SUPABASE_URL}/rest/v1/job_subscribers?${params.toString()}`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    console.error('[job-subscribers] list failed', await res.text())
    return []
  }
  return res.json()
}

export async function jobSubscribersStats() {
  const url = `${SUPABASE_URL}/rest/v1/job_subscribers?select=status,source,last_sent_at`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return { total: 0, active: 0, unsubscribed: 0, candidates: 0, recruiters: 0, never_sent: 0 }
  const rows = await res.json()
  const out = { total: rows.length, active: 0, unsubscribed: 0, candidates: 0, recruiters: 0, never_sent: 0 }
  for (const r of rows) {
    if (r.status === 'active') out.active++
    if (r.status === 'unsubscribed') out.unsubscribed++
    if (r.source === 'busco-trabajo' || r.source === 'busco-trabajo-candidates') out.candidates++
    if (r.source === 'busco-trabajo-recruiters') out.recruiters++
    if (!r.last_sent_at && r.status === 'active') out.never_sent++
  }
  return out
}

export async function unsubscribeSubscriberById(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/job_subscribers?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString() }),
  })
  return res.ok
}
