/**
 * Resend webhook → tabla `email_events`.
 *
 * Resend firma sus webhooks con el esquema Svix. Verificamos a mano con
 * `crypto` (no metemos la dependencia `svix` para no inflar el cold start,
 * mismo criterio que lib/resend.js y el verificador de Slack en /api/rex).
 *
 * Tabla destino: `email_events` en el proyecto scraper (`tchppyxhapxtjemxrbqm`),
 * mismo DB que job_subscribers / jobs. Service-role obligatorio (RLS lockeado).
 * Server-only — nunca importar en componentes cliente.
 *
 * Env requerido:
 *   - RESEND_WEBHOOK_SECRET            (Svix signing secret, "whsec_…")
 *   - SUPABASE_SERVICE_ROLE_KEY        (o SCRAPER_SUPABASE_SERVICE_KEY)
 */

import crypto from 'crypto'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co').trim()

function serviceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SCRAPER_SUPABASE_SERVICE_KEY || ''
}

function authHeaders() {
  const key = serviceKey()
  return { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
}

// ─────────────────────────────────────────────────────────────
// Verificación de firma (Svix)
//   contenido firmado = `${id}.${timestamp}.${body}`
//   secret = "whsec_<base64>"  → key = base64-decode del tramo posterior
//   HMAC-SHA256 → base64; header `svix-signature` es lista separada por
//   espacios de entradas "v1,<sig>". Comparación constante.
// ─────────────────────────────────────────────────────────────
export function verifySvix({ secret, id, timestamp, signatureHeader, body }) {
  if (!secret || !id || !timestamp || !signatureHeader || body == null) return false

  // Anti-replay: rechazar timestamps con más de 5 min de skew.
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false

  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret
  let keyBytes
  try {
    keyBytes = Buffer.from(raw, 'base64')
  } catch {
    return false
  }
  if (!keyBytes.length) return false

  const signed = `${id}.${timestamp}.${body}`
  const expected = Buffer.from(
    crypto.createHmac('sha256', keyBytes).update(signed).digest('base64')
  )

  for (const part of String(signatureHeader).split(' ')) {
    const comma = part.indexOf(',')
    if (comma === -1) continue
    const sig = Buffer.from(part.slice(comma + 1))
    if (sig.length === expected.length && crypto.timingSafeEqual(sig, expected)) {
      return true
    }
  }
  return false
}

// ─────────────────────────────────────────────────────────────
// Mapeo payload Resend → fila email_events
// ─────────────────────────────────────────────────────────────
function firstRecipient(to) {
  if (Array.isArray(to)) return to[0] || null
  if (typeof to === 'string') return to
  return null
}

// Resend manda los tags como objeto {campaign, audience} o, según versión,
// como array [{name, value}]. Soportamos ambas formas.
function normalizeTags(tags) {
  const out = {}
  if (Array.isArray(tags)) {
    for (const t of tags) if (t && t.name) out[t.name] = t.value
  } else if (tags && typeof tags === 'object') {
    Object.assign(out, tags)
  }
  return out
}

export function mapEvent(payload, svixId) {
  const d = (payload && payload.data) || {}
  const tags = normalizeTags(d.tags)
  return {
    svix_id: svixId || null,
    event_type: (payload && payload.type) || null,
    email_id: d.email_id || null,
    recipient: firstRecipient(d.to),
    subject: d.subject || null,
    campaign: tags.campaign || null,
    audience: tags.audience || null,
    link: (d.click && d.click.link) || null,
    event_at: d.created_at || (payload && payload.created_at) || null,
    raw: payload || null,
  }
}

// ─────────────────────────────────────────────────────────────
// Persistencia (idempotente por svix_id)
// ─────────────────────────────────────────────────────────────
export async function insertEmailEvent(row) {
  if (!serviceKey()) return { ok: false, error: 'no_service_key' }
  const h = authHeaders()

  // Idempotencia: Svix reintenta ante respuestas no-2xx. Si ya guardamos este
  // id, salimos OK sin duplicar (no asumimos unique constraint en la tabla).
  if (row.svix_id) {
    try {
      const dup = await fetch(
        `${SUPABASE_URL}/rest/v1/email_events?svix_id=eq.${encodeURIComponent(row.svix_id)}&select=id&limit=1`,
        { headers: h, cache: 'no-store' }
      )
      if (dup.ok && (await dup.json()).length) return { ok: true, deduped: true }
    } catch {
      /* si falla el check, seguimos al insert */
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/email_events`, {
    method: 'POST',
    headers: { ...h, Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    console.error('[resend-webhook] insert failed', res.status, txt)
    return { ok: false, error: 'insert_failed', status: res.status }
  }
  return { ok: true }
}
