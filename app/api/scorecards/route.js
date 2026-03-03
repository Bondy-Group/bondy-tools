export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/scorecards?client=IOL
export async function GET(request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const client = searchParams.get('client')

    if (client) {
      const { data, error } = await supabase
        .from('client_scorecards')
        .select('*')
        .eq('client_name', client)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)

      if (error) throw error

      if (data && data.length > 0) {
        return NextResponse.json({ scorecard: data[0] })
      }

      // Fallback to default
      const { data: defaultData, error: defaultError } = await supabase
        .from('client_scorecards')
        .select('*')
        .eq('client_name', '__DEFAULT__')
        .eq('is_active', true)
        .limit(1)

      if (defaultError) throw defaultError

      return NextResponse.json({
        scorecard: defaultData?.[0] || null,
        isDefault: true
      })
    }

    // All active scorecards
    const { data, error } = await supabase
      .from('client_scorecards')
      .select('id, client_name, scorecard_name, description, is_active, created_at, updated_at, scorecard_data')
      .eq('is_active', true)
      .order('client_name', { ascending: true })

    if (error) throw error
    return NextResponse.json({ scorecards: data || [] })
  } catch (error) {
    console.error('Scorecards GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { client_name, scorecard_name, description, scorecard_data, created_by } = body

    if (!client_name || !scorecard_name || !scorecard_data) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('client_scorecards')
      .insert({ client_name, scorecard_name, description: description || null, scorecard_data, created_by: created_by || null, is_active: true })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ scorecard: data })
  } catch (error) {
    console.error('Scorecards POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const allowed = ['client_name','scorecard_name','description','scorecard_data','is_active']
    const updateFields = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))
    const { data, error } = await supabase
      .from('client_scorecards')
      .update(updateFields)
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
