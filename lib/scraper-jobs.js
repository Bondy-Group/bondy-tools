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
  arcdev: 'arc.dev',
}

// Language requirement detected by the scraper (column `language_required`).
// Legacy rows pre-detection have null and are simply NOT shown when the user
// applies a language filter — they pass through the catalog as "Sin detectar".
const LANGUAGE_TO_LABEL = {
  es: 'Español',
  en: 'Inglés',
  mixed: 'Bilingüe',
  unclear: 'Sin detectar',
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
export const SOURCES = ['GetOnBoard', 'Remotive', 'Himalayas', 'WeWorkRemotely', 'Greenhouse', 'Lever', 'YC', 'arc.dev']
export const LOCATIONS = [
  'Argentina',
  'México',
  'Brasil',
  'Uruguay',
  'España',
  'LATAM (remoto)',
  'Global (remoto)',
]
// User-facing language filter labels. Order matters in the UI.
// 'Sin detectar' is included on purpose: it lets users opt INTO seeing
// legacy/unclassified rows when they want them, without having them appear
// as a hidden bucket.
export const LANGUAGES = ['Español', 'Inglés', 'Bilingüe', 'Sin detectar']
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
async function fetchActiveSourceIds() {
  // Reads job_sources.active=true → drives both the public job board filter
  // and the scraper (skill bondy-job-scraper checks the same flag at runtime).
  // If the table can't be read, fail-open: return null = "no filter applied".
  try {
    const url = `${SCRAPER_SUPABASE_URL}/rest/v1/job_sources?select=id,active,in_scraper&active=eq.true&in_scraper=eq.true`
    const res = await fetch(url, {
      headers: {
        apikey: SCRAPER_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SCRAPER_SUPABASE_ANON_KEY}`,
      },
      next: { revalidate: 1800 },
    })
    if (!res.ok) return null
    const rows = await res.json()
    if (!Array.isArray(rows) || rows.length === 0) return null
    return rows.map((r) => r.id)
  } catch {
    return null
  }
}

export async function fetchOpenRoles({ days = 60, limit = 500 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const activeIds = await fetchActiveSourceIds()

  const params = new URLSearchParams({
    select:
      'id,title,company,location,countries,modality,seniority,tech_stack,category,source,source_url,min_salary,max_salary,currency,published_at,collected_at,status,language_required',
    order: 'published_at.desc',
    limit: String(limit),
    'published_at': `gte.${since}`,
    'status': 'neq.rejected',
  })
  // Filter by active sources only. PostgREST `in.(a,b,c)` syntax.
  if (activeIds && activeIds.length > 0) {
    params.set('source', `in.(${activeIds.join(',')})`)
  }

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
    return { roles: [], lastUpdate: null, newToday: 0, activeSources: null }
  }

  const rows = await res.json()
  let lastUpdate = null
  const now = Date.now()
  const FRESH_MS = 24 * 3600000 // 24h cutoff for "Nuevo" badge

  const roles = rows
    .map((r) => {
      const area = CATEGORY_TO_AREA[r.category]
      if (!area) return null // skip categories outside our buckets

      // track most recent scrape across visible roles
      const t = r.collected_at || r.published_at
      if (t && (!lastUpdate || t > lastUpdate)) lastUpdate = t

      // FOMO signal: was this role added to our DB in the last 24h?
      // Prefer collected_at (when WE saw it); fallback to published_at.
      const freshRef = r.collected_at || r.published_at
      const isNew = freshRef ? (now - new Date(freshRef).getTime()) < FRESH_MS : false

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
        collectedAt: r.collected_at || null,
        isNew,
        source: SOURCE_TO_LABEL[r.source] || r.source || '—',
        applyUrl: r.source_url,
        tags: Array.isArray(r.tech_stack) ? r.tech_stack.slice(0, 8) : [],
        language: r.language_required ? (LANGUAGE_TO_LABEL[r.language_required] || null) : null,
      }
    })
    .filter(Boolean)

  const newToday = roles.filter((r) => r.isNew).length

  // The set of source labels actually present in the visible roles, intersected
  // with what's currently active in job_sources. The UI filter chips use this
  // to avoid showing sources that have been turned off.
  const activeSources = activeIds
    ? activeIds.map((id) => SOURCE_TO_LABEL[id] || id)
    : null

  return { roles, lastUpdate, newToday, activeSources }
}

// ─────────────────────────────────────────────────────────────
// Recruiting-focused fetcher (used by /recursos-recruiters/busco-trabajo)
// ─────────────────────────────────────────────────────────────

// Sub-areas exposed in the filter for recruiter-facing job board.
// Derived from `title` keywords (the scraper's `category` field is mostly
// useless here — almost every recruiter role lands as `programming`).
export const RECRUITING_AREAS = [
  'Recruiter / Sourcer',
  'Talent Acquisition',
  'People Ops / HR',
  'Talent Development',
]

// Phrases that look like recruiting roles but are NOT — they are talent
// pipelines, candidate communities, or unrelated dev roles. Excluded post-fetch.
const RECRUITING_FALSE_POSITIVES = [
  'talent pool',
  'talent community',
  'talent network',
  'banco de talentos',
  'banco de talento',
  'talent connection',
  'talent engagement platform', // YC company description, not a role
  'always recruiting', // generic dev posting
  'join our talent',
  'future opportunities',
  '[yc ', // YC company self-description ("[YC Winter 2019] Hiring at Ashby...")
]

// Sub-area classifier — order matters (more specific first).
function classifyRecruitingArea(title) {
  const t = (title || '').toLowerCase()
  if (/talent\s+acquisition/.test(t)) return 'Talent Acquisition'
  if (/talent\s+(development|management|brand)/.test(t)) return 'Talent Development'
  if (/people\s+ops|human\s+resources|\bhr\b|people\s+operations/.test(t)) return 'People Ops / HR'
  if (/recruit|sourcer|headhunt/.test(t)) return 'Recruiter / Sourcer'
  return null
}

function isRecruitingFalsePositive(title) {
  const t = (title || '').toLowerCase()
  return RECRUITING_FALSE_POSITIVES.some((p) => t.includes(p))
}

export async function fetchRecruitingRoles({ days = 60, limit = 500 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const activeIds = await fetchActiveSourceIds()

  // PostgREST `or=` syntax with `ilike` patterns. We over-fetch here and
  // exclude false positives client-side (cheaper than nesting `not.ilike`).
  const orFilter = [
    'title.ilike.*recruit*',
    'title.ilike.*sourcer*',
    'title.ilike.*headhunt*',
    'title.ilike.*talent%20acquisition*',
    'title.ilike.*talent%20management*',
    'title.ilike.*talent%20development*',
    'title.ilike.*talent%20brand*',
    'title.ilike.*people%20ops*',
    'title.ilike.*human%20resources*',
  ].join(',')

  const params = new URLSearchParams({
    select:
      'id,title,company,location,countries,modality,seniority,tech_stack,category,source,source_url,min_salary,max_salary,currency,published_at,collected_at,status,language_required',
    order: 'published_at.desc',
    limit: String(limit),
    'published_at': `gte.${since}`,
    'status': 'neq.rejected',
  })
  params.append('or', `(${orFilter})`)

  if (activeIds && activeIds.length > 0) {
    params.set('source', `in.(${activeIds.join(',')})`)
  }

  const url = `${SCRAPER_SUPABASE_URL}/rest/v1/jobs?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      apikey: SCRAPER_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SCRAPER_SUPABASE_ANON_KEY}`,
    },
    next: { revalidate: 1800 },
  })

  if (!res.ok) {
    console.error('[recursos-recruiters] Supabase fetch failed', res.status, await res.text())
    return { roles: [], lastUpdate: null, newToday: 0, activeSources: null }
  }

  const rows = await res.json()
  let lastUpdate = null
  const now = Date.now()
  const FRESH_MS = 24 * 3600000

  const roles = rows
    .map((r) => {
      if (isRecruitingFalsePositive(r.title)) return null
      const area = classifyRecruitingArea(r.title)
      if (!area) return null

      const t = r.collected_at || r.published_at
      if (t && (!lastUpdate || t > lastUpdate)) lastUpdate = t

      const freshRef = r.collected_at || r.published_at
      const isNew = freshRef ? (now - new Date(freshRef).getTime()) < FRESH_MS : false

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
        collectedAt: r.collected_at || null,
        isNew,
        source: SOURCE_TO_LABEL[r.source] || r.source || '—',
        applyUrl: r.source_url,
        tags: Array.isArray(r.tech_stack) ? r.tech_stack.slice(0, 8) : [],
        language: r.language_required ? (LANGUAGE_TO_LABEL[r.language_required] || null) : null,
      }
    })
    .filter(Boolean)

  const newToday = roles.filter((r) => r.isNew).length
  const activeSources = activeIds
    ? activeIds.map((id) => SOURCE_TO_LABEL[id] || id)
    : null

  return { roles, lastUpdate, newToday, activeSources }
}

// Returns today's date as a readable label in es-AR.
// e.g. "miércoles 6 de noviembre" — used in the hero to anchor freshness.
export function formatTodayLabel() {
  try {
    return new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Argentina/Buenos_Aires',
    }).format(new Date())
  } catch {
    return ''
  }
}

// Returns "hoy", "ayer", "hace 3 días", "hace 2 horas" — computed server-side
// against the moment the page is rendered (revalidates with the page).
export function formatUpdateLabel(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now - d
  if (diffMs < 0) return 'hoy'

  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMs / 3600000)

  // same calendar day?
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) {
    if (diffMin < 60) return diffMin <= 1 ? 'hace un instante' : `hace ${diffMin} min`
    return `hoy · hace ${diffH}h`
  }

  // yesterday?
  const yest = new Date(now)
  yest.setDate(now.getDate() - 1)
  if (yest.toDateString() === d.toDateString()) return 'ayer'

  const diffD = Math.floor(diffMs / 86400000)
  return `hace ${diffD} días`
}
