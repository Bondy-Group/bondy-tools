import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { BONDY_SCORECARD_PROMPT } from '@/lib/prompts'
import { getSupabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-5'

export async function POST(request) {
  try {
    const body = await request.json()
    const { transcript, candidateName, clientName, positionName, recruiterScores, recruiterPositional } = body

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript requerido' }, { status: 400 })
    }

    let userContent = ''
    if (candidateName) userContent += `CANDIDATO: ${candidateName}\n\n`
    if (clientName)    userContent += `CLIENTE: ${clientName}\n\n`
    if (positionName)  userContent += `POSICIÓN: ${positionName}\n\n`
    userContent += `TRANSCRIPCIÓN DE LA ENTREVISTA:\n${transcript}`

    const result = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 3000,
      messages: [{ role: 'user', content: `${BONDY_SCORECARD_PROMPT()}\n\n---\n\n${userContent}` }]
    })

    const rawText = result.content[0]?.text || ''
    let bondyScorecard = null
    try {
      const clean = rawText.replace(/```json\n?/g, '').replace(/```/g, '').trim()
      bondyScorecard = JSON.parse(clean)
    } catch (e) {
      console.error('Error parsing bondy scorecard JSON:', e)
      return NextResponse.json({ error: 'Error parseando scorecard' }, { status: 500 })
    }

    return NextResponse.json({ bondyScorecard, recruiterScores, recruiterPositional })

  } catch (error) {
    console.error('Bondy scorecard generation error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

export async function PATCH(request) {
  // Guardar scorecard + scores del recruiter en interview_reports
  try {
    const body = await request.json()
    const { reportId, bondyScorecard, recruiterScores, recruiterPositional, nota, visibleCliente } = body

    if (!reportId) {
      return NextResponse.json({ error: 'reportId requerido' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const updatePayload = {
      // Scores del modelo — Bloque A
      model_claridad_motivacional: bondyScorecard?.block_a?.claridad_motivacional?.score || null,
      model_consistencia_discurso: bondyScorecard?.block_a?.consistencia_discurso?.score || null,
      model_alineacion_cultural:   bondyScorecard?.block_a?.alineacion_cultural?.score || null,
      model_motivacion_pertenencia: bondyScorecard?.block_a?.motivacion_pertenencia?.score || null,
      model_preferencia_entorno:   bondyScorecard?.block_a?.preferencia_entorno?.position_label || null,

      // Scores del modelo — Bloque B
      model_comprension_consigna:    bondyScorecard?.block_b?.comprension_consigna?.score || null,
      model_organizacion_pensamiento: bondyScorecard?.block_b?.organizacion_pensamiento?.score || null,
      model_flexibilidad_cognitiva:  bondyScorecard?.block_b?.flexibilidad_cognitiva?.score || null,
      model_capacidad_sintesis:      bondyScorecard?.block_b?.capacidad_sintesis?.score || null,
      model_tolerancia_frustracion:  bondyScorecard?.block_b?.tolerancia_frustracion?.score || null,
      model_autonomia:               bondyScorecard?.block_b?.autonomia?.position_label || null,

      // Scores del recruiter — Bloque A
      rec_claridad_motivacional: recruiterScores?.claridad_motivacional || null,
      rec_consistencia_discurso: recruiterScores?.consistencia_discurso || null,
      rec_alineacion_cultural:   recruiterScores?.alineacion_cultural || null,
      rec_motivacion_pertenencia: recruiterScores?.motivacion_pertenencia || null,
      rec_preferencia_entorno:   recruiterPositional?.preferencia_entorno
        ? ['muy_estructurado','centro_estructurado','centro','centro_dinamico','muy_dinamico'][recruiterPositional.preferencia_entorno - 1]
        : null,

      // Nota y visibilidad
      bondy_scorecard_nota: nota || null,
      scorecard_visible_cliente: visibleCliente || false,

      // JSONB completo del modelo
      bondy_scorecard_full: bondyScorecard || null,

      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('interview_reports')
      .update(updatePayload)
      .eq('id', reportId)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Bondy scorecard save error:', error)
    return NextResponse.json({ error: error.message || 'Error guardando' }, { status: 500 })
  }
}
