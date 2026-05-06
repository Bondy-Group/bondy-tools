import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * Data Explorer — endpoint de query de filas.
 * Soporta filtros, sort y paginación a través del REST API de Supabase
 * (PostgREST), por lo que cualquier columna y operador estándar funciona.
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

  // filters viene como JSON [{col, op, val}]
  let filters = []
  const filtersRaw = searchParams.get('filters')
  if (filtersRaw) {
    try {
      filters = JSON.parse(filtersRaw)
    } catch {}
  }

  if (!table) {
    return NextResponse.json({ error: 'Missing table' }, { status: 400 })
  }
  const project = PROJECTS[projectKey]
  if (!project?.url || !project?.serviceKey) {
    return NextResponse.json({ error: 'Invalid project' }, { status: 400 })
  }

  // Construir URL PostgREST
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
    return NextResponse.json(
      { error: `Query failed: ${res.status}`, detail: detail.slice(0, 400) },
      { status: 500 }
    )
  }

  const data = await res.json()
  const cr = res.headers.get('content-range') // "0-49/12345"
  let totalCount = null
  if (cr) {
    const parts = cr.split('/')
    if (parts[1] && parts[1] !== '*') totalCount = parseInt(parts[1])
  }

  return NextResponse.json({
    data,
    totalCount,
    page,
    pageSize,
    totalPages: totalCount != null ? Math.ceil(totalCount / pageSize) : null,
  })
}
