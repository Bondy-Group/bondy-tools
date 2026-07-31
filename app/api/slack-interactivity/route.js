/**
 * POST /api/slack-interactivity
 *
 * Request URL de Interactivity de la Slack App. Procesa los clicks de los
 * botones del mensaje de #candidatos-match ("Lo tomo" / "Marcar enviado").
 *
 * A diferencia de los botones-link, acá SÍ sabemos quién clickeó, y la
 * confirmación se hace editando el mensaje en el mismo canal (no abre nada).
 *
 * Config necesaria (una vez): Slack App → Interactivity & Shortcuts → ON →
 * Request URL = https://<deployment>/api/slack-interactivity
 */

import crypto from 'node:crypto'
const Airtable = require('airtable')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_ID = 'appOXmQUWbbxpgj0e'
const T_INTAKE = 'Intake de perfiles'
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''
const SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET || ''

const getBase = () => new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_ID)

function verifySlack(rawBody, timestamp, signature) {
  if (!SIGNING_SECRET || !timestamp || !signature) return false
  // Rechazar requests viejos (replay) > 5 min.
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 60 * 5) return false
  const basestring = `v0:${timestamp}:${rawBody}`
  const mySig = 'v0=' + crypto.createHmac('sha256', SIGNING_SECRET).update(basestring, 'utf8').digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(mySig), Buffer.from(signature))
  } catch {
    return false
  }
}

async function slackUserName(userId) {
  if (!userId || !SLACK_BOT_TOKEN) return null
  try {
    const res = await fetch(`https://slack.com/api/users.info?user=${encodeURIComponent(userId)}`, {
      headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}` },
    })
    const data = await res.json()
    return data?.user?.real_name || data?.user?.profile?.real_name || data?.user?.name || null
  } catch {
    return null
  }
}

// Reconstruye los blocks del mensaje: saca los botones, deja info + draft,
// agrega una línea de estado, y (si corresponde) deja el botón "Marcar enviado".
function rebuildBlocks(blocks, statusText, keepSentButton, recordId) {
  const kept = (blocks || []).filter((b) => b.type !== 'actions')
  kept.push({ type: 'context', elements: [{ type: 'mrkdwn', text: statusText }] })
  if (keepSentButton) {
    kept.push({
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Marcar enviado', emoji: true }, action_id: 'sent', value: recordId },
      ],
    })
  }
  return kept
}

export async function POST(req) {
  const raw = await req.text()
  const ts = req.headers.get('x-slack-request-timestamp')
  const sig = req.headers.get('x-slack-signature')
  if (!verifySlack(raw, ts, sig)) {
    return new Response('invalid signature', { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(new URLSearchParams(raw).get('payload'))
  } catch {
    return new Response('bad payload', { status: 400 })
  }

  const action = payload.actions?.[0]
  const actionId = action?.action_id
  const recordId = action?.value
  const responseUrl = payload.response_url
  const messageBlocks = payload.message?.blocks || []

  if (!recordId || !['take', 'sent'].includes(actionId)) {
    return new Response('', { status: 200 })
  }

  // Respondemos 200 enseguida y hacemos el trabajo; Slack corta a los 3s.
  try {
    const name = (await slackUserName(payload.user?.id)) || payload.user?.name || 'alguien'
    const base = getBase()

    let statusText
    let keepSent = false
    if (actionId === 'take') {
      await base(T_INTAKE).update(recordId, { Recruiter: name, 'Estado intake': 'Tomado' })
      statusText = `:raised_hand: Tomado por *${name}*`
      keepSent = true
    } else {
      await base(T_INTAKE).update(recordId, { 'Estado intake': 'Contactado' })
      statusText = `:white_check_mark: Enviado por *${name}*`
    }

    if (responseUrl) {
      const blocks = rebuildBlocks(messageBlocks, statusText, keepSent, recordId)
      await fetch(responseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replace_original: true, blocks }),
      })
    }
  } catch (err) {
    console.error('[slack-interactivity] error', err)
  }

  return new Response('', { status: 200 })
}
