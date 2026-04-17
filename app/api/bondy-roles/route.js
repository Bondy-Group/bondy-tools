export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import {
  requireJobBoardAdmin,
  supabaseHeaders,
  supabaseUrl,
  slugify,
  uniqueSlug,
  nextPositionNumber,
} from '@/lib/job-board'

/**
 * GET /api/bondy-roles
 * Query params (all optional): status, seniority, role_category, modality, q (search on title/client_name)
 */
export async function GET(req) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const { searchParams } = new URL(req.url)
  const filters = []
  const status = searchParams.get('status')
  const seniority = searchParams.get('seniority')
  const category = searchParams.get('role_category')
  const modality = searchParams.get('modality')
  const q = searchParams.get('q')

  if (status) filters.push(`status=eq.${encodeURIComponent(status)}`)
  if (seniority) filters.push(`seniority=eq.${encodeURIComponent(seniority)}`)
  if (category) filters.push(`role_category=eq.${encodeURIComponent(category)}`)
  if (modality) filters.push(`modality=eq.${encodeURIComponent(modality)}`)
  if (q) {
    const esc = q.replace(/[%,]/g, '').trim()
    if (esc) filters.push(`or=(title.ilike.*${encodeURIComponent(esc)}*,client_name.ilike.*${encodeURIComponent(esc)}*)`)
  }
  filters.push('order=position_number.desc')
  filters.push('select=*')

  const url = `${supabaseUrl()}/rest/v1/bondy_roles?${filters.join('&')}`
  const res = await fetch(url, { headers: supabaseHeaders(), cache: 'no-store' })
  if (!res.ok) {
    const err = await res.text()
    console.error('[bondy-roles GET] supabase error', res.status, err)
    return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  }
  const rows = await res.json()
  return NextResponse.json({ roles: rows })
}

/**
 * POST /api/bondy-roles
 * Body: any subset of role fields. Required: title.
 */
export async function POST(req) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const title = String(body.title || '').trim()
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  const slug = await uniqueSlug(body.slug || title)
  const position_number = await nextPositionNumber()

  const payload = {
    position_number,
    slug,
    title,
    status: body.status || 'draft',
    seniority: body.seniority || null,
    role_category: body.role_category || null,
    client_name: body.client_name || null,
    client_blurb: body.client_blurb || null,
    client_visible: !!body.client_visible,
    about_client: body.about_client || null,
    tech_stack: Array.isArray(body.tech_stack) ? body.tech_stack : [],
    modality: body.modality || null,
    location: body.location || null,
    countries: Array.isArray(body.countries) ? body.countries : [],
    english_level: body.english_level || null,
    description_role: body.description_role || null,
    description_requirements: body.description_requirements || null,
    description_process: body.description_process || null,
    benefits: Array.isArray(body.benefits) ? body.benefits : [],
    min_salary_usd: body.min_salary_usd ?? null,
    max_salary_usd: body.max_salary_usd ?? null,
    salary_currency: body.salary_currency || 'USD',
    salary_visible: !!body.salary_visible,
    salary_note: body.salary_note || null,
    is_featured: !!body.is_featured,
    created_by: guard.email,
    updated_by: guard.email,
  }
  if (payload.status === 'published') {
    payload.published_at = new Date().toISOString()
  }

  const insertRes = await fetch(`${supabaseUrl()}/rest/v1/bondy_roles`, {
    method: 'POST',
    headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
    body: JSON.stringify(payload),
  })
  if (!insertRes.ok) {
    const err = await insertRes.text()
    console.error('[bondy-roles POST] supabase error', insertRes.status, err)
    return NextResponse.json({ error: 'Could not create role' }, { status: 500 })
  }
  const rows = await insertRes.json()
  return NextResponse.json({ role: rows[0] }, { status: 201 })
}
