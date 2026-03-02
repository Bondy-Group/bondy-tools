import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCREENING_PROMPT, SCORECARD_PROMPT } from '@/lib/prompts'
import { saveInterviewToSupabase, getSupabaseAdmin } from '@/lib/supabase'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getScorecardById(id) {
  try {
    const supabase = getSupabaseAdmin()
    const { data } = await supabase.from('client_scorecards').select('*').eq('id', id).single()
    return data
  } catch { return null }
}

export async function POST(request) {
  try {
    const { transcript, type, clientProfile, summary, language, clientName, jd, linkedin, recruiterName, candidateName, candidateEmail, techScorecardId, cultScorecardId } = await request.json()
    if (!transcript) return NextResponse.json({ error: 'Transcript requerido' }, { status: 400 })

    if (type === 'screening') {
      const prompt = SCREENING_PROMPT({ language, clientName, jd })
      let userContent = ''
      if (linkedin) userContent += 'LINKEDIN URL: ' + linkedin + '\n\n'
      if (jd) userContent += 'JOB DESCRIPTION:\n' + jd + '\n\n---\n\n'
      if (summary) userContent += 'INTERVIEW SUMMARY:\n' + summary + '\n\n---\n\n'
      userContent += 'INTERVIEW TRANSCRIPT:\n' + transcript

      const [techScData, cultScData] = await Promise.all([
        techScorecardId ? getScorecardById(techScorecardId) : Promise.resolve(null),
        cultScorecardId ? getScorecardById(cultScorecardId) : Promise.resolve(null),
      ])

      const makeScorecardCall = (scData) => {
        if (!scData) return Promise.resolve(null)
        const scPrompt = SCORECARD_PROMPT({ scorecard: scData, language })
        return client.messages.create({ model: 'claude-opus-4-6', max_tokens: 2000, messages: [{ role: 'user', content: scPrompt + '\n\n---\n\nINTERVIEW TRANSCRIPT:\n' + transcript }] })
      }

      const [screeningMsg, techMsg, cultMsg] = await Promise.all([
        client.messages.create({ model: 'claude-opus-4-6', max_tokens: 2500, messages: [{ role: 'user', content: prompt + '\n\n---\n\n' + userContent }] }),
        makeScorecardCall(techScData),
        makeScorecardCall(cultScData),
      ])

      const result = screeningMsg.content[0].text
      const parseScorecard = (msg, scData) => {
        if (!msg) return null
        try {
          const text = msg.content[0].text.trim()
          const match = text.match(/\{[\s\S]*\}/)
          const parsed = match ? JSON.parse(match[0]) : JSON.parse(text)
          parsed.scorecard = scData
          return parsed
        } catch { return null }
      }

      const techResult = parseScorecard(techMsg, techScData)
      const cultResult = parseScorecard(cultMsg, cultScData)
      const fullReport = recruiterName ? result + '\n\n' + (language === 'en' ? 'Interview conducted by' : 'Entrevista realizada por') + ' ' + recruiterName : result

      saveInterviewToSupabase({ candidateName, candidateEmail, clientName, reportType: 'screening', reportContent: result, jobDescription: jd, linkedinUrl: linkedin, recruiterName, rawTranscript: transcript, scorecardId: techScorecardId, scorecardData: techResult ? JSON.stringify(techResult) : null, language: language || 'es' }).catch(console.error)

      return NextResponse.json({ result: fullReport, type: 'screening', techScorecard: techResult, cultScorecard: cultResult })

    } else if (type === 'cultural') {
      const { CULTURAL_FIT_PROMPT } = await import('@/lib/prompts')
      if (!clientProfile) return NextResponse.json({ error: 'Perfil requerido' }, { status: 400 })
      const prompt = CULTURAL_FIT_PROMPT(clientProfile)
      const uc = summary ? 'RESUMEN:\n' + summary + '\n\n---\nTRANSCRIPCIÓN:\n' + transcript : 'TRANSCRIPCIÓN:\n' + transcript
      const message = await client.messages.create({ model: 'claude-opus-4-6', max_tokens: 2000, messages: [{ role: 'user', content: prompt + '\n\n---\n\n' + uc }] })
      let parsed
      try { const text = message.content[0].text.trim(); const m = text.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : JSON.parse(text) }
      catch (e) { return NextResponse.json({ error: 'Error parseo', raw: message.content[0].text }, { status: 500 }) }
      saveInterviewToSupabase({ candidateName, clientName: clientProfile?.name, reportType: 'cultural', reportContent: JSON.stringify(parsed), recruiterName, rawTranscript: transcript }).catch(console.error)
      return NextResponse.json({ result: parsed, type: 'cultural' })
    }
    return NextResponse.json({ error: 'Tipo invalido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
