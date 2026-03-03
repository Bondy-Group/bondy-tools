import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-haiku-4-5-20251001'

export async function POST(request) {
  try {
    const { transcript, positionName, clientName } = await request.json()

    if (!transcript || transcript.length < 200) {
      return NextResponse.json({ error: 'Transcripción muy corta' }, { status: 400 })
    }

    if (transcript.length <= 2000) {
      return NextResponse.json({ optimized: transcript, savings: 0, alreadyShort: true })
    }

    const context = [
      positionName ? `Posición: ${positionName}` : null,
      clientName ? `Cliente: ${clientName}` : null,
    ].filter(Boolean).join(' | ')

    const systemPrompt = `Sos un asistente especializado en transcripciones de entrevistas técnicas de recruiting.
Tu única tarea es eliminar RUIDO TÉCNICO PURO de la transcripción — nada más.

ELIMINÁ SOLO ESTO (ruido técnico puro, sin valor analítico):
- Problemas de conexión/audio: "¿me escuchás?", "se cortó", "¿estás ahí?", "hay eco"
- Saludos de apertura y cierre: "hola", "¿cómo estás?", "bueno hasta luego", "que te vaya bien"
- Repeticiones EXACTAS de la misma oración (duplicados técnicos de transcripción automática)
- Frases completamente vacías sin contexto: "sí", "ok", "dale" cuando aparecen solas como línea única

CONSERVÁ ABSOLUTAMENTE TODO LO DEMÁS — incluido:
- Las preguntas del entrevistador (son contexto necesario para entender las respuestas)
- Dudas, titubeos, correcciones del candidato ("o sea, no, en realidad..."): son señales de pensamiento
- Pausas largas antes de responder (si están marcadas en el texto)
- Muletillas habituales del candidato: revelan estilo de comunicación
- Autocorrecciones: "usé React, bueno, en realidad era Vue"
- Respuestas vagas o evasivas: son datos para el análisis
- Emociones implícitas: entusiasmo, inseguridad, orgullo al hablar de proyectos
- Todo el contenido técnico, experiencias, motivaciones, pretensiones

CRITERIO DE ORO: si hay ALGUNA duda sobre si algo aporta al análisis del candidato, CONSERVALO.
El objetivo es quitar solo el 10-20% del texto — el ruido puro. No comprimir, no resumir.

FORMATO DE SALIDA:
- Mantené la estructura de diálogo (Entrevistador: / Candidato: si existe)
- No reformulés nada, usá las palabras exactas del texto
- No agregues ni inventes nada`

    const userPrompt = `${context ? context + '\n\n' : ''}TRANSCRIPCIÓN:\n${transcript}`

    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
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
