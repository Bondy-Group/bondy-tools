import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Data Explorer — endpoint de listado de tablas.
 *
 * Estrategia:
 *  1. Intenta el OpenAPI spec en /rest/v1/ (requiere service_role).
 *     Si funciona: devuelve tablas + columnas + FK detection completa.
 *  2. Si OpenAPI falla con 401 (anon key only): fallback con catálogo
 *     hardcoded por proyecto + count via anon. Las columnas se piden
 *     bajo demanda desde /api/data-explorer/schema.
 */

const PROJECTS = {
  crm: {
    label: 'CRM (datos de negocio)',
    url:
      (process.env.SUPABASE_CRM_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co').trim(),
    serviceKey: (
      process.env.SUPABASE_CRM_SERVICE_KEY ||
      process.env.SUPABASE_CRM_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'
    ).trim(),
  },
  tools: {
    label: 'Bondy Tools (app)',
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    serviceKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  },
}

const CRM_CATALOG = {
  'Bondy Master DB': [
    'bondy_clients',
    'bondy_candidates',
    'bondy_searches',
    'bondy_timeline',
    'bondy_candidate_searches',
    'bondy_roles',
    'bondy_applications',
  ],
  'Airtable mirror': ['Accounts', 'Contacts', 'Opportunities'],
  Operacional: [
    'placements',
    'oportunidades_hold',
    'clientes_reactivacion_drive',
    'payments',
  ],
  'Outreach & Leads': [
    'outreach_contacts',
    'contact_leads',
    'Interactions',
    'warm_leads',
    'lead_dossiers',
    'sourcing_pipeline',
    'potential_clients',
    'referrals',
  ],
  'Jobs & Market': ['jobs', 'market_signals', 'job_applications'],
  ATS: [
    'ats_users',
    'ats_user_invites',
    'ats_notifications',
    'interview_reports',
    'clients',
    'client_scorecards',
    'candidates',
    'interviews',
    'question_bank',
  ],
  Sistema: ['gmail_tokens', 'newsletter_subscribers'],
}

const TOOLS_CATALOG = {
  Tools: [
    'proposals',
    'clients',
    'cultural_profiles',
    'processes',
    'candidates',
    'candidate_processes',
    'potential_clients',
    'ats_users',
    'ats_user_invites',
    'ats_notifications',
    'tool_usage',
  ],
}

function groupForTable(projectKey, tableName) {
  const catalog = projectKey === 'crm' ? CRM_CATALOG : TOOLS_CATALOG
  for (const [group, list] of Object.entries(catalog)) {
    if (list.includes(tableName)) return group
  }
  return 'Otros'
}

/**
 * Origen de los datos de cada tabla (de dónde se cargan / actualizan).
 * Si una tabla no está acá, se infiere por el group de su catálogo (fallback).
 *
 * Cada entrada: { label, detail }
 *  - label: string corto para el pill (ej. "Airtable", "Mercury")
 *  - detail: tooltip largo (ej. "ETL desde base Airtable appx2N… cada 6h")
 */
const TABLE_SOURCES = {
  // Bondy Master DB → ETL desde Airtable + placements
  bondy_clients: { label: 'ETL Airtable', detail: 'ETL desde Airtable (Accounts) + Mercury para flags financieros' },
  bondy_candidates: { label: 'ETL Airtable', detail: 'ETL desde Airtable (BASE General) — ~40k perfiles' },
  bondy_searches: { label: 'ETL Airtable', detail: 'ETL desde Airtable (Opportunities)' },
  bondy_timeline: { label: 'ETL Airtable', detail: 'Derivado de Airtable + placements + eventos manuales' },
  bondy_candidate_searches: { label: 'ETL Airtable', detail: 'Tabla puente derivada de Opportunities ↔ Base General' },
  bondy_roles: { label: 'ETL Airtable', detail: 'Derivado de Opportunities (Airtable)' },
  bondy_applications: { label: 'ETL Airtable', detail: 'Derivado de Airtable + ATS interna' },

  // Mirror directo de Airtable
  Accounts: { label: 'Airtable', detail: 'Mirror directo de Airtable · Registro Comercial (appx2N660HZRJhWN5)' },
  Contacts: { label: 'Airtable', detail: 'Mirror directo de Airtable · Contacts en empresas cliente' },
  Opportunities: { label: 'Airtable', detail: 'Mirror directo de Airtable · ⚠️ fees frecuentemente en cero, NO usar para finanzas' },

  // Operacional
  placements: { label: 'Manual / seed', detail: 'Carga manual del equipo · fuente autoritativa de placements históricos' },
  oportunidades_hold: { label: 'Manual', detail: 'Carga manual · oportunidades pausadas o en hold' },
  clientes_reactivacion_drive: { label: 'Google Drive', detail: '97 ex-clientes extraídos de SCHMITMAN HR (Inactivos + Empresas Inactivas)' },
  payments: { label: 'Mercury', detail: 'Pagos/cobros desde Mercury (fuente autoritativa de finanzas)' },

  // Outreach & Leads
  outreach_contacts: { label: 'Apollo + scrapers', detail: 'Contactos enriquecidos en Apollo por bondy-morning-prospecting + lead-generator' },
  contact_leads: { label: 'Form web', detail: 'Leads entrantes del form de wearebondy.com · dispara notify-new-lead' },
  Interactions: { label: 'Agentes outbound', detail: 'Logging de outreach B2B por agentes (lead-generator, sourcer, press)' },
  warm_leads: { label: 'Mixto', detail: 'Combinación de contact_leads + outreach con engagement' },
  lead_dossiers: { label: 'Enriquecimiento', detail: 'Dossiers generados por bondy-prospect-enrichment (Apollo + web research)' },
  sourcing_pipeline: { label: 'Sourcer', detail: 'Pipeline activo de candidatos por search · poblado por bondy-sourcer' },
  potential_clients: { label: 'Manual + agentes', detail: 'Empresas en evaluación · alimentado por Mara + agentes de prospecting' },
  referrals: { label: 'Manual', detail: 'Referidos del equipo y network' },

  // Jobs & Market
  jobs: { label: 'Scraper (7 fuentes)', detail: 'bondy-job-scraper · GetOnBoard, YC, Remotive, Himalayas, WWR, Greenhouse, Lever' },
  market_signals: { label: 'Scraper + web', detail: 'Señales de mercado (layoffs, rondas, hiring spikes) recolectadas por agentes' },
  job_applications: { label: 'Form web', detail: 'Aplicaciones desde /busco-trabajo (tools.wearebondy.com)' },

  // ATS
  ats_users: { label: 'ATS app', detail: 'Usuarios internos del ATS de Bondy' },
  ats_user_invites: { label: 'ATS app', detail: 'Invitaciones a usuarios del ATS' },
  ats_notifications: { label: 'ATS app', detail: 'Notificaciones in-app del ATS' },
  interview_reports: { label: 'ATS app', detail: 'Reports de entrevistas cargados desde la ATS' },
  clients: { label: 'ATS app', detail: 'Clientes en la ATS (separado del CRM)' },
  client_scorecards: { label: 'ATS app', detail: 'Scorecards de evaluación definidas por cliente' },
  candidates: { label: 'ATS app', detail: 'Candidatos cargados en la ATS' },
  interviews: { label: 'ATS app', detail: 'Entrevistas agendadas en la ATS' },
  question_bank: { label: 'ATS app', detail: 'Banco de preguntas para entrevistas' },

  // Sistema
  gmail_tokens: { label: 'Gmail OAuth', detail: 'Tokens de Gmail OAuth (mara@wearebondy.com) — usados por send-draft flow' },
  newsletter_subscribers: { label: 'Form web', detail: 'Suscriptores a digest semanal /busco-trabajo + recursos-recruiters' },
}

const GROUP_SOURCE_FALLBACK = {
  'Bondy Master DB': { label: 'ETL Airtable', detail: 'Derivada del ETL desde Airtable' },
  'Airtable mirror': { label: 'Airtable', detail: 'Mirror desde Airtable' },
  Operacional: { label: 'Manual', detail: 'Carga manual del equipo' },
  'Outreach & Leads': { label: 'Agentes / web', detail: 'Generada por agentes o forms del sitio' },
  'Jobs & Market': { label: 'Scrapers', detail: 'Datos externos recolectados por scrapers' },
  ATS: { label: 'ATS app', detail: 'Usada por la ATS interna' },
  Sistema: { label: 'Sistema', detail: 'Tabla de sistema / infraestructura' },
  Tools: { label: 'Tools app', detail: 'Tabla operativa de la app tools.wearebondy.com' },
  Otros: { label: 'Supabase', detail: 'Origen no documentado en el explorador' },
}

function sourceForTable(projectKey, tableName, group) {
  if (TABLE_SOURCES[tableName]) return TABLE_SOURCES[tableName]
  return GROUP_SOURCE_FALLBACK[group] || GROUP_SOURCE_FALLBACK.Otros
}

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

async function countRows(project, tableName, projectKey) {
  // Intento 1: RPC bypass-RLS (sólo CRM)
  if (projectKey === 'crm') {
    try {
      const res = await fetch(`${project.url}/rest/v1/rpc/data_explorer_count`, {
        method: 'POST',
        headers: {
          apikey: project.serviceKey,
          Authorization: `Bearer ${project.serviceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_table: tableName }),
        cache: 'no-store',
      })
      if (res.ok) {
        const n = await res.json()
        if (typeof n === 'number') return n
      }
    } catch {}
  }

  // Intento 2: REST con Prefer count=exact (falla con RLS para anon)
  try {
    const res = await fetch(
      `${project.url}/rest/v1/${encodeURIComponent(tableName)}?select=*&limit=1`,
      {
        headers: {
          apikey: project.serviceKey,
          Authorization: `Bearer ${project.serviceKey}`,
          Prefer: 'count=exact',
          Range: '0-0',
        },
        cache: 'no-store',
      }
    )
    const cr = res.headers.get('content-range')
    if (cr) {
      const parts = cr.split('/')
      if (parts[1] && parts[1] !== '*') return parseInt(parts[1])
    }
  } catch {}
  return null
}

async function tryOpenApiIntrospection(project, projectKey) {
  const specRes = await fetch(`${project.url}/rest/v1/`, {
    headers: {
      apikey: project.serviceKey,
      Authorization: `Bearer ${project.serviceKey}`,
      Accept: 'application/openapi+json',
    },
    cache: 'no-store',
  })
  if (!specRes.ok) {
    return { ok: false, status: specRes.status }
  }
  const spec = await specRes.json()
  const defs = spec.definitions || {}
  const tableNames = Object.keys(defs).sort()

  const tables = await Promise.all(
    tableNames.map(async (name) => {
      const def = defs[name]
      const props = def.properties || {}
      const columns = Object.entries(props).map(([colName, meta]) => {
        const description = meta.description || ''
        const fkMatch = description.match(/Foreign Key to `([^.]+)\.([^`]+)`/)
        return {
          name: colName,
          type: meta.format || meta.type || 'unknown',
          nullable: !(def.required || []).includes(colName),
          isPrimaryKey: /<pk\/>/.test(description),
          fk: fkMatch ? { table: fkMatch[1], column: fkMatch[2] } : null,
          enum: meta.enum || null,
        }
      })
      const rowCount = await countRows(project, name, projectKey)
      const group = groupForTable(projectKey, name)
      return {
        name,
        columns,
        rowCount,
        group,
        source: sourceForTable(projectKey, name, group),
        introspected: true,
      }
    })
  )

  return { ok: true, tables }
}

async function buildFallbackCatalog(project, projectKey) {
  const catalog = projectKey === 'crm' ? CRM_CATALOG : TOOLS_CATALOG
  const allTables = []
  for (const [group, names] of Object.entries(catalog)) {
    for (const name of names) {
      allTables.push({ name, group })
    }
  }
  const tables = await Promise.all(
    allTables.map(async ({ name, group }) => {
      const rowCount = await countRows(project, name, projectKey)
      return {
        name,
        columns: [],
        rowCount,
        group,
        source: sourceForTable(projectKey, name, group),
        introspected: false,
      }
    })
  )
  return tables
}

export async function GET(request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectKey = searchParams.get('project') || 'crm'
  const project = PROJECTS[projectKey]
  if (!project) {
    return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  }
  if (!project.url || !project.serviceKey) {
    return NextResponse.json(
      { error: `Project "${projectKey}" missing env vars` },
      { status: 500 }
    )
  }

  const intro = await tryOpenApiIntrospection(project, projectKey)
  if (intro.ok) {
    return NextResponse.json({
      project: projectKey,
      label: project.label,
      tables: intro.tables,
      introspectionMode: 'openapi',
    })
  }

  const tables = await buildFallbackCatalog(project, projectKey)
  return NextResponse.json({
    project: projectKey,
    label: project.label,
    tables,
    introspectionMode: 'fallback',
    introspectionWarning:
      `service_role no disponible (HTTP ${intro.status}). Schema completo de cada tabla se descubre al abrirla.`,
  })
}
