/**
 * POST /api/actualizar-datos
 *
 * Recibe el formulario de autoactualización de perfil
 * (tools.wearebondy.com/busco-trabajo/actualizar-datos).
 *
 * Efectos:
 *   1. Escribe una fila en la tabla "Intake de perfiles" de la base
 *      "Talento — Autoactualización" (Airtable, appOXmQUWbbxpgj0e).
 *   2. Corre un scorecard determinístico contra las búsquedas abiertas
 *      ("Búsquedas activas") y guarda Score / Resultado / Motivo / Búsqueda match.
 *   3. Si el mejor match da "Matchea", postea en #candidatos-match con el
 *      texto de outreach listo para que un recruiter copie y envíe.
 *
 * Diseño: guardar el intake es lo crítico y siempre corre. El match y el
 * Slack están envueltos en try/catch: si fallan, la fila igual queda guardada
 * y la respuesta es exitosa. No usa secretos nuevos (AIRTABLE_API_KEY y
 * SLACK_BOT_TOKEN ya están en env).
 */

import { NextResponse } from 'next/server'
const Airtable = require('airtable')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BASE_ID = 'appOXmQUWbbxpgj0e'
const T_INTAKE = 'Intake de perfiles'
const T_SEARCHES = 'Búsquedas activas'
const SLACK_CHANNEL = 'C0BLKHT3MUN' // #candidatos-match
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN || ''

const AREA_LABELS = {
  back: 'Backend', front: 'Frontend', full: 'Full Stack',
  data: 'Data & Analytics', ml: 'ML / AI', devops: 'DevOps / SRE',
  mobile: 'Mobile', qa: 'QA',
}
const MODALIDAD_MAP = { 'Dispuesto a mudarme': 'Dispuesto a mudarse' }
const BUSQUEDA_MAP = { 'De forma pasiva, si aparece algo interesante': 'Pasivamente' }

// Tokens técnicos que sabemos detectar en un must-have y en el stack del candidato.
const TECHS = [
  'databricks', 'pyspark', 'spark', 'python', 'sql', 'azure', 'aws', 'gcp', 'cloud',
  'machine learning', 'ml', 'airflow', 'dbt', 'kafka', 'delta lake', 'etl', 'big data',
  'react', 'typescript', 'next', 'vue', 'angular', 'node', 'java', 'kotlin', 'swift',
  'kubernetes', 'terraform', 'docker', 'graphql', 'scala', 'snowflake', 'pytorch', 'tensorflow',
]

const getBase = () => new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_ID)

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

function normalize(payload) {
  const nombre = (payload.nombre || '').trim()
  const apellido = (payload.apellido || '').trim()
  const stackAll = [...(payload.stack || []), ...(payload.custom || [])]
  const fields = {
    'Nombre y apellido': `${nombre} ${apellido}`.trim(),
    Nombre: nombre,
    Apellido: apellido,
    Email: (payload.email || '').trim(),
    LinkedIn: (payload.linkedin || '').trim(),
    'Área': AREA_LABELS[payload.area] || undefined,
    Stack: stackAll.join(', ') || undefined,
    'IA herramientas': (payload.aiTools || []).join(', ') || undefined,
    'IA nivel': payload.aiLevel || undefined,
    Seniority: payload.seniority || undefined,
    'Inglés': payload.ingles || undefined,
    Ciudad: (payload.ciudad || '').trim() || undefined,
    Modalidad: MODALIDAD_MAP[payload.modalidad] || payload.modalidad || undefined,
    'En búsqueda': BUSQUEDA_MAP[payload.busqueda] || payload.busqueda || undefined,
    Observaciones: (payload.observaciones || '').trim() || undefined,
    Fuente: 'Autoactualización',
    Sourcer: 'Rex',
    'Estado intake': 'Nuevo',
    Recibido: new Date().toISOString(),
  }
  if (payload.area === 'data' && payload.extra) fields['Databricks en prod'] = payload.extra
  if (payload.area === 'ml' && payload.extra) fields['ML/IA en prod'] = payload.extra
  // Salario a número
  const sal = parseInt(String(payload.salario || '').replace(/[^\d]/g, ''), 10)
  if (!Number.isNaN(sal) && sal > 0) fields['Salario deseado USD'] = sal
  // Limpiar undefined
  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k])
  return fields
}

function techsIn(text) {
  const t = (text || '').toLowerCase()
  return TECHS.filter((tech) => t.includes(tech))
}

// Score determinístico del candidato contra una búsqueda. Devuelve {score, matched, missing, gateFail}.
function scoreAgainst(search, payload, blob) {
  const mustText = search.get('Must-haves') || ''
  const lines = mustText.split('\n').map((l) => l.trim()).filter(Boolean)
  if (!lines.length) return null

  const matched = []
  const missing = []
  for (const line of lines) {
    const lineTechs = techsIn(line)
    if (lineTechs.length === 0) {
      // Línea sin tecnología detectable (ej: "4+ años..."): la contamos como cumplida
      // si menciona años y el candidato es senior o superior.
      const wantsYears = /años|year/i.test(line)
      const isSenior = /senior|staff|lead/i.test(payload.seniority || '')
      if (wantsYears && isSenior) matched.push(line)
      else missing.push(line)
      continue
    }
    const hit = lineTechs.some((tech) => blob.includes(tech))
    if (hit) matched.push(line)
    else missing.push(line)
  }

  // Gate de modalidad: si la búsqueda es híbrida/presencial en un lugar y el
  // candidato es solo remoto, es dealbreaker.
  const geo = (search.get('Geo / Modalidad') || '').toLowerCase()
  const requiresOnsite = /híbrido|hibrido|presencial|buenos aires/.test(geo)
  const mod = MODALIDAD_MAP[payload.modalidad] || payload.modalidad || ''
  const gateFail = requiresOnsite && mod === 'Remoto'

  const score = Math.round((matched.length / lines.length) * 100)
  return { score, matched, missing, gateFail }
}

async function postSlack({ payload, search, result }) {
  if (!SLACK_BOT_TOKEN) return { skipped: true }
  const nombre = `${(payload.nombre || '').trim()} ${(payload.apellido || '').trim()}`.trim()
  const rol = search.get('Rol') || 'la búsqueda'
  const area = AREA_LABELS[payload.area] || ''
  const cumple = result.matched.length ? result.matched.join('; ') : 'ver perfil'
  const falta = result.missing.length ? result.missing.join('; ') : 'nada relevante'

  // Texto de outreach: sin nombre de cliente, sin em-dashes, sin emojis, sin "te copa".
  const draft = [
    `Hola ${(payload.nombre || '').trim()},`,
    '',
    `Soy parte del equipo de Bondy. Tenemos abierta una búsqueda de ${rol} en Argentina, híbrida en Buenos Aires, y tu perfil encaja con lo que buscamos.`,
    '',
    '¿Tenés un rato esta semana para que te cuente los detalles? Si te interesa, respondeme y coordinamos.',
    '',
    'Gracias.',
  ].join('\n')

  const text = [
    `:dart: *Nuevo match · ${rol}*`,
    `*${nombre}* · score ${result.score}/100 · ${area}`,
    payload.linkedin ? `LinkedIn: ${payload.linkedin}` : '',
    payload.email ? `Email: ${payload.email}` : '',
    `Cumple: ${cumple}`,
    `Falta: ${falta}`,
    '',
    'Para copiar y enviar desde tu casilla:',
    '```',
    draft,
    '```',
    'Reaccioná con :raised_hand: si lo tomás, y :white_check_mark: cuando lo enviaste.',
  ].filter((l) => l !== '').join('\n')

  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SLACK_BOT_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text, unfurl_links: false }),
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
    if (!payload.nombre?.trim() || !payload.apellido?.trim() || !payload.linkedin?.trim()) {
      return NextResponse.json({ ok: false, error: 'missing_fields' }, { status: 400 })
    }

    const base = getBase()
    const fields = normalize(payload)

    // 1. Guardar intake (crítico)
    const created = await base(T_INTAKE).create([{ fields }], { typecast: true })
    const recordId = created[0].id

    // 2 + 3. Match + Slack (best-effort, no rompe el guardado)
    let debug = { matched: false }
    try {
      const blob = buildBlob(payload)
      // Traemos todas y filtramos "Abierta" en JS (más robusto que filterByFormula).
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
          `\nFalta: ${best.missing.join('; ') || '—'}`

        if (best.resultado === 'Matchea') {
          const slack = await postSlack({ payload, search: best.search, result: best })
          if (slack && slack.ok === false) motivo += `\n[slack error: ${slack.error}]`
          if (slack && slack.skipped) motivo += `\n[slack: sin SLACK_BOT_TOKEN]`
          debug.slack = slack?.ok === true ? 'ok' : (slack?.error || (slack?.skipped ? 'no_token' : 'unknown'))
        }

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
      // Dejamos el error visible en el propio registro para diagnosticar sin logs.
      try { await base(T_INTAKE).update(recordId, { 'Motivo match': `MATCH_ERROR: ${msg}` }) } catch {}
    }

    return NextResponse.json({ ok: true, id: recordId, debug })
  } catch (err) {
    console.error('[actualizar-datos] crash', err)
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 })
  }
}
