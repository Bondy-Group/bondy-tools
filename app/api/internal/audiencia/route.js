/**
 * GET /api/internal/audiencia
 * Admin-only. Devuelve agregados de los 3 públicos (tech / hr / newsletter).
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { audienciaOverview } from '@/lib/audiencia'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

export async function GET() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const data = await audienciaOverview()
  return NextResponse.json({ ok: true, ...data })
}
