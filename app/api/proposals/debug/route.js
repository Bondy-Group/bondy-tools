export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin, supabaseUrl, supabaseHeaders } from '@/lib/job-board'

export async function GET() {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const url = supabaseUrl()
  const headers = supabaseHeaders()

  const debug = {
    supabaseUrl: url,
    apikeyLen: headers.apikey ? headers.apikey.length : 0,
    apikeyPrefix: headers.apikey ? headers.apikey.slice(0, 12) : null,
    apikeySuffix: headers.apikey ? headers.apikey.slice(-12) : null,
  }

  try {
    const r = await fetch(`${url}/rest/v1/proposals?select=id&limit=1`, { headers, cache: 'no-store' })
    debug.proposalsStatus = r.status
    debug.proposalsBody = await r.text()
  } catch (err) {
    debug.proposalsError = String(err.message || err)
  }

  return NextResponse.json(debug, { status: 200 })
}
// force-redeploy 1777488700
