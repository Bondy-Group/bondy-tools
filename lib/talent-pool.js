/**
 * Talent Pool — capa de acceso a Supabase. Server-only, service role.
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

const SELECT_LIST = [
  'id', 'email', 'name', 'linkedin_url',
  'current_position', 'current_company', 'years_experience',
  'location_city', 'location_country',
  'primary_area', 'seniority', 'skills',
  'modality_preference', 'english_level',
  'desired_salary_amount', 'desired_salary_currency', 'desired_salary_period',
  'status', 'source', 'pitch', 'internal_tags',
  'created_at', 'updated_at', 'last_edited_by_candidate_at', 'edit_count',
].join(',')

export async function listTalentPool({ status, area, q, limit = 200 } = {}) {
  const params = new URLSearchParams()
  params.set('select', SELECT_LIST)
  params.set('order', 'created_at.desc')
  params.set('limit', String(limit))
  if (status) params.append('status', `eq.${status}`)
  if (area) params.append('primary_area', `eq.${area}`)
  if (q) {
    // OR across name/email/current_position/current_company/pitch
    const term = String(q).replace(/[%,]/g, '').trim()
    if (term) params.append('or', `(name.ilike.*${term}*,email.ilike.*${term}*,current_position.ilike.*${term}*,current_company.ilike.*${term}*,pitch.ilike.*${term}*)`)
  }
  const url = `${SUPABASE_URL}/rest/v1/talent_pool?${params.toString()}`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) {
    console.error('[talent-pool] list failed', await res.text())
    return []
  }
  return res.json()
}

export async function getTalent(id) {
  const url = `${SUPABASE_URL}/rest/v1/talent_pool?id=eq.${encodeURIComponent(id)}&select=*&limit=1`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return null
  const rows = await res.json()
  return rows?.[0] || null
}

export async function updateTalent(id, patch) {
  const clean = { ...patch }
  delete clean.id
  delete clean.email
  delete clean.edit_token
  delete clean.edit_token_expires_at
  delete clean.created_at
  delete clean.updated_at
  delete clean.edit_count

  const res = await fetch(`${SUPABASE_URL}/rest/v1/talent_pool?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { ...headers(), Prefer: 'return=representation' },
    body: JSON.stringify(clean),
  })
  if (!res.ok) {
    console.error('[talent-pool] update failed', await res.text())
    return { ok: false }
  }
  const rows = await res.json()
  return { ok: true, talent: rows?.[0] }
}

export async function deleteTalent(id) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/talent_pool?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(),
  })
  return res.ok
}

export async function countTalentByStatus() {
  const url = `${SUPABASE_URL}/rest/v1/talent_pool?select=status`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return {}
  const rows = await res.json()
  const out = { total: rows.length, new: 0, active: 0, archived: 0, spam: 0, hired_elsewhere: 0 }
  for (const r of rows) {
    if (out[r.status] !== undefined) out[r.status]++
  }
  return out
}

export async function listTalentEdits(talentId) {
  const url = `${SUPABASE_URL}/rest/v1/talent_pool_edits?talent_id=eq.${encodeURIComponent(talentId)}&order=created_at.desc&limit=50`
  const res = await fetch(url, { headers: headers(), cache: 'no-store' })
  if (!res.ok) return []
  return res.json()
}
