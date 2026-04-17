import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export const JOB_BOARD_ADMINS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

/**
 * Check if the current session belongs to a job board admin (Mara / Lucía).
 * Returns { ok: true, email } or { ok: false, response: NextResponse } to short-circuit.
 */
export async function requireJobBoardAdmin() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email) {
    return { ok: false, status: 401, error: 'Not authenticated' }
  }
  if (!JOB_BOARD_ADMINS.includes(email)) {
    return { ok: false, status: 403, error: 'Forbidden' }
  }
  return { ok: true, email }
}

export function supabaseHeaders() {
  return {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  }
}

export function supabaseUrl() {
  return SUPABASE_URL
}

/**
 * Generate a URL-safe slug. If taken, appends -2, -3, etc.
 */
export function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 80) || 'role'
}

export async function uniqueSlug(base, excludeId = null) {
  const root = slugify(base)
  let candidate = root
  let n = 2
  for (let i = 0; i < 20; i++) {
    const q = `${SUPABASE_URL}/rest/v1/bondy_roles?slug=eq.${encodeURIComponent(candidate)}&select=id`
    const res = await fetch(q, { headers: supabaseHeaders(), cache: 'no-store' })
    if (!res.ok) break
    const rows = await res.json()
    const conflict = rows.find((r) => r.id !== excludeId)
    if (!conflict) return candidate
    candidate = `${root}-${n++}`
  }
  return candidate
}

/**
 * Get next position_number (auto-increment).
 */
export async function nextPositionNumber() {
  const q = `${SUPABASE_URL}/rest/v1/bondy_roles?select=position_number&order=position_number.desc&limit=1`
  const res = await fetch(q, { headers: supabaseHeaders(), cache: 'no-store' })
  if (!res.ok) return 1000
  const rows = await res.json()
  const max = rows[0]?.position_number || 0
  return max + 1
}
