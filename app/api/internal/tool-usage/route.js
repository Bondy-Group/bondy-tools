export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseHeaders, supabaseUrl } from '@/lib/job-board'

/**
 * GET /api/internal/tool-usage
 * Returns aggregated usage for the current user over the last 30 days.
 * Response: { usage: [{ tool_id, click_count, last_used_at }] }
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const url = `${supabaseUrl()}/rest/v1/tool_usage_30d?user_email=eq.${encodeURIComponent(email)}&select=tool_id,click_count,last_used_at`
  const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' })

  if (!res.ok) {
    const err = await res.text()
    console.error('[tool-usage GET] supabase error', res.status, err)
    return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  }

  const rows = await res.json()
  return NextResponse.json({ usage: rows })
}
