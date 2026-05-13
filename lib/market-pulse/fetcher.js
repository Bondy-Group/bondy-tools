import { createClient } from '@supabase/supabase-js'
import {
  topStacks,
  trendsByMonth,
  distribution,
  topCompanies,
  topCountries,
  groupSeniority,
  CATEGORY_LABELS,
} from './normalize'

/**
 * Cliente Supabase apuntando al proyecto SCRAPER (tchppyxhapxtjemxrbqm),
 * donde vive la tabla `jobs`. NO al proyecto principal de bondy-tools
 * (ejvjpjwcbxicbknrbddb), donde getSupabaseAdmin() apunta por default.
 *
 * Replica el patrón de lib/scraper-jobs.js. Usa anon key porque la lectura
 * es read-only sobre campos no sensibles del board público.
 */
const SCRAPER_SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SCRAPER_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

function getScraperClient() {
  return createClient(SCRAPER_SUPABASE_URL, SCRAPER_SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  })
}

/**
 * Trae el dataset de los últimos N días desde Supabase.
 * Limita campos para reducir payload (no traemos `description`).
 */
async function fetchRawJobs(daysBack) {
  const supabase = getScraperClient()
  const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

  // Paginamos en lotes de 1000 (límite default de PostgREST)
  // para no perder filas en períodos largos.
  const PAGE = 1000
  let all = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('jobs')
      .select('published_at,company,category,seniority,modality,tech_stack,countries')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .range(from, from + PAGE - 1)
    if (error) throw error
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

/**
 * Computa el dataset completo de Market Pulse en una sola pasada.
 * Las 3 vistas (candidato, hiring manager, recruiter) consumen el mismo
 * objeto pero muestran cortes distintos.
 */
export async function getMarketPulseData() {
  const now = Date.now()
  const day = 24 * 60 * 60 * 1000

  // Traemos 180 días para poder mostrar tendencias de 6 meses
  const allJobs = await fetchRawJobs(180)

  // Slices por ventana
  const last30 = allJobs.filter(j => new Date(j.published_at).getTime() >= now - 30 * day)
  const prev30 = allJobs.filter(j => {
    const t = new Date(j.published_at).getTime()
    return t >= now - 60 * day && t < now - 30 * day
  })
  const last72h = allJobs.filter(j => new Date(j.published_at).getTime() >= now - 3 * day)

  // Top stacks últimos 30d con delta vs 30-60d
  const stacks = topStacks(last30, prev30, 15)
  const topStackNames = stacks.slice(0, 6).map(s => s.stack)
  const trends = trendsByMonth(allJobs, topStackNames, 6)

  // Skills emergentes: con al menos 8 menciones y delta >= +100% o is_new
  const rising = stacks
    .filter(s => (s.is_new && s.count >= 8) || (s.delta_pct !== null && s.delta_pct >= 100 && s.count >= 8))
    .slice(0, 6)

  // Distribuciones (usando 30d para más muestra)
  const modalityDist = distribution(last30, 'modality')
  const seniorityDist = distribution(last30, 'seniority', groupSeniority)
  const categoryDist = distribution(last30, 'category')
    .filter(d => d.value !== 'unknown')
    .map(d => ({ ...d, label: CATEGORY_LABELS[d.value] || d.value }))

  // Top empresas y países
  const companies = topCompanies(last30, 12)
  const countries = topCountries(last30, 10)

  // Volúmenes
  const volume = {
    last_30d: last30.length,
    prev_30d: prev30.length,
    last_72h: last72h.length,
    companies_30d: new Set(last30.map(j => j.company).filter(Boolean)).size,
    delta_pct: prev30.length > 0
      ? Math.round(((last30.length - prev30.length) / prev30.length) * 100)
      : null,
    remote_pct: modalityDist.find(m => m.value === 'remote')?.pct ?? null,
  }

  return {
    generated_at: new Date().toISOString(),
    volume,
    top_stacks: stacks,
    rising_skills: rising,
    trends,
    modality: modalityDist,
    seniority: seniorityDist,
    category: categoryDist,
    top_companies: companies,
    top_countries: countries,
  }
}
