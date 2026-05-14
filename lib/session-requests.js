/**
 * Sesiones de Carrera — consultoría de carrera 1 a 1 (Mara / Lucía).
 *
 * Tabla `session_requests` vive en el proyecto Supabase del scraper
 * (tchppyxhapxtjemxrbqm), igual que bondy_roles / bondy_applications.
 * Reusamos los helpers de `lib/job-board.js` (supabaseUrl / supabaseHeaders)
 * que ya apuntan ahí con el service_role key.
 *
 * Acceso 100% server-side. No tocar desde el cliente.
 */

import { supabaseUrl, supabaseHeaders } from '@/lib/job-board'

// ─── Config de producto (fuente única de verdad) ───────────────────
// Promo vigente: 50% OFF sobre el precio de lista.
export const PRODUCTOS = {
  'Exprés': { precioOriginal: 'USD 90–110', precio: 'USD 45–55', detalle: '1 sesión de 60 min' },
  'Plan de Carrera': { precioOriginal: 'USD 270–320', precio: 'USD 135–160', detalle: '3 sesiones de 60 min' },
  'Todavía no sé': { precioOriginal: null, precio: null, detalle: null },
}

export const PRODUCTO_VALUES = Object.keys(PRODUCTOS)
export const CONSULTORA_VALUES = ['Mara', 'Lucía', 'La que tenga disponibilidad antes']
export const PAGINA_VALUES = ['busco-trabajo', 'recursos-recruiters']
export const ESTADOS = ['pending', 'approved', 'rejected', 'paid', 'booked']

// Nombre completo de cada consultora (la lógica usa el valor corto Mara/Lucía).
export function fullName(consultora) {
  return consultora === 'Lucía' ? 'Lucía Palomeque' : 'Mara Schmitman'
}

// ─── Pendiente de Mara (ver Notion · Credenciales) ─────────────────
// Links de calendario por consultora + instrucciones de pago. Hasta que
// se carguen las env vars, los emails salen con un placeholder claro.
export function calendarLink(consultora) {
  if (consultora === 'Lucía') return (process.env.CONSULTORA_CALENDAR_LUCIA || '').trim()
  return (process.env.CONSULTORA_CALENDAR_MARA || '').trim()
}

export function paymentInstructions() {
  return (
    process.env.PAYMENT_INSTRUCTIONS ||
    'Te pasamos los datos de pago por este mismo mail en cuanto confirmemos.'
  ).trim()
}

// ─── Acceso a la tabla ─────────────────────────────────────────────
const TABLE = `${supabaseUrl()}/rest/v1/session_requests`

export async function insertSessionRequest(row) {
  const res = await fetch(TABLE, {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(row),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[session-requests] insert error', res.status, err)
    return { ok: false, error: 'insert_failed' }
  }
  const rows = await res.json()
  return { ok: true, row: rows[0] }
}

export async function getSessionRequest(id) {
  const url = `${TABLE}?id=eq.${encodeURIComponent(id)}&select=*`
  const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' })
  if (!res.ok) return { ok: false, error: 'fetch_failed' }
  const rows = await res.json()
  if (!rows.length) return { ok: false, error: 'not_found' }
  return { ok: true, row: rows[0] }
}

export async function updateSessionRequest(id, patch) {
  const url = `${TABLE}?id=eq.${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const err = await res.text()
    console.error('[session-requests] update error', res.status, err)
    return { ok: false, error: 'update_failed' }
  }
  const rows = await res.json()
  return { ok: true, row: rows[0] }
}
