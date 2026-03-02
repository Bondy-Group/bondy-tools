export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/scorecards - lista todos los scorecards activos
export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('client_scorecards')
      .select('id, client_id, client_name, is_default, is_active, technical_scorecard, notes, updated_at')
      .eq('is_active', true)
      .order('client_name')

    if (error) throw error
    return NextResponse.json({ scorecards: data })
  } catch (error) {
    console.error('Scorecards GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/scorecards - crear nuevo scorecard
export async function POST(request) {
  try {
    const body = await request.json()
    const { client_id, client_name, technical_scorecard, notes, is_default } = body

    if (!client_id || !client_name) {
      return NextResponse.json({ error: 'client_id y client_name son requeridos' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('client_scorecards')
      .insert({ client_id: client_id.toLowerCase().replace(/\s+/g, '_'), client_name, technical_scorecard, notes, is_default: is_default || false })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ scorecard: data })
  } catch (error) {
    console.error('Scorecards POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/scorecards - actualizar scorecard existente
export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, client_name, technical_scorecard, notes, is_active } = body

    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('client_scorecards')
      .update({ client_name, technical_scorecard, notes, is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ scorecard: data })
  } catch (error) {
    console.error('Scorecards PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
