/**
 * Market Pulse — normalización del dataset crudo de `jobs`.
 *
 * El scraper carga la columna `tech_stack` como array de strings,
 * con mucho ruido (industrias, roles, sinónimos). Esta lib aplica
 * una whitelist curada para producir un dataset confiable para
 * dashboards públicos.
 *
 * Las 3 vistas del Market Pulse (candidato, hiring manager, recruiter)
 * usan el mismo dataset normalizado pero con cortes distintos.
 *
 * Cuando agregues un stack nuevo a TECH_SYNONYMS, ponelo en lowercase
 * en `raw` y casteado a su forma canónica en `canonical`.
 */

/* ───────────────────────── whitelist de stacks ───────────────────────── */

export const TECH_SYNONYMS = {
  // Languages
  python: { canonical: 'Python', family: 'language' },
  javascript: { canonical: 'JavaScript', family: 'language' },
  js: { canonical: 'JavaScript', family: 'language' },
  typescript: { canonical: 'TypeScript', family: 'language' },
  ts: { canonical: 'TypeScript', family: 'language' },
  java: { canonical: 'Java', family: 'language' },
  rust: { canonical: 'Rust', family: 'language' },
  go: { canonical: 'Go', family: 'language' },
  golang: { canonical: 'Go', family: 'language' },
  ruby: { canonical: 'Ruby', family: 'language' },
  'c#': { canonical: 'C#', family: 'language' },
  'c++': { canonical: 'C++', family: 'language' },
  php: { canonical: 'PHP', family: 'language' },
  kotlin: { canonical: 'Kotlin', family: 'language' },
  swift: { canonical: 'Swift', family: 'language' },
  scala: { canonical: 'Scala', family: 'language' },
  elixir: { canonical: 'Elixir', family: 'language' },
  // Frontend
  react: { canonical: 'React', family: 'frontend' },
  reactjs: { canonical: 'React', family: 'frontend' },
  'react.js': { canonical: 'React', family: 'frontend' },
  vue: { canonical: 'Vue', family: 'frontend' },
  vuejs: { canonical: 'Vue', family: 'frontend' },
  angular: { canonical: 'Angular', family: 'frontend' },
  nextjs: { canonical: 'Next.js', family: 'frontend' },
  'next.js': { canonical: 'Next.js', family: 'frontend' },
  svelte: { canonical: 'Svelte', family: 'frontend' },
  // Backend
  nodejs: { canonical: 'Node.js', family: 'backend' },
  'node.js': { canonical: 'Node.js', family: 'backend' },
  node: { canonical: 'Node.js', family: 'backend' },
  django: { canonical: 'Django', family: 'backend' },
  fastapi: { canonical: 'FastAPI', family: 'backend' },
  rails: { canonical: 'Rails', family: 'backend' },
  spring: { canonical: 'Spring', family: 'backend' },
  express: { canonical: 'Express', family: 'backend' },
  // AI / ML
  ai: { canonical: 'AI/ML', family: 'ai' },
  ml: { canonical: 'AI/ML', family: 'ai' },
  'machine-learning': { canonical: 'AI/ML', family: 'ai' },
  genai: { canonical: 'AI/ML', family: 'ai' },
  llm: { canonical: 'AI/ML', family: 'ai' },
  tensorflow: { canonical: 'TensorFlow', family: 'ai' },
  pytorch: { canonical: 'PyTorch', family: 'ai' },
  langchain: { canonical: 'LangChain', family: 'ai' },
  // Cloud
  aws: { canonical: 'AWS', family: 'cloud' },
  azure: { canonical: 'Azure', family: 'cloud' },
  gcp: { canonical: 'GCP', family: 'cloud' },
  // DevOps
  docker: { canonical: 'Docker', family: 'devops' },
  kubernetes: { canonical: 'Kubernetes', family: 'devops' },
  k8s: { canonical: 'Kubernetes', family: 'devops' },
  terraform: { canonical: 'Terraform', family: 'devops' },
  // Data
  sql: { canonical: 'SQL', family: 'data' },
  postgresql: { canonical: 'PostgreSQL', family: 'data' },
  postgres: { canonical: 'PostgreSQL', family: 'data' },
  mongodb: { canonical: 'MongoDB', family: 'data' },
  redis: { canonical: 'Redis', family: 'data' },
  kafka: { canonical: 'Kafka', family: 'data' },
  spark: { canonical: 'Spark', family: 'data' },
}

/* ───────────────────── etiquetas legibles para categorías ──────────────────── */

export const CATEGORY_LABELS = {
  programming: 'Software engineering',
  'sysadmin-devops-qa': 'DevOps / SRE / QA',
  engineering: 'Engineering',
  'data-science-analytics': 'Data & Analytics',
  'machine-learning-ai': 'ML / AI',
  design: 'Product / Design',
  product: 'Product',
  hr: 'HR / Recruiting',
}

/* ─────────────────────── normalización de seniority ──────────────────────── */

const SENIORITY_GROUPS = {
  Junior: ['Junior', 'Entry-level', 'Trainee'],
  Mid: ['Mid', 'Mid-level', 'Mid-Senior'],
  Senior: ['Senior'],
  Lead: ['Lead / Staff', 'Lead', 'Staff', 'Principal'],
  Executive: ['Director', 'Executive', 'VP', 'Head'],
}

export function groupSeniority(raw) {
  if (!raw || raw === 'Not specified') return 'Not specified'
  for (const [group, labels] of Object.entries(SENIORITY_GROUPS)) {
    if (labels.includes(raw)) return group
  }
  return raw
}

/* ───────────────────────── helpers de fecha ──────────────────────────────── */

export function startOfMonth(date) {
  const d = new Date(date)
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

export function monthKey(date) {
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(key, lang = 'es') {
  const [year, month] = key.split('-').map(Number)
  const months = lang === 'es'
    ? ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
    : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[month - 1]} ${String(year).slice(2)}`
}

/* ───────────────────── normalización de un job individual ────────────────── */

export function normalizeTechStack(rawArray) {
  if (!Array.isArray(rawArray)) return []
  const found = new Set()
  for (const raw of rawArray) {
    if (typeof raw !== 'string') continue
    const key = raw.toLowerCase().trim()
    const match = TECH_SYNONYMS[key]
    if (match) found.add(match.canonical)
  }
  return Array.from(found)
}

/* ────────────────────── agregaciones del dataset ─────────────────────────── */

/**
 * Devuelve top N stacks por count en un rango de jobs, con delta vs período anterior.
 */
export function topStacks(jobsCurrent, jobsPrev, limit = 12) {
  const countCurrent = new Map()
  const countPrev = new Map()

  for (const job of jobsCurrent) {
    for (const stack of normalizeTechStack(job.tech_stack)) {
      countCurrent.set(stack, (countCurrent.get(stack) || 0) + 1)
    }
  }
  for (const job of jobsPrev) {
    for (const stack of normalizeTechStack(job.tech_stack)) {
      countPrev.set(stack, (countPrev.get(stack) || 0) + 1)
    }
  }

  const result = []
  for (const [stack, n] of countCurrent.entries()) {
    const prev = countPrev.get(stack) || 0
    const family = Object.values(TECH_SYNONYMS).find(s => s.canonical === stack)?.family || 'other'
    result.push({
      stack,
      family,
      count: n,
      prev_count: prev,
      delta_pct: prev > 0 ? Math.round(((n - prev) / prev) * 100) : null,
      is_new: prev === 0 && n >= 5,
    })
  }
  return result.sort((a, b) => b.count - a.count).slice(0, limit)
}

/**
 * Devuelve tendencia mes a mes (últimos 6 meses) de un set de stacks.
 */
export function trendsByMonth(jobsAll, stacks, months = 6) {
  const buckets = new Map() // key: monthKey, value: Map(stack -> count)

  for (const job of jobsAll) {
    const mKey = monthKey(job.published_at)
    if (!buckets.has(mKey)) buckets.set(mKey, new Map())
    const bucket = buckets.get(mKey)
    for (const stack of normalizeTechStack(job.tech_stack)) {
      if (stacks.includes(stack)) {
        bucket.set(stack, (bucket.get(stack) || 0) + 1)
      }
    }
  }

  const sortedKeys = Array.from(buckets.keys()).sort().slice(-months)
  return {
    months: sortedKeys,
    series: stacks.map(stack => ({
      stack,
      values: sortedKeys.map(k => buckets.get(k)?.get(stack) || 0),
    })),
  }
}

/**
 * Distribución por dimensión (modality, seniority, category).
 */
export function distribution(jobs, field, mapFn = null) {
  const counts = new Map()
  for (const job of jobs) {
    let val = job[field]
    if (mapFn) val = mapFn(val)
    if (!val) val = 'unknown'
    counts.set(val, (counts.get(val) || 0) + 1)
  }
  const total = jobs.length || 1
  return Array.from(counts.entries())
    .map(([val, n]) => ({ value: val, count: n, pct: Math.round((n / total) * 100) }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Top empresas por jobs abiertos. Filtra ruido obvio.
 */
export function topCompanies(jobs, limit = 12) {
  const counts = new Map()
  for (const job of jobs) {
    const c = (job.company || '').trim()
    if (!c || c === 'Unknown' || c.length < 2) continue
    counts.set(c, (counts.get(c) || 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([company, n]) => ({ company, count: n }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

/**
 * Top países (de array `countries`).
 */
export function topCountries(jobs, limit = 10) {
  const counts = new Map()
  for (const job of jobs) {
    if (!Array.isArray(job.countries)) continue
    for (const c of job.countries) {
      if (!c || typeof c !== 'string') continue
      counts.set(c, (counts.get(c) || 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([country, n]) => ({ country, count: n }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
