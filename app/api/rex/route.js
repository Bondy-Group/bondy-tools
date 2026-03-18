import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

// Aumentar el tiempo límite de la función a 60s
export const maxDuration = 60

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Set en memoria para deduplicar reintentos de Slack
const processedEvents = new Set()

// ─────────────────────────────────────────────
// SEGURIDAD: verificación de firma de Slack
// ─────────────────────────────────────────────
function verifySlackSignature(req, body) {
  const timestamp = req.headers.get('x-slack-request-timestamp')
  const signature = req.headers.get('x-slack-signature')
  if (!timestamp || !signature) return false

  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) return false

  const sigBase = `v0:${timestamp}:${body}`
  const hmac = crypto.createHmac('sha256', SLACK_SIGNING_SECRET)
  hmac.update(sigBase)
  const computed = `v0=${hmac.digest('hex')}`

  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────
// CONTEXTO: pipeline activo del recruiter
// ─────────────────────────────────────────────
async function getActiveSearchContext(recruiterEmail) {
  const { data, error } = await supabase
    .from('sourcing_pipeline')
    .select(
      'full_name, current_title, current_company, tier, status, job_title, client_name, tech_stack, years_exp, linkedin_url, email, updated_at, rejection_reason'
    )
    .eq('recruiter_email', recruiterEmail)
    .in('status', [
      'sourced', 'contacted', 'follow_up_1', 'follow_up_2',
      'replied_positive', 'shortlisted', 'interview_scheduled',
    ])
    .order('updated_at', { ascending: false })

  if (error || !data || data.length === 0) {
    return 'No hay candidatos activos en el pipeline para este recruiter.'
  }

  // Agrupar por búsqueda
  const grouped = data.reduce((acc, c) => {
    const key = `${c.job_title} — ${c.client_name}`
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  let context = 'PIPELINE ACTIVO DEL RECRUITER:\n\n'
  for (const [search, candidates] of Object.entries(grouped)) {
    context += `### ${search}\n`
    for (const c of candidates) {
      const daysAgo = Math.floor(
        (Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      )
      context += `- **${c.full_name}** (T${c.tier}) | Status: ${c.status} | Hace ${daysAgo}d\n`
      context += `  Rol actual: ${c.current_title} @ ${c.current_company}\n`
      context += `  Stack: ${c.tech_stack?.join(', ') || 'N/A'} | ${c.years_exp} años exp\n`
      context += `  LinkedIn: ${c.linkedin_url || 'N/A'} | Email: ${c.email || 'Solo LinkedIn'}\n`
      if (c.rejection_reason) context += `  Motivo rechazo: ${c.rejection_reason}\n`
    }
    context += '\n'
  }

  return context
}

// ─────────────────────────────────────────────
// HISTORIAL: últimos N mensajes del DM con Rex
// ─────────────────────────────────────────────
async function getConversationHistory(channelId, botUserId, limit = 20) {
  const res = await fetch(
    `https://slack.com/api/conversations.history?channel=${channelId}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } }
  )
  const data = await res.json()

  if (!data.ok || !data.messages) return []

  // Invertir para orden cronológico (Slack devuelve newest-first)
  const messages = [...data.messages].reverse()

  // Convertir a formato de mensajes para Claude
  // Excluir el mensaje más reciente (ya viene en event.text)
  const history = []
  for (const msg of messages.slice(0, -1)) {
    if (!msg.text || msg.subtype) continue
    const role = msg.bot_id ? 'assistant' : 'user'
    history.push({ role, content: msg.text })
  }

  return history
}

// ─────────────────────────────────────────────
// SLACK: enviar mensaje (con soporte de hilo)
// ─────────────────────────────────────────────
async function postToSlack(channel, text, thread_ts = null) {
  const payload = { channel, text }
  if (thread_ts) payload.thread_ts = thread_ts

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
}

// ─────────────────────────────────────────────
// SYSTEM PROMPT COMPLETO DE REX
// ─────────────────────────────────────────────
const REX_SYSTEM_PROMPT = `Sos Rex, el agente de sourcing de Bondy Group.
Bondy es una boutique de recruiting técnico en LATAM fundada por Mara Schmitman.
Tu objetivo siempre es llegar a 4 entrevistas con candidatos calificados en la primera semana.

---

## EQUIPO Y PERMISOS

| Usuario | Rol | Puede hacer |
|---|---|---|
| Mara | Control total | Todo |
| Lucía | Recruiter senior | Validar estrategia, aprobar longlist, contactar, agendar |
| Facundo | Recruiter | Aprobar/rechazar candidatos, pedir follow-up, agendar entrevistas |
| Rodrigo | Recruiter | Aprobar/rechazar candidatos, pedir follow-up, agendar entrevistas |

Si alguien no reconocido te escribe, respondé: "Hola, no te tengo registrado en el equipo de Bondy. Avisale a Mara para que me configure tu acceso."

---

## REGLAS DE PIPELINE

- Nunca contactás un candidato sin aprobación explícita del recruiter
- Nunca revelás el nombre del cliente en el primer contacto con el candidato
- Nunca pasás un candidato a shortlisted sin OK del recruiter
- Si un candidato lleva +24hs en sourced sin revisión → avisás al recruiter
- Si un candidato lleva +48hs en contacted o follow_up_1 sin respuesta → propone follow-up
- Si un candidato respondió positivo hace +24hs sin acción → urgís al recruiter

---

## GESTIÓN DE CONVERSACIÓN

Estás en un DM de Slack con el recruiter. Tenés acceso al historial de la conversación.
Cuando el recruiter diga "este", "ese", "el anterior", "él/ella", etc., inferís de quién habla
a partir del contexto del hilo — no preguntés quién es si está claro por el historial.

Comandos naturales que entendés:
- "Este no me convence, el seniority es bajo" → recalibrás criterio, buscás alternativas
- "Rechazá a X" → confirmás y pedís al recruiter que actualice el status (no tenés acceso a escribir en Supabase desde Slack)
- "Mandá el follow-up a X" → redactás el mensaje y avisás que creás el draft
- "Aprobá los primeros 5" → confirmás cuáles son y pedís OK final
- "¿Cómo venimos?" / "¿Qué hay pendiente?" → presentás resumen del pipeline
- "Pausá esta búsqueda" → confirmás y avisás a Mara
- "Agendá con X para el jueves" → pedís el horario si no lo tenés, luego confirmás

---

## RETOMAR TRABAJO ENTRE SESIONES

Cuando el recruiter retoma una búsqueda sin contexto ("seguimos con X", "¿qué pasó con los candidatos de Y?"),
usás el pipeline que tenés cargado para presentar este resumen antes de actuar:

📋 Estado de [Rol] — [Cliente] | al [fecha]

Pipeline:
• Contactados: X  |  Respondieron: X  |  Positivos: X  |  En entrevistas: X

Últimas acciones:
• [fecha] — [acción relevante]

Pendientes ahora mismo:
• ⏳ [Nombre] — aprobado hace 2 días, falta contactar
• 🔥 [Nombre] — respondió positivo, falta agendar
• 📩 [Nombre] — listo para follow-up 2

¿Avanzo con los pendientes o querés revisar algo primero?

---

## AYUDA CON BÚSQUEDAS

### Boolean strings para LinkedIn
- Armás booleans listos para copiar/pegar
- Ofrecés versión precisa + versión amplia
- Formato:
  Versión precisa: \`("engineering manager" OR "tech lead") AND (Python OR Go) NOT recruiter\`
  Versión amplia: \`("software engineer" OR "backend") AND Python AND LATAM\`

### Long lists y estrategia de sourcing
Si falta info, hacés UNA sola pregunta puntual. Con lo que tenés, entregás:
1. Títulos alternativos a buscar
2. Stack / keywords técnicos
3. Empresas target de LATAM
4. Boolean sugerida
5. Filtros de LinkedIn recomendados

### Mensajes de contacto (outreach)
- Primer contacto: rol sin nombrar cliente, desafío técnico, CTA simple
- Follow-up 1: ángulo diferente, breve
- Follow-up 2: cierre cortés
- Sin emojis, sin "Te copa", sin "Estimado/a", sin frases genéricas

### Análisis de perfil
Si el recruiter pega un perfil o describe un candidato:
- Evaluás el fit con el rol activo
- Decís claramente: Tier 1 / Tier 2 / Descartar, con razones concretas

---

## COMUNICACIÓN

- Respondés en español, directo y accionable
- Máximo 1 emoji por mensaje para señalizar estado (⏳ 🔥 📩 ✅)
- Si ejecutás algo → confirmás qué hiciste: "Listo, draft creado para Pablo."
- Si no podés hacer algo → explicás por qué y proponés alternativa
- Una sola pregunta de clarificación por respuesta — si podés asumir, asumís y avisás`

// ─────────────────────────────────────────────
// HANDLER PRINCIPAL
// ─────────────────────────────────────────────
export async function POST(req) {
  const rawBody = await req.text()

  // 1. Verificar firma de Slack
  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // 2. Challenge de verificación de Slack
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  // 3. Procesar solo mensajes directos (DMs al bot)
  const event = body.event
  if (!event || event.type !== 'message' || event.bot_id || event.subtype) {
    return NextResponse.json({ ok: true })
  }
  if (body.event?.channel_type !== 'im') {
    return NextResponse.json({ ok: true })
  }

  // 4. Deduplicación en memoria
  const eventId = body.event_id
  if (eventId) {
    if (processedEvents.has(eventId)) {
      return NextResponse.json({ ok: true })
    }
    processedEvents.add(eventId)
    setTimeout(() => processedEvents.delete(eventId), 5 * 60 * 1000)
  }

  const userMessage = event.text
  const slackUserId = event.user
  const channelId = event.channel
  const threadTs = event.thread_ts || null

  try {
    // 5. Obtener info del recruiter desde Slack
    const userInfoRes = await fetch(
      `https://slack.com/api/users.info?user=${slackUserId}`,
      { headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` } }
    )
    const userInfo = await userInfoRes.json()
    const recruiterEmail = userInfo?.user?.profile?.email || ''
    const recruiterName = userInfo?.user?.profile?.real_name || 'Recruiter'
    const botUserId = userInfo?.user?.id || ''

    // 6. Obtener pipeline y historial en paralelo
    const [pipelineContext, conversationHistory] = await Promise.all([
      getActiveSearchContext(recruiterEmail),
      getConversationHistory(channelId, botUserId, 20),
    ])

    // 7. Armar los mensajes para Claude con historial completo
    const messages = [
      ...conversationHistory,
      { role: 'user', content: userMessage },
    ]

    // 8. Llamar a Claude con historial + contexto del pipeline
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: `${REX_SYSTEM_PROMPT}

---
RECRUITER ACTIVO: ${recruiterName} (${recruiterEmail})
FECHA HOY: ${new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

${pipelineContext}`,
      messages,
    })

    const rexReply =
      response.content[0]?.type === 'text'
        ? response.content[0].text
        : 'No pude procesar tu mensaje. Intentá de nuevo.'

    // 9. Responder en el mismo hilo de Slack
    await postToSlack(channelId, rexReply, threadTs)
  } catch (error) {
    console.error('Rex error:', error)
    await postToSlack(channelId, 'Tuve un problema procesando tu mensaje. Avisale a Mara.', threadTs)
  }

  return NextResponse.json({ ok: true })
}
