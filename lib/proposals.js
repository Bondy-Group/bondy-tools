import { getSupabaseAdmin } from './supabase'

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

// ── DB helpers ───────────────────────────────────────────
export async function listProposals() {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase
    .from('proposals')
    .select('id, agreement_id, client_name, status, fee_pct, language, variant, proposal_date, created_at, updated_at, created_by')
    .order('updated_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getProposal(id) {
  const supabase = getSupabaseAdmin()
  const { data, error } = await supabase.from('proposals').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createProposal(payload, createdBy) {
  const supabase = getSupabaseAdmin()
  const year = payload.year || String(new Date().getFullYear())

  // Generar agreement_id via RPC
  const { data: idData, error: idErr } = await supabase.rpc('next_agreement_id', { p_year: year })
  if (idErr) throw idErr

  const insertPayload = {
    ...DEFAULT_PROPOSAL,
    ...payload,
    agreement_id: idData,
    created_by: createdBy || null,
  }

  const { data, error } = await supabase.from('proposals').insert(insertPayload).select().single()
  if (error) throw error
  return data
}

export async function updateProposal(id, patch) {
  const supabase = getSupabaseAdmin()
  // Nunca dejamos sobrescribir agreement_id desde patch
  const { agreement_id, id: _ignoredId, created_at, ...safe } = patch || {}
  const { data, error } = await supabase.from('proposals').update(safe).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteProposal(id) {
  const supabase = getSupabaseAdmin()
  const { error } = await supabase.from('proposals').delete().eq('id', id)
  if (error) throw error
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
