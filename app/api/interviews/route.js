import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/interviews
// ?date=2024-03-01   → entrevistas del día (en timezone Argentina UTC-3)
// ?id=uuid           → una entrevista específica
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const id = searchParams.get('id')

    if (id) {
      const { data, error } = await supabase
        .from('interviews')
        .select('*, client_scorecards(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return NextResponse.json({ interview: data })
    }

    // Listar por fecha — usando timezone Argentina (UTC-3) para evitar desfase
    const targetDate = date || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' })
    // Rango del día completo en Argentina (UTC-3)
    const startOfDay = `${targetDate}T00:00:00-03:00`
    const endOfDay   = `${targetDate}T23:59:59-03:00`

    const { data, error } = await supabase
      .from('interviews')
      .select('*')
      .gte('scheduled_at', startOfDay)
      .lte('scheduled_at', endOfDay)
      .order('scheduled_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ interviews: data || [] })
  } catch (error) {
    console.error('GET /api/interviews error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/interviews  → crear nueva entrevista
export async function POST(request) {
  try {
    const body = await request.json()

    const {
      recruiter_name,
      candidate_name,
      candidate_email,
      candidate_airtable_id,
      linkedin_url,
      github_url,
      cv_url,
      position,
      client_name,
      scorecard_id,
      scheduled_at,
    } = body

    if (!recruiter_name || !candidate_name || !position || !client_name) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos: recruiter_name, candidate_name, position, client_name' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('interviews')
      .insert({
        recruiter_name,
        candidate_name,
        candidate_email: candidate_email || null,
        candidate_airtable_id: candidate_airtable_id || null,
        linkedin_url: linkedin_url || null,
        github_url: github_url || null,
        cv_url: cv_url || null,
        position,
        client_name,
        scorecard_id: scorecard_id || null,
        scheduled_at: scheduled_at || null,
        status: 'scheduled',
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ interview: data }, { status: 201 })
  } catch (error) {
    console.error('POST /api/interviews error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH /api/interviews  → actualizar (notas, status, ai_insights, etc.)
export async function PATCH(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const allowed = [
      'status',
      'session_notes',
      'ai_insights',
      'generated_questions',
      'interview_report_id',
      'scheduled_at',
      'cv_url',
      'linkedin_url',
      'github_url',
    ]
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([key]) => allowed.includes(key))
    )

    const { data, error } = await supabase
      .from('interviews')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ interview: data })
  } catch (error) {
    console.error('PATCH /api/interviews error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
