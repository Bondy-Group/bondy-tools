/**
 * app/api/culture-quiz/route.ts
 *
 * POST handler for public culture quiz submissions.
 * Validates with Zod, maps answers to cultural profile, inserts into
 * the `potential_clients` table on the Bondy ATS Supabase project.
 *
 * Uses NEXT_PUBLIC_SUPABASE_URL_ATS + SUPABASE_SERVICE_ROLE_KEY_ATS
 * (separate from bondy-tools' own Supabase instance).
 * Does NOT use getSupabaseAdmin() from lib/supabase.js — that client
 * points at the bondy-tools instance.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { mapAnswersToProfile } from '@/lib/culture-quiz-mapping'

// ---------------------------------------------------------------------------
// ATS Supabase client (server-side only, service role)
// ---------------------------------------------------------------------------

function getATSClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL_ATS
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY_ATS
  if (!url || !key) {
    throw new Error(
      'Missing env vars: NEXT_PUBLIC_SUPABASE_URL_ATS and SUPABASE_SERVICE_ROLE_KEY_ATS are required'
    )
  }
  return createClient(url, key)
}

// ---------------------------------------------------------------------------
// Zod schema — must stay in sync with QuizAnswers in culture-quiz-mapping.ts
// ---------------------------------------------------------------------------

const quizSchema = z.object({
  // Step 1 — Lead info
  companyName:   z.string().min(1, 'Company name is required'),
  contactName:   z.string().min(1, 'Contact name is required'),
  email:         z.string().email('A valid email is required'),
  role:          z.string().optional(),
  companySize:   z.string().min(1, 'Company size is required'),
  industry:      z.array(z.string()).max(3).optional(),

  // Step 2 — Work style & autonomy
  autonomyLevel:      z.number().int().min(1).max(5),
  ambiguityHandling:  z.enum(['wait-for-clarity', 'ask-then-proceed', 'assume-and-move', 'thrive-in-it']),
  speedQuality:       z.number().int().min(1).max(5),
  processStructure:   z.enum(['very-structured', 'some-structure', 'mostly-adhoc', 'figure-it-out']),

  // Step 3 — Team & communication
  collaborationStyle:      z.enum(['async-first', 'hybrid-mix', 'sync-heavy']),
  remoteSetup:             z.enum(['fully-remote', 'hybrid', 'fully-onsite']),
  collaborationImportance: z.number().int().min(1).max(5),
  communicationMethod:     z.enum(['slack-chat', 'email', 'video-calls', 'in-person']),

  // Step 4 — Culture & values
  missionImportance: z.number().int().min(1).max(5),
  feedbackHandling:  z.enum(['direct-frequent', 'structured-reviews', 'informal', 'rarely']),
  growthStage:       z.enum(['early-stage', 'scaling', 'established']),
  freeTextNotes:     z.string().optional(),
})

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validated = quizSchema.parse(body)

    const culturalProfile = mapAnswersToProfile(validated)

    const supabase = getATSClient()
    const { data, error } = await supabase
      .from('potential_clients')
      .insert({
        company_name:     validated.companyName,
        contact_name:     validated.contactName,
        email:            validated.email,
        role:             validated.role      || null,
        company_size:     validated.companySize,
        industry:         validated.industry?.join(', ') || null,
        raw_answers:      validated,
        cultural_profile: culturalProfile,
        free_text_notes:  validated.freeTextNotes || null,
        source:           'public_questionnaire',
        status:           'new',
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, id: data.id })

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: err.issues },
        { status: 400 }
      )
    }
    console.error('[culture-quiz] Submission error:', err)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
