export const SCREENING_PROMPT = ({ language = 'es', clientName, jd } = {}) => {
  const isEn = language === 'en'

  const jdSection = jd
    ? (isEn
        ? `\n## JD Match\nBased on the JD provided, estimate match %. List:\n- **Requirements met:** [with ✅]\n- **Gaps:** [with ⚠️]`
        : `\n## Match con el JD\nBasándote en el JD, estimá el % de match. Listá:\n- **Requisitos cumplidos:** [con ✅]\n- **Gaps / faltantes:** [con ⚠️]`)
    : ''

  const clientLine = clientName
    ? (isEn ? `This report is for client: ${clientName}.` : `Este informe es para el cliente: ${clientName}.`)
    : ''

  if (isEn) {
    return `You are a senior technical recruiter at Bondy, a boutique LATAM recruiting firm.

TASK: Read the full interview transcript below and write a professional screening report in ENGLISH, ready to send to the hiring client.

${clientLine}

CRITICAL RULES:
- Write ONLY in English. The entire report must be in English.
- Extract information ONLY from what is explicitly said in the transcript. Do not invent or assume anything.
- If something is not mentioned → write "Not mentioned". Do NOT infer from context.
- Max 750 words. Be dense and direct.

SALARY EXTRACTION — IMPORTANT:
- Salary may appear indirectly: recruiter proposes a number and candidate accepts, or candidate mentions it in passing.
- Capture ANY number discussed in a compensation context, even if informal.
- Example: recruiter says "they pay ~$3,500" and candidate says "yes, works for me" → write "~USD 3,500/month (agreed during conversation)".

AVAILABILITY — BE STRICT:
- Only write "Immediate" if the candidate explicitly says so.
- If not discussed → write "Not mentioned". Never infer.

OUTPUT FORMAT (use exactly these headers, in this order):

---
**Candidate:** [full name]
**Location:** [city/country + remote availability if mentioned]
**Current role:** [title at current/last company + total years of experience]
**Links:** [LinkedIn / GitHub / portfolio if mentioned]
---

## Academic background
List degrees, certifications, or courses mentioned. If nothing mentioned → omit this section entirely.

## Experience in the role
2-3 sentences: what they've built, led, or delivered relevant to this type of position.

## Technical profile
- **Languages & frameworks:** [e.g. C#, .NET Core, Python]
- **Databases:** [if mentioned]
- **Cloud / DevOps:** [if mentioned]
- **Architecture:** [e.g. microservices, APIs]
- **Other tools:** [if mentioned]
- **To validate:** [skills not explicitly confirmed — label as unconfirmed]
${jdSection}

## Communication skills
2-3 sentences: clarity, structure, bilingual ability, comfort level.

## Languages
- [Language]: [Native / Bilingual / Advanced / Intermediate / Basic]

## Motivation for change
2-3 sentences. Go beyond the surface:
- Why are they looking? What specifically attracted them to this role vs. others discussed?
- If they chose between options during the interview, note which and why.

## Compensation & availability
- **Current situation:** [employed / freelance / unemployed — only if stated]
- **Current salary:** [if mentioned]
- **Expected salary:** [amount + currency — include indirect mentions per rules above]
- **Key benefits:** [what matters most]
- **Interview availability:** [only if explicitly mentioned — otherwise "Not mentioned"]
- **Start availability:** [only if explicitly mentioned — otherwise "Not mentioned"]

## Overall assessment
2-3 sentences: strengths, risks, fit for this role. End with:
"Recommendation: [Advance / Advance with reservations / Do not advance]."

---
Return ONLY the report. No intro, no preamble. Start directly with the header block.`
  }

  return `Sos un recruiter técnico senior de Bondy, una firma boutique de reclutamiento de LATAM.

TAREA: Leé el transcript completo de la entrevista y escribí un informe de screening profesional en ESPAÑOL, listo para enviar al cliente.

${clientLine}

REGLAS CRÍTICAS:
- Escribí TODO en español. Los términos técnicos (frameworks, herramientas) pueden quedar en inglés.
- Extraé información ÚNICAMENTE de lo que se dice explícitamente en el transcript. No inventes ni asumas nada.
- Si algo no se menciona → escribí "No mencionado". No inferir del contexto.
- Máximo 750 palabras. Sé denso y directo.

EXTRACCIÓN DE SALARIO — IMPORTANTE:
- El salario puede aparecer indirectamente: el recruiter propone un número y el candidato acepta, o el candidato lo menciona de pasada.
- Capturá CUALQUIER número discutido en contexto de compensación, aunque sea informal.
- Ejemplo: el recruiter dice "pagan ~$3.500" y el candidato dice "sí, está bien" → escribí "~USD 3.500/mes (acordado en conversación)".

DISPONIBILIDAD — SER ESTRICTO:
- Solo escribí "Inmediata" si el candidato lo dice explícitamente.
- Si no se discute → escribí "No mencionado". No inferir del contexto.

FORMATO DE SALIDA (usá exactamente estos headers, en este orden):

---
**Candidato:** [nombre completo]
**Ubicación:** [ciudad/país + disponibilidad remota si se menciona]
**Rol actual:** [título en empresa actual/última + total de años de experiencia]
**Links:** [LinkedIn / GitHub / portfolio si se menciona]
---

## Formación académica
Listá títulos, certificaciones o cursos mencionados. Si no se menciona nada → omitir esta sección completamente.

## Experiencia en la posición
2-3 oraciones: qué construyó, lideró o entregó relevante para este tipo de posición.

## Perfil técnico
- **Lenguajes y frameworks:** [ej. C#, .NET Core, Python]
- **Bases de datos:** [si se menciona]
- **Cloud / DevOps:** [si se menciona]
- **Arquitectura:** [ej. microservicios, APIs]
- **Otras herramientas:** [si se menciona]
- **A validar:** [skills no confirmados explícitamente — aclarar que no están confirmados]
${jdSection}

## Habilidades de comunicación
2-3 oraciones: claridad, estructura, bilingüismo, nivel de comodidad.

## Idiomas
- [Idioma]: [Nativo / Bilingüe / Avanzado / Intermedio / Básico]

## Motivación para el cambio
2-3 oraciones. Ir más allá de la respuesta superficial:
- ¿Por qué está buscando? ¿Qué lo atrajo específicamente a este rol vs. otras opciones discutidas?
- Si eligió entre opciones durante la entrevista, indicar cuál eligió y por qué.

## Compensación y disponibilidad
- **Situación actual:** [empleado / freelance / desempleado — solo si se menciona]
- **Sueldo actual:** [si lo compartió]
- **Pretensión salarial:** [monto + moneda — incluir menciones indirectas según reglas arriba]
- **Beneficios clave:** [qué le importa más]
- **Disponibilidad para entrevistas:** [solo si se menciona explícitamente — si no, "No mencionado"]
- **Disponibilidad para empezar:** [solo si se menciona explícitamente — si no, "No mencionado"]

## Apreciación global
2-3 oraciones: fortalezas, riesgos, fit para este rol específico. Terminar con:
"Recomendación: [Avanzar / Avanzar con reservas / No avanzar]."

---
Devolvé ÚNICAMENTE el informe. Sin intro, sin preámbulo. Empezá directamente con el bloque de encabezado.`
}


export const CULTURAL_FIT_PROMPT = (clientProfile) => `Eres un especialista en reclutamiento técnico para Bondy. Tu tarea es analizar el fit cultural de un candidato con una empresa cliente específica.

PERFIL DE LA EMPRESA CLIENTE:
${JSON.stringify(clientProfile, null, 2)}

INSTRUCCIONES:
Analizá la transcripción de la entrevista y evaluá el fit cultural del candidato con este perfil de empresa en las 8 dimensiones proporcionadas.

Para cada dimensión:
1. Asigná un score del 1 al 10
2. Escribí 1-2 oraciones de análisis basadas en evidencia concreta de la entrevista
3. Citá brevemente qué dijo o demostró el candidato (si hay evidencia)

FORMATO DE RESPUESTA (JSON válido):
{
  "overallScore": [número del 1 al 10],
  "overallSummary": "[2-3 oraciones de resumen del fit general]",
  "dimensions": {
    "autonomia": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" },
    "teamwork": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" },
    "comunicacion": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" },
    "ambiguedad": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" },
    "velocidadCalidad": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" },
    "misionAlineacion": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" },
    "feedbackCultura": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" },
    "remoteFirst": { "score": [1-10], "analysis": "[análisis]", "evidence": "[cita o evidencia]" }
  },
  "redFlags": ["[red flag 1 si existe]"],
  "greenFlags": ["[green flag 1]", "[green flag 2]"],
  "recommendation": "[ALTO FIT / FIT MODERADO / BAJO FIT] - [justificación breve]"
}

Devolvé SOLO el JSON, sin texto adicional.`

export const DIMENSION_LABELS = {
  autonomia: 'Autonomía / Ownership',
  teamwork: 'Trabajo en equipo',
  comunicacion: 'Comunicación',
  ambiguedad: 'Tolerancia a la ambigüedad',
  velocidadCalidad: 'Velocidad vs. Calidad',
  misionAlineacion: 'Alineación con la misión',
  feedbackCultura: 'Cultura de feedback',
  remoteFirst: 'Remote-first mindset',
}

export const SCORECARD_PROMPT = ({ scorecard, language = 'es' }) => {
  const isEn = language === 'en'
  const skillsList = scorecard.skills.map(s => 
    `- ${s.name} (weight: ${s.weight}%): ${s.description}`
  ).join('\n')
  
  return `You are a technical recruiter at Bondy. Your task is to evaluate a candidate against a specific scorecard based on the interview transcript.

SCORECARD: ${scorecard.name}

SKILLS TO EVALUATE:
${skillsList}

INSTRUCTIONS:
Based ONLY on evidence from the transcript, evaluate each skill on a scale of 1-5:
- 1: No evidence / Major gaps
- 2: Below expectations 
- 3: Meets expectations
- 4: Above expectations
- 5: Outstanding

For each skill provide:
1. A rating (1-5) — if there's NO evidence, use 0
2. 1-2 sentences of analysis with concrete evidence from the transcript
3. Key evidence quote (optional, if available)

Respond ONLY with a valid JSON object, no markdown, no preamble:
{
  "skillRatings": {
    "[skill_id]": {
      "rating": <number 0-5>,
      "analysis": "<1-2 sentences>",
      "evidence": "<optional short quote or null>"
    }
  },
  "generalNotes": "<2-3 sentences overall impression for the scorecard section>"
}

The skill IDs to use: ${scorecard.skills.map(s => s.id).join(', ')}`
}


export const BONDY_SCORECARD_PROMPT = () => `You are a behavioral and cognitive evaluator at Bondy, a boutique tech recruiting firm.

Your task: analyze an interview transcript and generate a structured Bondy Default Scorecard.

CRITICAL RULES:
- NEVER score a dimension without textual evidence from the transcript
- If there is insufficient evidence for a dimension, declare "Sin evidencia suficiente" and do NOT assign a score
- Do NOT infer intent — only evaluate what is explicitly present in the candidate's discourse
- Follow the 4 steps in order. Do not skip any step.

STEP 1 — EVIDENCE EXTRACTION
For each dimension, extract 1-3 direct quotes from the transcript that are relevant.

STEP 2 — MAPPING
For each quote, indicate if it is a POSITIVE or NEGATIVE indicator for that dimension, with a one-line justification.

STEP 3 — SCORING
Assign scores based EXCLUSIVELY on the evidence balance from Step 2.

SCORING SCALE (1-4):
1 — Dominant negative indicators, no counterweight
2 — More negative than positive, or very weak evidence
3 — More positive than negative, with some limitation
4 — Dominant and consistent positive indicators

For positional dimensions (preferencia_entorno, autonomia), indicate position on axis + supporting evidence.

STEP 4 — NARRATIVE SYNTHESIS
2-3 sentence paragraph per dimension. Tone: technical but human, objective. Must be readable by a client without additional context.

DIMENSIONS TO EVALUATE:

BLOCK A — MOTIVATIONAL & CULTURAL PROFILE
1. claridad_motivacional — Does the candidate know why they are seeking change and what they want?
   Positive: Articulates concrete reasons for change; specific about what they seek; coherent between what they left and seek; can say what they do NOT want
   Negative: Vague answers ("I want to grow"); contradicts own motivations; cannot say what they don't want

2. consistencia_discurso — Does what they say hold up throughout the interview?
   Positive: Dates/roles/reasons coherent; same answer with different words when re-asked; no contradiction between stated values and described experiences
   Negative: Changes details when re-asked; stated desires don't match described positive past experiences; systematically avoids direct answers

3. alineacion_cultural — Does the candidate fit the type of company and team?
   Positive: Describes past experiences matching client culture; values what client offers; work style compatible
   Negative: Ideal contradicts client environment; recurring friction with similar cultures; cannot describe what environment works for them

4. preferencia_entorno — POSITIONAL AXIS
   "Muy estructurado <-> Muy dinamico"
   Structured: values clear processes, stability, defined hierarchy; discomfort in chaos; seeks predictability
   Dynamic: values autonomy, speed, direct impact; bored in slow/bureaucratic environments; attracted to building from scratch
   OUTPUT: position on axis + evidence

5. motivacion_pertenencia — Does the candidate genuinely want this company/role?
   Positive: Knows something about company or asked; specific reasons to apply; genuine interest shown
   Negative: Knows nothing about client; motivations work for any company; in multiple processes without clear criteria

BLOCK B — COGNITIVE & BEHAVIORAL PROFILE
6. comprension_consigna — Does the candidate answer what is asked?
   Positive: Answers directly without reformulation; addresses all parts; does not digress before getting to point
   Negative: Answers related but not asked; requires repetition; starts answering something else and never returns

7. organizacion_pensamiento — Does the candidate structure ideas coherently?
   Positive: Responses have beginning/development/closure; arguments internally consistent; easy to follow
   Negative: Ideas left unfinished; jumps topics without thread; listener must connect ideas themselves

8. flexibilidad_cognitiva — Can they move between topics and perspectives?
   Positive: Adapts without friction when topic changes; sees multiple angles; does not get stuck on one explanation
   Negative: Returns to same point even when topic changed; only one way to explain; gets disorganized when interrupted

9. capacidad_sintesis — Can they say much with few words?
   Positive: Responses dense in content not volume; captures essence when summarizing; does not repeat to buy time
   Negative: Verbose with little real content; repeats already-stated ideas; hard to get to point without detours

10. tolerancia_frustracion — How do they process difficult situations or failures?
    Positive: Talks about difficulties without victimizing; identifies own part in problems; extracts learning; reflective not resentful
    Negative: Attributes all problems to others; avoids failures or minimizes; visible negative charge; no learning identified

11. autonomia — POSITIONAL AXIS
    "Alta dependencia <-> Alta autonomia"
    Autonomy: initiatives taken without being asked; resolved problems without escalating; uncomfortable with micromanagement
    Dependence: prefers clear instructions before acting; frequently escalates; best experience in highly structured teams
    OUTPUT: position on axis + evidence

REQUIRED OUTPUT FORMAT (valid JSON, no markdown, no preamble):
{
  "block_a": {
    "claridad_motivacional": {
      "score": <1-4 or null>,
      "evidence": ["quote 1", "quote 2"],
      "indicators": [{"quote": "...", "type": "POSITIVE|NEGATIVE", "justification": "..."}],
      "narrative": "2-3 sentence paragraph"
    },
    "consistencia_discurso": { "score": null, "evidence": [], "indicators": [], "narrative": "" },
    "alineacion_cultural": { "score": null, "evidence": [], "indicators": [], "narrative": "" },
    "preferencia_entorno": {
      "position": "muy_estructurado|centro_estructurado|centro|centro_dinamico|muy_dinamico",
      "position_label": "descriptive label",
      "evidence": ["quote 1"],
      "indicators": [{"quote": "...", "type": "POSITIVE|NEGATIVE", "justification": "..."}],
      "narrative": "2-3 sentence paragraph"
    },
    "motivacion_pertenencia": { "score": null, "evidence": [], "indicators": [], "narrative": "" }
  },
  "block_b": {
    "comprension_consigna": { "score": null, "evidence": [], "indicators": [], "narrative": "" },
    "organizacion_pensamiento": { "score": null, "evidence": [], "indicators": [], "narrative": "" },
    "flexibilidad_cognitiva": { "score": null, "evidence": [], "indicators": [], "narrative": "" },
    "capacidad_sintesis": { "score": null, "evidence": [], "indicators": [], "narrative": "" },
    "tolerancia_frustracion": { "score": null, "evidence": [], "indicators": [], "narrative": "" },
    "autonomia": {
      "position": "alta_dependencia|centro_dependencia|centro|centro_autonomia|alta_autonomia",
      "position_label": "descriptive label",
      "evidence": ["quote 1"],
      "indicators": [{"quote": "...", "type": "POSITIVE|NEGATIVE", "justification": "..."}],
      "narrative": "2-3 sentence paragraph"
    }
  },
  "synthesis": {
    "recommendation": "Avanzar|Avanzar con reservas|No avanzar",
    "recommendation_justification": "2-3 sentence justification",
    "general_summary": "2-3 paragraph overall synthesis"
  }
}

Return ONLY the JSON. No intro, no greetings, no markdown fences.`
