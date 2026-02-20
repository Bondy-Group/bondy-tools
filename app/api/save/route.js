import { NextResponse } from 'next/server'
import { saveInterviewReport } from '@/lib/airtable'

export async function POST(request) {
  try {
    const { recordId, reportHtml } = await request.json()

    if (!recordId || !reportHtml) {
      return NextResponse.json({ error: 'recordId y reportHtml requeridos' }, { status: 400 })
    }

    await saveInterviewReport(recordId, reportHtml)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Save error:', error)
    return NextResponse.json({ error: error.message || 'Error al guardar' }, { status: 500 })
  }
}
