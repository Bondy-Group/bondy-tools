export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { requireJobBoardAdmin } from '@/lib/job-board'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-5-20250929'

const SYSTEM_PROMPT = `Sos Mateo, asistente de Bondy (firma de recruiting técnico en LATAM).
Tu tarea es extraer información estructurada de un transcript de meeting (kickoff comercial, brief de cliente, llamada de descubrimiento) para auto-llenar una propuesta de servicios.

REGLAS:
- Extraé SOLO lo que aparece explícitamente en el transcript. Si un campo no aparece, devolvé null o "" (vacío).
- NO inventes datos. NO completes con suposiciones.
- Para los roles, identificá cada posición distinta que el cliente quiere cubrir. El "focus" es el dominio o foco técnico (1-2 frases).
- Para approach_notes, extraé bullets calibrados (formato "Título corto. Descripción del bullet.") UNO POR LÍNEA, basados en lo que el cliente enfatizó como crítico, sus prioridades, sus deal-breakers.

CAMPOS A EXTRAER (siempre devolvé exactamente estas keys):
- client_name: nombre comercial de la empresa cliente
- client_legal_name: razón social legal (si la mencionan)
- client_short_name: nombre corto/abreviado para referirse al cliente
- client_contact: nombre de la persona principal del cliente en la llamada
- client_contact_role: cargo de esa persona
- client_location: ubicación principal (ciudad/país)
- client_work_mode: modalidad de trabajo (remote / hybrid / onsite, con detalle si aplica)
- roles: array de objetos { title, qty, focus }
- approach_notes: string con bullets uno por línea, formato "Título. Descripción."

DEVOLVÉ ÚNICAMENTE JSON VÁLIDO, sin markdown, sin texto antes o después. Empezá con { y terminá con }.`

async function extractFromContent(contentBlocks) {
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          ...contentBlocks,
          {
            type: 'text',
            text: 'Extraé los campos del transcript anterior según las reglas. Devolvé sólo el JSON.',
          },
        ],
      },
    ],
  })

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No text block in response')

  let raw = textBlock.text.trim()
  // Limpiar fences si las hubiera
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    throw new Error(`LLM did not return valid JSON: ${raw.slice(0, 200)}`)
  }
  return parsed
}

async function fetchTextFromUrl(url) {
  // Fetch básico. Para Fathom/Meet idealmente usaríamos sus connectors,
  // pero mantenemos simple: el operador puede pegar texto si la URL es protegida.
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BondyBot/1.0)' },
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`Fetch ${res.status}: ${url}`)
  const html = await res.text()
  // Strip muy básico de HTML → texto. Suficiente para muchos transcripts públicos.
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
  return text
}

function parseVtt(vttText) {
  // Convierte WebVTT a líneas de texto plano (sin timestamps)
  return vttText
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim()
      if (!trimmed) return false
      if (trimmed === 'WEBVTT') return false
      if (/^\d+$/.test(trimmed)) return false // cue number
      if (/-->/.test(trimmed)) return false // timestamp
      return true
    })
    .join('\n')
}

export async function POST(req) {
  const guard = await requireJobBoardAdmin()
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status })

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { source, url, text, fileBase64, mimeType, fileName } = body

  try {
    let contentBlocks = []

    if (source === 'text' || (text && !url && !fileBase64)) {
      const t = String(text || '').trim()
      if (t.length < 50) {
        return NextResponse.json({ error: 'Texto muy corto (min 50 caracteres)' }, { status: 400 })
      }
      contentBlocks = [{ type: 'text', text: `<transcript>\n${t}\n</transcript>` }]

    } else if (source === 'url' || url) {
      const u = String(url || '').trim()
      if (!u || !/^https?:\/\//i.test(u)) {
        return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
      }
      const fetched = await fetchTextFromUrl(u)
      if (fetched.length < 100) {
        return NextResponse.json({
          error: 'No se pudo extraer texto de la URL. La página puede requerir auth o estar protegida. Pegá el texto directamente en la pestaña "Texto".',
        }, { status: 400 })
      }
      contentBlocks = [{
        type: 'text',
        text: `<source_url>${u}</source_url>\n<transcript>\n${fetched.slice(0, 100000)}\n</transcript>`,
      }]

    } else if (source === 'file' || fileBase64) {
      const mt = String(mimeType || '').toLowerCase()
      const data = String(fileBase64 || '').replace(/^data:[^;]+;base64,/, '')

      if (mt === 'application/pdf') {
        contentBlocks = [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data },
          },
          { type: 'text', text: `Filename: ${fileName || 'transcript.pdf'}` },
        ]
      } else if (
        mt.startsWith('text/') ||
        mt === 'application/json' ||
        /\.(txt|md|vtt|srt)$/i.test(fileName || '')
      ) {
        let decoded = Buffer.from(data, 'base64').toString('utf8')
        if (/\.vtt$/i.test(fileName || '') || mt === 'text/vtt') {
          decoded = parseVtt(decoded)
        }
        if (decoded.length < 50) {
          return NextResponse.json({ error: 'Archivo de texto muy corto' }, { status: 400 })
        }
        contentBlocks = [{
          type: 'text',
          text: `<filename>${fileName || 'transcript.txt'}</filename>\n<transcript>\n${decoded.slice(0, 100000)}\n</transcript>`,
        }]
      } else {
        return NextResponse.json({
          error: `Tipo de archivo no soportado: ${mt || 'desconocido'}. Usá PDF, TXT, MD, VTT o pegá el texto directamente.`,
        }, { status: 400 })
      }

    } else {
      return NextResponse.json({ error: 'Falta uno de: url, text, fileBase64' }, { status: 400 })
    }

    const extracted = await extractFromContent(contentBlocks)
    return NextResponse.json({ extracted })

  } catch (err) {
    console.error('[proposals/extract]', err)
    return NextResponse.json({
      error: String(err.message || err).slice(0, 500),
    }, { status: 500 })
  }
}
