import { createClient } from '@supabase/supabase-js'

let _supabaseAdmin = null

export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Supabase env vars not configured (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)')
    }
    _supabaseAdmin = createClient(url, key, {
      auth: { persistSession: false }
    })
  }
  return _supabaseAdmin
}

export async function saveInterviewToSupabase({
  candidateName,
  candidateLinkedin,
  jobDescription,
  notes,
  client,
  screeningReport,
  scorecardId,
  scorecardIdDb,
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
      candidate_linkedin: candidateLinkedin || null,
      job_description: jobDescription || null,
      interview_notes: notes || null,
      client_name: client || null,
      screening_report: screeningReport || null,
      scorecard_id: scorecardId || null,
      scorecard_id_db: scorecardIdDb || null,
      scorecard_data: scorecardData || null,
      technical_skills_data: technicalSkillsData || null,
      soft_skills_data: softSkillsData || null,
      technical_score: technicalScore ?? null,
      soft_score: softScore ?? null,
      overall_score: overallScore ?? null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}
