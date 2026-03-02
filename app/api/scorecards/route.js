export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const clientName = searchParams.get('client')
    const type = searchParams.get('type') // 'technical' | 'cultural' | 'default'

    const supabase = getSupabaseAdmin()
    let query = supabase
      .from('client_scorecards')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (clientName) query = query.eq('client_name', clientName)
    if (type) query = query.eq('scorecard_type', type)

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ scorecards: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { client_id, client_name, scorecard_type, name, description, skills } = body
    if (!client_name || !name || !skills) {
      return NextResponse.json({ error: 'client_name, name y skills son requeridos' }, { status: 400 })
    }
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('client_scorecards')
      .insert({ client_id, client_name, scorecard_type: scorecard_type || 'technical', name, description, skills })
      .select().single()
    if (error) throw error
    return NextResponse.json({ scorecard: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
