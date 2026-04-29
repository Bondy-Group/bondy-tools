export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin } from '@/lib/job-board'
import { getProposal, updateProposal, deleteProposal } from '@/lib/proposals'

export async function GET(_req, { params }) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    const row = await getProposal(params.id)
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ proposal: row })
  } catch (err) {
    console.error('[proposals GET id]', err)
    return NextResponse.json({ error: 'Could not load proposal' }, { status: 500 })
  }
}

export async function PATCH(req, { params }) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let patch
  try {
    patch = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const row = await updateProposal(params.id, patch)
    return NextResponse.json({ proposal: row })
  } catch (err) {
    console.error('[proposals PATCH]', err)
    return NextResponse.json({ error: 'Could not update proposal' }, { status: 500 })
  }
}

export async function DELETE(_req, { params }) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  try {
    await deleteProposal(params.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[proposals DELETE]', err)
    return NextResponse.json({ error: 'Could not delete proposal' }, { status: 500 })
  }
}
