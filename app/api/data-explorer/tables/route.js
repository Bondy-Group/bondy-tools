import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Data Explorer — endpoint de introspección de tablas.
 * Lee el OpenAPI spec que Supabase expone en /rest/v1/ para descubrir
 * tablas + columnas sin necesidad de queries SQL directas.
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

// Agrupación visual de tablas del CRM (criterio de Dana)
const CRM_GROUPS = {
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
  'Operacional': [
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
  'ATS': [
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
  'Sistema': ['gmail_tokens', 'newsletter_subscribers'],
}

function groupForCrm(tableName) {
  for (const [group, list] of Object.entries(CRM_GROUPS)) {
    if (list.includes(tableName)) return group
  }
  return 'Otros'
}

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

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

  // Supabase expone OpenAPI 2.0 en /rest/v1/?
  const specRes = await fetch(`${project.url}/rest/v1/`, {
    headers: {
      apikey: project.serviceKey,
      Authorization: `Bearer ${project.serviceKey}`,
      Accept: 'application/openapi+json',
    },
    cache: 'no-store',
  })
  if (!specRes.ok) {
    const txt = await specRes.text()
    return NextResponse.json(
      { error: `OpenAPI fetch failed: ${specRes.status}`, detail: txt.slice(0, 200) },
      { status: 500 }
    )
  }
  const spec = await specRes.json()

  // spec.definitions tiene cada tabla; cada definición tiene `properties`
  const defs = spec.definitions || {}
  const tableNames = Object.keys(defs).sort()

  const tables = await Promise.all(
    tableNames.map(async (name) => {
      const def = defs[name]
      const props = def.properties || {}
      const columns = Object.entries(props).map(([colName, meta]) => {
        // meta.format viene de pg (e.g. "uuid", "timestamp with time zone")
        // meta.type es el tipo OpenAPI (string, integer, etc.)
        const description = meta.description || ''
        // FK detection: descripción suele incluir "Note:\nThis is a Foreign Key to `table.col`"
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

      // Conteo exacto via count head
      let rowCount = null
      try {
        const countRes = await fetch(
          `${project.url}/rest/v1/${encodeURIComponent(name)}?select=*&limit=1`,
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
        const cr = countRes.headers.get('content-range') // "0-0/123"
        if (cr) {
          const parts = cr.split('/')
          if (parts[1] && parts[1] !== '*') rowCount = parseInt(parts[1])
        }
      } catch {
        rowCount = null
      }

      return {
        name,
        columns,
        rowCount,
        group: projectKey === 'crm' ? groupForCrm(name) : 'Tools',
      }
    })
  )

  return NextResponse.json({
    project: projectKey,
    label: project.label,
    tables,
  })
}
