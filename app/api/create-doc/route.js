import { NextResponse } from 'next/server'
import { createBondyDoc } from '@/lib/google-docs'

export const maxDuration = 30

export async function POST(request) {
  try {
    let body
    try {
      const raw = await request.text()
      body = JSON.parse(raw)
    } catch (e) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { reportText, candidateName, recruiterName, positionName, clientName } = body

    if (!reportText) {
      return NextResponse.json({ error: 'reportText requerido' }, { status: 400 })
    }

    // Check env vars upfront
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      return NextResponse.json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON no configurado' }, { status: 500 })
    }

    const result = await createBondyDoc({
      reportText,
      candidateName: candidateName || 'Candidato',
      recruiterName: recruiterName || null,
      positionName: positionName || null,
      clientName: clientName || null,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('create-doc error:', error?.message, error?.stack)
    // Always return valid JSON
    return NextResponse.json(
      { error: String(error?.message || 'Error desconocido').slice(0, 500) },
      { status: 500 }
    )
  }
}
