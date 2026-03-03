import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-5'

// Proceso en chunks de 3500 chars para no superar rate limit
const CHUNK_SIZE = 3500

export async function POST(request) {
  try {
    const { transcript, positionName, clientName } = await request.json()

    if (!transcript || transcript.length < 200) {
      return NextResponse.json({ error: 'Transcripción muy corta' }, { status: 400 })
    }

    // Si es corta, no hace falta optimizar
    if (transcript.length <= 3000) {
      return NextResponse.json({ optimized: transcript, savings: 0, alreadyShort: true })
    }

    const context = [
      positionName ? `Posición: ${positionName}` : null,
      clientName ? `Cliente: ${clientName}` : null,
    ].filter(Boolean).join(' | ')

    const systemPrompt = `Sos un asistente de recruiting técnico. Tu única tarea es limpiar y condensar transcripciones de entrevistas técnicas para que sean procesables por IA.

REGLAS ESTRICTAS:
- Eliminá: saludos, despedidas, silencios, relleno ("eh", "mmm", "bueno", "o sea"), comentarios off-topic, repeticiones exactas, interrupciones sin contenido
- Conservá TODO: respuestas técnicas, ejemplos de experiencia, números, tecnologías mencionadas, logros, motivaciones, pretensión salarial, disponibilidad
- No resumás ni parafraseés — mantené las palabras exactas del candidato cuando dicen algo relevante
- No agregues nada que no esté en el original
- Formato: texto fluido, sin timestamps, sin "Entrevistador:" / "Candidato:" — solo el contenido útil
- Resultado debe ser 40-60% del original en longitud`

    const userPrompt = context
      ? `${context}\n\nTRANSCRIPCIÓN A LIMPIAR:\n${transcript}`
      : `TRANSCRIPCIÓN A LIMPIAR:\n${transcript}`

    // Si es muy larga, procesar en chunks
    let optimized = ''
    if (transcript.length > CHUNK_SIZE * 2) {
      // Dividir en chunks respetando párrafos
      const chunks = []
      let remaining = transcript
      while (remaining.length > 0) {
        if (remaining.length <= CHUNK_SIZE) {
          chunks.push(remaining)
          break
        }
        // Cortar en salto de línea más cercano a CHUNK_SIZE
        let cutAt = remaining.lastIndexOf('\n', CHUNK_SIZE)
        if (cutAt < CHUNK_SIZE * 0.5) cutAt = CHUNK_SIZE
        chunks.push(remaining.slice(0, cutAt))
        remaining = remaining.slice(cutAt).trim()
      }

      // Procesar chunks secuencialmente (para no saturar rate limit)
      const cleanedChunks = []
      for (const chunk of chunks) {
        const res = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 800,
          messages: [{
            role: 'user',
            content: `${systemPrompt}\n\n${context ? context + '\n\n' : ''}TRANSCRIPCIÓN A LIMPIAR (parte ${cleanedChunks.length + 1} de ${chunks.length}):\n${chunk}`
          }]
        })
        cleanedChunks.push(res.content[0]?.text || chunk)
        // Pequeña pausa entre chunks para no saturar
        if (chunks.length > 1) await new Promise(r => setTimeout(r, 500))
      }
      optimized = cleanedChunks.join('\n\n')
    } else {
      const res = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 1200,
        messages: [{ role: 'user', content: `${systemPrompt}\n\n${userPrompt}` }]
      })
      optimized = res.content[0]?.text || transcript
    }

    const savings = Math.round((1 - optimized.length / transcript.length) * 100)

    return NextResponse.json({
      optimized,
      originalLength: transcript.length,
      optimizedLength: optimized.length,
      savings, // % reducción
    })
  } catch (error) {
    console.error('Optimize transcript error:', error)
    return NextResponse.json({ error: error.message || 'Error optimizando' }, { status: 500 })
  }
}
