/**
 * POST /api/actualizar-datos
 *
 * Recibe el formulario de autoactualización de perfil
 * (tools.wearebondy.com/busco-trabajo/actualizar-datos).
 *
 * Efectos (en orden):
 *   1. Sube el CV a Supabase Storage (best-effort) y obtiene un link.
 *   2. UPSERT en la Base General: si identificamos a la persona (token ?t=,
 *      email firmado, o match por email/LinkedIn) ACTUALIZA su ficha existente;
 *      si no, crea una nueva. Marca "Datos frescos" + "Autoactualización".
 *   3. Escribe una fila en la base staging "Talento — Autoactualización"
 *      ("Intake de perfiles") — la automación de ingreso de siempre.
 *   4. Corre el scorecard determinístico contra "Búsquedas activas" y, si hay
 *      match, postea en #candidatos-match con el outreach listo para copiar.
 *
 * Diseño: cada bloque va en su propio try/catch. Guardar la ficha es lo crítico;
 * si el match o el Slack fallan, igual respondemos ok. No usa secretos nuevos.
 */

import { NextResponse } from 'next/server'
import { uploadCvToSupabase } from '@/lib/cv-supabase'
import { upsertCandidate } from '@/lib/actualizar-datos-store'
const Airtable = require('airtable')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_ID = 'appOXmQUWbbxpgj0e'
const T_INTAKE = 'Intake de perfiles'
const T_SEARCHES = 'Búsquedas activas'
const SLACK_CHANNEL = 'C0BLKHT3MUN' // #candidatos-match
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''

const getBase = () => new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_ID)

// Tokens técnicos que sabemos detectar en un must-have y en el stack del candidato.
const TECHS = [
  'databricks', 'pyspark', 'spark', 'python', 'sql', 'azure', 'aws', 'gcp', 'cloud',
  'machine learning', 'ml', 'airflow', 'dbt', 'kafka', 'delta lake', 'etl', 'big data',
  'react', 'typescript', 'next', 'vue', 'angular', 'node', 'java', 'kotlin', 'swift',
  'kubernetes', 'terraform', 'docker', 'graphql', 'scala', 'snowflake', 'pytorch', 'tensorflow',
  '.net', 'c#', 'go', 'rust', 'php', 'ruby', 'rails', 'django', 'fastapi', 'spring',
  'git', 'plc', 'scada', 'flutter', 'react native', 'selenium', 'cypress', 'playwright',
]

// ── Cloudflare Turnstile ───────────────────────────────────────────────────
// Verifica solo si TURNSTILE_SECRET_KEY está seteada. Sin la key, no bloquea
// (el form sigue protegido por honeypot + rate-limit). Con la key, exige token.
async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY || ''
  if (!secret) return { ok: true, skipped: true }
  if (!token) return { ok: false, error: 'missing_token' }
  try {
    const body = new URLSearchParams()
    body.append('secret', secret)
    body.append('response', token)
    if (ip) body.append('remoteip', ip)
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
    const d = await r.json().catch(() => ({}))
    return { ok: !!d.success, error: (d['error-codes'] || []).join(',') }
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) }
  }
}

// ── Rate limit best-effort (mismo patrón que job-subscribe) ────────────────
const HITS = new Map()
function rateLimited(ip) {
  if (!ip) return false
  const now = Date.now()
  const arr = (HITS.get(ip) || []).filter((t) => now - t < 60_000)
  arr.push(now)
  HITS.set(ip, arr)
  return arr.length > 8
}

// Payload del form nuevo → fila del Intake (staging). No pisa la Base General.
function normalizeIntake(payload) {
  const nombre = (payload.nombre || '').trim()
  const apellido = (payload.apellido || '').trim()
  const skills = [...(payload.skills || []), ...(payload.especializacion || [])]
  const aiParts = []
  if (payload.aiLevel) aiParts.push(`Nivel: ${payload.aiLevel}`)
  const fields = {
    'Nombre y apellido': `${nombre} ${apellido}`.trim(),
    Nombre: nombre,
    Apellido: apellido,
    Email: (payload.email || '').trim(),
    LinkedIn: (payload.linkedin || '').trim(),
    'Área': payload.areaLabel || undefined,
    Stack: skills.join(', ') || undefined,
    'IA herramientas': (payload.aiTools || []).join(', ') || undefined,
    'IA nivel': payload.aiLevel || undefined,
    Seniority: payload.seniority || undefined,
    'Inglés': payload.ingles || undefined,
    Ciudad: (payload.ciudad || '').trim() || undefined,
    Modalidad: payload.modalidad || undefined,
    'En búsqueda': payload.enBusqueda || undefined,
    Observaciones: (payload.comentarios || '').trim() || undefined,
    Fuente: 'Autoactualización',
    Sourcer: 'Rex',
    'Estado intake': 'Nuevo',
    Recibido: new Date().toISOString(),
  }
  const usd = parseInt(String(payload.salarioUsd || '').replace(/[^\d]/g, ''), 10)
  const ars = parseInt(String(payload.salarioArs || '').replace(/[^\d]/g, ''), 10)
  if (!Number.isNaN(usd) && usd > 0) fields['Salario deseado USD'] = usd
  if (!Number.isNaN(ars) && ars > 0) fields['Salario deseado ARS'] = ars
  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k])
  return fields
}

function techsIn(text) {
  const t = (text || '').toLowerCase()
  return TECHS.filter((tech) => t.includes(tech))
}

// Blob de señales del candidato para matchear contra los must-haves.
function buildBlob(payload) {
  const parts = [
    payload.areaLabel || '',
    (payload.especializacion || []).join(' '),
    (payload.skills || []).join(' '),
    (payload.aiTools || []).join(' '),
    payload.seniority || '',
  ]
  return parts.join(' ').toLowerCase()
}

function scoreAgainst(search, payload, blob) {
  const mustText = search.get('Must-haves') || ''
  const lines = mustText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return null

  const matched = []
  const missing = []
  for (const line of lines) {
    const lineTechs = techsIn(line)
    if (lineTechs.length === 0) {
      const wantsYears = /años|year/i.test(line)
      const isSenior = /senior|staff|lead|sr/i.test(payload.seniority || '')
      if (wantsYears && isSenior) matched.push(line)
      else missing.push(line)
      continue
    }
    const hit = lineTechs.some((tech) => blob.includes(tech))
    if (hit) matched.push(line)
    else missing.push(line)
  }

  const geo = (search.get('Geo / Modalidad') || '').toLowerCase()
  const requiresOnsite = /híbrido|hibrido|presencial|buenos aires|onsite/.test(geo)
  const mod = payload.modalidad || ''
  const gateFail = requiresOnsite && mod === 'Remoto'

  const score = Math.round((matched.length / lines.length) * 100)
  return { score, matched, missing, gateFail }
}

async function postSlack({ payload, search, result, resultado, recordId }) {
  if (!SLACK_BOT_TOKEN) return { skipped: true }
  const nombre = `${(payload.nombre || '').trim()} ${(payload.apellido || '').trim()}`.trim()
  const rol = search.get('Rol') || 'la búsqueda'
  const area = payload.areaLabel || ''
  const cumple = result.matched.length ? result.matched.join('; ') : 'ver perfil'
  const falta = result.missing.length ? result.missing.join('; ') : 'nada relevante'

  const draft = [
    `Hola ${(payload.nombre || '').trim()},`,
    '',
    `Soy parte del equipo de Bondy. Tenemos abierta una búsqueda de ${rol} y tu perfil encaja con lo que buscamos.`,
    '',
    '¿Tenés un rato esta semana para que te cuente los detalles? Si te interesa, respondeme y coordinamos.',
    '',
    'Gracias.',
  ].join('\n')

  const HEAD = {
    'Matchea': `:dart: *Match · ${rol}*`,
    'A revisar': `:warning: *A revisar · ${rol}* (score bajo el umbral)`,
    'No matchea': `:new: *Perfil actualizado · no matchea con ${rol} hoy*`,
  }
  const head = HEAD[resultado] || `:new: *Perfil actualizado · ${rol}*`
  const text = `${resultado || 'Perfil'} · ${rol} · ${nombre} (${result.score}/100)`

  const blocks = [
    { type: 'section', text: { type: 'mrkdwn', text: head } },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Candidato*\n${nombre}` },
        { type: 'mrkdwn', text: `*Score*\n${result.score}/100 · ${area}` },
        { type: 'mrkdwn', text: `*LinkedIn*\n${payload.linkedin ? `<${payload.linkedin}|ver perfil>` : '—'}` },
        { type: 'mrkdwn', text: `*Email*\n${payload.email || '—'}` },
      ],
    },
    { type: 'section', text: { type: 'mrkdwn', text: `*Cumple:* ${cumple}\n*Falta:* ${falta}` } },
  ]
  if (resultado === 'Matchea') {
    blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `*Para copiar y enviar desde tu casilla:*\n\`\`\`${draft}\`\`\`` } })
  }
  if (recordId) {
    blocks.push({
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Lo tomo', emoji: true }, action_id: 'take', value: recordId, style: 'primary' },
        { type: 'button', text: { type: 'plain_text', text: 'Marcar enviado', emoji: true }, action_id: 'sent', value: recordId },
      ],
    })
  }

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text, blocks, unfurl_links: false }),
  })
  return res.json().catch(() => ({}))
}

export async function POST(request) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') || ''
    if (rateLimited(ip)) {
      return NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 })
    }

    const payload = await request.json().catch(() => ({}))

    // Honeypot
    if (typeof payload.hp_field === 'string' && payload.hp_field.trim() !== '') {
      return NextResponse.json({ ok: true })
    }

    // Validación mínima
    if (!payload.nombre?.trim() || !payload.apellido?.trim() || !payload.linkedin?.trim() || !payload.email?.trim()) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
    }

    // Turnstile anti-spam (solo bloquea si hay secret configurado)
    const ts = await verifyTurnstile(payload.turnstileToken, ip)
    if (!ts.ok) {
      return NextResponse.json({ ok: false, error: 'turnstile' }, { status: 403 })
    }

    // 1. CV a Supabase (best-effort). Link largo para guardarlo en la Base General.
    let cvUrl = null
    let cvResult = null
    if (payload.cvBase64) {
      try {
        const fname = `CV - ${(payload.nombre || '').trim()} ${(payload.apellido || '').trim()} - ${new Date().toISOString().slice(0, 10)}.pdf`
        const up = await uploadCvToSupabase({ base64: payload.cvBase64, filename: fname, expiresIn: 60 * 60 * 24 * 365 * 5 })
        cvUrl = up.url
        cvResult = 'ok'
      } catch (cvErr) {
        cvResult = String((cvErr && cvErr.message) || cvErr)
      }
    }

    // 2. UPSERT Base General (best-effort, no rompe la respuesta).
    let baseGeneral = { done: false }
    try {
      const r = await upsertCandidate(payload, { cvUrl })
      baseGeneral = { done: true, mode: r.mode, id: r.id }
    } catch (bgErr) {
      baseGeneral = { done: false, error: String((bgErr && bgErr.message) || bgErr) }
    }

    // 3. Intake staging (crítico para la automación de ingreso + scorecard).
    const base = getBase()
    const fields = normalizeIntake(payload)
    const created = await base(T_INTAKE).create([{ fields }], { typecast: true })
    const recordId = created[0].id

    // 3b. CV al intake como adjunto nativo (best-effort).
    if (cvUrl) {
      try {
        const fname = `CV - ${fields['Nombre y apellido'] || 'candidato'}.pdf`
        await base(T_INTAKE).update(recordId, { 'CV / PDF': [{ url: cvUrl, filename: fname }], 'CV (Drive)': cvUrl })
      } catch { /* no rompe */ }
    }

    // 4. Match + Slack (best-effort).
    let debug = { matched: false }
    try {
      const blob = buildBlob(payload)
      const all = await base(T_SEARCHES).select().firstPage()
      const searches = all.filter((s) => (s.get('Estado') || '') === 'Abierta')

      let best = null
      for (const s of searches) {
        const r = scoreAgainst(s, payload, blob)
        if (!r) continue
        const umbral = s.get('Umbral de match') || 70
        let resultado
        if (r.gateFail) resultado = 'No matchea'
        else if (r.score >= umbral) resultado = 'Matchea'
        else if (r.score >= umbral - 20) resultado = 'A revisar'
        else resultado = 'No matchea'
        const cand = { search: s, ...r, umbral, resultado }
        if (!best || cand.score > best.score) best = cand
      }

      debug = { matched: !!best, openSearches: searches.length, resultado: best?.resultado, score: best?.score }

      if (best) {
        let motivo =
          `Búsqueda: ${best.search.get('Rol')} · score ${best.score}/100 (umbral ${best.umbral}).` +
          (best.gateFail ? ' Dealbreaker: no acepta la modalidad requerida.' : '') +
          `\nCumple: ${best.matched.join('; ') || '—'}` +
          `\nFalta: ${best.missing.join('; ') || '—'}` +
          `\n[Base General: ${baseGeneral.done ? `${baseGeneral.mode}` : (baseGeneral.error || 'no')}]` +
          `\n[CV: ${payload.cvBase64 ? (cvResult || 'error desconocido') : 'sin archivo'}]`

        const slack = await postSlack({ payload, search: best.search, result: best, resultado: best.resultado, recordId })
        if (slack && slack.ok === false) motivo += `\n[slack error: ${slack.error}]`
        if (slack && slack.skipped) motivo += `\n[slack: sin SLACK_BOT_TOKEN]`
        debug.slack = slack?.ok === true ? 'ok' : (slack?.error || (slack?.skipped ? 'no_token' : 'unknown'))

        await base(T_INTAKE).update(recordId, {
          Score: best.score,
          'Resultado match': best.resultado,
          'Motivo match': motivo,
          'Búsqueda match': [best.search.id],
        })
      }
    } catch (matchErr) {
      const msg = String((matchErr && matchErr.message) || matchErr)
      debug = { matched: false, error: msg }
      try { await base(T_INTAKE).update(recordId, { 'Motivo match': `MATCH_ERROR: ${msg}` }) } catch {}
    }

    return NextResponse.json({ ok: true, id: recordId, debug: { ...debug, cv: cvResult, baseGeneral } })
  } catch (err) {
    console.error('[actualizar-datos] crash', err)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
