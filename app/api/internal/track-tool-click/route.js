export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { supabaseHeaders, supabaseUrl } from '@/lib/job-board'

/**
 * POST /api/internal/track-tool-click
 * body: { toolId: string }
 * Records a click on an internal tool by the current authenticated user.
 */
export async function POST(req) {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const toolId = String(body?.toolId || '').trim()
  if (!toolId || toolId.length > 64) {
    return NextResponse.json({ error: 'Invalid toolId' }, { status: 400 })
  }

  const url = `${supabaseUrl()}/rest/v1/tool_usage`
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify({ user_email: email, tool_id: toolId }),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[track-tool-click] supabase error', res.status, err)
    return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
