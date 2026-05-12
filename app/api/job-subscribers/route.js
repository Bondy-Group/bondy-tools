/**
 * GET /api/job-subscribers?status=&source=
 * Admin-only.
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listJobSubscribers, jobSubscribersStats } from '@/lib/job-subscribers-admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

export async function GET(req) {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const source = url.searchParams.get('source') || undefined
  const [subscribers, stats] = await Promise.all([
    listJobSubscribers({ status, source }),
    jobSubscribersStats(),
  ])
  return NextResponse.json({ ok: true, subscribers, stats })
}
