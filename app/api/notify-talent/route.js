/**
 * POST /api/notify-talent
 *
 * Dispara dos efectos al recibirse un nuevo perfil en talent_pool:
 *   1. Autoresponder al candidato (vía Resend) confirmando que su perfil fue recibido,
 *      mostrándole un resumen de lo que ingresó y un link único para completar/editar.
 *   2. Notificación al canal de Slack #candidatos-inbound (env var SLACK_CANDIDATES_CHANNEL_ID).
 *
 * Autenticado con x-notify-secret.
 * Body: { talent_id, email, name, edit_url, is_new, snapshot }
 */
import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/resend'
import { renderTalentAutoresponder, renderTalentAutoresponderText } from '@/lib/email/talent-pool'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTIFY_LEAD_SECRET = process.env.NOTIFY_LEAD_SECRET || 'bondy-notify-lead-internal'
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''
const SLACK_CHANNEL = process.env.SLACK_CANDIDATES_CHANNEL_ID || ''

async function postSlack({ talentId, email, name, snapshot, isNew, editUrl }) {
  if (!SLACK_BOT_TOKEN || !SLACK_CHANNEL) {
    console.warn('[notify-talent] SLACK env missing, skipping slack post')
    return { skipped: true }
  }
  const linkedinLine = snapshot.linkedin_url ? `\n• LinkedIn: ${snapshot.linkedin_url}` : ''
  const areaLine = snapshot.primary_area ? `\n• Área: ${snapshot.primary_area}` : ''
  const yrsLine = snapshot.years_experience ? `\n• Años: ${snapshot.years_experience}` : ''
  const locLine = (snapshot.location_city || snapshot.location_country)
    ? `\n• Ubicación: ${[snapshot.location_city, snapshot.location_country].filter(Boolean).join(', ')}`
    : ''
  const pitchLine = snapshot.pitch ? `\n• Pitch: ${String(snapshot.pitch).slice(0, 200)}` : ''
  const utm = snapshot.utm_source ? `\n• UTM: ${snapshot.utm_source}/${snapshot.utm_medium || ''}/${snapshot.utm_campaign || ''}` : ''

  const header = isNew ? '🆕 Nuevo perfil en talent pool' : '🔁 Talent pool actualizado'
  const text = `${header}
*${name}* — <mailto:${email}|${email}>${linkedinLine}${areaLine}${yrsLine}${locLine}${pitchLine}${utm}

→ Ver en tools: https://tools.wearebondy.com/internal/talent-pool/${talentId}`

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL,
      text,
      unfurl_links: false,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) console.error('[notify-talent] slack post failed', data)
  return data
}

export async function POST(req) {
  const auth = req.headers.get('x-notify-secret')
  if (auth !== NOTIFY_LEAD_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const { talent_id, email, name, edit_url, is_new, snapshot } = body || {}
  if (!email || !name || !edit_url) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  // 1. Autoresponder al candidato
  const html = renderTalentAutoresponder({ name, email, editUrl: edit_url, snapshot, isNew: !!is_new })
  const text = renderTalentAutoresponderText({ name, email, editUrl: edit_url, snapshot, isNew: !!is_new })

  const subject = is_new
    ? 'Recibimos tu perfil en Bondy — completá los detalles'
    : 'Actualizamos tu perfil en Bondy'

  const emailRes = await sendEmail({
    to: email,
    subject,
    html,
    text,
    headers: {
      'X-Entity-Ref-ID': `talent-${talent_id}`,
    },
    tags: [
      { name: 'campaign', value: 'talent-autoresponder' },
      { name: 'is_new', value: is_new ? 'true' : 'false' },
    ],
  })

  // 2. Slack en paralelo (no bloquea respuesta)
  const slackRes = await postSlack({
    talentId: talent_id,
    email,
    name,
    snapshot: snapshot || {},
    isNew: !!is_new,
    editUrl: edit_url,
  })

  return NextResponse.json({
    ok: true,
    email_sent: emailRes.ok,
    slack_posted: !slackRes.skipped && slackRes.ok !== false,
  })
}
