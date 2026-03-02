export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// PUT /api/scorecards/byid?id=xxx
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const body = await request.json()
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('client_scorecards').update(body).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ scorecard: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    const supabase = getSupabaseAdmin()
    const { error } = await supabase
      .from('client_scorecards').update({ is_active: false }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
