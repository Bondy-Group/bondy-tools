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

  // Pedir 1 fila para inferir columnas
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
    // Tabla vacía → no podemos inferir
    return NextResponse.json({
      columns: [],
      empty: true,
      note: 'Tabla vacía, no se puede inferir schema sin service_role.',
    })
  }

  const sample = data[0]
  const columns = Object.entries(sample).map(([name, value]) => ({
    name,
    type: inferType(value),
    nullable: true, // no podemos saberlo sin OpenAPI
    isPrimaryKey: name === 'id' || name === 'uuid', // heurística mínima
    fk: null,
    enum: null,
  }))

  return NextResponse.json({ columns, empty: false, sampledFromRow: true })
}
