export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin, supabaseHeaders, supabaseUrl } from '@/lib/job-board'

/**
 * GET /api/bondy-applications
 * Query params: role_id, status, q (search on name/email)
 * Returns applications joined with role (title, slug, client_name).
 */
export async function GET(req) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { searchParams } = new URL(req.url)
  const filters = []
  const role_id = searchParams.get('role_id')
  const status = searchParams.get('status')
  const q = searchParams.get('q')

  if (role_id) filters.push(`role_id=eq.${encodeURIComponent(role_id)}`)
  if (status) filters.push(`status=eq.${encodeURIComponent(status)}`)
  if (q) {
    const esc = q.replace(/[%,]/g, '').trim()
    if (esc) filters.push(`or=(full_name.ilike.*${encodeURIComponent(esc)}*,email.ilike.*${encodeURIComponent(esc)}*)`)
  }

  filters.push('order=created_at.desc')
  // PostgREST embedded resource: requires FK relationship (which we have: bondy_applications.role_id → bondy_roles.id)
  filters.push('select=*,role:bondy_roles(id,title,slug,client_name,client_blurb,client_visible,status,seniority,role_category)')

  const url = `${supabaseUrl()}/rest/v1/bondy_applications?${filters.join('&')}`
  const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' })
  if (!res.ok) {
    const err = await res.text()
    console.error('[applications GET] supabase error', res.status, err)
    return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  }
  const rows = await res.json()
  return NextResponse.json({ applications: rows })
}
