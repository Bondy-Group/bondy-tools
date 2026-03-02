import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { SCREENING_PROMPT, CULTURAL_FIT_PROMPT, SCORECARD_PROMPT } from '@/lib/prompts'
import { saveInterviewToSupabase } from '@/lib/supabase'
import { calculateWeightedScore, getScoreLabel } from '@/lib/scorecards'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request) {
  try {
    const {
      transcript, type, clientProfile, summary, language,
      clientName, clientId, jd, linkedin, recruiterName,
      // scorecardData: scorecard completa desde Supabase (structure: { totalWeight, skills: [...] })
      scorecardData,
      // scorecardId: legacy, por si viene del formato viejo
      scorecardId,
    } = await request.json()

    if (!transcript) {
      return NextResponse.json({ error: 'Transcript requerido' }, { status: 400 })
    }

    if (type === 'screening') {
      const prompt = SCREENING_PROMPT({ language, clientName, jd })

      let userContent = ''
      if (linkedin) userContent += `LINKEDIN URL: ${linkedin}\n\n`
      if (jd) userContent += `JOB DESCRIPTION:\n${jd}\n\n---\n\n`
      if (summary) userContent += `INTERVIEW SUMMARY:\n${summary}\n\n---\n\n`
      userContent += `INTERVIEW TRANSCRIPT:\n${transcript}`

      const screeningPromise = client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2500,
        messages: [{ role: 'user', content: `${prompt}\n\n---\n\n${userContent}` }]
      })

      // Armar la scorecard a evaluar (nueva estructura dinámica tiene precedencia)
      const scorecardToEval = scorecardData && scorecardData.skills?.length > 0
        ? { id: clientId || 'dynamic', name: clientName || 'Scorecard', ...scorecardData }
        : null

      let scorecardPromise = null
      if (scorecardToEval) {
        const scPrompt = SCORECARD_PROMPT({ scorecard: scorecardToEval, language })
        scorecardPromise = client.messages.create({
          model: 'claude-opus-4-6',
          max_tokens: 2000,
          messages: [{ role: 'user', content: `${scPrompt}\n\n---\n\nINTERVIEW TRANSCRIPT:\n${transcript}` }]
        })
      }

      const [screeningMsg, scorecardMsg] = await Promise.all([
        screeningPromise,
        scorecardPromise || Promise.resolve(null)
      ])

      const result = screeningMsg.content[0].text

      let scorecardResult = null
      let weightedScore = null
      let scoreLabel = null

      if (scorecardMsg) {
        try {
          const text = scorecardMsg.content[0].text.trim()
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          scorecardResult = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
          scorecardResult.scorecardId = clientId || 'dynamic'
          scorecardResult.scorecardName = clientName || 'Scorecard'
          scorecardResult.scorecard = scorecardToEval

          // Calcular score ponderado
          const ratings = Object.fromEntries(
            scorecardToEval.skills.map(s => [s.id, scorecardResult.skillRatings?.[s.id]?.rating || 0])
          )
          weightedScore = calculateWeightedScore(ratings, scorecardToEval)
          const label = getScoreLabel(weightedScore)
          scoreLabel = label?.label || null
        } catch (e) {
          console.error('Scorecard parse error:', e)
        }
      }

      const fullReport = recruiterName
        ? `${result}\n\n${language === 'en' ? 'Interview conducted by' : 'Entrevista realizada por'} ${recruiterName}`
        : result

      // Guardar en Supabase (no-bloqueante)
      saveInterviewToSupabase({
        candidateName: null,
        clientName: clientName || null,
        clientId: clientId || null,
        reportType: 'screening',
        reportContent: result,
        jobDescription: jd || null,
        linkedinUrl: linkedin || null,
        recruiterName: recruiterName || null,
        rawTranscript: transcript,
        scorecardId: clientId || null,
        scorecardData: scorecardResult ? JSON.stringify(scorecardResult) : null,
        skillRatings: scorecardResult?.skillRatings ? JSON.stringify(scorecardResult.skillRatings) : null,
        weightedScore: weightedScore || null,
        scoreLabel: scoreLabel || null,
      }).catch(err => console.error('Supabase auto-save failed (non-blocking):', err))

      return NextResponse.json({ result: fullReport, type: 'screening', scorecard: scorecardResult })

    } else if (type === 'cultural') {
      if (!clientProfile) {
        return NextResponse.json({ error: 'Perfil de cliente requerido para cultural fit' }, { status: 400 })
      }

      const prompt = CULTURAL_FIT_PROMPT(clientProfile)
      const userContent = summary
        ? `RESUMEN DE LA ENTREVISTA:\n${summary}\n\n---\nTRANSCRIPCIÓN:\n${transcript}`
        : `TRANSCRIPCIÓN DE LA ENTREVISTA:\n${transcript}`

      const message = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2000,
        messages: [{ role: 'user', content: `${prompt}\n\n---\n\n${userContent}` }]
      })

      let parsed
      try {
        const text = message.content[0].text.trim()
        const jsonMatch = text.match(/\{[\s\S]*\}/)
        parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(text)
      } catch (e) {
        return NextResponse.json({ error: 'Error al parsear respuesta de cultural fit', raw: message.content[0].text }, { status: 500 })
      }

      saveInterviewToSupabase({
        candidateName: null,
        clientName: clientProfile?.name || null,
        reportType: 'cultural',
        reportContent: JSON.stringify(parsed, null, 2),
        recruiterName: recruiterName || null,
        rawTranscript: transcript,
      }).catch(err => console.error('Supabase auto-save failed (non-blocking):', err))

      return NextResponse.json({ result: parsed, type: 'cultural' })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })

  } catch (error) {
    console.error('Generate error:', error)
    return NextResponse.json({ error: error.message || 'Error interno' }, { status: 500 })
  }
}
