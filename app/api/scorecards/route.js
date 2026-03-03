export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/scorecards?client=IOL&position=TL+Frontend
// GET /api/scorecards?client=IOL
// GET /api/scorecards?client=__DEFAULT__              → scorecard default
// GET /api/scorecards?clients=true                   → lista clientes (incluye Bondy Default)
// GET /api/scorecards?positions=IOL
export async function GET(request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const client = searchParams.get('client')
    const position = searchParams.get('position')
    const clientsOnly = searchParams.get('clients')
    const positionsFor = searchParams.get('positions')

    // Lista de clientes únicos — incluye __DEFAULT__ como opción explícita
    if (clientsOnly) {
      const { data, error } = await supabase
        .from('client_scorecards')
        .select('client_name')
        .eq('is_active', true)
        .order('client_name')
      if (error) throw error
      // Clientes reales (sin __DEFAULT__)
      const unique = [...new Set((data || []).map(r => r.client_name))]
        .filter(n => n !== '__DEFAULT__')
        .sort()
      // __DEFAULT__ va primero como opción especial
      const hasDefault = (data || []).some(r => r.client_name === '__DEFAULT__')
      return NextResponse.json({ clients: unique, hasDefault })
    }

    // Posiciones de un cliente
    if (positionsFor) {
      const clientKey = positionsFor === '__DEFAULT__' ? '__DEFAULT__' : positionsFor
      const { data, error } = await supabase
        .from('client_scorecards')
        .select('id, scorecard_name')
        .eq('client_name', clientKey)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return NextResponse.json({ positions: data || [] })
    }

    // Scorecard específica por cliente + posición
    if (client && position) {
      const { data, error } = await supabase
        .from('client_scorecards')
        .select('*')
        .eq('client_name', client)
        .eq('scorecard_name', position)
        .eq('is_active', true)
        .limit(1)
      if (error) throw error
      if (data && data.length > 0) {
        return NextResponse.json({ scorecard: data[0], isDefault: client === '__DEFAULT__' })
      }
    }

    // Scorecard por cliente (la más reciente)
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
        return NextResponse.json({ scorecard: data[0], isDefault: client === '__DEFAULT__' })
      }
      // Si pidió un cliente real y no hay scorecard, cae al default
      if (client !== '__DEFAULT__') {
        const { data: defaultData } = await supabase
          .from('client_scorecards')
          .select('*')
          .eq('client_name', '__DEFAULT__')
          .eq('is_active', true)
          .limit(1)
        return NextResponse.json({ scorecard: defaultData?.[0] || null, isDefault: true })
      }
      return NextResponse.json({ scorecard: null, isDefault: true })
    }

    // Lista completa
    const { data, error } = await supabase
      .from('client_scorecards')
      .select('*')
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
      .select().single()
    if (error) throw error
    return NextResponse.json({ scorecard: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { id, ...rest } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const allowed = ['client_name','scorecard_name','description','scorecard_data','is_active']
    const fields = Object.fromEntries(Object.entries(rest).filter(([k]) => allowed.includes(k)))
    const { data, error } = await supabase.from('client_scorecards').update(fields).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ scorecard: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
