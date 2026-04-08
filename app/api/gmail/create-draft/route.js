import { NextResponse } from 'next/server'
import { getValidAccessToken, createGmailDraft } from '@/lib/gmail'

const REX_INTERNAL_SECRET = process.env.REX_INTERNAL_SECRET || 'rex-bondy-internal'

/**
 * POST /api/gmail/create-draft
 *
 * Crea un borrador en el Gmail de cualquier recruiter de Bondy.
 * Autenticado con x-rex-secret (solo para uso interno de Rex).
 *
 * Body: { recruiter_email, to, subject, html_body }
 * Respuesta: { ok: true, draft_id, message }
 */
export async function POST(req) {
  // Auth interna — solo Rex puede llamar este endpoint
  const secret = req.headers.get('x-rex-secret')
  if (secret !== REX_INTERNAL_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { recruiter_email, to, subject, html_body } = body

  if (!recruiter_email || !to || !subject || !html_body) {
    return NextResponse.json(
      { error: 'Campos requeridos: recruiter_email, to, subject, html_body' },
      { status: 400 }
    )
  }

  // Obtener access token válido del recruiter
  let accessToken
  try {
    accessToken = await getValidAccessToken(recruiter_email)
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 404 })
  }

  // Crear draft en el Gmail del recruiter
  let draft
  try {
    draft = await createGmailDraft(accessToken, to, subject, html_body)
  } catch (err) {
    console.error('[gmail/create-draft] Error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }

  console.log(`[gmail/create-draft] Draft creado para ${recruiter_email} → ${to} | draft_id=${draft.id}`)

  return NextResponse.json({
    ok: true,
    draft_id: draft.id,
    message: `Draft creado en el Gmail de ${recruiter_email}`,
  })
}
