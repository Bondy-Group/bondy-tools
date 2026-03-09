import { NextResponse } from 'next/server'
import { createBondyDoc } from '@/lib/google-docs'

export const maxDuration = 30

export async function POST(request) {
  try {
    // Read as text first to debug potential JSON issues
    const rawBody = await request.text()
    
    let body
    try {
      body = JSON.parse(rawBody)
    } catch (parseErr) {
      console.error('JSON parse error:', parseErr.message)
      console.error('Raw body length:', rawBody.length)
      console.error('Raw body preview:', rawBody.slice(0, 500))
      return NextResponse.json(
        { error: `JSON parse error: ${parseErr.message}` },
        { status: 400 }
      )
    }

    const { reportText, candidateName, recruiterName, positionName, clientName } = body

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
