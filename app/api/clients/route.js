export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    // Get unique clients that have scorecards, plus all active scorecards
    const { data, error } = await supabase
      .from('client_scorecards')
      .select('client_name, scorecard_name')
      .eq('is_active', true)
      .neq('client_name', '__DEFAULT__')
      .order('client_name', { ascending: true })
    if (error) throw error
    const clients = [...new Map((data || []).map(r => [r.client_name, r])).values()]
      .map(r => ({ id: r.client_name, name: r.client_name }))
    return NextResponse.json({ clients })
  } catch (e) {
    // fallback empty list
    return NextResponse.json({ clients: [] })
  }
}
