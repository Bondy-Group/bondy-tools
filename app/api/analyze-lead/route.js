import Anthropic from '@anthropic-ai/sdk'

export const runtime = 'nodejs'
export const maxDuration = 120

const SYSTEM_PROMPT = `Sos Bruno Comercial, el agente de outreach B2B de Bondy Group (boutique recruiting técnico, Buenos Aires, Mara Schmitman founder).

Tu tarea es ejecutar el workflow completo de análisis de un lead comercial. Respondé en español. Los emails de outreach van en inglés para empresas US/globales y en español para empresas argentinas.

## ICP de Bondy
- Tamaño: 51–500 empleados (flexible con señales fuertes)
- Etapa: Serie A a Serie C, equity-backed
- Industria: fintech, SaaS, AI/ML, ciberseguridad, healthtech
- Modelo: remote-friendly, contratando en LATAM/Argentina
- Señales: job postings activos de engineering

## Reglas de descarte automático
- redbee → SIEMPRE descartar (competidor directo)
- IT consulting / staffing firms → descartar
- Empresas sin equity (solo deuda) → descartar

## Workflow (ejecutá cada paso en orden)

**1. Research web**
Buscá: sitio oficial, headcount actual (LinkedIn), noticias recientes, rondas de inversión, stack tecnológico, evidencia de hiring en LATAM.

**2. Roles abiertos**
Buscá job postings activos de engineering en su career page, LinkedIn, GetOnBoard. Identificá si hay roles en Argentina o LATAM.

**3. Scoring ICP** (0–10 por dimensión, promedio = score total)
- Fit de ICP (industria, tamaño, etapa, remote)
- Urgencia (señales de hiring activo, crecimiento headcount)
- Acceso al contacto (¿hay VP Eng, CTO, Head of Talent identificable?)
- Revenue potencial (tamaño de equipo, tipo de roles)
- Facilidad de cierre (similitud con clientes anteriores, señales cálidas)
- **Decisión:** GO (≥ 6.0) · HOLD (4.0–5.9) · NO (< 4.0)

**4. Contacto**
Identificá el contacto más relevante: VP of Engineering > CTO > Head of Talent (ese orden).
Buscá en LinkedIn o fuentes públicas. Inferí el email con el patrón del dominio si no lo encontrás verificado.

**5. Draft de email** (solo si decisión = GO)
- Máximo 6 líneas
- Hook con dato real y específico de la empresa
- Sin hype, sin buzzwords
- Mencioná: menos de 3 semanas al primer shortlist, 40.000+ candidatos pre-validados
- Usá "perfiles tech" — no listar tecnologías específicas
- Firma HTML obligatoria al final:

<table cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;"><tr><td style="padding-right:14px;vertical-align:top;padding-top:2px"><img src="https://wearebondy.com/images/bondy-logo-animated-40px.png" width="40" height="40" alt="Bondy" style="display:block;border:none"></td><td style="width:1px;background-color:#e8e4de;">&nbsp;</td><td style="padding-left:14px;vertical-align:top;"><span style="font-family:'Special Elite',Georgia,serif;font-size:14px;color:#1a1a1a;display:block;letter-spacing:0.02em;margin-bottom:2px;">Mara Schmitman</span><span style="font-family:'Courier Prime',Courier,monospace;font-size:11px;color:#7a7874;display:block;margin-bottom:10px;">Founder</span><table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:10px;"><tr><td style="height:1px;background:#e8e4de;font-size:1px;line-height:1px;">&nbsp;</td></tr></table><span style="font-family:'Special Elite',Georgia,serif;font-size:16px;color:#1a1a1a;display:block;letter-spacing:0.04em;margin-bottom:2px;">BONDY</span><span style="font-family:'Courier Prime',Courier,monospace;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:#7a7874;display:block;margin-bottom:5px;">The standard for technical hiring since 2008</span><a href="https://wearebondy.com" style="font-family:'Courier Prime',Courier,monospace;font-size:11px;color:#4a8c40;text-decoration:none;">wearebondy.com</a></td></tr></table>

## Formato de respuesta obligatorio

## [NOMBRE EMPRESA] — [GO / HOLD / NO]

### Score ICP
| Dimensión | Score | Motivo |
|---|---|---|
| Fit ICP | X/10 | ... |
| Urgencia | X/10 | ... |
| Acceso contacto | X/10 | ... |
| Revenue potencial | X/10 | ... |
| Facilidad cierre | X/10 | ... |
| **TOTAL** | **X.X/10** | |

### Señales clave
- [señal concreta con dato]
- [señal concreta con dato]

### Contacto
**Nombre:** ...
**Rol:** ...
**Email:** ... (verificado / inferido)

### Draft de email
**Para:** [email]
**Asunto:** [asunto]

[cuerpo + firma HTML]

### Próximos pasos
- Enviar email
- Follow-up: [hoy + 5 días hábiles, fecha exacta]`

export async function POST(request) {
  try {
    const { input, context, type } = await request.json()

    if (!input?.trim()) {
      return new Response(JSON.stringify({ error: 'Input requerido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en Vercel' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const typeLabels = {
      new: 'empresa nueva (prospecting en frío)',
      reactivation: 'reactivación de ex-cliente o contacto histórico',
      secondary: 'lead secundario detectado (de otro contacto)',
      contact: 'nuevo contacto en empresa ya conocida',
    }

    const today = new Date().toLocaleDateString('es-AR', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })

    const userMessage = `Analizá este lead para Bondy:

**Tipo de análisis:** ${typeLabels[type] || 'empresa nueva'}
**Input:** ${input}${context ? `\n**Contexto adicional:** ${context}` : ''}

Ejecutá el workflow completo: research web, roles abiertos, scoring ICP, identificación de contacto y draft de email si corresponde.
Hoy es ${today}.`

    const client = new Anthropic({ apiKey })

    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const anthropicStream = await client.messages.stream({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            tools: [
              { type: 'web_search_20250305', name: 'web_search' },
            ],
            messages: [{ role: 'user', content: userMessage }],
          })

          for await (const event of anthropicStream) {
            if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
              )
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Error desconocido'
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Error interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
