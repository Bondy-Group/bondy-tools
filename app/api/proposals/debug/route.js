export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin, supabaseUrl, supabaseHeaders } from '@/lib/job-board'

export async function GET() {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const url = supabaseUrl()
  const headers = supabaseHeaders()

  const debug = {
    step: 'init',
    supabaseUrl: url,
    hasApikey: !!headers.apikey,
    apikeyLen: headers.apikey ? headers.apikey.length : 0,
    apikeyPrefix: headers.apikey ? headers.apikey.slice(0, 8) : null,
    hasAuth: !!headers.Authorization,
    NEXT_PUBLIC_SUPABASE_URL_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SERVICE_ROLE_len: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').length,
  }

  try {
    debug.step = 'fetching_proposals_list'
    const fetchUrl = `${url}/rest/v1/proposals?select=id&limit=1`
    debug.fetchUrl = fetchUrl
    const res = await fetch(fetchUrl, { headers, cache: 'no-store' })
    debug.status = res.status
    debug.responseText = await res.text()
  } catch (err) {
    debug.error = String(err.message || err)
    debug.errorStack = err.stack
  }

  try {
    debug.step2 = 'fetching_rpc'
    const rpcUrl = `${url}/rest/v1/rpc/next_agreement_id`
    debug.rpcUrl = rpcUrl
    const r = await fetch(rpcUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_year: '2026' }),
    })
    debug.rpcStatus = r.status
    debug.rpcText = await r.text()
  } catch (err) {
    debug.rpcError = String(err.message || err)
  }

  return NextResponse.json(debug, { status: 200 })
}
