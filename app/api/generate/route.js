import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCREENING_PROMPT, SCORECARD_PROMPT } from '@/lib/prompts'
import { saveInterviewToSupabase } from '@/lib/supabase'
import { calculateWeightedScore } from '@/lib/scorecards'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const {
      candidateName,
      candidateLinkedin,
      jobDescription,
      notes,
      client,
      scorecardId,    // UUID from client_scorecards table
      scorecardData,  // { skills: [...] } from active scorecard
    } = await request.json()

    if (!notes) {
      return NextResponse.json({ error: 'Notas de entrevista requeridas' }, { status: 400 })
    }

    // Build user content for screening
    let userContent = ''
    if (candidateName) userContent += `CANDIDATO: ${candidateName}\n\n`
    if (candidateLinkedin) userContent += `LINKEDIN: ${candidateLinkedin}\n\n`
    if (client) userContent += `CLIENTE: ${client}\n\n`
    if (jobDescription) userContent += `JOB DESCRIPTION:\n${jobDescription}\n\n---\n\n`
    userContent += `NOTAS DE ENTREVISTA:\n${notes}`

    const screeningPrompt = SCREENING_PROMPT({ language: 'es', clientName: client || null, jd: jobDescription || null })

    // Run screening always
    const screeningPromise = anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 2500,
      messages: [{ role: 'user', content: `${screeningPrompt}\n\n---\n\n${userContent}` }]
    })

    // Run scorecard evaluation only if skills are provided
    let scorecardPromise = null
    if (scorecardData?.skills?.length > 0) {
      const scorecardToEval = {
        id: scorecardId || 'dynamic',
        name: client ? `Scorecard ${client}` : 'Scorecard',
        skills: scorecardData.skills,
      }
      const scPrompt = SCORECARD_PROMPT({ scorecard: scorecardToEval })
      scorecardPromise = anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: `${scPrompt}\n\n---\n\n${userContent}` }]
      })
    }

    // Await in parallel
    const [screeningResult, scorecardResult] = await Promise.all([
      screeningPromise,
      scorecardPromise || Promise.resolve(null),
    ])

    const screeningText = screeningResult.content[0]?.text || ''

    // Parse scorecard AI response
    let parsedScorecard = null
    if (scorecardResult) {
      try {
        const rawText = scorecardResult.content[0]?.text || ''
        const jsonMatch = rawText.match(/```json\n?([\s\S]*?)\n?```/) || rawText.match(/({[\s\S]*})/)
        if (jsonMatch) {
          parsedScorecard = JSON.parse(jsonMatch[1] || jsonMatch[0])
        }
      } catch (e) {
        console.error('Error parsing scorecard JSON:', e)
      }
    }

    // Calculate separate scores
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

      // Technical score
      if (techSkills.length > 0) {
        const techRatings = Object.fromEntries(techSkills.map(s => [s.id, allRatings[s.id] || 0]))
        const techTotal = techSkills.reduce((sum, s) => sum + s.weight, 0)
        if (techTotal > 0) {
          const weightedSum = techSkills.reduce((sum, s) => sum + (techRatings[s.id] || 0) * s.weight, 0)
          technicalScore = Math.round((weightedSum / techTotal) * 20) // normalize to 0-100
        }
        technicalSkillsData = techSkills.map(s => ({
          id: s.id, name: s.name, weight: s.weight,
          rating: allRatings[s.id] || 0,
          analysis: parsedScorecard.skillRatings[s.id]?.analysis || '',
          evidence: parsedScorecard.skillRatings[s.id]?.evidence || '',
        }))
      }

      // Soft score
      if (softSkills.length > 0) {
        const softRatings = Object.fromEntries(softSkills.map(s => [s.id, allRatings[s.id] || 0]))
        const softTotal = softSkills.reduce((sum, s) => sum + s.weight, 0)
        if (softTotal > 0) {
          const weightedSum = softSkills.reduce((sum, s) => sum + (softRatings[s.id] || 0) * s.weight, 0)
          softScore = Math.round((weightedSum / softTotal) * 20) // normalize to 0-100
        }
        softSkillsData = softSkills.map(s => ({
          id: s.id, name: s.name, weight: s.weight,
          rating: allRatings[s.id] || 0,
          analysis: parsedScorecard.skillRatings[s.id]?.analysis || '',
          evidence: parsedScorecard.skillRatings[s.id]?.evidence || '',
        }))
      }

      // Overall weighted score (0-100)
      const fullScorecard = { skills: scorecardData.skills }
      overallScore = calculateWeightedScore(allRatings, fullScorecard)
      if (overallScore !== null) {
        overallScore = Math.round(overallScore * 20) // 5-star to 0-100
      }
    }

    // Save to Supabase
    let saved = false
    try {
      await saveInterviewToSupabase({
        candidateName: candidateName || null,
        candidateLinkedin: candidateLinkedin || null,
        jobDescription: jobDescription || null,
        notes,
        client: client || null,
        screeningReport: screeningText,
        scorecardId: null, // legacy field
        scorecardIdDb: scorecardId || null,
        scorecardData: parsedScorecard || null,
        technicalSkillsData: technicalSkillsData || null,
        softSkillsData: softSkillsData || null,
        technicalScore: technicalScore,
        softScore: softScore,
        overallScore: overallScore,
      })
      saved = true
    } catch (saveErr) {
      console.error('Supabase save error:', saveErr)
    }

    return NextResponse.json({
      screening: screeningText,
      scorecard: parsedScorecard,
      candidateName: candidateName || null,
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
