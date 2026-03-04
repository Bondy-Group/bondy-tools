import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const MODEL = 'claude-haiku-4-5-20251001' // Haiku: rápido y económico para prep

// POST /api/interviews/prep
// Genera insights del candidato + preguntas por competencia
export async function POST(request) {
  try {
    const body = await request.json()
    const { interview_id, cv_text, linkedin_text, scorecard_data, position, client_name } = body

    if (!interview_id) {
      return NextResponse.json({ error: 'interview_id requerido' }, { status: 400 })
    }

    const contextParts = []
    if (position) contextParts.push(`Posición: ${position}`)
    if (client_name) contextParts.push(`Cliente: ${client_name}`)
    const context = contextParts.join(' | ')

    const hasSkills = scorecard_data?.skills?.length > 0

    // Prompt para insights del candidato
    const insightsPrompt = `Sos un recruiter técnico experto preparando una entrevista.
${context ? `Contexto: ${context}` : ''}

Basándote en el perfil del candidato abajo, generá un análisis BREVE y ACCIONABLE para el recruiter.

CANDIDATO:
${cv_text ? `CV:\n${cv_text.slice(0, 1500)}\n` : ''}
${linkedin_text ? `LinkedIn:\n${linkedin_text.slice(0, 800)}\n` : ''}
${!cv_text && !linkedin_text ? '[Sin CV ni LinkedIn disponible — responder con insights genéricos para la posición]' : ''}

Respondé SOLO con JSON válido, sin markdown:
{
  "highlights": ["máx 4 bullets — lo más relevante del perfil para esta posición"],
  "gaps": ["máx 3 bullets — áreas a explorar o posibles debilidades"],
  "topics_to_explore": ["máx 4 temas técnicos o de experiencia para profundizar en la entrevista"]
}`

    // Prompt para preguntas por competencia
    const questionsPrompt = hasSkills
      ? `Sos un recruiter técnico experto. Generá preguntas de entrevista para evaluar competencias específicas.
${context ? `Contexto: ${context}` : ''}

COMPETENCIAS A EVALUAR:
${scorecard_data.skills.map(s => `- ${s.name} (${s.skill_type === 'soft' ? 'habilidad blanda' : 'habilidad técnica'}, peso: ${s.weight}%)`).join('\n')}

${cv_text ? `PERFIL DEL CANDIDATO (resumen):\n${cv_text.slice(0, 800)}\n` : ''}

Para cada competencia, generá 2-3 preguntas STAR específicas y accionables.
Respondé SOLO con JSON válido, sin markdown:
{
  "questions_by_skill": {
    "NOMBRE_EXACTO_DEL_SKILL": {
      "skill_type": "technical" o "soft",
      "questions": ["pregunta 1", "pregunta 2", "pregunta 3"],
      "what_to_look_for": "qué señales buscar en la respuesta"
    }
  }
}`
      : null

    // Llamadas en paralelo
    const insightsCall = anthropic.messages.create({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: insightsPrompt }],
    })

    const questionsCall = questionsPrompt
      ? anthropic.messages.create({
          model: MODEL,
          max_tokens: 1200,
          messages: [{ role: 'user', content: questionsPrompt }],
        })
      : Promise.resolve(null)

    const [insightsResult, questionsResult] = await Promise.all([insightsCall, questionsCall])

    // Parsear insights
    let ai_insights = null
    try {
      const text = insightsResult.content[0]?.text || '{}'
      const clean = text.replace(/```json\n?|\n?```/g, '').trim()
      ai_insights = JSON.parse(clean)
    } catch (e) {
      console.error('Error parsing insights:', e)
      ai_insights = { highlights: [], gaps: [], topics_to_explore: [] }
    }

    // Parsear preguntas
    let generated_questions = null
    if (questionsResult) {
      try {
        const text = questionsResult.content[0]?.text || '{}'
        const clean = text.replace(/```json\n?|\n?```/g, '').trim()
        generated_questions = JSON.parse(clean)
      } catch (e) {
        console.error('Error parsing questions:', e)
        generated_questions = { questions_by_skill: {} }
      }
    }

    // Guardar en Supabase
    const { data, error } = await supabase
      .from('interviews')
      .update({ ai_insights, generated_questions })
      .eq('id', interview_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      ai_insights,
      generated_questions,
      interview: data,
    })
  } catch (error) {
    console.error('POST /api/interviews/prep error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
