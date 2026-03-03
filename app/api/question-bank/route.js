import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const skill = searchParams.get('skill')
    const client = searchParams.get('client')
    const type = searchParams.get('type')

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
    return Response.json({ questions: data })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { questions } = body // array de preguntas a insertar/upsert

    if (!questions || !Array.isArray(questions)) {
      return Response.json({ error: 'questions array required' }, { status: 400 })
    }

    const results = []
    for (const q of questions) {
      // Buscar si ya existe pregunta similar (por texto exacto + skill)
      const { data: existing } = await supabase
        .from('question_bank')
        .select('id, client_tags, times_used')
        .eq('skill_name', q.skill_name)
        .ilike('question', q.question)
        .limit(1)

      if (existing && existing.length > 0) {
        // Ya existe: agregar client_tag si es nuevo
        const current = existing[0]
        const newTags = [...new Set([...(current.client_tags || []), ...(q.client_tags || [])])]
        const { data, error } = await supabase
          .from('question_bank')
          .update({ client_tags: newTags, updated_at: new Date().toISOString() })
          .eq('id', current.id)
          .select()
          .single()
        if (error) throw error
        results.push({ ...data, action: 'updated' })
      } else {
        // Nueva pregunta
        const { data, error } = await supabase
          .from('question_bank')
          .insert({
            skill_name: q.skill_name,
            skill_type: q.skill_type || 'technical',
            question: q.question,
            follow_up: q.follow_up || null,
            green_flag: q.green_flag || null,
            red_flag: q.red_flag || null,
            what_to_look_for: q.what_to_look_for || null,
            source_client: q.source_client || null,
            client_tags: q.client_tags || [],
            source: q.source_client || 'manual',
            created_by: q.created_by || 'admin',
          })
          .select()
          .single()
        if (error) throw error
        results.push({ ...data, action: 'created' })
      }
    }

    return Response.json({ results, saved: results.length })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return Response.json({ error: 'id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('question_bank')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return Response.json({ question: data })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
