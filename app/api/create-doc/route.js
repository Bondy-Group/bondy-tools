import { NextResponse } from 'next/server'
import { createBondyDoc } from '@/lib/google-docs'

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      reportText,
      candidateName,
      recruiterName,
      positionName,
      clientName,
    } = body

    if (!reportText) {
      return NextResponse.json({ error: 'reportText requerido' }, { status: 400 })
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
    console.error('create-doc error:', error)
    return NextResponse.json(
      { error: error.message || 'Error creando documento' },
      { status: 500 }
    )
  }
}
