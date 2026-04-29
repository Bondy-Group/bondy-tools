import { supabaseUrl as getSupabaseUrl, supabaseHeaders } from './job-board'

// ── Defaults ─────────────────────────────────────────────
export const DEFAULT_DNA = [
  { title: 'Resilience / Antifragility', desc: 'Narrates failure with precision. We probe for observable before/after.' },
  { title: 'Real autonomy',              desc: 'Decisions made with partial information; ownership of cost-of-error.' },
  { title: 'Power',                      desc: 'Concrete weekly outputs. Energy management system, not improvisation.' },
  { title: 'Learning capacity',          desc: 'Recent learnings that visibly changed how they work; AI as multiplier, not shortcut.' },
  { title: 'Ethics / Integrity',         desc: 'Bad news delivered fast; comfortable saying "I don\'t know"; same in private and public.' },
  { title: 'Judgment',                   desc: 'Explicit prioritization logic. Can defend what they didn\'t do.' },
]

export const DEFAULT_DNA_ES = [
  { title: 'Resiliencia / Antifragilidad', desc: 'Narra el fracaso con precisión. Sondeamos por observable antes/después.' },
  { title: 'Autonomía real',               desc: 'Decisiones con información parcial; ownership del costo del error.' },
  { title: 'Power',                        desc: 'Outputs semanales concretos. Sistema de gestión de energía, no improvisación.' },
  { title: 'Capacidad de aprendizaje',     desc: 'Aprendizajes recientes que cambiaron visiblemente su modo de trabajar; IA como multiplicador, no atajo.' },
  { title: 'Ética / Integridad',           desc: 'Malas noticias rápido; cómodo diciendo "no sé"; igual en privado y en público.' },
  { title: 'Juicio',                       desc: 'Lógica de priorización explícita. Puede defender qué no hizo.' },
]

export const DEFAULT_PROPOSAL = {
  status: 'draft',
  language: 'en',
  variant: 'c',
  fee_pct: 14,
  salary_currency: 'ARS',
  date_long: '',
  proposal_date: null,
  year: String(new Date().getFullYear()),
  show_timeline: true,
  client_name: '',
  client_legal_name: '',
  client_short_name: '',
  client_contact: '',
  client_contact_role: '',
  client_location: '',
  client_work_mode: '',
  roles: [
    { title: 'AI Engineer', qty: 1, focus: '' },
  ],
  dna: null,
  approach_notes: '',
  internal_notes: '',
}

// ── DB helpers (fetch directo, mismo patrón que lib/job-board.js) ────────
const SELECT_LIST = 'id,agreement_id,client_name,status,fee_pct,language,variant,proposal_date,created_at,updated_at,created_by'

export async function listProposals() {
  const url = `${getSupabaseUrl()}/rest/v1/proposals?select=${SELECT_LIST}&order=updated_at.desc`
  const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`listProposals supabase ${res.status}: ${txt}`)
  }
  return await res.json()
}

export async function getProposal(id) {
  const url = `${getSupabaseUrl()}/rest/v1/proposals?id=eq.${encodeURIComponent(id)}&select=*`
  const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`getProposal supabase ${res.status}: ${txt}`)
  }
  const rows = await res.json()
  return rows[0] || null
}

async function callNextAgreementId(year) {
  const url = `${getSupabaseUrl()}/rest/v1/rpc/next_agreement_id`
  const res = await fetch(url, {
    method: 'POST',
    headers: supabaseHeaders(),
    body: JSON.stringify({ p_year: String(year) }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`next_agreement_id rpc ${res.status}: ${txt}`)
  }
  return await res.json() // returns scalar (string)
}

export async function createProposal(payload, createdBy) {
  const year = payload.year || String(new Date().getFullYear())
  const agreementId = await callNextAgreementId(year)

  const insertPayload = {
    ...DEFAULT_PROPOSAL,
    ...payload,
    agreement_id: agreementId,
    created_by: createdBy || null,
  }

  const url = `${getSupabaseUrl()}/rest/v1/proposals`
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(insertPayload),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`createProposal supabase ${res.status}: ${txt}`)
  }
  const rows = await res.json()
  return rows[0]
}

export async function updateProposal(id, patch) {
  // Nunca dejamos sobrescribir agreement_id, id ni created_at desde patch
  const { agreement_id, id: _ignoredId, created_at, updated_at, ...safe } = patch || {}

  const url = `${getSupabaseUrl()}/rest/v1/proposals?id=eq.${encodeURIComponent(id)}`
  const res = await fetch(url, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(safe),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`updateProposal supabase ${res.status}: ${txt}`)
  }
  const rows = await res.json()
  return rows[0]
}

export async function deleteProposal(id) {
  const url = `${getSupabaseUrl()}/rest/v1/proposals?id=eq.${encodeURIComponent(id)}`
  const res = await fetch(url, { method: 'DELETE', headers: supabaseHeaders() })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`deleteProposal supabase ${res.status}: ${txt}`)
  }
  return { ok: true }
}

// ── Render helper: convierte row de DB → shape que esperan los componentes ─
export function rowToRenderData(row) {
  const dna = (row.dna && row.dna.length) ? row.dna : (row.language === 'es' ? DEFAULT_DNA_ES : DEFAULT_DNA)
  return {
    fee: Number(row.fee_pct || 14),
    dateLong: row.date_long || '',
    year: row.year || String(new Date().getFullYear()),
    salaryCurrency: row.salary_currency || 'ARS',
    showTimeline: !!row.show_timeline,
    variant: row.variant || 'c',
    language: row.language || 'en',
    agreementId: row.agreement_id || '',
    client: {
      name: row.client_name || '',
      legalName: row.client_legal_name || row.client_name || '',
      shortName: row.client_short_name || row.client_name || '',
      contact: row.client_contact || '',
      contactRole: row.client_contact_role || '',
      location: row.client_location || '',
      workMode: row.client_work_mode || '',
    },
    roles: Array.isArray(row.roles) ? row.roles : [],
    dna,
    approachNotes: row.approach_notes || '',
  }
}
