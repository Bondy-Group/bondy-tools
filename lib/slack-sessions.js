/**
 * Mensaje de Slack para Sesiones de Carrera — #agentes-bondy.
 *
 * Patrón B (Next.js postea directo) — válido porque sólo POST /api/session-requests
 * inserta en la tabla. Ver docs/notifications.md.
 *
 * Los botones son URL buttons que apuntan a GET /api/session-requests/action
 * (mismo patrón que classify-lead). Esto evita tener que configurar la
 * "Interactivity Request URL" en la Slack App — no la necesitamos.
 *
 * Requisito operativo: Rex (la Slack App) tiene que estar invitado a
 * #agentes-bondy (`/invite @Rex`), si no chat.postMessage devuelve
 * `not_in_channel`. El POST igual no falla — el post a Slack es best-effort.
 */

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN
const CHANNEL = process.env.SLACK_AGENTES_BONDY_CHANNEL_ID || 'C0AL153UN8K'
const HOST = process.env.TOOLS_BASE_URL || 'https://tools.wearebondy.com'
const ACTION_SECRET = process.env.SESSION_ACTION_SECRET || 'bondy-session-action-internal'

function clip(s, n = 600) {
  const v = (s || '').toString().trim()
  if (!v) return '—'
  return v.length > n ? v.slice(0, n - 1) + '…' : v
}

function actionUrl(id, action, consultora) {
  let u = `${HOST}/api/session-requests/action?id=${encodeURIComponent(id)}&action=${action}&secret=${encodeURIComponent(ACTION_SECRET)}`
  if (consultora) u += `&consultora=${encodeURIComponent(consultora)}`
  return u
}

function btn(text, id, action, consultora, style) {
  const el = {
    type: 'button',
    text: { type: 'plain_text', text, emoji: true },
    url: actionUrl(id, action, consultora),
  }
  if (style) el.style = style
  return el
}

// Botonera según el estado actual de la fila.
function actionElements(row) {
  const { id, estado, consultora_preferida } = row
  if (estado === 'pending') {
    if (consultora_preferida === 'La que tenga disponibilidad antes') {
      return [
        btn('Aprobar · Mara', id, 'approve', 'Mara', 'primary'),
        btn('Aprobar · Lucía', id, 'approve', 'Lucía', 'primary'),
        btn('Rechazar', id, 'reject', null, 'danger'),
      ]
    }
    return [
      btn('Aprobar', id, 'approve', consultora_preferida, 'primary'),
      btn('Rechazar', id, 'reject', null, 'danger'),
    ]
  }
  if (estado === 'approved') {
    return [
      btn('Confirmar pago', id, 'confirm_payment', null, 'primary'),
      btn('Rechazar', id, 'reject', null, 'danger'),
    ]
  }
  return [] // paid / rejected / booked → sin acciones
}

const STATUS_LINE = {
  pending: '🟡 *Pendiente de revisión*',
  approved: (r) => `✅ *Aprobada* · ${r.consultora_asignada || r.consultora_preferida} — esperando pago`,
  paid: (r) => `💵 *Pago confirmado* · ${r.consultora_asignada || r.consultora_preferida} — link de agenda enviado`,
  rejected: '✕ *Rechazada* — email enviado',
  booked: '📅 *Reservada*',
}

export function buildBlocks(row) {
  const linkedin = row.linkedin_url
    ? `<${row.linkedin_url}|ver perfil>`
    : '—'
  const cv = row.cv_url ? `<${row.cv_url}|ver CV>` : '—'
  const statusRaw = STATUS_LINE[row.estado]
  const status = typeof statusRaw === 'function' ? statusRaw(row) : (statusRaw || row.estado)

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: ':briefcase: *Solicitud · Sesión de Carrera*' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Nombre*\n${clip(row.nombre, 80)}` },
        { type: 'mrkdwn', text: `*Email*\n${clip(row.email, 80)}` },
        { type: 'mrkdwn', text: `*Servicio*\n${clip(row.producto, 40)}` },
        { type: 'mrkdwn', text: `*Consultora pedida*\n${clip(row.consultora_preferida, 40)}` },
        { type: 'mrkdwn', text: `*Origen*\n${clip(row.pagina_origen, 40)}` },
        { type: 'mrkdwn', text: `*LinkedIn · CV*\n${linkedin} · ${cv}` },
      ],
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Qué espera de las charlas*\n${clip(row.expectativa)}` },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*Mayor problema hoy*\n${clip(row.problema)}` },
    },
  ]

  const elements = actionElements(row)
  if (elements.length) {
    blocks.push({ type: 'actions', elements })
  }

  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: status }],
  })

  return blocks
}

async function slackCall(method, payload) {
  if (!SLACK_BOT_TOKEN) {
    console.warn('[slack-sessions] SLACK_BOT_TOKEN not set — skipping', method)
    return { ok: false, error: 'no_token' }
  }
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(payload),
  })
  const data = await res.json().catch(() => ({ ok: false, error: 'bad_json' }))
  if (!data.ok) console.error('[slack-sessions]', method, 'failed:', data.error)
  return data
}

export async function postSessionRequestMessage(row) {
  const data = await slackCall('chat.postMessage', {
    channel: CHANNEL,
    text: `Nueva solicitud de Sesión de Carrera — ${row.nombre}`,
    blocks: buildBlocks(row),
    unfurl_links: false,
  })
  return data.ok ? { ok: true, ts: data.ts } : { ok: false, error: data.error }
}

export async function updateSessionRequestMessage(ts, row) {
  if (!ts) return { ok: false, error: 'no_ts' }
  const data = await slackCall('chat.update', {
    channel: CHANNEL,
    ts,
    text: `Solicitud de Sesión de Carrera — ${row.nombre} · ${row.estado}`,
    blocks: buildBlocks(row),
  })
  return data.ok ? { ok: true } : { ok: false, error: data.error }
}
