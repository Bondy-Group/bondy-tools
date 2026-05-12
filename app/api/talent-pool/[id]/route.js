/**
 * GET    /api/talent-pool/[id]   — fetch one + edit history
 * PATCH  /api/talent-pool/[id]   — admin update (notes, status, internal_tags, etc.)
 * DELETE /api/talent-pool/[id]   — hard delete (cuidado)
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getTalent, updateTalent, deleteTalent, listTalentEdits } from '@/lib/talent-pool'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_EMAILS = ['mara@wearebondy.com', 'lucia@wearebondy.com']

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  const email = (session?.user?.email || '').toLowerCase()
  if (!email || !ADMIN_EMAILS.includes(email)) return { ok: false }
  return { ok: true, email }
}

export async function GET(_req, { params }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const talent = await getTalent(params.id)
  if (!talent) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  const edits = await listTalentEdits(params.id)
  return NextResponse.json({ ok: true, talent, edits })
}

export async function PATCH(req, { params }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  let body
  try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }) }

  // Admin puede editar más cosas que el candidato. Acepto todos los campos editables + notes/status/tags.
  const ADMIN_FIELDS = [
    'name', 'linkedin_url',
    'current_position', 'current_company', 'years_experience',
    'location_city', 'location_country',
    'primary_area', 'seniority', 'skills',
    'modality_preference', 'english_level', 'spanish_level',
    'open_to_relocate', 'willing_to_travel',
    'desired_salary_amount', 'desired_salary_currency', 'desired_salary_period', 'desired_salary_notes',
    'available_from', 'notice_period', 'contract_preference',
    'pitch',
    // Admin-only:
    'status', 'notes', 'internal_tags',
  ]

  const patch = {}
  for (const k of ADMIN_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, k)) patch[k] = body[k]
  }
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 })
  }

  const result = await updateTalent(params.id, patch)
  if (!result.ok) return NextResponse.json({ error: 'update_failed' }, { status: 500 })
  return NextResponse.json({ ok: true, talent: result.talent })
}

export async function DELETE(_req, { params }) {
  const auth = await requireAdmin()
  if (!auth.ok) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  const ok = await deleteTalent(params.id)
  if (!ok) return NextResponse.json({ error: 'delete_failed' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
