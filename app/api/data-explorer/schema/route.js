import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Data Explorer — schema on-demand para una tabla.
 * Cuando no hay service_role para introspección via OpenAPI, este endpoint
 * descubre las columnas de una tabla pidiendo 1 fila y leyendo las keys
 * + tipos inferidos del valor.
 */

const PROJECTS = {
  crm: {
    url:
      (process.env.SUPABASE_CRM_URL || 'https://tchppyxhapxtjemxrbqm.supabase.co').trim(),
    serviceKey: (
      process.env.SUPABASE_CRM_SERVICE_KEY ||
      process.env.SUPABASE_CRM_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRjaHBweXhoYXB4dGplbXhyYnFtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5MzE5NTUsImV4cCI6MjA4NzUwNzk1NX0.GwH_UZV_62cOkd8x1UknkajQVk1eDosLL0DkV8hsjhw'
    ).trim(),
  },
  tools: {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim(),
    serviceKey: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
  },
}

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

function inferType(value) {
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'numeric'
  }
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'object') return 'jsonb'
  if (typeof value === 'string') {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return 'uuid'
    }
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)) return 'timestamp'
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'date'
    return 'text'
  }
  return 'unknown'
}

/**
 * Intento 1: RPC public.data_explorer_columns(p_table) — lee information_schema
 * con SECURITY DEFINER. Funciona aún si la tabla está vacía o RLS bloquea SELECT.
 * Disponible sólo en el proyecto CRM (no en tools).
 */
async function fetchColumnsViaRpc(project, table) {
  const res = await fetch(`${project.url}/rest/v1/rpc/data_explorer_columns`, {
    method: 'POST',
    headers: {
      apikey: project.serviceKey,
      Authorization: `Bearer ${project.serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ p_table: table }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const rows = await res.json()
  if (!Array.isArray(rows) || rows.length === 0) return null
  return rows.map((r) => ({
    name: r.column_name,
    type: r.udt_name || r.data_type || 'unknown',
    nullable: r.is_nullable === 'YES',
    isPrimaryKey: !!r.is_primary_key,
    fk: r.fk_table ? { table: r.fk_table, column: r.fk_column } : null,
    enum: null,
  }))
}

export async function GET(request) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const projectKey = searchParams.get('project') || 'crm'
  const table = searchParams.get('table')
  const project = PROJECTS[projectKey]

  if (!table) return NextResponse.json({ error: 'Missing table' }, { status: 400 })
  if (!project?.url || !project?.serviceKey) {
    return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  }

  // Intento 1: RPC contra information_schema (sólo proyecto CRM).
  if (projectKey === 'crm') {
    const columns = await fetchColumnsViaRpc(project, table)
    if (columns && columns.length > 0) {
      return NextResponse.json({ columns, empty: false, source: 'information_schema' })
    }
  }

  // Intento 2: sample de 1 fila e inferencia heurística.
  const res = await fetch(
    `${project.url}/rest/v1/${encodeURIComponent(table)}?select=*&limit=1`,
    {
      headers: {
        apikey: project.serviceKey,
        Authorization: `Bearer ${project.serviceKey}`,
      },
      cache: 'no-store',
    }
  )

  if (!res.ok) {
    const detail = await res.text()
    return NextResponse.json(
      { error: `Schema fetch failed: ${res.status}`, detail: detail.slice(0, 300) },
      { status: 500 }
    )
  }

  const data = await res.json()
  if (!Array.isArray(data) || data.length === 0) {
    return NextResponse.json({
      columns: [],
      empty: true,
      note: 'Tabla vacía o sin acceso de lectura, y la RPC information_schema no devolvió columnas.',
    })
  }

  const sample = data[0]
  const columns = Object.entries(sample).map(([name, value]) => ({
    name,
    type: inferType(value),
    nullable: true,
    isPrimaryKey: name === 'id' || name === 'uuid',
    fk: null,
    enum: null,
  }))

  return NextResponse.json({ columns, empty: false, source: 'sample' })
}
