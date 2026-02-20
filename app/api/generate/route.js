import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCREENING_PROMPT, CULTURAL_FIT_PROMPT } from '@/lib/prompts'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const { transcript, type, clientProfile, summary, language, clientName, jd, linkedin } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript requerido' }, { status: 400 })
    }

    if (type === 'screening') {
      const prompt = SCREENING_PROMPT({ language, clientName, jd })

      let userContent = ''
      if (linkedin) userContent += `LINKEDIN URL: ${linkedin}\n\n`
      if (jd) userContent += `JOB DESCRIPTION:\n${jd}\n\n---\n\n`
      if (summary) userContent += `INTERVIEW SUMMARY:\n${summary}\n\n---\n\n`
      userContent += `INTERVIEW TRANSCRIPT:\n${transcript}`

      const message = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2500,
        messages: [
          { role: 'user', content: `${prompt}\n\n---\n\n${userContent}` }
        ]
      })

      return NextResponse.json({ result: message.content[0].text, type: 'screening' })

    } else if (type === 'cultural') {
      if (!clientProfile) {
        return NextResponse.json({ error: 'Perfil de cliente requerido para cultural fit' }, { status: 400 })
      }

      const prompt = CULTURAL_FIT_PROMPT(clientProfile)
      const userContent = summary
        ? `RESUMEN DE LA ENTREVISTA:\n${summary}\n\n---\nTRANSCRIPCIÓN:\n${transcript}`
        : `TRANSCRIPCIÓN DE LA ENTREVISTA:\n${transcript}`

      const message = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [
          { role: 'user', content: `${prompt}\n\n---\n\n${userContent}` }
        ]
      })

      let parsed
      try {
        const text = message.content[0].text.trim()
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
      } catch (e) {
        return NextResponse.json({ error: 'Error al parsear respuesta de cultural fit', raw: message.content[0].text }, { status: 500 })
      }

      return NextResponse.json({ result: parsed, type: 'cultural' })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
