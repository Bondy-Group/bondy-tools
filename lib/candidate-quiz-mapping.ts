import type { Lang } from './candidate-quiz-i18n'

export type CandidateQuizAnswers = {
  name: string
  email: string
  linkedinUrl?: string
  jobTitle?: string
  yearsOfExperience?: number
  location?: string
  autonomyPreference: number
  ambiguityHandling: string
  speedQuality: number
  processPreference: string
  collaborationStyle: string
  remotePreference: string
  collaborationImportance: number
  communicationMethod: string
  missionImportance: number
  feedbackPreference: string
  environmentType: string
  freeTextNotes?: string
}

export type CulturalDimension = {
  score: number
  description: string
}

export type CandidateCulturalProfile = {
  autonomia: CulturalDimension
  teamwork: CulturalDimension
  comunicacion: CulturalDimension
  ambiguedad: CulturalDimension
  velocidadCalidad: CulturalDimension
  misionAlineacion: CulturalDimension
  feedbackCultura: CulturalDimension
  remoteFirst: CulturalDimension
}

const PROCESS_ADJUSTMENTS: Record<string, number> = {
  'very-structured': -1,
  'some-structure':   0,
  'mostly-adhoc':    +1,
  'figure-it-out':   +1,
}

const AMBIGUITY_SCORES: Record<string, number> = {
  'wait-for-clarity':  2,
  'ask-then-proceed':  5,
  'assume-and-move':   8,
  'thrive-in-it':     10,
}

const COLLABORATION_SCORES: Record<string, number> = {
  'async-first': 8,
  'hybrid-mix':  6,
  'sync-heavy':  4,
}

const COMMUNICATION_ADJUSTMENTS: Record<string, number> = {
  'slack-chat':  +1,
  'email':        0,
  'video-calls': -1,
  'in-person':   -2,
}

const REMOTE_BASE_SCORES: Record<string, number> = {
  'fully-remote':  9,
  'hybrid':        5,
  'fully-onsite':  1,
}

const REMOTE_COLLAB_ADJUSTMENTS: Record<string, number> = {
  'async-first': +1,
  'hybrid-mix':   0,
  'sync-heavy':  -1,
}

const FEEDBACK_SCORES: Record<string, number> = {
  'direct-frequent':    9,
  'structured-reviews': 6,
  'informal':           4,
  'rarely':             2,
}

function clamp(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n)))
}

function describeAutonomia(_a: CandidateQuizAnswers, score: number, lang: Lang): string {
  if (lang === 'es') {
    if (score >= 8) return `Prefiere entornos de alta autonomía — toma decisiones de punta a punta con supervisión mínima.`
    if (score >= 5) return `Cómodo con responsabilidad clara dentro de límites definidos. No necesita microgestión.`
    return `Prefiere contextos estructurados donde las decisiones están bien documentadas y hay validación disponible.`
  }
  if (score >= 8) return `Thrives in high-autonomy environments — owns decisions end-to-end with minimal oversight.`
  if (score >= 5) return `Comfortable with clear ownership within defined boundaries. Doesn't need micromanagement.`
  return `Prefers structured contexts where decisions are well-documented and validation is available.`
}

function describeAmbiguedad(_a: CandidateQuizAnswers, score: number, lang: Lang): string {
  if (lang === 'es') {
    if (score >= 9) return `Se desenvuelve activamente en la ambigüedad — sin especificaciones completas no es un problema.`
    if (score >= 7) return `Cómodo operando con información incompleta — hace suposiciones y ajusta sobre la marcha.`
    if (score >= 4) return `Maneja la ambigüedad buscando clarificación antes de avanzar.`
    return `Trabaja mejor con requisitos claros y alcance bien definido.`
  }
  if (score >= 9) return `Actively thrives in ambiguity — incomplete specs and unclear direction are not a problem.`
  if (score >= 7) return `Comfortable with incomplete information — makes assumptions and adjusts along the way.`
  if (score >= 4) return `Handles ambiguity by seeking clarification before moving forward.`
  return `Works best with clear requirements and well-defined scope.`
}

function describeVelocidadCalidad(_a: CandidateQuizAnswers, score: number, lang: Lang): string {
  if (lang === 'es') {
    if (score >= 9) return `Velocidad sobre perfección — prefiere lanzar rápido e iterar en producción.`
    if (score >= 6) return `Apunta a la velocidad sin sacrificar estándares mínimos de calidad.`
    if (score >= 4) return `Equilibra velocidad y calidad según el contexto y las apuestas.`
    return `Calidad primero — prefiere hacerlo bien desde el inicio sobre lanzar rápido.`
  }
  if (score >= 9) return `Speed over perfection — prefers shipping fast and iterating in production.`
  if (score >= 6) return `Leans toward speed without sacrificing minimum quality standards.`
  if (score >= 4) return `Balances speed and quality — depends on context and stakes.`
  return `Quality first — prefers getting it right upfront over shipping fast.`
}

function describeTeamwork(_a: CandidateQuizAnswers, score: number, lang: Lang): string {
  if (lang === 'es') {
    if (score >= 8) return `Altamente colaborativo — prospera cuando el éxito es colectivo y trabaja cerca de un equipo.`
    if (score >= 5) return `Valora la colaboración pero también disfruta de la contribución individual enfocada.`
    return `Principalmente orientado a la contribución individual — prefiere tener su propio carril.`
  }
  if (score >= 8) return `Highly collaborative — thrives when success is collective and works closely with a team.`
  if (score >= 5) return `Values collaboration but also enjoys focused individual contribution.`
  return `Primarily individually-oriented — prefers owning their own lane.`
}

function describeComunicacion(a: CandidateQuizAnswers, score: number, lang: Lang): string {
  const isAsync = a.collaborationStyle === 'async-first'
  if (lang === 'es') {
    if (score >= 7) return `Comunicador escrito fuerte. ${isAsync ? 'Prefiere async — docs claros, hilos y actualizaciones estructuradas.' : 'Se comunica con claridad a través de múltiples canales.'}`
    if (score >= 5) return `Estilo de comunicación mixto — combina escrito y verbal según el contexto.`
    return `Prefiere comunicación verbal y cara a cara sobre documentación escrita.`
  }
  if (score >= 7) return `Strong written communicator. ${isAsync ? 'Prefers async — clear docs, threads, and structured updates.' : 'Communicates clearly across multiple channels.'}`
  if (score >= 5) return `Mixed communication style — blends written and verbal depending on context.`
  return `Prefers verbal and face-to-face communication over written documentation.`
}

function describeRemoteFirst(a: CandidateQuizAnswers, score: number, lang: Lang): string {
  if (lang === 'es') {
    if (a.remotePreference === 'fully-remote') {
      return score >= 8
        ? `Prefiere trabajo 100% remoto con prácticas async maduras.`
        : `Prefiere trabajo remoto y se adapta bien a entornos distribuidos.`
    }
    if (a.remotePreference === 'hybrid') return `Prefiere modalidad híbrida — flexibilidad remota con algo de colaboración presencial.`
    return `Prefiere trabajo presencial — el contacto cara a cara es importante para su forma de trabajar.`
  }
  if (a.remotePreference === 'fully-remote') {
    return score >= 8
      ? `Prefers 100% remote work with mature async practices.`
      : `Prefers remote work and adapts well to distributed environments.`
  }
  if (a.remotePreference === 'hybrid') return `Prefers hybrid — remote flexibility with some in-person collaboration.`
  return `Prefers on-site work — face-to-face contact is important to how they operate.`
}

function describeMisionAlineacion(_a: CandidateQuizAnswers, score: number, lang: Lang): string {
  if (lang === 'es') {
    if (score >= 8) return `La misión es un filtro primario — necesita creer genuinamente en el propósito de la empresa.`
    if (score >= 5) return `La misión importa pero no es el único criterio. Cultura, equipo y rol tienen un peso similar.`
    return `La misión es secundaria — el fit del rol y la calidad del equipo son los factores principales.`
  }
  if (score >= 8) return `Mission is a primary filter — needs to genuinely believe in what the company is building.`
  if (score >= 5) return `Mission matters but isn't the only criterion. Culture, team, and role carry similar weight.`
  return `Mission is secondary — role fit and team quality are the primary decision factors.`
}

function describeFeedbackCultura(_a: CandidateQuizAnswers, score: number, lang: Lang): string {
  if (lang === 'es') {
    if (score >= 8) return `Prospera con feedback directo y frecuente — las conversaciones cándidas son esperadas y bienvenidas.`
    if (score >= 5) return `Prefiere feedback estructurado en ciclos regulares. Consistente pero no necesariamente constante.`
    if (score >= 3) return `Cómodo con feedback informal y ocasional.`
    return `Prefiere entornos con feedback mínimo — trabaja mejor con alta autonomía y poca supervisión.`
  }
  if (score >= 8) return `Thrives on direct, frequent feedback — candid conversations are expected and welcome.`
  if (score >= 5) return `Prefers structured feedback in regular cycles. Consistent but not necessarily constant.`
  if (score >= 3) return `Comfortable with informal and occasional feedback.`
  return `Prefers minimal feedback environments — works best with high autonomy and little oversight.`
}

export function mapCandidateAnswersToProfile(
  answers: CandidateQuizAnswers,
  lang: Lang = 'en'
): CandidateCulturalProfile {
  const autonomiaRaw = (answers.autonomyPreference * 2) + (PROCESS_ADJUSTMENTS[answers.processPreference] ?? 0)
  const autonomiaScore = clamp(autonomiaRaw)

  const ambiguedadScore = clamp(AMBIGUITY_SCORES[answers.ambiguityHandling] ?? 5)
  const velocidadScore  = clamp(answers.speedQuality * 2)
  const teamworkScore   = clamp(answers.collaborationImportance * 2)

  const comunicacionBase  = COLLABORATION_SCORES[answers.collaborationStyle] ?? 6
  const comunicacionAdj   = COMMUNICATION_ADJUSTMENTS[answers.communicationMethod] ?? 0
  const comunicacionScore = clamp(comunicacionBase + comunicacionAdj)

  const remoteBase  = REMOTE_BASE_SCORES[answers.remotePreference] ?? 5
  const remoteAdj   = REMOTE_COLLAB_ADJUSTMENTS[answers.collaborationStyle] ?? 0
  const remoteScore = clamp(remoteBase + remoteAdj)

  const misionScore   = clamp(answers.missionImportance * 2)
  const feedbackScore = clamp(FEEDBACK_SCORES[answers.feedbackPreference] ?? 5)

  return {
    autonomia:        { score: autonomiaScore,    description: describeAutonomia(answers, autonomiaScore, lang) },
    ambiguedad:       { score: ambiguedadScore,   description: describeAmbiguedad(answers, ambiguedadScore, lang) },
    velocidadCalidad: { score: velocidadScore,    description: describeVelocidadCalidad(answers, velocidadScore, lang) },
    teamwork:         { score: teamworkScore,     description: describeTeamwork(answers, teamworkScore, lang) },
    comunicacion:     { score: comunicacionScore, description: describeComunicacion(answers, comunicacionScore, lang) },
    remoteFirst:      { score: remoteScore,       description: describeRemoteFirst(answers, remoteScore, lang) },
    misionAlineacion: { score: misionScore,       description: describeMisionAlineacion(answers, misionScore, lang) },
    feedbackCultura:  { score: feedbackScore,     description: describeFeedbackCultura(answers, feedbackScore, lang) },
  }
}
