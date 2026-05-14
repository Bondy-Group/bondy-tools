import { describe, it, expect } from 'vitest'
import { mapCandidateAnswersToProfile, type CandidateQuizAnswers } from '../candidate-quiz-mapping'

const BASE: CandidateQuizAnswers = {
  name: 'Test User',
  email: 'test@example.com',
  autonomyPreference: 3,
  ambiguityHandling: 'ask-then-proceed',
  speedQuality: 3,
  processPreference: 'some-structure',
  collaborationStyle: 'hybrid-mix',
  remotePreference: 'hybrid',
  collaborationImportance: 3,
  communicationMethod: 'slack-chat',
  missionImportance: 3,
  feedbackPreference: 'structured-reviews',
  environmentType: 'scaling',
}

describe('mapCandidateAnswersToProfile', () => {
  it('returns all 8 expected dimensions', () => {
    const profile = mapCandidateAnswersToProfile(BASE)
    expect(Object.keys(profile)).toEqual(
      expect.arrayContaining([
        'autonomia', 'teamwork', 'comunicacion', 'ambiguedad',
        'velocidadCalidad', 'misionAlineacion', 'feedbackCultura', 'remoteFirst',
      ])
    )
  })

  it('produces scores within 1–10 for all dimensions', () => {
    const profile = mapCandidateAnswersToProfile(BASE)
    for (const dim of Object.values(profile)) {
      expect(dim.score).toBeGreaterThanOrEqual(1)
      expect(dim.score).toBeLessThanOrEqual(10)
    }
  })

  it('computes autonomia from autonomyPreference × 2 + process adjustment', () => {
    // 5 * 2 + 1 (figure-it-out) = 11 → clamped to 10
    const profile = mapCandidateAnswersToProfile({ ...BASE, autonomyPreference: 5, processPreference: 'figure-it-out' })
    expect(profile.autonomia.score).toBe(10)
  })

  it('scores ambiguedad directly from ambiguityHandling choice', () => {
    expect(mapCandidateAnswersToProfile({ ...BASE, ambiguityHandling: 'wait-for-clarity' }).ambiguedad.score).toBe(2)
    expect(mapCandidateAnswersToProfile({ ...BASE, ambiguityHandling: 'assume-and-move' }).ambiguedad.score).toBe(8)
    expect(mapCandidateAnswersToProfile({ ...BASE, ambiguityHandling: 'thrive-in-it' }).ambiguedad.score).toBe(10)
  })

  it('scores velocidadCalidad from speedQuality × 2', () => {
    expect(mapCandidateAnswersToProfile({ ...BASE, speedQuality: 1 }).velocidadCalidad.score).toBe(2)
    expect(mapCandidateAnswersToProfile({ ...BASE, speedQuality: 5 }).velocidadCalidad.score).toBe(10)
  })

  it('scores teamwork from collaborationImportance × 2', () => {
    expect(mapCandidateAnswersToProfile({ ...BASE, collaborationImportance: 1 }).teamwork.score).toBe(2)
    expect(mapCandidateAnswersToProfile({ ...BASE, collaborationImportance: 5 }).teamwork.score).toBe(10)
  })

  it('scores remoteFirst higher for fully-remote + async-first', () => {
    const high = mapCandidateAnswersToProfile({ ...BASE, remotePreference: 'fully-remote', collaborationStyle: 'async-first' })
    const low  = mapCandidateAnswersToProfile({ ...BASE, remotePreference: 'fully-onsite', collaborationStyle: 'sync-heavy' })
    expect(high.remoteFirst.score).toBeGreaterThan(low.remoteFirst.score)
  })

  it('clamps autonomia to minimum 1 when adjustment pushes below', () => {
    // 1 * 2 + (-1) = 1 — exactly at floor
    const profile = mapCandidateAnswersToProfile({ ...BASE, autonomyPreference: 1, processPreference: 'very-structured' })
    expect(profile.autonomia.score).toBeGreaterThanOrEqual(1)
  })

  it('generates different descriptions for EN vs ES', () => {
    const en = mapCandidateAnswersToProfile(BASE, 'en')
    const es = mapCandidateAnswersToProfile(BASE, 'es')
    expect(en.autonomia.description).not.toBe(es.autonomia.description)
  })

  it('each dimension has a non-empty description string', () => {
    const profile = mapCandidateAnswersToProfile(BASE)
    for (const dim of Object.values(profile)) {
      expect(typeof dim.description).toBe('string')
      expect(dim.description.length).toBeGreaterThan(0)
    }
  })
})
