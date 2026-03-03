import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCREENING_PROMPT, SCORECARD_PROMPT } from '@/lib/prompts'
import { saveInterviewToSupabase } from '@/lib/supabase'
import { calculateWeightedScore } from '@/lib/scorecards'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Sonnet: límites mucho más altos, sin rate limit en uso normal
const MODEL = 'claude-sonnet-4-5'

export async function POST(request) {
  try {
    const body = await request.json()

    const candidateName    = body.candidateName || null
    const linkedinUrl      = body.linkedinUrl || body.candidateLinkedin || null
    const cvText           = body.cvText || null
    const clientName       = body.clientName || body.client || null
    const positionName     = body.positionName || null
    const interviewerNotes = body.interviewerNotes || null
    const transcript       = body.transcript || body.notes || null
    const jobDescription   = body.jobDescription || null
    const scorecardId      = body.scorecardId || null
    const scorecardData    = body.scorecardData || null

    if (!transcript) {
      return NextResponse.json({ error: 'Transcripción requerida' }, { status: 400 })
    }

    // Construir contexto completo
    let userContent = ''
    if (candidateName)    userContent += `CANDIDATO: ${candidateName}\n\n`
    if (linkedinUrl)      userContent += `LINKEDIN: ${linkedinUrl}\n\n`
    if (cvText)           userContent += `CV DEL CANDIDATO:\n${cvText}\n\n---\n\n`
    if (clientName)       userContent += `CLIENTE: ${clientName}\n\n`
    if (positionName)     userContent += `POSICIÓN: ${positionName}\n\n`
    if (jobDescription)   userContent += `JOB DESCRIPTION:\n${jobDescription}\n\n---\n\n`
    if (interviewerNotes) userContent += `NOTAS DEL ENTREVISTADOR:\n${interviewerNotes}\n\n---\n\n`
    userContent += `TRANSCRIPCIÓN DE LA ENTREVISTA:\n${transcript}`

    const screeningPrompt = SCREENING_PROMPT({ language: 'es', clientName: clientName || null, jd: jobDescription || null })

    // Screening siempre
    const screeningPromise = anthropic.messages.create({
      model: MODEL,
      max_tokens: 2500,
      messages: [{ role: 'user', content: `${screeningPrompt}\n\n---\n\n${userContent}` }]
    })

    // Scorecard solo si hay skills cargadas
    let scorecardPromise = null
    if (scorecardData?.skills?.length > 0) {
      const scorecardToEval = {
        id: scorecardId || 'dynamic',
        name: positionName || (clientName ? `Scorecard ${clientName}` : 'Scorecard'),
        skills: scorecardData.skills,
      }
      const scPrompt = SCORECARD_PROMPT({ scorecard: scorecardToEval })
      scorecardPromise = anthropic.messages.create({
        model: MODEL,
        max_tokens: 2000,
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

    // Calcular scores técnico / soft / overall
    let technicalScore = null
    let softScore = null
    let overallScore = null
    let technicalSkillsData = null
    let softSkillsData = null

    if (parsedScorecard?.skillRatings && scorecardData?.skills) {
      const techSkills = scorecardData.skills.filter(s => s.skill_type === 'technical' || !s.skill_type)
      const softSkills = scorecardData.skills.filter(s => s.skill_type === 'soft')

      const allRatings = Object.fromEntries(
        Object.entries(parsedScorecard.skillRatings).map(([id, data]) => [id, data.rating || 0])
      )

      if (techSkills.length > 0) {
        const techTotal = techSkills.reduce((sum, s) => sum + s.weight, 0)
        if (techTotal > 0) {
          technicalScore = Math.round(
            techSkills.reduce((sum, s) => sum + (allRatings[s.id] || 0) * s.weight, 0) / techTotal * 20
          )
        }
        technicalSkillsData = techSkills.map(s => ({
          id: s.id, name: s.name, weight: s.weight,
          rating: allRatings[s.id] || 0,
          analysis: parsedScorecard.skillRatings[s.id]?.analysis || '',
          evidence: parsedScorecard.skillRatings[s.id]?.evidence || '',
        }))
      }

      if (softSkills.length > 0) {
        const softTotal = softSkills.reduce((sum, s) => sum + s.weight, 0)
        if (softTotal > 0) {
          softScore = Math.round(
            softSkills.reduce((sum, s) => sum + (allRatings[s.id] || 0) * s.weight, 0) / softTotal * 20
          )
        }
        softSkillsData = softSkills.map(s => ({
          id: s.id, name: s.name, weight: s.weight,
          rating: allRatings[s.id] || 0,
          analysis: parsedScorecard.skillRatings[s.id]?.analysis || '',
          evidence: parsedScorecard.skillRatings[s.id]?.evidence || '',
        }))
      }

      overallScore = calculateWeightedScore(allRatings, { skills: scorecardData.skills })
      if (overallScore !== null) overallScore = Math.round(overallScore * 20)
    }

    // Guardar en Supabase
    let saved = false
    try {
      await saveInterviewToSupabase({
        candidateName,
        candidateLinkedin: linkedinUrl,
        jobDescription,
        notes: transcript,
        client: clientName,
        screeningReport: screeningText,
        scorecardId: null,
        scorecardIdDb: scorecardId,
        scorecardData: parsedScorecard,
        technicalSkillsData,
        softSkillsData,
        technicalScore,
        softScore,
        overallScore,
      })
      saved = true
    } catch (saveErr) {
      console.error('Supabase save error:', saveErr)
    }

    return NextResponse.json({
      screeningReport: screeningText,
      scorecardReport: parsedScorecard ? JSON.stringify(parsedScorecard, null, 2) : null,
      scorecard: parsedScorecard,
      candidateName,
      technicalScore,
      softScore,
      overallScore,
      saved,
    })
  } catch (error) {
    console.error('Generate API error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
