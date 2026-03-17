import { NextResponse } from 'next/server'
import crypto from 'crypto'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Verificación de firma de Slack (seguridad obligatoria)
function verifySlackSignature(req, body) {
  const timestamp = req.headers.get('x-slack-request-timestamp')
  const signature = req.headers.get('x-slack-signature')
  if (!timestamp || !signature) return false

  // Prevenir replay attacks (mensajes con más de 5 minutos de antigüedad)
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

// Obtiene las búsquedas activas del recruiter desde Supabase
async function getActiveSearchContext(recruiterEmail) {
  const { data, error } = await supabase
    .from('sourcing_pipeline')
    .select('full_name, current_title, current_company, tier, status, job_title, client_name, tech_stack, years_exp, linkedin_url, email')
    .eq('recruiter_email', recruiterEmail)
    .in('status', ['sourced', 'contacted', 'follow_up_1', 'follow_up_2', 'replied_positive', 'shortlisted'])
    .order('tier', { ascending: true })

  if (error || !data || data.length === 0) {
    return 'No hay candidatos activos en el pipeline para este recruiter.'
  }

  // Agrupar por búsqueda (job_title + client_name)
  const grouped = data.reduce((acc, c) => {
    const key = `${c.job_title} — ${c.client_name}`
    if (!acc[key]) acc[key] = []
    acc[key].push(c)
    return acc
  }, {})

  let context = 'BÚSQUEDAS ACTIVAS EN EL PIPELINE:\n\n'
  for (const [search, candidates] of Object.entries(grouped)) {
    context += `### ${search}\n`
    for (const c of candidates) {
      context += `- **${c.full_name}** (T${c.tier}) | ${c.current_title} @ ${c.current_company} | Status: ${c.status}\n`
      context += `  Stack: ${c.tech_stack?.join(', ') || 'N/A'} | ${c.years_exp} años exp\n`
      context += `  LinkedIn: ${c.linkedin_url || 'N/A'} | Email: ${c.email || 'Solo LinkedIn'}\n`
    }
    context += '\n'
  }

  return context
}

// Envía un mensaje a Slack via chat.postMessage
async function postToSlack(channel, text, thread_ts = null) {
  const payload = {
    channel,
    text,
  }
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

// System prompt de Rex
const REX_SYSTEM_PROMPT = `Sos Rex, el agente de sourcing de Bondy Group.
Bondy es una boutique de recruiting técnico en LATAM fundada por Mara Schmitman.
Operás como asistente de búsqueda para los recruiters del equipo: Lucía, Rodrigo, y cualquier usuario de Bondy.

Tu objetivo principal es llegar a 4 entrevistas con candidatos calificados en la primera semana.

---

## GESTIÓN DE PIPELINE

- Tenés acceso al pipeline activo del recruiter (incluido al final como contexto)
- Cuando el recruiter aprueba candidatos, ofrecés armar los drafts de contacto
- Cuando rechaza candidatos, confirmás y actualizás el status mentalmente
- Nunca contactás un candidato sin aprobación explícita del recruiter
- Nunca revelás el nombre del cliente al candidato en el primer contacto

---

## AYUDA CON BÚSQUEDAS

Cuando un recruiter te pide ayuda con una búsqueda, podés hacer todo esto:

### Boolean strings para LinkedIn Recruiter / LinkedIn Search
- Armás booleans precisos y listos para copiar/pegar
- Usás operadores AND, OR, NOT, comillas para frases exactas, paréntesis para agrupar
- Ofrecés variantes: una versión amplia para volumen y una acotada para precisión
- Ejemplo de formato de respuesta:
  *Versión precisa:*
  \`("engineering manager" OR "tech lead") AND (Python OR Go) AND ("fintech" OR "payments") NOT recruiter\`
  *Versión amplia:*
  \`("software engineer" OR "backend developer") AND (Python OR Django) AND LATAM\`

### Long lists / estrategia de sourcing
- Cuando te piden armar una long list, preguntás lo mínimo necesario si falta info: rol, seniority, stack, ubicación, industria
- Sugerís los mejores títulos alternativos a buscar (ej: para un "Head of Engineering" → también "VP Engineering", "CTO", "Director of Engineering")
- Identificás empresas target donde suelen estar esos perfiles (competidores, empresas del sector, scale-ups conocidas de LATAM)
- Armás la estrategia de sourcing en este formato:
  1. Títulos a buscar
  2. Stack / keywords técnicos
  3. Empresas target
  4. Boolean sugerida
  5. Filtros de LinkedIn recomendados (años de exp, ubicación, etc.)

### Mensajes de contacto (outreach)
- Armás drafts de LinkedIn InMail o email en español, directos, sin emojis, sin frases genéricas
- Primer contacto: menciona el rol sin nombrar el cliente, desafío técnico interesante, call to action simple
- Follow-up 1: recordatorio breve, diferente ángulo
- Follow-up 2: cierre cortés

### Análisis de perfil
- Si el recruiter pega un perfil de LinkedIn o describe un candidato, evaluás el fit con el rol activo del pipeline
- Decís claramente si es Tier 1 / Tier 2 / descartar y por qué

---

## REGLAS DE COMUNICACIÓN

- Respondés en español, de forma concisa y accionable
- Sin emojis, sin "Te copa", sin "Estimado/a", sin frases de relleno
- Si falta información para hacer bien la tarea, hacés UNA sola pregunta puntual
- Para booleans y long lists, entregás el output listo para usar, no explicaciones largas
- Máximo 1 pregunta de clarificación por respuesta — si podés asumir, asumís y avisás que asumiste`

export async function POST(req) {
  // IMPORTANTE: leer el body como texto PRIMERO para poder verificar la firma
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

  // 2. Responder al challenge de verificación de Slack (solo al configurar el endpoint)
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge })
  }

  // 3. Procesar solo mensajes directos al bot (ignorar mensajes del propio bot y subtypes)
  const event = body.event
  if (!event || event.type !== 'message' || event.bot_id || event.subtype) {
    return NextResponse.json({ ok: true })
  }

  // Solo DMs (channel_type === 'im')
  if (body.event?.channel_type !== 'im') {
    return NextResponse.json({ ok: true })
  }

  const userMessage = event.text
  const slackUserId = event.user
  const channelId = event.channel
  const threadTs = event.thread_ts || null

  // Responder OK inmediatamente a Slack (tiene timeout de 3 seg)
  // La lógica corre async pero Slack ya recibió el 200
  const processAsync = async () => {
    try {
      // 4. Obtener email del recruiter desde Slack
      const userInfoRes = await fetch(`https://slack.com/api/users.info?user=${slackUserId}`, {
        headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
      })
      const userInfo = await userInfoRes.json()
      const recruiterEmail = userInfo?.user?.profile?.email || ''
      const recruiterName = userInfo?.user?.profile?.real_name || 'Recruiter'

      // 5. Obtener contexto del pipeline
      const pipelineContext = await getActiveSearchContext(recruiterEmail)

      // 6. Llamar a Claude API
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: `${REX_SYSTEM_PROMPT}\n\n---\nRECRUITER: ${recruiterName} (${recruiterEmail})\n\n${pipelineContext}`,
        messages: [{ role: 'user', content: userMessage }],
      })

      const rexReply =
        response.content[0]?.type === 'text'
          ? response.content[0].text
          : 'No pude procesar tu mensaje. Intentá de nuevo.'

      // 7. Responder en Slack como Rex
      await postToSlack(channelId, rexReply, threadTs)
    } catch (error) {
      console.error('Rex error:', error)
      await postToSlack(channelId, 'Tuve un problema procesando tu mensaje. Avisale a Mara.')
    }
  }

  // Ejecutar async sin bloquear la respuesta a Slack
  processAsync()

  return NextResponse.json({ ok: true })
}
