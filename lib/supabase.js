import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const getSupabaseAdmin = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function saveInterviewToSupabase({
  candidateName,
  candidateEmail,
  clientName,
  scorecardId,
  screeningReport,
  culturalFitReport,
  scorecardReport,
  scorecardData,
  technicalSkillsData,
  softSkillsData,
  technicalScore,
  softScore,
  overallScore,
}) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('interview_reports')
    .insert({
      candidate_name: candidateName || null,
      candidate_email: candidateEmail || null,
      client_name: clientName || null,
      scorecard_id: scorecardId || null,
      screening_report: screeningReport || null,
      cultural_fit_report: culturalFitReport || null,
      scorecard_report: scorecardReport || null,
      scorecard_data: scorecardData || null,
      technical_skills_data: technicalSkillsData || null,
      soft_skills_data: softSkillsData || null,
      technical_score: technicalScore || null,
      soft_score: softScore || null,
      overall_score: overallScore || null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
