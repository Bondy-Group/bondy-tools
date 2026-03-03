import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
// Haiku: más rápido y económico, perfecto para preprocesamiento
const MODEL = 'claude-haiku-4-5-20251001'

export async function POST(request) {
  try {
    const { transcript, positionName, clientName } = await request.json()

    if (!transcript || transcript.length < 200) {
      return NextResponse.json({ error: 'Transcripción muy corta' }, { status: 400 })
    }

    // Si ya es corta, no hace falta limpiar
    if (transcript.length <= 2000) {
      return NextResponse.json({ optimized: transcript, savings: 0, alreadyShort: true })
    }

    const context = [
      positionName ? `Posición: ${positionName}` : null,
      clientName ? `Cliente: ${clientName}` : null,
    ].filter(Boolean).join(' | ')

    const systemPrompt = `Sos un asistente de recruiting técnico. Tu única tarea es limpiar y condensar transcripciones de entrevistas técnicas.

ELIMINÁ:
- Saludos, despedidas, presentaciones ("hola", "¿cómo estás?", "bueno hasta luego")
- Relleno verbal: "eh", "mmm", "bueno", "o sea", "¿me entendés?", pausas, muletillas
- Repeticiones exactas o casi exactas de la misma idea
- Comentarios off-topic que no aporten al perfil del candidato
- Confirmaciones vacías ("sí, claro", "perfecto", "okay", "entiendo", "dale")
- Preguntas del entrevistador (conservá solo las respuestas del candidato)
- Aclaraciones administrativas (horarios, problemas técnicos de conexión)

CONSERVÁ TODO:
- Experiencia laboral, empresas, roles, períodos de tiempo
- Tecnologías, frameworks, herramientas, lenguajes de programación
- Logros concretos, métricas, proyectos
- Arquitecturas, decisiones técnicas, metodologías
- Motivaciones para cambiar de trabajo
- Pretensión salarial y disponibilidad
- Idiomas y nivel
- Cualquier cosa que un recruiter necesitaría para escribir un informe

FORMATO:
- Texto fluido sin timestamps ni etiquetas "Entrevistador:" / "Candidato:"
- Mantené las palabras exactas del candidato cuando dicen algo técnico o concreto
- No inventes ni agregues nada que no esté en el original
- Objetivo: quedarte con el 40-60% del largo original`

    const userPrompt = `${context ? context + '\n\n' : ''}TRANSCRIPCIÓN A LIMPIAR:\n${transcript}`

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }]
    })

    const optimized = res.content[0]?.text || transcript
    const savings = Math.round((1 - optimized.length / transcript.length) * 100)

    return NextResponse.json({
      optimized,
      originalLength: transcript.length,
      optimizedLength: optimized.length,
      savings,
    })
  } catch (error) {
    console.error('Optimize transcript error:', error)
    return NextResponse.json({ error: error.message || 'Error optimizando' }, { status: 500 })
  }
}
