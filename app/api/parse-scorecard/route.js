export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

// Clasificador heurístico de skill_type
function classifySkillType(skillName) {
  const name = skillName.toLowerCase()
  const technicalKeywords = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java', 'golang', 'go ',
    'node', 'backend', 'frontend', 'arquitectura', 'architecture', 'infra', 'cloud', 'aws',
    'sql', 'database', 'api', 'css', 'html', 'performance', 'producción', 'incidente',
    'testing', 'test', 'ci', 'cd', 'deploy', 'devops', 'observabilidad', 'monitoring',
    'seguridad', 'security', 'mobile', 'ios', 'android', 'data', 'ml', 'ia', 'ai',
    'sistema', 'system', 'código', 'code', 'git', 'stack', 'tech', 'producto'
  ]
  const softKeywords = [
    'liderazgo', 'leadership', 'comunicación', 'communication', 'feedback', 'mentoring',
    'coaching', 'equipo', 'team', 'negociación', 'negotiation', 'hiring', 'selección',
    'cultura', 'culture', 'empat', 'conflict', 'conflicto', 'colabor', 'senior',
    'management', 'priorización', 'stakeholder', 'influencia', 'influence', 'armado'
  ]
  for (const kw of technicalKeywords) {
    if (name.includes(kw)) return 'technical'
  }
  for (const kw of softKeywords) {
    if (name.includes(kw)) return 'soft'
  }
  return null // para que IA decida
}

// POST /api/parse-scorecard
// body: FormData con campo "file" (xlsx/xlsm) y "client" (nombre del cliente)
export async function POST(request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const clientName = formData.get('client') || ''

    if (!file) return NextResponse.json({ error: 'No se recibió archivo' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const fileName = file.name || 'scorecard.xlsx'

    // Llamar a Claude para parsear el Excel
    const prompt = `Sos un asistente que parsea scorecards de entrevista desde archivos Excel.
Te voy a dar el contenido de un Excel como base64. 
El archivo se llama: ${fileName}
Cliente: ${clientName || 'no especificado'}

Tu tarea es extraer TODOS los skills y preguntas del Excel y devolver un JSON estructurado.

Para cada skill necesito:
- skill_name: nombre del skill (string)
- skill_type: "technical" o "soft" — clasificá vos según el contenido
- weight: peso en porcentaje (número, sin el %)
- questions: array de preguntas, cada una con:
  - question: el texto de la pregunta
  - what_to_look_for: qué se busca / evidencia
  - red_flag: respuesta que preocupa
  - green_flag: respuesta ideal
  - follow_up: repregunta o profundización

Reglas de clasificación skill_type:
- "technical": arquitectura, tecnologías, código, performance, producción, incidentes, herramientas
- "soft": liderazgo, comunicación, feedback, mentoring, hiring, negociación, trabajo en equipo, cultura

Devolvé SOLO el JSON, sin texto adicional, sin markdown, sin backticks.
Formato exacto:
{
  "scorecard_name": "nombre detectado del Excel",
  "client_name": "${clientName || 'detectado del Excel'}",
  "description": "descripción breve del perfil",
  "skills": [
    {
      "skill_name": "...",
      "skill_type": "technical|soft",
      "weight": 15,
      "questions": [
        {
          "question": "...",
          "what_to_look_for": "...",
          "red_flag": "...",
          "green_flag": "...",
          "follow_up": "..."
        }
      ]
    }
  ]
}

Archivo Excel (base64): ${base64}`

    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    if (!aiResponse.ok) {
      const err = await aiResponse.text()
      throw new Error(`Error IA: ${err}`)
    }

    const aiData = await aiResponse.json()
    const rawText = aiData.content?.[0]?.text || ''

    // Limpiar y parsear JSON
    const clean = rawText.replace(/```json|```/g, '').trim()
    let parsed
    try {
      parsed = JSON.parse(clean)
    } catch (e) {
      return NextResponse.json({ error: 'No pude parsear la respuesta de IA', raw: rawText }, { status: 500 })
    }

    // Aplicar clasificación heurística como doble check
    if (parsed.skills) {
      parsed.skills = parsed.skills.map(skill => {
        const heuristic = classifySkillType(skill.skill_name)
        return {
          ...skill,
          skill_type: skill.skill_type || heuristic || 'technical',
          id: `skill_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
        }
      })
    }

    return NextResponse.json({ parsed, fileName })
  } catch (error) {
    console.error('parse-scorecard error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
