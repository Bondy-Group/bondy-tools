import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export function getSupabaseAdmin() {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function saveInterviewToSupabase({
  candidateName,
  candidateEmail,
  candidateAirtableId,
  reportType,
  reportContent,
  clientName,
  jobDescription,
  linkedinUrl,
  recruiterName,
  rawTranscript,
  scorecardId,
  scorecardData,
}) {
  const supabase = getSupabaseAdmin()

  const { data, error } = await supabase
    .from('interview_reports')
    .insert({
      candidate_name: candidateName || null,
      candidate_email: candidateEmail || null,
      candidate_airtable_id: candidateAirtableId || null,
      report_type: reportType,
      report_content: reportContent,
      client_name: clientName || null,
      job_description: jobDescription || null,
      linkedin_url: linkedinUrl || null,
      recruiter_name: recruiterName || null,
      raw_transcript: rawTranscript || null,
      scorecard_id: scorecardId || null,
      scorecard_data: scorecardData || null,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error('Supabase save error:', error)
    throw error
  }

  return data
}
