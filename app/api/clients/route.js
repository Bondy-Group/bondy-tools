export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, display_name, industry, is_active')
      .eq('is_active', true)
      .order('name')
    if (error) throw error
    return NextResponse.json({ clients: data })
  } catch (error) {
    console.error('Clients GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { name, display_name, industry, website, notes } = body
    if (!name) return NextResponse.json({ error: 'name requerido' }, { status: 400 })
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('clients')
      .insert({ name: name.toUpperCase().trim(), display_name, industry, website, notes })
      .select().single()
    if (error) throw error
    return NextResponse.json({ client: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
