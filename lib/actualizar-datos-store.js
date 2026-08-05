// lib/actualizar-datos-store.js
// Helpers para el form de autoactualización de perfil contra la Base General
// (Airtable "Base general (ultima)" → tabla "Base General").
//
// - Token firmado (HMAC) para identificar a la persona desde el link del email.
// - Resolución del candidato por token / email / LinkedIn (clave: "Candidato (ID único)").
// - Prefill: record de Base General → shape del form.
// - Upsert: escribe/actualiza la ficha existente con los datos del form.
//
// No rompe el flujo de intake+scorecard+Slack: eso vive en route.js y sigue igual.

const crypto = require('crypto')
const Airtable = require('airtable')

const BASE_GENERAL_ID = 'appZ2uavuwQLI2foP'
const T_BASE = 'Base General'
const SECRET = process.env.SESSION_ACTION_SECRET || 'bondy-session-action-internal'

const getBase = () => new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(BASE_GENERAL_ID)

// ── Token ──────────────────────────────────────────────────────────────────
function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function unb64url(s) {
  try { return Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8') } catch { return '' }
}
function hmac(value) {
  return b64url(crypto.createHmac('sha256', SECRET).update(String(value)).digest()).slice(0, 22)
}
function safeEq(a, b) {
  const ba = Buffer.from(String(a)), bb = Buffer.from(String(b))
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

// Token de record: "<b64url(recordId)>.<sig>". Lo genera Hermes para el link ?t=
function signToken(recordId) {
  return `${b64url(recordId)}.${hmac(recordId)}`
}
function verifyToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const recordId = unb64url(body)
  if (!/^rec[A-Za-z0-9]{14}$/.test(recordId)) return null
  if (!safeEq(sig, hmac(recordId))) return null
  return recordId
}

// Token de email firmado para el link ?e=<email firmado>
function signEmailToken(email) {
  const e = String(email || '').trim().toLowerCase()
  return `${b64url(e)}.${hmac(e)}`
}
function verifyEmailToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null
  const [body, sig] = token.split('.')
  const email = unb64url(body).toLowerCase()
  if (!email || !safeEq(sig, hmac(email))) return null
  return email
}

// ── Identidad / dedup ────────────────────────────────────────────────────────
// Replica la clave del campo formula "Candidato (ID único)": email lower, o
// si no hay email, LinkedIn normalizado (sin protocolo, query ni barra final).
function normalizeLinkedin(url) {
  return String(url || '')
    .trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\?.*$/, '')
    .replace(/\/+$/, '')
}
function identityKey({ email, linkedin }) {
  const e = String(email || '').trim().toLowerCase()
  if (e) return e
  const l = normalizeLinkedin(linkedin)
  return l || ''
}
function escapeFormulaValue(v) {
  return String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// Busca la ficha existente por token → email → linkedin. Devuelve el record o null.
async function findCandidate({ token, emailToken, email, linkedin } = {}) {
  const base = getBase()

  const rid = verifyToken(token)
  if (rid) {
    try { return await base(T_BASE).find(rid) } catch { /* sigue por email */ }
  }

  const signedEmail = verifyEmailToken(emailToken)
  const key = identityKey({ email: signedEmail || email, linkedin })
  if (!key) return null

  const formula = `LOWER({Candidato (ID único)}) = "${escapeFormulaValue(key)}"`
  const rows = await base(T_BASE).select({ filterByFormula: formula, maxRecords: 1 }).firstPage()
  return rows[0] || null
}

// ── Prefill ──────────────────────────────────────────────────────────────────
const SPEC_SET = ['Backend', 'Frontend', 'Full Stack', 'Mobile', 'Data & Analytics', 'ML / AI', 'DevOps / SRE', 'QA / Testing']

function asArray(v) { return Array.isArray(v) ? v : (v ? [v] : []) }

// record de Base General → objeto plano para prefillear el form (todo editable).
function recordToPrefill(record) {
  if (!record) return null
  const g = (f) => record.get(f)
  const profile = asArray(g('Profile'))
  return {
    recordId: record.id,
    nombre: g('Name') || '',
    apellido: g('Lastname') || '',
    email: g('Email') || '',
    telefono: g('Cellphone #') || '',
    linkedin: g('linkedin') || '',
    portfolio: g('Repositorio / Portfolio') || '',
    ciudad: g('City') || '',
    provincia: g('State') || '',
    pais: g('Country') || '',
    relocacion: !!g('Wiling to Relocate'),
    area: g('Área') || '',
    especializacion: profile.filter((p) => SPEC_SET.includes(p)),
    seniority: g('Seniority') || '',
    aniosExp: g('Años de experiencia') != null ? String(g('Años de experiencia')) : '',
    skills: asArray(g('Skills 2')),
    ingles: g('English Level') || '',
    otrosIdiomas: g('Otros idiomas') || '',
    modalidad: asArray(g('Preferred Work Model'))[0] || '',
    enBusqueda: g('En búsqueda') || '',
    disponibilidad: g('Disponibilidad') || '',
    salaryCurrency: g('Currency') || 'USD',
    salarioUsd: g('Desired Salary U$D') != null ? String(g('Desired Salary U$D')) : '',
    salarioArs: g('Desired Salary AR$') != null ? String(g('Desired Salary AR$')) : '',
    tipoContratacion: asArray(g('Tipo de contratación')),
    canal: asArray(g('Preferred communication channel'))[0] || '',
    idiomaComm: asArray(g('Preferred Language'))[0] || '',
    consentimiento: !!g('Clausula Datos'),
    comentarios: '', // no prellenamos +Obs para no pisar notas internas
  }
}

// ── Upsert ───────────────────────────────────────────────────────────────────
const AREA_LABELS = {
  eng: 'Ingeniería / Software', data: 'Data & AI', prod: 'Producto',
  design: 'Diseño (UX/UI)', mkt: 'Marketing', hr: 'RRHH / Recruiting / Talent',
  sales: 'Ventas / Comercial', ops: 'Operaciones / PM', otro: 'Otro',
}

function num(v) {
  const n = parseInt(String(v ?? '').replace(/[^\d]/g, ''), 10)
  return Number.isNaN(n) ? undefined : n
}

// Arma los campos de Base General a partir del payload del form.
function payloadToBaseGeneralFields(payload, cvUrl) {
  const nombre = (payload.nombre || '').trim()
  const apellido = (payload.apellido || '').trim()
  const areaLabel = AREA_LABELS[payload.area] || (payload.area || '').trim() || undefined
  const spec = Array.isArray(payload.especializacion) ? payload.especializacion : []
  const skills = [...(payload.skills || []), ...(payload.customSkills || [])]

  const aiParts = []
  if (payload.aiLevel) aiParts.push(`Nivel: ${payload.aiLevel}`)
  if ((payload.aiTools || []).length) aiParts.push(`Herramientas: ${(payload.aiTools || []).join(', ')}`)

  const fields = {
    Name: nombre || undefined,
    Lastname: apellido || undefined,
    Email: (payload.email || '').trim() || undefined,
    'Cellphone #': (payload.telefono || '').trim() || undefined,
    linkedin: (payload.linkedin || '').trim() || undefined,
    'Repositorio / Portfolio': (payload.portfolio || '').trim() || undefined,
    City: (payload.ciudad || '').trim() || undefined,
    State: (payload.provincia || '').trim() || undefined,
    Country: (payload.pais || '').trim() || undefined,
    'Wiling to Relocate': typeof payload.relocacion === 'boolean' ? payload.relocacion : undefined,
    'Área': areaLabel,
    Profile: spec.length ? spec : undefined,
    Seniority: payload.seniority || undefined,
    'Años de experiencia': num(payload.aniosExp),
    'Skills 2': skills.length ? skills : undefined,
    'English Level': payload.ingles || undefined,
    'Otros idiomas': (payload.otrosIdiomas || '').trim() || undefined,
    'Preferred Work Model': payload.modalidad ? [payload.modalidad] : undefined,
    'En búsqueda': payload.enBusqueda || undefined,
    Disponibilidad: payload.disponibilidad || undefined,
    'Tipo de contratación': Array.isArray(payload.tipoContratacion)
      ? (payload.tipoContratacion.length ? payload.tipoContratacion : undefined)
      : (payload.tipoContratacion || undefined),
    'Preferred communication channel': payload.canal ? [payload.canal] : undefined,
    'Preferred Language': payload.idiomaComm ? [payload.idiomaComm] : undefined,
    'Clausula Datos': typeof payload.consentimiento === 'boolean' ? payload.consentimiento : undefined,
    'Datos frescos': true,
    'Autoactualización': new Date().toISOString().slice(0, 10),
    'Last contact date': new Date().toISOString().slice(0, 10),
  }

  if (aiParts.length) fields['AI Knowledge'] = aiParts.join(' · ')
  if ((payload.comentarios || '').trim()) fields['+Obs'] = (payload.comentarios || '').trim()
  if (cvUrl) fields['CV'] = cvUrl

  // Salario: USD y ARS son independientes (no excluyentes). Se puede tener
  // pretensión en pesos (relación de dependencia) y en dólares (contractor).
  const usd = num(payload.salarioUsd)
  const ars = num(payload.salarioArs)
  if (usd) fields['Desired Salary U$D'] = usd
  if (ars) fields['Desired Salary AR$'] = ars
  const cur = usd && ars ? 'USD/ARS' : usd ? 'USD' : ars ? 'ARS' : ''
  if (cur) fields['Currency'] = cur

  Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k])
  return fields
}

// Actualiza la ficha existente o crea una nueva. Devuelve { id, mode }.
async function upsertCandidate(payload, { matchedRecord, cvUrl } = {}) {
  const base = getBase()
  const fields = payloadToBaseGeneralFields(payload, cvUrl)

  let record = matchedRecord
  if (!record) {
    record = await findCandidate({
      token: payload.token,
      emailToken: payload.emailToken,
      email: payload.email,
      linkedin: payload.linkedin,
    })
  }

  if (record) {
    await base(T_BASE).update(record.id, fields, { typecast: true })
    return { id: record.id, mode: 'updated' }
  }
  fields['Fuentes'] = fields['Fuentes'] || undefined
  const created = await base(T_BASE).create([{ fields }], { typecast: true })
  return { id: created[0].id, mode: 'created' }
}

module.exports = {
  signToken, verifyToken, signEmailToken, verifyEmailToken,
  findCandidate, recordToPrefill, upsertCandidate,
  payloadToBaseGeneralFields, identityKey, normalizeLinkedin, AREA_LABELS,
}
