// Client-safe helper. Mismo shape que lib/proposals.js#rowToRenderData
// pero importable desde componentes 'use client' sin tirar el supabase admin client.

const DEFAULT_DNA_EN = [
  { title: 'Resilience / Antifragility', desc: 'Narrates failure with precision. We probe for observable before/after.' },
  { title: 'Real autonomy',              desc: 'Decisions made with partial information; ownership of cost-of-error.' },
  { title: 'Power',                      desc: 'Concrete weekly outputs. Energy management system, not improvisation.' },
  { title: 'Learning capacity',          desc: 'Recent learnings that visibly changed how they work; AI as multiplier, not shortcut.' },
  { title: 'Ethics / Integrity',         desc: 'Bad news delivered fast; comfortable saying "I don\'t know"; same in private and public.' },
  { title: 'Judgment',                   desc: 'Explicit prioritization logic. Can defend what they didn\'t do.' },
]

const DEFAULT_DNA_ES = [
  { title: 'Resiliencia / Antifragilidad', desc: 'Narra el fracaso con precisión. Sondeamos por observable antes/después.' },
  { title: 'Autonomía real',               desc: 'Decisiones con información parcial; ownership del costo del error.' },
  { title: 'Power',                        desc: 'Outputs semanales concretos. Sistema de gestión de energía, no improvisación.' },
  { title: 'Capacidad de aprendizaje',     desc: 'Aprendizajes recientes que cambiaron visiblemente su modo de trabajar; IA como multiplicador, no atajo.' },
  { title: 'Ética / Integridad',           desc: 'Malas noticias rápido; cómodo diciendo "no sé"; igual en privado y en público.' },
  { title: 'Juicio',                       desc: 'Lógica de priorización explícita. Puede defender qué no hizo.' },
]

export function rowToRenderData(row) {
  const dna = (row.dna && row.dna.length) ? row.dna : (row.language === 'es' ? DEFAULT_DNA_ES : DEFAULT_DNA_EN)
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
