export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin, supabaseHeaders, supabaseUrl } from '@/lib/job-board'

/**
 * GET /api/internal/usage-admin
 * Solo admins (Mara / Lucía).
 *
 * Devuelve agregados de los últimos 30 días, generados por la RPC
 * public.usage_admin_aggregate():
 *   - by_tool:   [{ tool_id, click_count, distinct_users, last_used_at }]
 *   - by_user:   [{ user_email, click_count, distinct_tools, last_used_at }]
 *   - matrix:    [{ user_email, tool_id, click_count, last_used_at }]
 *   - daily:     [{ day (YYYY-MM-DD), click_count }]
 */
export async function GET() {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const url = `${supabaseUrl()}/rest/v1/rpc/usage_admin_aggregate`
  const res = await fetch(url, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: '{}',
    cache: 'no-store',
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[usage-admin GET] supabase error', res.status, err)
    return NextResponse.json({ error: 'Supabase error', detail: err }, { status: 500 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
