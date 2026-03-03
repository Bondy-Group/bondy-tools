export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

// GET /api/question-bank?skill=Python&type=technical&client=IOL
export async function GET(request) {
  try {
    const supabase = getSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const skill = searchParams.get('skill')
    const type = searchParams.get('type')
    const client = searchParams.get('client')

    let query = supabase
      .from('question_bank')
      .select('*')
      .eq('is_active', true)
      .order('times_used', { ascending: false })

    if (skill) query = query.ilike('skill_name', `%${skill}%`)
    if (type) query = query.eq('skill_type', type)
    if (client) query = query.contains('client_tags', [client])

    const { data, error } = await query
    if (error) throw error
    return NextResponse.json({ questions: data || [] })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/question-bank → crear pregunta(s)
// body: { questions: [...] } o una sola pregunta
export async function POST(request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()

    const items = Array.isArray(body.questions) ? body.questions : [body]

    const toInsert = items.map(q => ({
      skill_name: q.skill_name,
      skill_type: q.skill_type,
      question: q.question,
      what_to_look_for: q.what_to_look_for || null,
      red_flag: q.red_flag || null,
      green_flag: q.green_flag || null,
      follow_up: q.follow_up || null,
      client_tags: q.client_tags || [],
      source: q.source || 'manual',
      created_by: q.created_by || null,
    }))

    const { data, error } = await supabase
      .from('question_bank')
      .insert(toInsert)
      .select()

    if (error) throw error
    return NextResponse.json({ questions: data, count: data.length })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/question-bank → actualizar o incrementar uso
export async function PUT(request) {
  try {
    const supabase = getSupabaseAdmin()
    const body = await request.json()
    const { id, increment_usage, ...fields } = body

    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    let updateFields = {}
    if (increment_usage) {
      const { data: current } = await supabase.from('question_bank').select('times_used').eq('id', id).single()
      updateFields.times_used = (current?.times_used || 0) + 1
    } else {
      const allowed = ['skill_name','skill_type','question','what_to_look_for','red_flag','green_flag','follow_up','client_tags','is_active']
      allowed.forEach(k => { if (fields[k] !== undefined) updateFields[k] = fields[k] })
    }

    const { data, error } = await supabase.from('question_bank').update(updateFields).eq('id', id).select().single()
    if (error) throw error
    return NextResponse.json({ question: data })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
