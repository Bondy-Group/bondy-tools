export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireJobBoardAdmin } from '@/lib/job-board'

/**
 * POST /api/internal/job-sources/request
 * Body: { sourceId: string, notes?: string }
 *
 * Marks a non-integrated source in `job_sources` as "integration requested" by
 * setting integration_requested_at / _by / _notes. Posts a draft to
 * #agentes-bondy so Mateo Dev sees it next session.
 *
 * Admin-only (Mara / Lucía).
 *
 * NOTE: writes go against the SCRAPER Supabase project (different from the
 * tools project). We use its anon key — RLS on job_sources allows anon UPDATE.
 */
const SCRAPER_SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SCRAPER_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

const AGENTES_BONDY_CHANNEL = 'C0AL153UN8K'

async function postSlack(text) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return { ok: false, skipped: 'no_token' }
  try {
    const r = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: AGENTES_BONDY_CHANNEL, text }),
    })
    const j = await r.json()
    return { ok: !!j.ok, raw: j }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}

export async function POST(req) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  const sourceId = (body?.sourceId || '').trim()
  const notes = (body?.notes || '').trim().slice(0, 1000)
  if (!sourceId) return NextResponse.json({ error: 'sourceId_required' }, { status: 400 })

  const requestedBy = guard.email || 'unknown'
  const now = new Date().toISOString()

  // 1. Patch the row. Only if in_scraper=false (already integrated → no-op).
  const url = `${SCRAPER_SUPABASE_URL}/rest/v1/job_sources?id=eq.${encodeURIComponent(sourceId)}&in_scraper=eq.false`
  const r = await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: SCRAPER_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SCRAPER_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      integration_requested_at: now,
      integration_requested_by: requestedBy,
      integration_request_notes: notes || null,
    }),
  })
  if (!r.ok) {
    const t = await r.text()
    return NextResponse.json({ error: 'patch_failed', detail: t }, { status: 500 })
  }
  const rows = await r.json()
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'source_not_found_or_already_integrated' }, { status: 404 })
  }
  const row = rows[0]

  // 2. Slack notification (best effort).
  const lines = [
    `🔵 *Pedido de integración al scraper* — solicitado por ${requestedBy}`,
    ``,
    `*Fuente:* ${row.name} (\`${row.id}\`)`,
    `*URL:* ${row.url}`,
    `*Método:* ${row.method} · *LATAM:* ${row.latam_coverage} · *Tipo:* ${row.tipo}`,
    `*Notas del catálogo:* ${row.notes}`,
  ]
  if (notes) lines.push(``, `*Contexto adicional:* ${notes}`)
  lines.push(``, `Mateo Dev: tomar en la próxima sesión. Filtro: \`integration_requested_at IS NOT NULL AND in_scraper = false\` ordenado por \`integration_requested_at ASC\`.`)
  const slack = await postSlack(lines.join('\n'))

  return NextResponse.json({
    ok: true,
    source: { id: row.id, name: row.name, integration_requested_at: row.integration_requested_at },
    slackPosted: slack.ok,
  })
}
