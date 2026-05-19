/**
 * POST /api/webhooks/resend
 *
 * Recibe los eventos de Resend (email.sent / delivered / opened / clicked /
 * bounced / complained …) y los persiste en `email_events`. Es lo que enciende
 * la sección Opens · Clicks · Deliverability del panel /internal/audiencia.
 *
 * Seguridad: verifica la firma Svix con RESEND_WEBHOOK_SECRET. Sin secret
 * configurado → 503 (no aceptamos eventos sin firmar). Firma inválida → 401.
 *
 * Códigos de respuesta y reintentos de Svix:
 *   - 200  procesado (incluye dedup) → Svix no reintenta
 *   - 401  firma inválida            → no reintenta (config rota)
 *   - 503  sin secret                → reintenta hasta que se configure
 *   - 500  error transitorio de DB   → Svix reintenta más tarde
 *
 * Setup pendiente de Mara (una vez):
 *   1. Resend → Webhooks → endpoint https://tools.wearebondy.com/api/webhooks/resend
 *      con todos los eventos email.*
 *   2. Copiar el "Signing Secret" (whsec_…) → env var RESEND_WEBHOOK_SECRET
 *      en Vercel bondy-tools + guardarlo en Notion → Credenciales.
 */

import { NextResponse } from 'next/server'
import { verifySvix, mapEvent, insertEmailEvent } from '@/lib/resend-webhook'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET
  if (!secret) {
    console.error('[resend-webhook] RESEND_WEBHOOK_SECRET not set')
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }

  // Cuerpo crudo: la verificación de firma se hace sobre el texto exacto.
  const body = await request.text()
  const id = request.headers.get('svix-id')
  const timestamp = request.headers.get('svix-timestamp')
  const signatureHeader = request.headers.get('svix-signature')

  const sigOk = verifySvix({ secret, id, timestamp, signatureHeader, body })

  // ── TEMP DEBUG (diagnóstico webhook — quitar tras validar) ────────────
  // Registra TODO POST entrante para distinguir "Resend no entrega" de
  // "secret no matchea". El funnel ignora event_type != 'email.*'.
  try {
    let parsedType = null
    try { parsedType = JSON.parse(body)?.type || null } catch { /* noop */ }
    await insertEmailEvent({
      svix_id: id ? `dbg_${id}` : `dbg_${Date.now()}`,
      event_type: 'webhook.debug',
      email_id: null, recipient: null, subject: null,
      campaign: null, audience: null, link: null,
      event_at: new Date().toISOString(),
      raw: {
        sig_ok: sigOk,
        had_sig_headers: !!(id && timestamp && signatureHeader),
        svix_id: id, svix_timestamp: timestamp,
        body_len: body.length, parsed_type: parsedType,
      },
    })
  } catch (e) {
    console.error('[resend-webhook] debug capture failed', e)
  }
  // ── /TEMP DEBUG ───────────────────────────────────────────────────────

  if (!sigOk) {
    return NextResponse.json({ ok: false, error: 'invalid_signature' }, { status: 401 })
  }

  let payload
  try {
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 })
  }

  const row = mapEvent(payload, id)
  if (!row.event_type) {
    return NextResponse.json({ ok: true, ignored: 'no_event_type' })
  }

  const out = await insertEmailEvent(row)
  if (!out.ok) {
    // Error transitorio (DB / service key): 500 para que Svix reintente.
    return NextResponse.json({ ok: false, error: out.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deduped: !!out.deduped })
}

// GET para health-check manual (no procesa eventos).
export async function GET(request) {
  const configured = !!process.env.RESEND_WEBHOOK_SECRET

  // ── TEMP DIAG (quitar tras validar) ───────────────────────────────────
  // GET ?diag=<CRON_SECRET> → prueba un insert real y reporta el error
  // exacto de PostgREST + qué env vars resuelven (sin exponer secretos).
  const url = new URL(request.url)
  if (url.searchParams.get('diag') && url.searchParams.get('diag') === process.env.CRON_SECRET) {
    const SB_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co').trim()
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SCRAPER_SUPABASE_SERVICE_KEY || ''
    const which = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? 'SUPABASE_SERVICE_ROLE_KEY'
      : (process.env.SCRAPER_SUPABASE_SERVICE_KEY ? 'SCRAPER_SUPABASE_SERVICE_KEY' : 'NONE')
    let probe = { attempted: false }
    try {
      const r = await fetch(`${SB_URL}/rest/v1/email_events`, {
        method: 'POST',
        headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ svix_id: `diag_${Date.now()}`, event_type: 'webhook.debug', event_at: new Date().toISOString(), raw: { diag: true } }),
      })
      probe = { attempted: true, status: r.status, body: (await r.text()).slice(0, 300) }
    } catch (e) {
      probe = { attempted: true, threw: String(e).slice(0, 200) }
    }
    return NextResponse.json({
      ok: true,
      diag: true,
      resolved_url: SB_URL,
      url_has_newline: /\s$/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
      service_key_source: which,
      service_key_len: key.length,
      service_key_ref_claim: key ? (() => { try { return JSON.parse(Buffer.from(key.split('.')[1], 'base64').toString()).ref } catch { return 'unparseable' } })() : null,
      probe,
    })
  }
  // ── /TEMP DIAG ────────────────────────────────────────────────────────

  return NextResponse.json({ ok: true, endpoint: 'resend-webhook', configured })
}
