import { NextResponse } from 'next/server'
import { getMarketPulseData } from '@/lib/market-pulse/fetcher'

// Cache de 30 min en CDN (mismo TTL que el scraper-jobs revalidate).
// El scrapper corre 1 vez al día, así que cachear 30 min es más que suficiente.
export const revalidate = 1800

export async function GET() {
  try {
    const data = await getMarketPulseData()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=3600',
      },
    })
  } catch (err) {
    console.error('[market-pulse] error:', err)
    return NextResponse.json(
      { error: 'failed to load market pulse data' },
      { status: 500 }
    )
  }
}
