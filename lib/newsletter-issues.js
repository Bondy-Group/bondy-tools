/**
 * Newsletter issues — capa de acceso a Supabase.
 * Server-only. Usa el service role key (bypassa RLS).
 *
 * Tabla:
 *   - newsletter_issues (drafts + sent)
 *   - newsletter_subscribers (confirmados)
 *   - newsletter_sends (log de envíos individuales)
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

// ───────────────────────────────────────────────────────────
// ISSUES
// ───────────────────────────────────────────────────────────
export async function listIssues({ limit = 50 } = {}) {
  const url = `${SUPABASE_URL}/rest/v1/newsletter_issues?select=*&order=created_at.desc&limit=${limit}`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    console.error('[newsletter-issues] list failed', await res.text())
    return []
  }
  return res.json()
}

export async function getIssue(id) {
  const url = `${SUPABASE_URL}/rest/v1/newsletter_issues?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] || null
}

export async function createIssue({ title, subject, preheader, lang = 'es', content, createdBy }) {
  const payload = {
    title: title || 'Sin título',
    subject: subject || title || 'Bondy Thinking',
    preheader: preheader || null,
    lang: lang === 'en' ? 'en' : 'es',
    content: content || { sections: [] },
    status: 'draft',
    created_by: createdBy || null,
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_issues`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[newsletter-issues] create failed', err)
    return { ok: false, error: err }
  }
  const rows = await res.json()
  return { ok: true, issue: rows?.[0] }
}

export async function updateIssue(id, patch) {
  // No permitir mutar campos managed
  const clean = { ...patch }
  delete clean.id
  delete clean.created_at
  delete clean.updated_at
  delete clean.issue_number
  delete clean.sent_at
  delete clean.sent_count

  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_issues?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(clean),
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[newsletter-issues] update failed', err)
    return { ok: false, error: err }
  }
  const rows = await res.json()
  return { ok: true, issue: rows?.[0] }
}

export async function deleteIssue(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_issues?id=eq.${encodeURIComponent(id)}&status=eq.draft`, {
    method: 'DELETE',
    headers: headers(),
  })
  return res.ok
}

export async function markIssueSent(id, sentCount) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_issues?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_count: sentCount,
    }),
  })
  if (!res.ok) {
    console.error('[newsletter-issues] markIssueSent failed', await res.text())
    return null
  }
  const rows = await res.json()
  return rows?.[0] || null
}

// ───────────────────────────────────────────────────────────
// SUBSCRIBERS (newsletter_subscribers)
// ───────────────────────────────────────────────────────────
export async function listConfirmedSubscribers({ lang } = {}) {
  // Solo los confirmados, no unsubscribed
  let url = `${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=id,email,lang,unsubscribe_token&confirmed_at=not.is.null&unsubscribed_at=is.null`
  if (lang) url += `&lang=eq.${lang}`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    console.error('[newsletter-subscribers] list failed', await res.text())
    return []
  }
  return res.json()
}

export async function countSubscribersByLang() {
  const url = `${SUPABASE_URL}/rest/v1/newsletter_subscribers?select=lang,confirmed_at,unsubscribed_at`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return { es: 0, en: 0, total_confirmed: 0, pending: 0 }
  const rows = await res.json()
  const out = { es: 0, en: 0, total_confirmed: 0, pending: 0, unsubscribed: 0 }
  for (const r of rows) {
    if (r.unsubscribed_at) {
      out.unsubscribed++
      continue
    }
    if (r.confirmed_at) {
      out.total_confirmed++
      if (r.lang === 'en') out.en++
      else out.es++
    } else {
      out.pending++
    }
  }
  return out
}

export async function findSubscriberByUnsubToken(token) {
  const url = `${SUPABASE_URL}/rest/v1/newsletter_subscribers?unsubscribe_token=eq.${encodeURIComponent(token)}&select=id,email,unsubscribed_at&limit=1`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] || null
}

export async function unsubscribeByToken(token) {
  const sub = await findSubscriberByUnsubToken(token)
  if (!sub) return { ok: false, error: 'not_found' }
  if (sub.unsubscribed_at) return { ok: true, alreadyDone: true }
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/newsletter_subscribers?id=eq.${sub.id}`,
    {
      method: 'PATCH',
      headers: { ...headers(), Prefer: 'return=minimal' },
      body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }),
    }
  )
  if (!res.ok) {
    console.error('[newsletter-subscribers] unsubscribe failed', await res.text())
    return { ok: false, error: 'update_failed' }
  }
  return { ok: true }
}

// ───────────────────────────────────────────────────────────
// SENDS LOG
// ───────────────────────────────────────────────────────────
export async function logSend({ issueId, subscriberId, email, resendId, status, error }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_sends`, {
    method: 'POST',
    headers: { ...headers(), Prefer: 'return=minimal' },
    body: JSON.stringify({
      issue_id: issueId,
      subscriber_id: subscriberId,
      email,
      resend_id: resendId || null,
      status: status || 'sent',
      error: error || null,
    }),
  })
  if (!res.ok) {
    console.error('[newsletter-sends] log failed', await res.text())
  }
}
