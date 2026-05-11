import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Data Explorer — endpoint de query de filas.
 *
 * Estrategia:
 *  1) RPC `data_explorer_rows` (sólo CRM): bypassa RLS via SECURITY DEFINER,
 *     valida tabla y columnas contra information_schema. Soporta filtros,
 *     sort y paginación.
 *  2) Fallback PostgREST: para `tools` project o si la RPC falla.
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

const ALLOWED_OPS = new Set([
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
])

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

async function queryViaRpc(project, { table, page, pageSize, sortCol, sortDir, filters }) {
  const res = await fetch(`${project.url}/rest/v1/rpc/data_explorer_rows`, {
    method: 'POST',
    headers: {
      apikey: project.serviceKey,
      Authorization: `Bearer ${project.serviceKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_table: table,
      p_page: page,
      p_page_size: pageSize,
      p_sort_col: sortCol,
      p_sort_dir: sortDir,
      p_filters: filters,
    }),
    cache: 'no-store',
  })
  if (!res.ok) return null
  const json = await res.json()
  if (!json || typeof json !== 'object') return null
  return json
}

async function queryViaRest(project, { table, page, pageSize, sortCol, sortDir, filters }) {
  const params = new URLSearchParams()
  params.set('select', '*')
  if (sortCol) params.set('order', `${sortCol}.${sortDir}.nullslast`)

  for (const f of filters) {
    if (!f?.col || !f?.op || !ALLOWED_OPS.has(f.op)) continue
    let val = f.val
    if (f.op === 'ilike' || f.op === 'like') {
      val = `*${String(val ?? '')}*`
    }
    params.append(f.col, `${f.op}.${val}`)
  }

  const offset = (page - 1) * pageSize
  const url = `${project.url}/rest/v1/${encodeURIComponent(table)}?${params.toString()}`

  const res = await fetch(url, {
    headers: {
      apikey: project.serviceKey,
      Authorization: `Bearer ${project.serviceKey}`,
      Prefer: 'count=exact',
      Range: `${offset}-${offset + pageSize - 1}`,
      'Range-Unit': 'items',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    const detail = await res.text()
    return { error: `Query failed: ${res.status}`, detail: detail.slice(0, 400) }
  }

  const data = await res.json()
  const cr = res.headers.get('content-range')
  let totalCount = null
  if (cr) {
    const parts = cr.split('/')
    if (parts[1] && parts[1] !== '*') totalCount = parseInt(parts[1])
  }

  return { data, totalCount }
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
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const pageSize = Math.min(200, Math.max(10, parseInt(searchParams.get('pageSize') || '50')))
  const sortCol = searchParams.get('sort') || null
  const sortDir = (searchParams.get('dir') || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc'

  let filters = []
  const filtersRaw = searchParams.get('filters')
  if (filtersRaw) {
    try {
      filters = JSON.parse(filtersRaw)
    } catch {}
  }

  if (!table) return NextResponse.json({ error: 'Missing table' }, { status: 400 })
  const project = PROJECTS[projectKey]
  if (!project?.url || !project?.serviceKey) {
    return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  }

  const args = { table, page, pageSize, sortCol, sortDir, filters }

  // Intento 1: RPC bypass-RLS (sólo proyecto CRM).
  if (projectKey === 'crm') {
    const rpc = await queryViaRpc(project, args)
    if (rpc && Array.isArray(rpc.data)) {
      const totalCount = typeof rpc.totalCount === 'number' ? rpc.totalCount : null
      return NextResponse.json({
        data: rpc.data,
        totalCount,
        page,
        pageSize,
        totalPages: totalCount != null ? Math.ceil(totalCount / pageSize) : null,
        source: 'rpc',
      })
    }
  }

  // Intento 2: PostgREST estándar
  const rest = await queryViaRest(project, args)
  if (rest.error) {
    return NextResponse.json({ error: rest.error, detail: rest.detail }, { status: 500 })
  }
  return NextResponse.json({
    data: rest.data,
    totalCount: rest.totalCount,
    page,
    pageSize,
    totalPages: rest.totalCount != null ? Math.ceil(rest.totalCount / pageSize) : null,
    source: 'rest',
  })
}
