/**
 * Read-only client for the public job board (`jobs` table).
 *
 * IMPORTANT: this Supabase project is DIFFERENT from the rest of bondy-tools.
 * The scraper writes into `tchppyxhapxtjemxrbqm` (different from the main
 * tools project). We hardcode here to keep the public job board independent.
 */

const SCRAPER_SUPABASE_URL = 'https://tchppyxhapxtjemxrbqm.supabase.co'
const SCRAPER_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'

// ─────────────────────────────────────────────────────────────
// Domain mappings (raw scraper values → user-facing buckets)
// ─────────────────────────────────────────────────────────────

// raw scraper category → grouped area shown in the filter chip
const CATEGORY_TO_AREA = {
  programming: 'Backend / Full Stack',
  'tech - engineering': 'Backend / Full Stack',
  engineering: 'Backend / Full Stack',
  'mobile-developer': 'Backend / Full Stack',
  technology: 'Backend / Full Stack',
  'it & ux': 'Backend / Full Stack',
  'data-science-analytics': 'Data & Analytics',
  'machine-learning-ai': 'ML / AI',
  'sysadmin-devops-qa': 'DevOps / QA',
  cybersecurity: 'DevOps / QA',
  design: 'Design',
  product: 'Product',
  hr: 'Recruiting',
  // Everything else (legal, finance, regulatory affairs, compliance,
  // commercial, operations, travel partners, …) is filtered out below.
}

const MODALITY_TO_ES = {
  remote: 'Remote',
  hybrid: 'Híbrido',
  'on-site': 'Presencial',
  onsite: 'Presencial',
}

const SOURCE_TO_LABEL = {
  getonboard: 'GetOnBoard',
  yc: 'YC',
  remotive: 'Remotive',
  himalayas: 'Himalayas',
  weworkremotely: 'WeWorkRemotely',
  greenhouse: 'Greenhouse',
  lever: 'Lever',
}

// Sources whose forms are mostly Spanish-speaking → default attribution copy in ES
const SPANISH_SOURCES = ['GetOnBoard', 'Remotive']

// Filter values exposed to the UI
export const AREAS = [
  'Backend / Full Stack',
  'Data & Analytics',
  'ML / AI',
  'DevOps / QA',
  'Design',
  'Product',
  'Recruiting',
]
export const MODALITIES = ['Remote', 'Híbrido', 'Presencial']
export const SENIORITIES = ['Junior', 'Mid-Senior', 'Senior', 'Lead / Staff']
export const SOURCES = ['GetOnBoard', 'Remotive', 'Himalayas', 'WeWorkRemotely', 'Greenhouse', 'Lever', 'YC']
export const LOCATIONS = [
  'Argentina',
  'México',
  'Brasil',
  'Uruguay',
  'España',
  'LATAM (remoto)',
  'Global (remoto)',
]
export { SPANISH_SOURCES }

// Normalize seniority into a smaller bucket
function normalizeSeniority(raw) {
  const s = (raw || '').toLowerCase()
  if (s.includes('junior') || s.includes('entry')) return 'Junior'
  if (s.includes('lead') || s.includes('staff') || s.includes('manager') || s.includes('principal')) return 'Lead / Staff'
  if (s === 'senior') return 'Senior'
  if (s.includes('mid')) return 'Mid-Senior'
  return 'Mid-Senior'
}

function formatSalary(min, max, currency) {
  if (!min && !max) return null
  const cur = currency || 'USD'
  if (min && max) return `${cur} ${(min / 1000).toFixed(0)}–${(max / 1000).toFixed(0)}k`
  if (max) return `Hasta ${cur} ${(max / 1000).toFixed(0)}k`
  return `Desde ${cur} ${(min / 1000).toFixed(0)}k`
}

function formatLocation(loc, countries) {
  if (loc && loc !== 'Remote') return loc
  if (countries && countries.length > 0 && countries[0] !== 'Remote') return countries.join(' · ')
  return 'Remote'
}

// ─────────────────────────────────────────────────────────────
// Public fetch: returns a normalized array ready for the UI
// ─────────────────────────────────────────────────────────────
export async function fetchOpenRoles({ days = 60, limit = 500 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  const params = new URLSearchParams({
    select:
      'id,title,company,location,countries,modality,seniority,tech_stack,category,source,source_url,min_salary,max_salary,currency,published_at,status',
    order: 'published_at.desc',
    limit: String(limit),
    'published_at': `gte.${since}`,
    'status': 'neq.rejected',
  })

  const url = `${SCRAPER_SUPABASE_URL}/rest/v1/jobs?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      apikey: SCRAPER_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SCRAPER_SUPABASE_ANON_KEY}`,
    },
    next: { revalidate: 1800 }, // 30 min cache
  })

  if (!res.ok) {
    console.error('[busco-trabajo] Supabase fetch failed', res.status, await res.text())
    return []
  }

  const rows = await res.json()
  return rows
    .map((r) => {
      const area = CATEGORY_TO_AREA[r.category]
      if (!area) return null // skip categories outside our buckets
      return {
        id: r.id,
        title: r.title,
        company: r.company || '—',
        area,
        modality: MODALITY_TO_ES[r.modality] || 'Remote',
        seniority: normalizeSeniority(r.seniority),
        location: formatLocation(r.location, r.countries),
        salary: formatSalary(r.min_salary, r.max_salary, r.currency),
        date: (r.published_at || '').slice(0, 10),
        source: SOURCE_TO_LABEL[r.source] || r.source || '—',
        applyUrl: r.source_url,
        tags: Array.isArray(r.tech_stack) ? r.tech_stack.slice(0, 8) : [],
      }
    })
    .filter(Boolean)
}
