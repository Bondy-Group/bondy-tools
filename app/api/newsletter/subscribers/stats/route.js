/**
 * GET /api/newsletter/subscribers/stats
 * Returns: { ok, stats: { es, en, pending, unsubscribed, total_confirmed } }
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { countSubscribersByLang } from '@/lib/newsletter-issues'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const stats = await countSubscribersByLang()
  return NextResponse.json({ ok: true, stats })
}
