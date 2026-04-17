export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin, supabaseHeaders, supabaseUrl } from '@/lib/job-board'

/**
 * GET /api/bondy-applications/[id]/cv
 * Returns a signed URL (1 hour) to download the CV from the private bucket.
 */
export async function GET(_req, { params }) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  // Lookup the CV path
  const lookupRes = await fetch(
    `${supabaseUrl()}/rest/v1/bondy_applications?id=eq.${encodeURIComponent(params.id)}&select=cv_storage_path,cv_filename&limit=1`,
    { headers: supabaseHeaders(), cache: 'no-store' }
  )
  if (!lookupRes.ok) return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  const rows = await lookupRes.json()
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { cv_storage_path, cv_filename } = rows[0]
  if (!cv_storage_path) return NextResponse.json({ error: 'No CV attached' }, { status: 404 })

  // Get signed URL from Supabase Storage (1 hour)
  const signRes = await fetch(
    `${supabaseUrl()}/storage/v1/object/sign/applications-cv/${encodeURI(cv_storage_path)}`,
    {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ expiresIn: 3600 }),
    }
  )
  if (!signRes.ok) {
    const err = await signRes.text()
    console.error('[applications CV] sign error', signRes.status, err)
    return NextResponse.json({ error: 'Could not sign URL' }, { status: 500 })
  }
  const signed = await signRes.json()
  // signed.signedURL is relative: "/object/sign/applications-cv/path?token=..."
  const fullUrl = `${supabaseUrl()}/storage/v1${signed.signedURL}`
  return NextResponse.json({ url: fullUrl, filename: cv_filename })
}
