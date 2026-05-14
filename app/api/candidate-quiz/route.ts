import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { mapCandidateAnswersToProfile } from '@/lib/candidate-quiz-mapping'

function getATSClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_ATS
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_ATS
  if (!url || !key) throw new Error('Missing env vars: NEXT_PUBLIC_SUPABASE_URL_ATS and SUPABASE_SERVICE_ROLE_KEY_ATS')
  return createClient(url, key)
}

const schema = z.object({
  name:  z.string().min(1, 'Name is required'),
  email: z.string().email('A valid email is required'),
  linkedinUrl:        z.string().optional(),
  jobTitle:           z.string().optional(),
  yearsOfExperience:  z.number().int().min(0).max(60).optional(),
  location:           z.string().optional(),

  autonomyPreference:     z.number().int().min(1).max(5),
  ambiguityHandling:      z.enum(['wait-for-clarity', 'ask-then-proceed', 'assume-and-move', 'thrive-in-it']),
  speedQuality:           z.number().int().min(1).max(5),
  processPreference:      z.enum(['very-structured', 'some-structure', 'mostly-adhoc', 'figure-it-out']),

  collaborationStyle:     z.enum(['async-first', 'hybrid-mix', 'sync-heavy']),
  remotePreference:       z.enum(['fully-remote', 'hybrid', 'fully-onsite']),
  collaborationImportance:z.number().int().min(1).max(5),
  communicationMethod:    z.enum(['slack-chat', 'email', 'video-calls', 'in-person']),

  missionImportance:  z.number().int().min(1).max(5),
  feedbackPreference: z.enum(['direct-frequent', 'structured-reviews', 'informal', 'rarely']),
  environmentType:    z.enum(['early-stage', 'scaling', 'established']),
  freeTextNotes:      z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body      = await request.json()
    const validated = schema.parse(body)

    const profileWithDescriptions = mapCandidateAnswersToProfile(validated)
    // Store scores only — matches cultural_profiles.radar_data shape in bondy-ats
    const culturalProfile = Object.fromEntries(
      Object.entries(profileWithDescriptions).map(([k, v]) => [k, v.score])
    )

    const supabase = getATSClient()
    const { data, error } = await supabase
      .from('potential_candidates')
      .insert({
        name:                validated.name,
        email:               validated.email,
        linkedin_url:        validated.linkedinUrl        || null,
        job_title:           validated.jobTitle           || null,
        years_of_experience: validated.yearsOfExperience  ?? null,
        location:            validated.location           || null,
        raw_answers:         validated,
        cultural_profile:    culturalProfile,
        free_text_notes:     validated.freeTextNotes      || null,
        source:              'candidate_questionnaire',
        status:              'new',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    console.error('[candidate-quiz] Submission error:', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
