import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

const SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

const FULL_ACCESS_EMAILS = ['mara@schmitman.com', 'mara@wearebondy.com']
const ACTIVE_STATUSES = ['sourced','contacted','follow_up_1','follow_up_2','replied_positive','shortlisted','interview_scheduled']

// ─── SEGURIDAD ───────────────────────────────
function verifySlackSignature(req, body) {
  const timestamp = req.headers.get('x-slack-request-timestamp')
  const signature = req.headers.get('x-slack-signature')
  if (!timestamp || !signature) return false
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return false
  const sigBase = 'v0:' + timestamp + ':' + body
  const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET)
  hmac.update(sigBase)
  const computed = 'v0=' + hmac.digest('hex')
  try { return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature)) }
  catch { return false }
}

// ─── SUPABASE FETCH DIRECTO ───────────────────
async function getPipeline(recruiterEmail) {
  const isFullAccess = FULL_ACCESS_EMAILS.includes((recruiterEmail || '').toLowerCase())
  const statusFilter = 'in.(' + ACTIVE_STATUSES.join(',') + ')'

  let url = SUPABASE_URL + '/rest/v1/sourcing_pipeline'
    + '?select=full_name,current_title,current_company,tier,status,job_title,client_name,tech_stack,years_exp,linkedin_url,email,updated_at,recruiter_email'
    + '&status=' + statusFilter
    + '&order=updated_at.desc'

  if (!isFullAccess) {
    url += '&recruiter_email=eq.' + encodeURIComponent(recruiterEmail || '')
  }

  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
    },
  })

  if (!res.ok) {
    const err = await res.text()
    return 'Error al consultar Supabase: ' + res.status + ' ' + res.statusText + ' - ' + err
  }

  const data = await res.json()

  if (!data || data.length === 0) {
    return isFullAccess
      ? 'El pipeline está vacío — no hay candidatos activos en este momento.'
      : 'No hay candidatos activos asignados a ' + recruiterEmail + ' en este momento.'
  }

  // Agrupar por búsqueda
  const grouped = data.reduce((acc, c) => {
    const key = (c.job_title || 'Sin rol') + ' — ' + (c.client_name || 'Sin cliente')
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  let context = 'PIPELINE ACTIVO DEL RECRUITER:\n\n'
  for (const [search, candidates] of Object.entries(grouped)) {
    context += '### ' + search + '\n'
    for (const c of candidates) {
      const daysAgo = Math.floor((Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24))
      context += '- **' + c.full_name + '** (T' + c.tier + ') | Status: ' + c.status + ' | Hace ' + daysAgo + 'd\n'
      context += '  Rol: ' + (c.current_title || 'N/A') + ' @ ' + (c.current_company || 'N/A') + '\n'
      context += '  Stack: ' + (Array.isArray(c.tech_stack) ? c.tech_stack.join(', ') : (c.tech_stack || 'N/A')) + ' | ' + (c.years_exp || '?') + ' años\n'
      context += '  LinkedIn: ' + (c.linkedin_url || 'N/A') + ' | Email: ' + (c.email || 'Solo LinkedIn') + '\n'
      if (!isFullAccess === false && c.recruiter_email) context += '  Recruiter: ' + c.recruiter_email + '\n'
    }
    context += '\n'
  }
  return context
}

// ─── HISTORIAL DE SLACK ────────────────────────
async function getHistory(channelId) {
  const res = await fetch('https://slack.com/api/conversations.history?channel=' + channelId + '&limit=20', {
    headers: { 'Authorization': 'Bearer ' + SLACK_BOT_TOKEN },
  })
  const data = await res.json()
  if (!data.ok || !data.messages) return []
  const messages = [...data.messages].reverse()
  const history = []
  for (const msg of messages.slice(0, -1)) {
    if (!msg.text || msg.subtype) continue
    history.push({ role: msg.bot_id ? 'assistant' : 'user', content: msg.text })
  }
  return history
}

// ─── SLACK POST ───────────────────────────────
async function postToSlack(channel, text, thread_ts) {
  const payload = { channel, text }
  if (thread_ts) payload.thread_ts = thread_ts
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + SLACK_BOT_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

// ─── SYSTEM PROMPT ────────────────────────────
const SYSTEM = `Sos Rex, el agente de sourcing de Bondy Group.
Bondy es una boutique de recruiting técnico en LATAM fundada por Mara Schmitman.
Tu objetivo siempre es llegar a 4 entrevistas con candidatos calificados en la primera semana.

## EQUIPO Y PERMISOS
- Mara: control total
- Lucía: validar estrategia, aprobar longlist, contactar, agendar
- Facundo / Rodrigo: aprobar/rechazar candidatos, pedir follow-up, agendar entrevistas

## REGLAS
- Nunca contactás un candidato sin aprobación explícita del recruiter
- Nunca revelás el nombre del cliente en el primer contacto
- Nunca pasás un candidato a shortlisted sin OK del recruiter
- Si candidato lleva +24hs en sourced sin revisión → avisás
- Si candidato lleva +48hs en contacted sin respuesta → proponés follow-up
- Si candidato respondió positivo hace +24hs sin acción → urgís al recruiter

## COMUNICACIÓN
- Respondés en español, directo y accionable
- Máximo 1 emoji por mensaje para señalizar estado
- Si ejecutás algo → confirmás qué hiciste
- Una sola pregunta de clarificación por respuesta
- NUNCA usar "Te copa", emojis en emails, "Estimado/a"`

// ─── DEDUPLICACIÓN ────────────────────────────
const processedEvents = new Set()

// ─── HANDLER PRINCIPAL ────────────────────────
export async function POST(req) {
  const rawBody = await req.text()

  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body
  try { body = JSON.parse(rawBody) }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }

  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  const event = body.event
  if (!event || event.type !== 'message' || event.bot_id || event.subtype) {
    return NextResponse.json({ ok: true })
  }
  if (body.event?.channel_type !== 'im') {
    return NextResponse.json({ ok: true })
  }

  const eventId = body.event_id
  if (eventId) {
    if (processedEvents.has(eventId)) return NextResponse.json({ ok: true })
    processedEvents.add(eventId)
    setTimeout(() => processedEvents.delete(eventId), 5 * 60 * 1000)
  }

  const userMessage = event.text
  const slackUserId = event.user
  const channelId = event.channel
  const threadTs = event.thread_ts || null

  try {
    const userInfoRes = await fetch('https://slack.com/api/users.info?user=' + slackUserId, {
      headers: { 'Authorization': 'Bearer ' + SLACK_BOT_TOKEN },
    })
    const userInfo = await userInfoRes.json()
    const recruiterEmail = userInfo?.user?.profile?.email || ''
    const recruiterName = userInfo?.user?.profile?.real_name || 'Recruiter'

    const [pipelineContext, history] = await Promise.all([
      getPipeline(recruiterEmail),
      getHistory(channelId),
    ])

    const messages = [
      ...history,
      { role: 'user', content: userMessage },
    ]

    const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM + '\n\n---\nRECRUITER: ' + recruiterName + ' (' + recruiterEmail + ')\nFECHA: ' + today + '\n\n' + pipelineContext,
      messages,
    })

    const reply = response.content[0]?.type === 'text'
      ? response.content[0].text
      : 'No pude procesar tu mensaje. Intentá de nuevo.'

    await postToSlack(channelId, reply, threadTs)
  } catch (error) {
    console.error('Rex error:', error)
    await postToSlack(channelId, 'Tuve un problema: ' + error.message, threadTs)
  }

  return NextResponse.json({ ok: true })
}
