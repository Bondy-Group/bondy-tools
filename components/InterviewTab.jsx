'use client'

import { useState, useRef } from 'react'
import { SCORECARD_LIST, SCORECARDS, calculateWeightedScore, getScoreLabel } from '@/lib/scorecards'

const BONDY_ORANGE = '#E05C00'
const BONDY_ORANGE_LIGHT = '#F47C20'

const inputBase = {
  width: '100%',
  border: '1.5px solid #e5e7eb',
  borderRadius: '10px',
  padding: '10px 14px',
  fontSize: '14px',
  outline: 'none',
  fontFamily: 'inherit',
  backgroundColor: 'white',
  color: '#111',
  transition: 'border-color 0.15s',
}

const inputStyle = { ...inputBase, resize: 'vertical' }
const noResizeInput = { ...inputBase, resize: 'none' }

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>
    {children}
  </label>
)
const Muted = ({ children }) => <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{children}</span>

function RatingStars({ value, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[1,2,3,4,5].map(star => (
        <button key={star} onClick={() => !disabled && onChange(star === value ? 0 : star)} disabled={disabled}
          style={{ width: '26px', height: '26px', borderRadius: '6px', border: '1.5px solid', fontSize: '11px', fontWeight: 700,
            borderColor: value >= star ? BONDY_ORANGE : '#e5e7eb',
            background: value >= star ? BONDY_ORANGE : 'white',
            color: value >= star ? 'white' : '#ccc',
            cursor: disabled ? 'default' : 'pointer', fontFamily: 'DM Mono, monospace',
            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.1s' }}
        >{star}</button>
      ))}
    </div>
  )
}

function ScorecardResult({ scorecardData, manualRatings, onManualRatingChange, mode }) {
  const { scorecard, skillRatings, generalNotes } = scorecardData
  const isAI = mode === 'ai'
  const ratings = isAI
    ? Object.fromEntries(scorecard.skills.map(s => [s.id, skillRatings?.[s.id]?.rating || 0]))
    : manualRatings
  const weightedScore = calculateWeightedScore(ratings, scorecard)
  const scoreLabel = getScoreLabel(weightedScore)

  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: 'DM Mono, monospace', marginBottom: '4px' }}>
            Scorecard {isAI ? '· Evaluado por IA' : '· Vista previa manual'}
          </div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#111', fontFamily: 'Playfair Display, serif' }}>{scorecard.name}</div>
        </div>
        {weightedScore !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: scoreLabel.color, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{weightedScore}</div>
            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>/100 ponderado</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: scoreLabel.color, marginTop: '4px' }}>{scoreLabel.emoji} {scoreLabel.label}</div>
          </div>
        )}
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {scorecard.skills.map(skill => {
          const rating = ratings[skill.id] || 0
          const aiData = skillRatings?.[skill.id]
          const pct = rating > 0 ? ((rating - 1) / 4) * 100 : 0
          return (
            <div key={skill.id} style={{ borderRadius: '10px', border: '1px solid #f0f0f0', padding: '12px 14px', background: '#fafafa' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: rating > 0 ? '8px' : '0', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{skill.name}</span>
                    <span style={{ fontSize: '10px', color: '#bbb', fontFamily: 'DM Mono, monospace' }}>peso {skill.weight}%</span>
                  </div>
                  <p style={{ fontSize: '11px', color: '#999', margin: '2px 0 0', lineHeight: 1.5 }}>{skill.description}</p>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <RatingStars value={rating} onChange={isAI ? () => {} : (v) => onManualRatingChange(skill.id, v)} disabled={isAI} />
                </div>
              </div>
              {rating > 0 && (
                <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', marginBottom: isAI && aiData?.analysis ? '8px' : '0' }}>
                  <div style={{ height: '100%', background: BONDY_ORANGE, borderRadius: '2px', width: pct + '%', transition: 'width 0.3s' }} />
                </div>
              )}
              {isAI && aiData?.analysis && (
                <p style={{ fontSize: '12px', color: '#555', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{aiData.analysis}"</p>
              )}
              {isAI && aiData?.evidence && (
                <p style={{ fontSize: '11px', color: '#777', margin: '6px 0 0', padding: '6px 10px', background: '#f5f5f5', borderRadius: '6px', borderLeft: '3px solid ' + BONDY_ORANGE }}>
                  {aiData.evidence}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {isAI && generalNotes && (
        <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>
            Notas generales
          </div>
          <p style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: 1.7 }}>{generalNotes}</p>
        </div>
      )}
    </div>
  )
}

export default function InterviewTab() {
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [jd, setJd] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [clientName, setClientName] = useState('')
  const [language, setLanguage] = useState('es')
  const [scorecardId, setScorecardId] = useState('NONE')
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [scorecardResult, setScorecardResult] = useState(null)
  const [manualRatings, setManualRatings] = useState({})
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const reportRef = useRef(null)

  const selectedScorecard = scorecardId !== 'NONE' ? SCORECARDS[scorecardId] : null

  const handleScorecardChange = (id) => {
    setScorecardId(id)
    setScorecardResult(null)
    if (id !== 'NONE' && SCORECARDS[id]) {
      const init = {}
      SCORECARDS[id].skills.forEach(s => { init[s.id] = 0 })
      setManualRatings(init)
    }
  }

  const generate = async () => {
    if (!transcript.trim()) return
    setLoading(true); setError(null); setReport(null); setScorecardResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, summary, jd, linkedin, language,
          clientName: clientName || null, recruiterName: recruiterName || null,
          type: 'screening', scorecardId: scorecardId !== 'NONE' ? scorecardId : null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data.result)
      if (data.scorecard) setScorecardResult(data.scorecard)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const copyReport = async () => {
    if (!report) return
    try { await navigator.clipboard.writeText(report) } catch { reportRef.current?.select(); document.execCommand('copy') }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  const copyScorecard = async () => {
    if (!scorecardResult) return
    const sc = scorecardResult.scorecard
    const ratings = Object.fromEntries(sc.skills.map(s => [s.id, scorecardResult.skillRatings?.[s.id]?.rating || 0]))
    const score = calculateWeightedScore(ratings, sc)
    const label = getScoreLabel(score)
    let text = 'SCORECARD: ' + sc.name + '\n'
    text += 'SCORE FINAL: ' + score + '/100 — ' + (label?.label || '') + '\n\n'
    sc.skills.forEach(skill => {
      const d = scorecardResult.skillRatings?.[skill.id]
      text += skill.name + ' (' + skill.weight + '%): ' + (d?.rating || 0) + '/5\n'
      if (d?.analysis) text += '  → ' + d.analysis + '\n'
    })
    if (scorecardResult.generalNotes) text += '\nNotas: ' + scorecardResult.generalNotes
    try { await navigator.clipboard.writeText(text) } catch {}
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: '#111', margin: 0 }}>Nueva entrevista</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label>Cliente <Muted>(opcional)</Muted></Label>
            <input type="text" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Ej: IOL, Uala, Mercado Libre..." style={noResizeInput} />
          </div>
          <div>
            <Label>Recruiter <Muted>(pie del reporte)</Muted></Label>
            <input type="text" value={recruiterName} onChange={e => setRecruiterName(e.target.value)} placeholder="Ej: Lucía Palomeque" style={noResizeInput} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label>Scorecard del cliente</Label>
            <div style={{ position: 'relative' }}>
              <select value={scorecardId} onChange={e => handleScorecardChange(e.target.value)}
                style={{ ...noResizeInput, cursor: 'pointer', appearance: 'none',
                  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E\")",
                  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }}>
                {SCORECARD_LIST.map(sc => <option key={sc.id} value={sc.id}>{sc.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <Label>Idioma del reporte</Label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['es', 'en'].map(lang => (
                <button key={lang} onClick={() => setLanguage(lang)}
                  style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: '1.5px solid', cursor: 'pointer', transition: 'all 0.15s',
                    background: language === lang ? BONDY_ORANGE : 'white',
                    color: language === lang ? 'white' : '#6b7280',
                    borderColor: language === lang ? BONDY_ORANGE : '#e5e7eb' }}>
                  {lang === 'es' ? '🇦🇷 Español' : '🇺🇸 English'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedScorecard && (
          <div style={{ background: '#FFF8F5', border: '1px solid #ffd4b8', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: BONDY_ORANGE }}>{selectedScorecard.name}</div>
              <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
                {selectedScorecard.skills.length} skills · {selectedScorecard.skills.map(s => s.name + ' (' + s.weight + '%)').join(' · ')}
              </div>
            </div>
            <div style={{ marginLeft: 'auto', fontSize: '10px', color: '#ccc', fontFamily: 'DM Mono, monospace', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              IA evalúa automáticamente →
            </div>
          </div>
        )}

        <div>
          <Label>LinkedIn URL <Muted>(opcional)</Muted></Label>
          <input type="text" value={linkedin} onChange={e => setLinkedin(e.target.value)} placeholder="linkedin.com/in/..." style={noResizeInput} />
        </div>

        <div>
          <Label>Job Description <Muted>(opcional)</Muted></Label>
          <textarea value={jd} onChange={e => setJd(e.target.value)} placeholder="Pegá la job description de la posición..." rows={4} style={inputStyle} />
        </div>

        <div>
          <Label>Resumen de Gemini <Muted>(opcional pero recomendado)</Muted></Label>
          <textarea value={summary} onChange={e => setSummary(e.target.value)} placeholder="Pegá el resumen que generó Gemini de la entrevista..." rows={3} style={inputStyle} />
        </div>

        <div>
          <Label>Transcripción completa <span style={{ color: '#ef4444' }}>*</span></Label>
          <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Pegá la transcripción completa de la entrevista..." rows={10} style={inputStyle} />
          {transcript && <p style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>{transcript.split(/\s+/).length} palabras · {Math.ceil(transcript.split(/\s+/).length / 130)} min aprox.</p>}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>⚠️ {error}</div>}

        <button onClick={generate} disabled={!transcript.trim() || loading}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', fontWeight: 700, color: 'white', fontSize: '14px', border: 'none',
            cursor: !transcript.trim() || loading ? 'not-allowed' : 'pointer',
            background: loading || !transcript.trim() ? '#ccc' : 'linear-gradient(135deg, ' + BONDY_ORANGE + ', ' + BONDY_ORANGE_LIGHT + ')',
            transition: 'all 0.2s', letterSpacing: '0.02em' }}>
          {loading ? (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
              {selectedScorecard ? 'Generando reporte + scorecard...' : 'Generando reporte...'}
            </span>
          ) : selectedScorecard ? '✨ Generar Reporte + Scorecard ' + selectedScorecard.name : '✨ Generar Screening Report'}
        </button>
      </div>

      {report && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: BONDY_ORANGE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>✓</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>Screening Report generado</div>
                <div style={{ fontSize: '11px', color: '#bbb' }}>Guardado automáticamente en Supabase</div>
              </div>
            </div>
            <button onClick={copyReport}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700,
                color: 'white', border: 'none', cursor: 'pointer',
                background: copied ? '#22c55e' : 'linear-gradient(135deg, ' + BONDY_ORANGE + ', ' + BONDY_ORANGE_LIGHT + ')',
                transition: 'all 0.2s' }}>
              {copied ? '✓ Copiado!' : '📋 Copiar reporte'}
            </button>
          </div>
          <textarea ref={reportRef} value={report} readOnly style={{ position: 'absolute', left: '-9999px' }} />
          <div style={{ padding: '24px' }}>
            <pre style={{ fontSize: '13px', color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{report}</pre>
          </div>
        </div>
      )}

      {scorecardResult && report && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'DM Mono, monospace' }}>Resultado del scorecard</div>
            <button onClick={copyScorecard}
              style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                color: BONDY_ORANGE, border: '1.5px solid ' + BONDY_ORANGE, background: 'white', cursor: 'pointer' }}>
              📋 Copiar scorecard
            </button>
          </div>
          <ScorecardResult scorecardData={scorecardResult} manualRatings={{}} onManualRatingChange={() => {}} mode="ai" />
        </div>
      )}

      {selectedScorecard && !report && Object.keys(manualRatings).length > 0 && (
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#bbb', fontFamily: 'DM Mono, monospace', marginBottom: '8px' }}>
            Vista previa del scorecard · La IA lo evaluará al generar el reporte
          </div>
          <ScorecardResult
            scorecardData={{ scorecard: selectedScorecard, skillRatings: null, generalNotes: null }}
            manualRatings={manualRatings}
            onManualRatingChange={(id, val) => setManualRatings(prev => ({ ...prev, [id]: val }))}
            mode="manual"
          />
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        textarea:focus, input:focus, select:focus { border-color: ${BONDY_ORANGE} !important; box-shadow: 0 0 0 3px rgba(224,92,0,0.08); }
      `}</style>
    </div>
  )
}
