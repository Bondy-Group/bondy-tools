/**
 * culture-quiz-mapping.ts
 *
 * Pure, deterministic function that converts quiz answers into a cultural
 * profile across the 8 Bondy dimensions. No API calls — scores are computed
 * synchronously so the radar chart can update live on step 5.
 *
 * Scores are on a 1-10 scale, matching the format consumed by CULTURAL_FIT_PROMPT
 * in lib/prompts.js. To tweak scoring logic, edit the mapping tables below.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QuizAnswers = {
  // Step 1 — Lead info (not used for scoring)
  companyName: string
  contactName: string
  email: string
  role?: string
  companySize: string
  industry?: string

  // Step 2 — Work style & autonomy
  autonomyLevel: number          // 1–5 (1 = very little, 5 = full autonomy)
  ambiguityHandling: string      // choice key (see AMBIGUITY_SCORES below)
  speedQuality: number           // 1–5 (1 = perfect quality, 5 = ship fast)
  processStructure: string       // choice key (see PROCESS_ADJUSTMENTS below)

  // Step 3 — Team & communication
  collaborationStyle: string     // choice key (see COLLABORATION_SCORES below)
  remoteSetup: string            // choice key (see REMOTE_BASE_SCORES below)
  collaborationImportance: number // 1–5 (1 = mostly individual, 5 = highly collaborative)
  communicationMethod: string    // choice key (see COMMUNICATION_ADJUSTMENTS below)

  // Step 4 — Culture & values
  missionImportance: number      // 1–5
  feedbackHandling: string       // choice key (see FEEDBACK_SCORES below)
  growthStage: string            // choice key — used only for descriptions
  freeTextNotes?: string
}

export type CulturalDimension = {
  score: number      // 1–10
  description: string
}

export type CulturalProfile = {
  autonomia: CulturalDimension
  teamwork: CulturalDimension
  comunicacion: CulturalDimension
  ambiguedad: CulturalDimension
  velocidadCalidad: CulturalDimension
  misionAlineacion: CulturalDimension
  feedbackCultura: CulturalDimension
  remoteFirst: CulturalDimension
}

// ---------------------------------------------------------------------------
// Scoring tables — edit these to tweak weights
// ---------------------------------------------------------------------------

/**
 * AUTONOMIA: how much autonomy team members have.
 * Primary driver: autonomyLevel scale (1–5 → ×2 = 2–10).
 * Secondary adjustment: processStructure (more ad-hoc = higher autonomy).
 */
const PROCESS_ADJUSTMENTS: Record<string, number> = {
  'very-structured':   -1,  // Heavy process = lower effective autonomy
  'some-structure':     0,  // Neutral
  'mostly-adhoc':      +1,  // Light process = higher autonomy
  'figure-it-out':     +1,  // No process = highest autonomy
}

/**
 * AMBIGUEDAD: tolerance for working with incomplete information.
 */
const AMBIGUITY_SCORES: Record<string, number> = {
  'wait-for-clarity':  2,   // Low tolerance — needs clear specs
  'ask-then-proceed':  5,   // Moderate — clarifies before moving
  'assume-and-move':   8,   // High — makes assumptions and ships
  'thrive-in-it':     10,   // Very high — ambiguity is the norm
}

/**
 * VELOCIDAD_CALIDAD: speed-quality spectrum.
 * speedQuality scale (1–5 → ×2 = 2–10).
 * High score = speed priority. Low score = quality priority.
 */
// No lookup table needed — direct scale multiplication.

/**
 * TEAMWORK: how collaborative vs individual the team is.
 * collaborationImportance scale (1–5 → ×2 = 2–10).
 */
// No lookup table needed — direct scale multiplication.

/**
 * COMUNICACION: clarity and effectiveness of communication.
 * Primary driver: collaborationStyle (async = high written comms clarity).
 * Secondary adjustment: communicationMethod.
 */
const COLLABORATION_SCORES: Record<string, number> = {
  'async-first':  8,   // Async = high written communication standards
  'hybrid-mix':   6,   // Mixed = moderate
  'sync-heavy':   4,   // Sync-heavy = often less reliance on written clarity
}

const COMMUNICATION_ADJUSTMENTS: Record<string, number> = {
  'slack-chat':  +1,  // Written async tool = higher comunicacion
  'email':        0,  // Neutral
  'video-calls': -1,  // Verbal-first = less written discipline
  'in-person':   -2,  // In-person = least written communication
}

/**
 * REMOTE_FIRST: maturity for distributed/remote work.
 * Primary driver: remoteSetup.
 * Secondary adjustment: collaborationStyle.
 */
const REMOTE_BASE_SCORES: Record<string, number> = {
  'fully-remote':  9,  // Fully remote = highest remote maturity
  'hybrid':        5,  // Hybrid = moderate
  'fully-onsite':  1,  // On-site = low remote-first culture
}

const REMOTE_COLLAB_ADJUSTMENTS: Record<string, number> = {
  'async-first':  +1,  // Async compounds remote-first maturity
  'hybrid-mix':    0,
  'sync-heavy':   -1,  // Sync-heavy reduces remote effectiveness
}

/**
 * FEEDBACK_CULTURA: openness to giving and receiving feedback.
 */
const FEEDBACK_SCORES: Record<string, number> = {
  'direct-frequent':    9,  // Direct and frequent = strongest feedback culture
  'structured-reviews': 6,  // Formal cycles = moderate
  'informal':           4,  // Informal/occasional = low-ish
  'rarely':             2,  // Almost no feedback culture
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Clamps a score to the 1–10 range */
function clamp(n: number): number {
  return Math.min(10, Math.max(1, Math.round(n)))
}

// ---------------------------------------------------------------------------
// Description generators — readable, auto-generated from answer combinations
// ---------------------------------------------------------------------------

function describeAutonomia(answers: QuizAnswers, score: number): string {
  if (score >= 8) return `High-autonomy culture. Team members own decisions end-to-end with ${answers.processStructure === 'very-structured' ? 'some' : 'minimal'} process overhead.`
  if (score >= 5) return `Moderate autonomy. Team has clear ownership within defined boundaries.`
  return `Low autonomy environment. Decisions typically require sign-off and follow structured processes.`
}

function describeAmbiguedad(answers: QuizAnswers, score: number): string {
  if (score >= 9) return `Ambiguity is the default state. Team actively thrives without full specs or clear direction.`
  if (score >= 7) return `Comfortable operating with incomplete information — makes assumptions and adjusts as needed.`
  if (score >= 4) return `Handles ambiguity by seeking clarification before proceeding. Prefers some clarity upfront.`
  return `Low ambiguity tolerance. Team works best with detailed requirements and clear scope.`
}

function describeVelocidadCalidad(answers: QuizAnswers, score: number): string {
  if (score >= 9) return `Speed-first culture. Ships fast and iterates. Perfectionism is actively avoided.`
  if (score >= 6) return `Leans toward speed with quality guardrails. Iterative, but maintains standards.`
  if (score >= 4) return `Balanced approach. Neither speed nor quality clearly dominates — context-dependent.`
  return `Quality-first culture. Thoroughness and correctness matter more than shipping speed.`
}

function describeTeamwork(answers: QuizAnswers, score: number): string {
  if (score >= 8) return `Highly collaborative team. Success is collective — individual output is meaningful only in team context.`
  if (score >= 5) return `Collaboration is valued but individual contribution also matters. Balanced team dynamics.`
  return `Primarily individual-contribution culture. Teamwork exists but autonomy and personal output dominate.`
}

function describeComunicacion(answers: QuizAnswers, score: number): string {
  const style = answers.collaborationStyle === 'async-first'
    ? 'async-first'
    : answers.collaborationStyle === 'sync-heavy' ? 'sync-heavy' : 'hybrid'
  if (score >= 7) return `Strong written communication culture. ${style === 'async-first' ? 'Async-first — relies on clear docs, Slack threads, and structured updates.' : 'Clear, frequent communication across channels.'}`
  if (score >= 5) return `Moderate communication standards. Mix of written and verbal, ${style} approach.`
  return `Communication is primarily verbal and in-person. Less emphasis on written documentation.`
}

function describeRemoteFirst(answers: QuizAnswers, score: number): string {
  if (answers.remoteSetup === 'fully-remote') {
    if (score >= 8) return `100% remote team with mature distributed work practices. Async-first, high documentation standards.`
    return `Fully remote setup with developing async habits. Strong remote intent.`
  }
  if (answers.remoteSetup === 'hybrid') return `Hybrid setup — some remote flexibility but in-person collaboration still plays a role.`
  return `Primarily on-site. Remote work is not a core expectation for this role.`
}

function describeMisionAlineacion(answers: QuizAnswers, score: number): string {
  if (score >= 8) return `Mission alignment is a primary hiring filter. Candidates must genuinely connect with the company's purpose.`
  if (score >= 5) return `Mission matters but is not the top screening criterion. Culture and skills carry similar weight.`
  return `Mission alignment is a secondary consideration. Skills and experience are the primary hiring filters.`
}

function describeFeedbackCultura(answers: QuizAnswers, score: number): string {
  if (score >= 8) return `Direct, high-frequency feedback culture. Candid conversations are expected and normalized at all levels.`
  if (score >= 5) return `Structured feedback through formal review cycles. Less real-time, but consistent.`
  if (score >= 3) return `Occasional informal feedback. Not a strong feedback-first environment.`
  return `Feedback culture is underdeveloped. Critical conversations are rare or avoided.`
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function mapAnswersToProfile(answers: QuizAnswers): CulturalProfile {

  // — AUTONOMIA —
  // Scale: autonomyLevel (1–5) × 2, then adjust for process structure
  const autonomiaRaw = (answers.autonomyLevel * 2) + (PROCESS_ADJUSTMENTS[answers.processStructure] ?? 0)
  const autonomiaScore = clamp(autonomiaRaw)

  // — AMBIGUEDAD —
  // Direct lookup from choice
  const ambiguedadScore = clamp(AMBIGUITY_SCORES[answers.ambiguityHandling] ?? 5)

  // — VELOCIDAD_CALIDAD —
  // speedQuality (1–5) × 2
  const velocidadScore = clamp(answers.speedQuality * 2)

  // — TEAMWORK —
  // collaborationImportance (1–5) × 2
  const teamworkScore = clamp(answers.collaborationImportance * 2)

  // — COMUNICACION —
  // Base from collaboration style, adjusted by communication method
  const comunicacionBase = COLLABORATION_SCORES[answers.collaborationStyle] ?? 6
  const comunicacionAdj = COMMUNICATION_ADJUSTMENTS[answers.communicationMethod] ?? 0
  const comunicacionScore = clamp(comunicacionBase + comunicacionAdj)

  // — REMOTE_FIRST —
  // Base from remote setup, adjusted by collaboration style
  const remoteBase = REMOTE_BASE_SCORES[answers.remoteSetup] ?? 5
  const remoteAdj = REMOTE_COLLAB_ADJUSTMENTS[answers.collaborationStyle] ?? 0
  const remoteScore = clamp(remoteBase + remoteAdj)

  // — MISION_ALINEACION —
  // missionImportance (1–5) × 2
  const misionScore = clamp(answers.missionImportance * 2)

  // — FEEDBACK_CULTURA —
  // Direct lookup from choice
  const feedbackScore = clamp(FEEDBACK_SCORES[answers.feedbackHandling] ?? 5)

  return {
    autonomia: {
      score: autonomiaScore,
      description: describeAutonomia(answers, autonomiaScore),
    },
    ambiguedad: {
      score: ambiguedadScore,
      description: describeAmbiguedad(answers, ambiguedadScore),
    },
    velocidadCalidad: {
      score: velocidadScore,
      description: describeVelocidadCalidad(answers, velocidadScore),
    },
    teamwork: {
      score: teamworkScore,
      description: describeTeamwork(answers, teamworkScore),
    },
    comunicacion: {
      score: comunicacionScore,
      description: describeComunicacion(answers, comunicacionScore),
    },
    remoteFirst: {
      score: remoteScore,
      description: describeRemoteFirst(answers, remoteScore),
    },
    misionAlineacion: {
      score: misionScore,
      description: describeMisionAlineacion(answers, misionScore),
    },
    feedbackCultura: {
      score: feedbackScore,
      description: describeFeedbackCultura(answers, feedbackScore),
    },
  }
}
