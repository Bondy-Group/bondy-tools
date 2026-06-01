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
  crypto: 'Crypto / Web3',
  // `hr` is intentionally NOT mapped here. Recruiting / TA / People Ops roles
  // belong on /recursos-recruiters/busco-trabajo, not on the tech board.
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
  torre: 'Torre.co',
  ashby: 'Ashby',
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
  'Crypto / Web3',
]
export const MODALITIES = ['Remote', 'Híbrido', 'Presencial']
export const SENIORITIES = ['Junior', 'Mid-Senior', 'Senior', 'Lead / Staff']
export const SOURCES = ['GetOnBoard', 'Remotive', 'Himalayas', 'WeWorkRemotely', 'Greenhouse', 'Lever', 'YC', 'arc.dev', 'Torre.co', 'Ashby']
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
// Geo gate (FIX 2026-06-01) — runtime defensive LATAM filter for the digest.
//
// Background: the weekly digest to candidates went out with US-only, EU-only,
// India and "Worldwide" roles (incident 2026-06-01). The scraper
// (bondy-job-scraper) now drops non-LATAM at scrape time and writes `geo_scope`,
// but legacy rows have geo_scope=null and a poorly-populated `countries`
// (e.g. an India-remote role stored as ['Remote']). This is the second line of
// defense the digest opts into via `latamOnly`. The public job board keeps the
// broad behavior (latamOnly defaults to false).
//
// Policy mirrors bondy-hr-jobs-scraper: accept LATAM / Americas / global-remote;
// drop US-only, EU-only, APAC, and any onsite/hybrid outside LATAM.
// ─────────────────────────────────────────────────────────────
const LATAM_COUNTRY_SET = new Set([
  'argentina', 'brazil', 'brasil', 'chile', 'colombia', 'mexico', 'méxico',
  'peru', 'perú', 'uruguay', 'paraguay', 'bolivia', 'ecuador', 'venezuela',
  'costa rica', 'panama', 'panamá', 'guatemala', 'honduras', 'el salvador',
  'nicaragua', 'dominican republic', 'república dominicana', 'puerto rico',
])
// Country codes the scraper stores for non-LATAM-only roles (e.g. ['US'], ['EU']).
const NON_LATAM_ONLY_CODES = new Set(['us', 'usa', 'eu', 'europe'])
const LATAM_TEXT = /\b(latam|latin america|am[eé]rica latina|argentin|buenos aires|bras[ií]l|s[ãa]o paulo|rio de janeiro|m[eé]xico|mexico|cdmx|guadalajara|monterrey|chile|santiago|colombia|bogot[áa]|medell[íi]n|per[uú]|lima|uruguay|montevideo|paraguay|asunci[óo]n|bolivia|ecuador|quito|guayaquil|venezuela|costa rica|panam[áa]|guatemala|honduras|el salvador|nicaragua|dominican|puerto rico)\b/i
const AMERICAS_TEXT = /\b(americas|am[eé]ricas|north america|pan[\s-]?american)\b/i
const GLOBAL_TEXT = /\b(worldwide|global|anywhere|remote[\s-]*first)\b/i
const NON_LATAM_HARD = /\b(india|philippines|pakistan|bangalore|bengaluru|mumbai|delhi|hyderabad|manila|jakarta|bangkok|seoul|singapore|tokyo|vietnam|indonesia|thailand|malaysia|china|japan|korea|emea|apac|europe|european union|germany|deutschland|france|italy|italia|spain|espa[ñn]a|madrid|barcelona|portugal|lisbon|lisboa|netherlands|amsterdam|poland|warsaw|romania|ukraine|united kingdom|england|london|ireland|dublin|sweden|stockholm|norway|finland|denmark|copenhagen|belgium|austria|vienna|switzerland|turkey|t[üu]rkiye|nigeria|kenya|south africa|egypt|israel|\buae\b|saudi)\b/i
const US_ONLY_TEXT = /\b(united states|u\.s\.a?\.?|\busa\b|us[\s-]?only|us[\s-]?based|us[\s-]?remote|remote[\s,(-]+us\b|san francisco|new york|\bnyc\b|seattle|\bboston\b|los angeles|chicago|austin|denver|\bmiami\b|palo alto|mountain view)\b/i

// Returns true if a row is workable from LATAM. `row` uses raw DB field names
// (countries: string[], location, modality, geo_scope, is_remote).
function passesLatamGeo(row) {
  // 1. Trust the scraper's classification when present (new rows).
  const scope = row.geo_scope
  if (scope === 'us_only' || scope === 'eu_only' || scope === 'apac') return false
  if (scope === 'latam' || scope === 'americas' || scope === 'global') return true

  // 2. Legacy rows (geo_scope null): fall back to countries + location heuristics.
  const countries = Array.isArray(row.countries) ? row.countries : []
  const cl = countries.map((c) => String(c).toLowerCase().trim()).filter(Boolean)
  if (cl.some((c) => LATAM_COUNTRY_SET.has(c))) return true
  // Explicitly non-LATAM country code(s) only (['US'], ['EU']) → drop.
  if (cl.length > 0 && cl.every((c) => NON_LATAM_ONLY_CODES.has(c))) return false

  const hay = `${row.location || ''} ${countries.join(' ')}`.toLowerCase()
  if (LATAM_TEXT.test(hay)) return true

  const isRemote =
    row.is_remote === true || row.modality === 'remote' || /\bremot/.test(hay)
  // Onsite / hybrid with no LATAM signal → not workable from LATAM.
  if (!isRemote) return false

  const globalish = GLOBAL_TEXT.test(hay) || AMERICAS_TEXT.test(hay)
  const hardNonLatam = NON_LATAM_HARD.test(hay) || US_ONLY_TEXT.test(hay)
  // Remote but restricted to a non-LATAM geo (e.g. "India - Remote",
  // "Remote (US)") and no LATAM/Americas/global signal → drop.
  if (hardNonLatam && !globalish) return false
  // Generic / worldwide remote with no restriction → workable from LATAM.
  return true
}

// True if the role was published within `days` days. Falls back to collected_at
// when published_at is missing (some sources never set it). Used by the digest
// so a month-old aviso that the source keeps re-listing ("zombie") is excluded
// even though collected_at looks fresh.
function isFreshByPublished(row, days, now) {
  const cutoff = now - days * 86400000
  const pub = row.published_at ? new Date(row.published_at).getTime() : null
  const ref = pub != null ? pub : (row.collected_at ? new Date(row.collected_at).getTime() : null)
  return ref != null && ref >= cutoff
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

export async function fetchOpenRoles({
  days = 60,
  limit = 500,
  // FIX 2026-06-01: the weekly digest opts into a LATAM-only geo gate
  // (latamOnly) and a real published-date freshness window
  // (publishedWithinDays). The public job board keeps the defaults (broad).
  latamOnly = false,
  publishedWithinDays = null,
} = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()
  const activeIds = await fetchActiveSourceIds()

  const params = new URLSearchParams({
    select:
      'id,title,company,location,countries,modality,seniority,tech_stack,category,source,source_url,min_salary,max_salary,currency,published_at,collected_at,status,language_required,geo_scope,is_remote',
    order: 'collected_at.desc',
    limit: String(limit),
    // FIX (2026-05-27): switched from published_at to collected_at — same
    // rationale as fetchRecruitingRoles (line ~329): ATS sources (Ashby,
    // Greenhouse, Lever) keep jobs open for weeks/months with stale
    // published_at, so filtering by it hides them entirely. collected_at
    // means "the scraper re-validated it recently as still open".
    'collected_at': `gte.${since}`,
    // FIX 2026-06-01: also exclude 'expired'. Jobs now transition to 'expired'
    // (one-shot cleanup + nightly cron); without this, expired zombies kept
    // showing on the public board and digest because the old filter only
    // excluded 'rejected'.
    'status': 'not.in.(rejected,expired)',
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

      // Defensive filter: some HR/recruiting roles get scraped with the wrong
      // category (e.g. `programming` for "Talent Sourcer", "People Generalist").
      // If the title looks like a recruiter role and isn't a false positive,
      // it belongs on /recursos-recruiters/busco-trabajo, not here. Reuses the
      // exact same patterns as the recruiter-board classifier for symmetry.
      if (!isRecruitingFalsePositive(r.title) && classifyRecruitingArea(r.title, null)) {
        return null
      }

      // FIX 2026-06-01: LATAM geo gate (digest opts in via latamOnly). Drops
      // US-only / EU-only / India / APAC and onsite-outside-LATAM roles that
      // leaked into the candidate digest.
      if (latamOnly && !passesLatamGeo(r)) return null

      // FIX 2026-06-01: real freshness for the digest. The REST query filters
      // collected_at (re-validation time), which lets a month-old aviso the
      // source keeps re-listing look "fresh". When the digest passes
      // publishedWithinDays, also require the role to have been *published*
      // within the window.
      if (publishedWithinDays != null && !isFreshByPublished(r, publishedWithinDays, now)) {
        return null
      }

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
// `category` is the scraper's tag (e.g. 'hr'); used as a final fallback
// when the title doesn't match any keyword pattern but the row was pulled
// in via `category.eq.hr`.
function classifyRecruitingArea(title, category) {
  const t = (title || '').toLowerCase()
  if (/talent\s+acquisition/.test(t)) return 'Talent Acquisition'
  if (/talent\s+(development|management|brand)/.test(t)) return 'Talent Development'
  if (/people\s+(ops|operations|generalist|partner|business)|human\s+resources|\bhr\b|\bhrbp\b|hr\s+(generalist|partner|business)/.test(t)) return 'People Ops / HR'
  if (/recruit|sourcer|headhunt/.test(t)) return 'Recruiter / Sourcer'
  // Scraper said it's HR but the title is non-obvious (e.g. "People Specialist",
  // "Workforce Partner") — bucket as People Ops / HR rather than dropping.
  if (category === 'hr') return 'People Ops / HR'
  return null
}

function isRecruitingFalsePositive(title) {
  const t = (title || '').toLowerCase()
  return RECRUITING_FALSE_POSITIVES.some((p) => t.includes(p))
}

// hr_role_type (set by the bondy-hr-jobs-scraper skill) → UI filter area.
// Every hr_jobs row has category='hr', so classifyRecruitingArea's
// `category==='hr'` fallback would bucket everything as People Ops / HR —
// hr_role_type is the precise signal instead.
const ROLE_TYPE_TO_AREA = {
  recruiter: 'Recruiter / Sourcer',
  recruiter_generic: 'Recruiter / Sourcer',
  tech_recruiter: 'Recruiter / Sourcer',
  sourcer: 'Recruiter / Sourcer',
  talent_acquisition: 'Talent Acquisition',
  head_of_people: 'Talent Acquisition',
  people_ops: 'People Ops / HR',
  hr_business_partner: 'People Ops / HR',
  hr_generalist: 'People Ops / HR',
}

// Sources feeding the recruiter board (bondy-hr-jobs-scraper skill).
export const HR_SOURCES = ['GetOnBoard', 'Remotive', 'Himalayas', 'Greenhouse', 'Lever']

function recruitingAreaFor(hrRoleType, title) {
  const t = (title || '').toLowerCase()
  // Talent Development has no hr_role_type — detect it by title first.
  if (/talent\s+(development|management|brand)/.test(t)) return 'Talent Development'
  const mapped = ROLE_TYPE_TO_AREA[hrRoleType]
  if (mapped) return mapped
  // hr_role_type 'other'/unknown — fall back to the title classifier; the row
  // already passed the scraper's HR gate, so default to People Ops / HR.
  return classifyRecruitingArea(title, null) || 'People Ops / HR'
}

export async function fetchRecruitingRoles({ days = 60, limit = 500 } = {}) {
  const since = new Date(Date.now() - days * 86400000).toISOString()

  // Reads the `hr_jobs` table, populated by the bondy-hr-jobs-scraper skill.
  // Separate table from `jobs` (tech board): the HR scraper validates every
  // title against an HR gate, applies a LATAM-first geo filter (onsite/hybrid
  // roles outside LATAM and US-only-remote are dropped at scrape time), and
  // classifies hr_role_type / signal_strength.
  // Freshness window is on `collected_at` (when we scraped it) — `published_at`
  // arrives null/inconsistent per source (Lever sets it null).
  const params = new URLSearchParams({
    select:
      'id,title,company,location,countries,modality,seniority,category,source,source_url,min_salary,max_salary,currency,published_at,collected_at,status,language_required,hr_role_type,hr_seniority_signal,signal_strength',
    order: 'collected_at.desc',
    limit: String(limit),
    'collected_at': `gte.${since}`,
    'status': 'neq.rejected',
    'visible_in_board': 'eq.true',
  })

  const url = `${SCRAPER_SUPABASE_URL}/rest/v1/hr_jobs?${params.toString()}`
  const res = await fetch(url, {
    headers: {
      apikey: SCRAPER_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SCRAPER_SUPABASE_ANON_KEY}`,
    },
    next: { revalidate: 1800 },
  })

  if (!res.ok) {
    console.error('[recursos-recruiters] hr_jobs fetch failed', res.status, await res.text())
    return { roles: [], lastUpdate: null, newToday: 0, activeSources: null }
  }

  const rows = await res.json()
  let lastUpdate = null
  const now = Date.now()
  const FRESH_MS = 24 * 3600000

  const roles = rows
    .map((r) => {
      if (isRecruitingFalsePositive(r.title)) return null
      const area = recruitingAreaFor(r.hr_role_type, r.title)
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
        date: (r.published_at || r.collected_at || '').slice(0, 10),
        collectedAt: r.collected_at || null,
        isNew,
        source: SOURCE_TO_LABEL[r.source] || r.source || '—',
        applyUrl: r.source_url,
        tags: [],
        language: r.language_required ? (LANGUAGE_TO_LABEL[r.language_required] || null) : null,
      }
    })
    .filter(Boolean)

  const newToday = roles.filter((r) => r.isNew).length

  return { roles, lastUpdate, newToday, activeSources: HR_SOURCES }
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

// ─────────────────────────────────────────────────────────────
// Bondy's OWN open roles (bondy_roles table in the same Supabase project)
// Read-only, public — used by the /busco-trabajo hero to surface our own
// searches above the scraped LATAM job board.
// ─────────────────────────────────────────────────────────────
export async function fetchBondyOpenRoles({ limit = 12 } = {}) {
  const url = new URL(`${SCRAPER_SUPABASE_URL}/rest/v1/bondy_roles`)
  url.searchParams.set(
    'select',
    'slug,title,seniority,role_category,modality,tech_stack,client_visible,client_name,is_featured,position_number'
  )
  url.searchParams.set('status', 'eq.published')
  url.searchParams.set('order', 'is_featured.desc,position_number.desc')
  url.searchParams.set('limit', String(limit))

  try {
    const res = await fetch(url.toString(), {
      headers: {
        apikey: SCRAPER_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SCRAPER_SUPABASE_ANON_KEY}`,
      },
      // ISR through the page-level revalidate; this lets us cache for a bit.
      next: { revalidate: 600 },
    })
    if (!res.ok) {
      console.warn('[fetchBondyOpenRoles] non-ok', res.status)
      return []
    }
    const rows = await res.json()
    return Array.isArray(rows) ? rows : []
  } catch (err) {
    console.warn('[fetchBondyOpenRoles] error', err?.message || err)
    return []
  }
}
