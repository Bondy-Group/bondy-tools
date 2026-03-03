import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCREENING_PROMPT, SCORECARD_PROMPT } from '@/lib/prompts'
import { saveInterviewToSupabase } from '@/lib/supabase'
import { calculateWeightedScore } from '@/lib/scorecards'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MODEL = 'claude-sonnet-4-5'

const MAX_TRANSCRIPT_CHARS = 4000

function truncateTranscript(text) {
  if (!text || text.length <= MAX_TRANSCRIPT_CHARS) return { text, truncated: false }
  const cut = text.slice(0, MAX_TRANSCRIPT_CHARS)
  const lastPeriod = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('.\n'))
  const finalCut = lastPeriod > MAX_TRANSCRIPT_CHARS * 0.7 ? cut.slice(0, lastPeriod + 1) : cut
  return { text: finalCut + '\n\n[Transcripci\u00f3n truncada por longitud \u2014 se procesaron los primeros ~4.000 caracteres]', truncated: true }
}

// Normaliza rating 1-5 a escala 0-100
function normalizeRating(rating) {
  if (!rating || rating < 1) return 0
  return Math.round(((rating - 1) / 4) * 100)
}

export async function POST(request) {
  try {
    const body = await request.json()

    const candidateName    = body.candidateName || null
    const linkedinUrl      = body.linkedinUrl || body.candidateLinkedin || null
    const cvText           = body.cvText || null
    const clientName       = body.clientName || body.client || null
    const positionName     = body.positionName || null
    const interviewerNotes = body.interviewerNotes || null
    const rawTranscript    = body.transcript || body.notes || null
    const jobDescription   = body.jobDescription || null
    const scorecardId      = body.scorecardId || null
    const scorecardData    = body.scorecardData || null

    if (!rawTranscript) {
      return NextResponse.json({ error: 'Transcripci\u00f3n requerida' }, { status: 400 })
    }

    const { text: transcript, truncated } = truncateTranscript(rawTranscript)

    let userContent = ''
    if (candidateName)    userContent += `CANDIDATO: ${candidateName}\n\n`
    if (linkedinUrl)      userContent += `LINKEDIN: ${linkedinUrl}\n\n`
    if (cvText)           userContent += `CV DEL CANDIDATO:\n${cvText.slice(0, 1000)}\n\n---\n\n`
    if (clientName)       userContent += `CLIENTE: ${clientName}\n\n`
    if (positionName)     userContent += `POSICI\u00d3N: ${positionName}\n\n`
    if (jobDescription)   userContent += `JOB DESCRIPTION:\n${jobDescription.slice(0, 500)}\n\n---\n\n`
    if (interviewerNotes) userContent += `NOTAS DEL ENTREVISTADOR:\n${interviewerNotes.slice(0, 500)}\n\n---\n\n`
    userContent += `TRANSCRIPCI\u00d3N DE LA ENTREVISTA:\n${transcript}`

    const screeningPrompt = SCREENING_PROMPT({ language: 'es', clientName: clientName || null, jd: jobDescription || null })

    const screeningPromise = anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      messages: [{ role: 'user', content: `${screeningPrompt}\n\n---\n\n${userContent}` }]
    })

    let scorecardPromise = null
    if (scorecardData?.skills?.length > 0) {
      const scPrompt = SCORECARD_PROMPT({
        scorecard: {
          id: scorecardId || 'dynamic',
          name: positionName || (clientName ? `Scorecard ${clientName}` : 'Scorecard'),
          skills: scorecardData.skills,
        }
      })
      scorecardPromise = anthropic.messages.create({
        model: MODEL,
        max_tokens: 1500,
        messages: [{ role: 'user', content: `${scPrompt}\n\n---\n\n${userContent}` }]
      })
    }

    const [screeningResult, scorecardResult] = await Promise.all([
      screeningPromise,
      scorecardPromise || Promise.resolve(null),
    ])

    const screeningText = screeningResult.content[0]?.text || ''

    // Parsear scorecard JSON
    let parsedScorecard = null
    if (scorecardResult) {
      try {
        const rawText = scorecardResult.content[0]?.text || ''
        const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/({[\s\S]*})/)
        if (jsonMatch) parsedScorecard = JSON.parse(jsonMatch[1] || jsonMatch[0])
      } catch (e) {
        console.error('Error parsing scorecard JSON:', e)
      }
    }

    // Calcular scores — rating 1-5, normalizar a 0-100
    let technicalScore = null, softScore = null, overallScore = null
    let technicalSkillsData = null, softSkillsData = null

    if (parsedScorecard?.skillRatings && scorecardData?.skills) {
      const techSkills = scorecardData.skills.filter(s => s.skill_type === 'technical')
      const softSkills = scorecardData.skills.filter(s => s.skill_type === 'soft')
      const allRatings = Object.fromEntries(
        Object.entries(parsedScorecard.skillRatings).map(([id, d]) => [id, typeof d === 'object' ? (d.rating || 0) : (d || 0)])
      )

      if (techSkills.length > 0) {
        const totalWeight = techSkills.reduce((s, x) => s + (x.weight || 0), 0)
        if (totalWeight > 0) {
          const weightedSum = techSkills.reduce((s, x) => s + normalizeRating(allRatings[x.id]) * (x.weight || 0), 0)
          technicalScore = Math.round(weightedSum / totalWeight)
        }
        technicalSkillsData = techSkills.map(s => ({
          id: s.id, name: s.name, weight: s.weight,
          rating: allRatings[s.id] || 0,
          normalizedScore: normalizeRating(allRatings[s.id]),
          analysis: parsedScorecard.skillRatings[s.id]?.analysis || '',
          evidence: parsedScorecard.skillRatings[s.id]?.evidence || ''
        }))
      }

      if (softSkills.length > 0) {
        const totalWeight = softSkills.reduce((s, x) => s + (x.weight || 0), 0)
        if (totalWeight > 0) {
          const weightedSum = softSkills.reduce((s, x) => s + normalizeRating(allRatings[x.id]) * (x.weight || 0), 0)
          softScore = Math.round(weightedSum / totalWeight)
        }
        softSkillsData = softSkills.map(s => ({
          id: s.id, name: s.name, weight: s.weight,
          rating: allRatings[s.id] || 0,
          normalizedScore: normalizeRating(allRatings[s.id]),
          analysis: parsedScorecard.skillRatings[s.id]?.analysis || '',
          evidence: parsedScorecard.skillRatings[s.id]?.evidence || ''
        }))
      }

      // Overall: usa calculateWeightedScore que ya devuelve 0-100
      overallScore = calculateWeightedScore(allRatings, { skills: scorecardData.skills })
    }

    // Guardar en Supabase
    let saved = false
    let savedReportId = null
    try {
      const savedReport = await saveInterviewToSupabase({
        candidateName, candidateLinkedin: linkedinUrl, jobDescription,
        notes: rawTranscript, client: clientName,
        screeningReport: screeningText,
        scorecardId: null, scorecardIdDb: scorecardId,
        scorecardData: parsedScorecard,
        technicalSkillsData, softSkillsData,
        technicalScore, softScore, overallScore,
      })
      saved = true
      savedReportId = savedReport?.id || null
    } catch (e) { console.error('Supabase save error:', e) }

    return NextResponse.json({
      screeningReport: screeningText,
      scorecard: parsedScorecard,
      scorecardSkills: scorecardData?.skills || null,
      candidateName, technicalScore, softScore, overallScore, saved,
      reportId: savedReportId,
      truncated,
    })
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}

