import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Data Explorer — endpoint de introspección de tablas.
 * Usa la RPC `bondy_data_explorer_meta()` que existe en cada proyecto.
 * Funciona con anon key (no requiere service_role).
 */

const PROJECTS = {
  crm: {
    label: 'CRM (datos de negocio)',
    url:
      (process.env.SUPABASE_CRM_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co').trim(),
    key: (
      process.env.SUPABASE_CRM_SERVICE_KEY ||
      process.env.SUPABASE_CRM_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'
    ).trim(),
  },
  tools: {
    label: 'Bondy Tools (app)',
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    key: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  },
}

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
  if (!project.url || !project.key) {
    return NextResponse.json(
      { error: `Project "${projectKey}" missing env vars` },
      { status: 500 }
    )
  }

  // RPC: bondy_data_explorer_meta()
  const rpcRes = await fetch(`${project.url}/rest/v1/rpc/bondy_data_explorer_meta`, {
    method: 'POST',
    headers: {
      apikey: project.key,
      Authorization: `Bearer ${project.key}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: '{}',
    cache: 'no-store',
  })

  if (!rpcRes.ok) {
    const txt = await rpcRes.text()
    return NextResponse.json(
      { error: `RPC failed: ${rpcRes.status}`, detail: txt.slice(0, 300) },
      { status: 500 }
    )
  }

  const meta = await rpcRes.json()
  const rawTables = Array.isArray(meta) ? meta : []

  // Para cada tabla: conteo exacto via Range header
  const tables = await Promise.all(
    rawTables.map(async (t) => {
      const tableName = t.table_name
      const columns = (t.columns || []).map((c) => ({
        name: c.name,
        type: c.type || c.data_type || 'unknown',
        nullable: !!c.nullable,
        isPrimaryKey: !!c.is_pk,
        fk: c.fk && c.fk.table ? { table: c.fk.table, column: c.fk.column } : null,
      }))

      let rowCount = null
      try {
        const countRes = await fetch(
          `${project.url}/rest/v1/${encodeURIComponent(tableName)}?select=*&limit=1`,
          {
            headers: {
              apikey: project.key,
              Authorization: `Bearer ${project.key}`,
              Prefer: 'count=exact',
              Range: '0-0',
            },
            cache: 'no-store',
          }
        )
        const cr = countRes.headers.get('content-range')
        if (cr) {
          const parts = cr.split('/')
          if (parts[1] && parts[1] !== '*') rowCount = parseInt(parts[1])
        }
      } catch {
        rowCount = null
      }

      return {
        name: tableName,
        comment: t.comment || null,
        columns,
        rowCount,
        group: projectKey === 'crm' ? groupForCrm(tableName) : 'Tools',
      }
    })
  )

  return NextResponse.json({
    project: projectKey,
    label: project.label,
    tables,
  })
}
