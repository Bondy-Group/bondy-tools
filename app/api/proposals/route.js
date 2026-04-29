export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin } from '@/lib/job-board'
import { listProposals, createProposal, DEFAULT_PROPOSAL } from '@/lib/proposals'

export async function GET() {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const rows = await listProposals()
    return NextResponse.json({ proposals: rows })
  } catch (err) {
    console.error('[proposals GET]', err)
    return NextResponse.json({ error: 'Could not list proposals' }, { status: 500 })
  }
}

export async function POST(req) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const clientName = String(body.client_name || '').trim()
  if (!clientName) {
    return NextResponse.json({ error: 'client_name is required' }, { status: 400 })
  }

  try {
    const row = await createProposal(
      {
        ...DEFAULT_PROPOSAL,
        ...body,
        client_name: clientName,
        client_legal_name: body.client_legal_name || clientName,
        client_short_name: body.client_short_name || clientName,
      },
      guard.email,
    )
    return NextResponse.json({ proposal: row }, { status: 201 })
  } catch (err) {
    console.error('[proposals POST]', err)
    return NextResponse.json({ error: 'Could not create proposal' }, { status: 500 })
  }
}
