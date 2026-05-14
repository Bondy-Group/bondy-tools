/**
 * POST /api/session-requests
 *
 * Form público "Sesiones de Carrera" (consultoría de carrera 1 a 1).
 * Renderizado por app/_components/SesionesCarrera.js en /busco-trabajo y
 * /recursos-recruiters.
 *
 * Body JSON: {
 *   nombre, email, linkedin_url, cv_url?, producto, consultora_preferida,
 *   expectativa, problema, pagina_origen, hp_field?
 * }
 * Returns: { ok: true } on success.
 *
 * Pipeline (Patrón B — ver docs/notifications.md):
 *   1. valida + honeypot + rate limit
 *   2. INSERT en session_requests (estado 'pending')
 *   3. postea a Slack #agentes-bondy con botones (best-effort, no bloquea)
 *   4. guarda el ts del mensaje en la fila para poder editarlo después
 */

import { NextResponse } from 'next/server'
import {
  insertSessionRequest,
  updateSessionRequest,
  PRODUCTO_VALUES,
  CONSULTORA_VALUES,
  PAGINA_VALUES,
} from '@/lib/session-requests'
import { postSessionRequestMessage } from '@/lib/slack-sessions'
import { sendEmail } from '@/lib/resend'
import { renderSubmissionNotifyEmail } from '@/lib/email/session-requests'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const NOTIFY_TO = process.env.SESSION_NOTIFY_EMAIL || 'hello@wearebondy.com'

// Rate limiter naive en memoria — best-effort, se resetea en cold start.
const HITS = new Map()
const WINDOW_MS = 60_000
const LIMIT = 8

function rateLimited(ip) {
  if (!ip) return false
  const now = Date.now()
  const arr = (HITS.get(ip) || []).filter((t) => now - t < WINDOW_MS)
  arr.push(now)
  HITS.set(ip, arr)
  return arr.length > LIMIT
}

function isEmail(s) {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

function isUrl(s) {
  if (typeof s !== 'string') return false
  try {
    const u = new URL(s.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

function clean(s, max) {
  return (s || '').toString().trim().slice(0, max)
}

export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
  if (rateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  // Honeypot: campo invisible. Si viene lleno, fingimos éxito y cortamos.
  if (body.hp_field) {
    return NextResponse.json({ ok: true })
  }

  const nombre = clean(body.nombre, 120)
  const email = clean(body.email, 160).toLowerCase()
  const linkedin_url = clean(body.linkedin_url, 300)
  const cv_url = clean(body.cv_url, 300)
  const producto = clean(body.producto, 60)
  const consultora_preferida = clean(body.consultora_preferida, 60)
  const expectativa = clean(body.expectativa, 2000)
  const problema = clean(body.problema, 2000)
  const pagina_origen = clean(body.pagina_origen, 40)

  const errors = []
  if (!nombre) errors.push('nombre')
  if (!isEmail(email)) errors.push('email')
  if (!isUrl(linkedin_url)) errors.push('linkedin_url')
  if (cv_url && !isUrl(cv_url)) errors.push('cv_url')
  if (!PRODUCTO_VALUES.includes(producto)) errors.push('producto')
  if (!CONSULTORA_VALUES.includes(consultora_preferida)) errors.push('consultora_preferida')
  if (!expectativa) errors.push('expectativa')
  if (!problema) errors.push('problema')
  if (!PAGINA_VALUES.includes(pagina_origen)) errors.push('pagina_origen')

  if (errors.length) {
    return NextResponse.json({ ok: false, error: 'validation', fields: errors }, { status: 400 })
  }

  const ins = await insertSessionRequest({
    nombre,
    email,
    linkedin_url,
    cv_url: cv_url || null,
    producto,
    consultora_preferida,
    expectativa,
    problema,
    pagina_origen,
    estado: 'pending',
  })

  if (!ins.ok) {
    return NextResponse.json({ ok: false, error: 'storage' }, { status: 500 })
  }

  // Notificación al equipo por email (hello@) — canal confiable, no depende
  // de Slack. Incluye los links de acción. Best-effort: si falla, la
  // solicitud igual quedó guardada y no rompemos el funnel del usuario.
  try {
    const mail = renderSubmissionNotifyEmail({ row: ins.row })
    await sendEmail({
      to: NOTIFY_TO,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      from: 'Bondy · Sesiones de Carrera <jobs@wearebondy.com>',
      replyTo: ins.row.email,
      tags: [{ name: 'type', value: 'session-notify' }],
    })
  } catch (e) {
    console.error('[session-requests] notify email threw', e)
  }

  // Slack es best-effort: si Rex no está en el canal o falla, la solicitud
  // igual quedó guardada y ya salió el email. No rompemos el funnel.
  try {
    const posted = await postSessionRequestMessage(ins.row)
    if (posted.ok && posted.ts) {
      await updateSessionRequest(ins.row.id, { slack_message_ts: posted.ts })
    }
  } catch (e) {
    console.error('[session-requests] slack post threw', e)
  }

  return NextResponse.json({ ok: true })
}
