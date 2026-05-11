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
      return {
        name,
        columns,
        rowCount,
        group: groupForTable(projectKey, name),
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
