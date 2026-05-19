/**
 * POST /api/webhooks/resend
 *
 * Recibe los eventos de Resend (email.sent / delivered / opened / clicked /
 * bounced / complained …) y los persiste en `email_events` (proyecto SCRAPER
 * tchppyxhapxtjemxrbqm — ver lib/resend-webhook.js). Es lo que enciende la
 * sección Opens · Clicks · Deliverability del panel /internal/audiencia.
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
 * Setup de Resend (una vez): endpoint
 *   https://tools.wearebondy.com/api/webhooks/resend  con eventos email.*
 *   y RESEND_WEBHOOK_SECRET (whsec_…) en Vercel bondy-tools.
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

  if (!verifySvix({ secret, id, timestamp, signatureHeader, body })) {
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
export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: 'resend-webhook',
    configured: !!process.env.RESEND_WEBHOOK_SECRET,
  })
}
