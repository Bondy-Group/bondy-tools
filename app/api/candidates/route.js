import { NextResponse } from 'next/server'
import { searchCandidates } from '@/lib/airtable'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ candidates: [] })
    }

    const candidates = await searchCandidates(query)
    return NextResponse.json({ candidates })
  } catch (error) {
    console.error('Candidates error:', error)
    return NextResponse.json({ error: error.message || 'Error al buscar candidatos' }, { status: 500 })
  }
}
