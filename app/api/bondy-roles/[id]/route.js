export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import {
  requireJobBoardAdmin,
  supabaseHeaders,
  supabaseUrl,
  uniqueSlug,
} from '@/lib/job-board'

const EDITABLE_FIELDS = [
  'title', 'status', 'seniority', 'role_category',
  'client_name', 'client_blurb', 'client_visible', 'about_client',
  'tech_stack', 'modality', 'location', 'countries', 'english_level',
  'description_role', 'description_requirements', 'description_process',
  'benefits', 'min_salary_usd', 'max_salary_usd', 'salary_currency',
  'salary_visible', 'salary_note', 'is_featured',
]

// Columns that have CHECK constraints and reject empty string ''.
// Empty strings coming from unselected dropdowns must be normalized to null.
const NULLABLE_ENUM_FIELDS = ['seniority', 'role_category', 'modality', 'english_level']

/** GET /api/bondy-roles/[id] — single role (any status, admin only) */
export async function GET(_req, { params }) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  const res = await fetch(
    `${supabaseUrl()}/rest/v1/bondy_roles?id=eq.${encodeURIComponent(params.id)}&select=*&limit=1`,
    { headers: supabaseHeaders(), cache: 'no-store' }
  )
  if (!res.ok) return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  const rows = await res.json()
  if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ role: rows[0] })
}

/** PATCH /api/bondy-roles/[id] — update. Use { status: 'closed' } for soft delete. */
export async function PATCH(req, { params }) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Build update payload (only editable fields)
  const update = {}
  for (const field of EDITABLE_FIELDS) {
    if (field in body) update[field] = body[field]
  }

  // Normalize empty strings to null for enum-constrained columns.
  // Supabase CHECK constraints reject '' on seniority/role_category/modality/english_level,
  // which would otherwise surface to the admin UI as a generic "Save failed".
  for (const field of NULLABLE_ENUM_FIELDS) {
    if (field in update && update[field] === '') update[field] = null
  }

  // Validate status transitions
  if ('status' in update) {
    const valid = ['draft', 'published', 'closed']
    if (!valid.includes(update.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
  }

  // Fetch current role to compare
  const curRes = await fetch(
    `${supabaseUrl()}/rest/v1/bondy_roles?id=eq.${encodeURIComponent(params.id)}&select=status,published_at,closed_at,slug,title&limit=1`,
    { headers: supabaseHeaders(), cache: 'no-store' }
  )
  if (!curRes.ok) return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
  const curRows = await curRes.json()
  if (!curRows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const current = curRows[0]

  // Timestamps on status transitions
  if ('status' in update) {
    if (update.status === 'published' && current.status !== 'published') {
      update.published_at = update.published_at ?? new Date().toISOString()
    }
    if (update.status === 'closed' && current.status !== 'closed') {
      update.closed_at = new Date().toISOString()
    }
  }

  // If slug being changed, ensure it is unique
  if ('slug' in body && body.slug && body.slug !== current.slug) {
    update.slug = await uniqueSlug(body.slug, params.id)
  } else if ('title' in update && !body.keep_slug && update.title !== current.title) {
    // Auto-rebuild slug if title changed and caller did not pass keep_slug
    // only if slug wasn't explicitly set; leave slug stable unless asked
  }

  update.updated_by = guard.email
  update.updated_at = new Date().toISOString()

  const res = await fetch(
    `${supabaseUrl()}/rest/v1/bondy_roles?id=eq.${encodeURIComponent(params.id)}`,
    {
      method: 'PATCH',
      headers: { ...supabaseHeaders(), Prefer: 'return=representation' },
      body: JSON.stringify(update),
    }
  )
  if (!res.ok) {
    const err = await res.text()
    console.error('[bondy-roles PATCH] supabase error', res.status, err)
    return NextResponse.json({ error: 'Could not update role' }, { status: 500 })
  }
  const rows = await res.json()
  return NextResponse.json({ role: rows[0] })
}
