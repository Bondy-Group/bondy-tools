/**
 * GET /api/talent-pool?status=&area=&q=
 * Admin-only (middleware ya filtra /internal — para /api usamos session check).
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listTalentPool, countTalentByStatus } from '@/lib/talent-pool'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) return { ok: false }
  return { ok: true, email }
}

export async function GET(req) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const url = new URL(req.url)
  const status = url.searchParams.get('status') || undefined
  const area = url.searchParams.get('area') || undefined
  const q = url.searchParams.get('q') || undefined
  const [talents, stats] = await Promise.all([
    listTalentPool({ status, area, q }),
    countTalentByStatus(),
  ])
  return NextResponse.json({ ok: true, talents, stats })
}
