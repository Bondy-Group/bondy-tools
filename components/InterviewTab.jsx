'use client'

import { useState, useEffect } from 'react'

const BONDY_ORANGE = '#E05C00'
const FONT_MONO = 'DM Mono, monospace'
const FONT_DISPLAY = 'Playfair Display, serif'

const Label = ({ children }) => (
  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT_MONO }}>
    {children}
  </label>
)

const inputStyle = {
  width: '100%', border: '1.5px solid #EBEBEB', borderRadius: '10px',
  padding: '12px 16px', fontSize: '14px', outline: 'none',
  fontFamily: 'inherit', background: 'white', color: '#111',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}

const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '200px', lineHeight: '1.6' }

function ScoreBar({ score, label, color = BONDY_ORANGE }) {
  if (score === null || score === undefined) return null
  const pct = Math.min(100, Math.max(0, score))
  return (
    <div style={{ marginBottom: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '11px', color: '#666', fontFamily: FONT_MONO }}>{label}</span>
        <span style={{ fontSize: '12px', fontWeight: 700, color, fontFamily: FONT_MONO }}>{Math.round(pct)}/100</span>
      </div>
      <div style={{ height: '6px', background: '#f0f0f0', borderRadius: '99px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
      </div>
    </div>
  )
}

export default function InterviewTab() {
  const [candidateName, setCandidateName] = useState('')
  const [candidateEmail, setCandidateEmail] = useState('')
  const [clientName, setClientName] = useState('')
  const [transcript, setTranscript] = useState('')

  // Scorecard state
  const [scorecard, setScorecard] = useState(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [isDefaultScorecard, setIsDefaultScorecard] = useState(false)

  // Generation state
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(null)

  // Load scorecard when client changes
  useEffect(() => {
    if (!clientName.trim()) { setScorecard(null); return }
    setScorecardLoading(true)
    fetch(`/api/scorecards?client=${encodeURIComponent(clientName.trim())}`)
      .then(r => r.json())
      .then(data => { setScorecard(data.scorecard); setIsDefaultScorecard(data.isDefault || false) })
      .catch(() => setScorecard(null))
      .finally(() => setScorecardLoading(false))
  }, [clientName])

  const techSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'technical') || []
  const softSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'soft') || []

  const handleGenerate = async () => {
    if (!transcript.trim()) return setError('Pegá la transcripción primero')
    if (transcript.trim().length < 100) return setError('La transcripción parece muy corta')
    setLoading(true); setError(null); setResults(null); setSaved(false)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          candidateName: candidateName.trim(),
          candidateEmail: candidateEmail.trim(),
          clientName: clientName.trim(),
          scorecardId: scorecard?.id || null,
          scorecardData: scorecard?.scorecard_data || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error generando informe')
      setResults(data)
      if (data.saved) setSaved(true)
    } catch (e) { setError(e.message) } finally { setLoading(false) }
  }

  const copy = (text, key) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const CopyBtn = ({ text, id }) => (
    <button onClick={() => copy(text, id)}
      style={{ padding: '6px 14px', border: `1px solid ${copied === id ? '#86efac' : '#e5e7eb'}`, background: copied === id ? '#f0fdf4' : 'white', color: copied === id ? '#16a34a' : '#666', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: FONT_MONO, transition: 'all 0.2s' }}>
      {copied === id ? '✓ Copiado' : 'Copiar'}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

      {/* Datos del candidato */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Datos del candidato</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          <div><Label>Nombre</Label><input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Nombre completo" style={inputStyle} /></div>
          <div><Label>Email</Label><input value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)} placeholder="email@ejemplo.com" style={inputStyle} /></div>
          <div><Label>Cliente</Label><input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="IOL, Clera, Unicity..." style={inputStyle} /></div>
        </div>

        {/* Scorecard indicator */}
        {clientName.trim() && (
          <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '10px', background: scorecardLoading ? '#f9f9f9' : (scorecard ? (isDefaultScorecard ? '#fff7ed' : '#f0fdf4') : '#fff5f5'), border: `1px solid ${scorecardLoading ? '#e5e7eb' : (scorecard ? (isDefaultScorecard ? '#fde68a' : '#86efac') : '#fecaca')}` }}>
            {scorecardLoading ? (
              <span style={{ fontSize: '12px', color: '#aaa', fontFamily: FONT_MONO }}>Buscando scorecard...</span>
            ) : scorecard ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{scorecard.scorecard_name}</span>
                  {isDefaultScorecard && <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d97706', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', fontFamily: FONT_MONO }}>Default</span>}
                </div>
                <span style={{ fontSize: '11px', color: '#888' }}>🔧 {techSkills.length} técnicos · 💬 {softSkills.length} blandos{isDefaultScorecard ? ' · No se encontró scorecard específica para este cliente' : ''}</span>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: '#ef4444' }}>Sin scorecard — se usará evaluación genérica</span>
            )}
          </div>
        )}
      </section>

      {/* Transcripción */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
          <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Transcripción de la entrevista</span>
        </div>
        <textarea value={transcript} onChange={e => setTranscript(e.target.value)} placeholder="Pegá aquí la transcripción completa de la entrevista..." style={textareaStyle} />
        <p style={{ fontSize: '11px', color: '#aaa', marginTop: '8px', fontFamily: FONT_MONO }}>{transcript.length > 0 ? `${transcript.length.toLocaleString()} caracteres` : 'Mínimo recomendado: 2.000 caracteres'}</p>
      </section>

      {/* Preview skills */}
      {scorecard && (techSkills.length > 0 || softSkills.length > 0) && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
            <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Skills a evaluar</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: techSkills.length > 0 && softSkills.length > 0 ? '1fr 1fr' : '1fr', gap: '16px' }}>
            {techSkills.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, margin: '0 0 10px', fontFamily: FONT_MONO }}>Técnicos</p>
                {techSkills.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8f8f8', fontSize: '12px' }}>
                    <span style={{ color: '#333' }}>{s.name}</span>
                    <span style={{ color: '#aaa', fontFamily: FONT_MONO }}>×{s.weight}%</span>
                  </div>
                ))}
              </div>
            )}
            {softSkills.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A90D9', margin: '0 0 10px', fontFamily: FONT_MONO }}>Blandos</p>
                {softSkills.map(s => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8f8f8', fontSize: '12px' }}>
                    <span style={{ color: '#333' }}>{s.name}</span>
                    <span style={{ color: '#aaa', fontFamily: FONT_MONO }}>×{s.weight}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Generate button */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={handleGenerate} disabled={loading}
          style={{ padding: '16px 48px', border: 'none', background: loading ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)`, color: 'white', borderRadius: '12px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 800, letterSpacing: '0.02em', boxShadow: loading ? 'none' : '0 4px 20px rgba(224,92,0,0.35)', transition: 'all 0.2s' }}>
          {loading ? 'Generando...' : scorecard ? `Generar informe + evaluación ${scorecard.scorecard_name}` : 'Generar informe de entrevista'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', color: '#dc2626', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {saved && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#16a34a', fontSize: '13px' }}>
              ✓ Guardado en Supabase
            </div>
          )}

          {/* Scores */}
          {(results.technicalScore !== undefined || results.softScore !== undefined) && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
                <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Scores</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '16px' }}>
                {results.technicalScore !== undefined && (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#FFF3EC', borderRadius: '10px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: BONDY_ORANGE, fontFamily: FONT_MONO }}>{Math.round(results.technicalScore)}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Técnico</div>
                  </div>
                )}
                {results.softScore !== undefined && (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#EFF6FF', borderRadius: '10px' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#4A90D9', fontFamily: FONT_MONO }}>{Math.round(results.softScore)}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Blando</div>
                  </div>
                )}
                {results.overallScore !== undefined && (
                  <div style={{ textAlign: 'center', padding: '16px', background: '#F9F8F6', borderRadius: '10px', border: '1.5px solid #e5e7eb' }}>
                    <div style={{ fontSize: '28px', fontWeight: 900, color: '#111', fontFamily: FONT_MONO }}>{Math.round(results.overallScore)}</div>
                    <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Overall</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Screening report */}
          {results.screeningReport && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
                  <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Informe de Screening</span>
                </div>
                <CopyBtn text={results.screeningReport} id="screening" />
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>{results.screeningReport}</div>
            </div>
          )}

          {/* Scorecard report */}
          {results.scorecardReport && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
                  <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Evaluación por Scorecard</span>
                </div>
                <CopyBtn text={results.scorecardReport} id="scorecard" />
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>{results.scorecardReport}</div>
            </div>
          )}

          {/* Cultural fit */}
          {results.culturalFitReport && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
                  <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>Cultural Fit</span>
                </div>
                <CopyBtn text={results.culturalFitReport} id="cultural" />
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>{results.culturalFitReport}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
