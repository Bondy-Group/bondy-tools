'use client'

import { useState, useEffect, useRef } from 'react'

const BONDY_ORANGE = '#E05C00'
const FONT_MONO = 'DM Mono, monospace'

const Label = ({ children, required }) => (
  <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: '#555', marginBottom: '8px', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: FONT_MONO }}>
    {children}{required && <span style={{ color: '#ef4444', marginLeft: '3px' }}>*</span>}
  </label>
)

const inputStyle = {
  width: '100%', border: '1.5px solid #EBEBEB', borderRadius: '10px',
  padding: '12px 16px', fontSize: '14px', outline: 'none',
  fontFamily: 'inherit', background: 'white', color: '#111',
  boxSizing: 'border-box', transition: 'border-color 0.15s',
}
const selectStyle = { ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23999' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 14px center', paddingRight: '36px' }
const textareaStyle = { ...inputStyle, resize: 'vertical', minHeight: '180px', lineHeight: '1.6' }

function SectionHeader({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
      <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
      <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>{label}</span>
    </div>
  )
}

function CopyBtn({ text, id, copied, onCopy }) {
  return (
    <button onClick={() => onCopy(text, id)}
      style={{ padding: '6px 14px', border: `1px solid ${copied === id ? '#86efac' : '#e5e7eb'}`, background: copied === id ? '#f0fdf4' : 'white', color: copied === id ? '#16a34a' : '#666', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontFamily: FONT_MONO, transition: 'all 0.2s' }}>
      {copied === id ? '✓ Copiado' : 'Copiar'}
    </button>
  )
}

export default function InterviewTab() {
  // Candidato
  const [candidateName, setCandidateName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvText, setCvText] = useState('')
  const fileRef = useRef()

  // Cliente / posición
  const [clients, setClients] = useState([])
  const [clientName, setClientName] = useState('')
  const [positions, setPositions] = useState([])
  const [positionId, setPositionId] = useState('')
  const [positionName, setPositionName] = useState('')

  // Notas del entrevistador (opcionales)
  const [interviewerNotes, setInterviewerNotes] = useState('')

  // Transcripción
  const [transcript, setTranscript] = useState('')

  // Scorecard
  const [scorecard, setScorecard] = useState(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [isDefaultScorecard, setIsDefaultScorecard] = useState(false)

  // Generación
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(null)

  // Cargar clientes al montar
  useEffect(() => {
    fetch('/api/scorecards?clients=true')
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => {})
  }, [])

  // Cargar posiciones cuando cambia el cliente
  useEffect(() => {
    setPositions([])
    setPositionId('')
    setPositionName('')
    setScorecard(null)
    if (!clientName) return
    fetch(`/api/scorecards?positions=${encodeURIComponent(clientName)}`)
      .then(r => r.json())
      .then(d => {
        const pos = d.positions || []
        setPositions(pos)
        if (pos.length === 1) { setPositionId(pos[0].id); setPositionName(pos[0].scorecard_name) }
      })
      .catch(() => {})
  }, [clientName])

  // Cargar scorecard cuando cambia posición o cliente
  useEffect(() => {
    if (!clientName) { setScorecard(null); return }
    setScorecardLoading(true)
    const url = positionName
      ? `/api/scorecards?client=${encodeURIComponent(clientName)}&position=${encodeURIComponent(positionName)}`
      : `/api/scorecards?client=${encodeURIComponent(clientName)}`
    fetch(url)
      .then(r => r.json())
      .then(d => { setScorecard(d.scorecard); setIsDefaultScorecard(d.isDefault || false) })
      .catch(() => setScorecard(null))
      .finally(() => setScorecardLoading(false))
  }, [clientName, positionName])

  const handleCvFile = (file) => {
    if (!file) return
    setCvFile(file)
    const reader = new FileReader()
    reader.onload = e => setCvText(e.target.result)
    reader.readAsText(file)
  }

  const techSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'technical') || []
  const softSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'soft') || []

  // Solo requiere nombre + transcripción (notas son opcionales)
  const canGenerate = candidateName.trim().length > 0 && transcript.trim().length > 50

  const handleGenerate = async () => {
    if (!candidateName.trim()) return setError('Ingresá el nombre del candidato')
    if (!transcript.trim() || transcript.trim().length < 50) return setError('Pegá la transcripción de la entrevista (mínimo 50 caracteres)')
    setLoading(true); setError(null); setResults(null); setSaved(false)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcript.trim(),
          interviewerNotes: interviewerNotes.trim() || null,
          candidateName: candidateName.trim(),
          linkedinUrl: linkedinUrl.trim() || null,
          cvText: cvText.trim() || null,
          clientName: clientName.trim() || null,
          positionName: positionName.trim() || null,
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
    setTimeout(() => setCopied(null), 2200)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>

      {/* ── CANDIDATO ── */}
      <section>
        <SectionHeader label="Candidato" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <Label required>Nombre completo</Label>
            <input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Nombre del candidato" style={inputStyle} />
          </div>
          <div>
            <Label>LinkedIn</Label>
            <input value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/usuario" style={inputStyle} />
          </div>
        </div>
        <div>
          <Label>CV (opcional)</Label>
          <div
            onClick={() => fileRef.current.click()}
            style={{ border: `1.5px dashed ${cvFile ? '#86efac' : '#EBEBEB'}`, borderRadius: '10px', padding: '14px 18px', cursor: 'pointer', background: cvFile ? '#f0fdf4' : 'white', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}
          >
            <span style={{ fontSize: '20px' }}>{cvFile ? '📄' : '📎'}</span>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: cvFile ? '#16a34a' : '#555', fontWeight: cvFile ? 600 : 400 }}>
                {cvFile ? cvFile.name : 'Subir CV del candidato'}
              </p>
              {!cvFile && <p style={{ margin: 0, fontSize: '11px', color: '#aaa', fontFamily: FONT_MONO }}>PDF · DOCX · TXT</p>}
            </div>
            {cvFile && (
              <button onClick={e => { e.stopPropagation(); setCvFile(null); setCvText('') }}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '14px' }}>✕</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => handleCvFile(e.target.files[0])} />
        </div>
      </section>

      {/* ── CLIENTE / POSICIÓN ── */}
      <section>
        <SectionHeader label="Cliente y posición" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label>Cliente</Label>
            <select value={clientName} onChange={e => setClientName(e.target.value)} style={selectStyle}>
              <option value="">— Seleccioná cliente —</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Posición</Label>
            <select
              value={positionId}
              onChange={e => {
                const sel = positions.find(p => p.id === e.target.value)
                setPositionId(e.target.value)
                setPositionName(sel?.scorecard_name || '')
              }}
              disabled={!clientName || positions.length === 0}
              style={{ ...selectStyle, opacity: (!clientName || positions.length === 0) ? 0.5 : 1 }}
            >
              <option value="">
                {!clientName ? '— Primero elegí cliente —' : positions.length === 0 ? '— Sin posiciones cargadas —' : '— Seleccioná posición —'}
              </option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.scorecard_name}</option>)}
            </select>
          </div>
        </div>

        {clientName && (
          <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '10px', background: scorecardLoading ? '#f9f9f9' : (scorecard ? (isDefaultScorecard ? '#fff7ed' : '#f0fdf4') : '#fafafa'), border: `1px solid ${scorecardLoading ? '#e5e7eb' : (scorecard ? (isDefaultScorecard ? '#fde68a' : '#86efac') : '#e5e7eb')}` }}>
            {scorecardLoading ? (
              <span style={{ fontSize: '12px', color: '#aaa', fontFamily: FONT_MONO }}>Buscando scorecard...</span>
            ) : scorecard ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{scorecard.scorecard_name}</span>
                {isDefaultScorecard && <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d97706', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', fontFamily: FONT_MONO }}>Default</span>}
                <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>🔧 {techSkills.length} técnicos · 💬 {softSkills.length} blandos</span>
              </div>
            ) : (
              <span style={{ fontSize: '12px', color: '#888' }}>Sin scorecard para este cliente — evaluación genérica</span>
            )}
          </div>
        )}
      </section>

      {/* ── NOTAS DEL ENTREVISTADOR (opcionales) ── */}
      <section>
        <SectionHeader label="Notas del entrevistador" />
        <textarea
          value={interviewerNotes}
          onChange={e => setInterviewerNotes(e.target.value)}
          placeholder="Opcional — impresiones, señales, contexto extra que no quedó en la transcripción..."
          style={{ ...textareaStyle, minHeight: '120px' }}
        />
      </section>

      {/* ── TRANSCRIPCIÓN ── */}
      <section>
        <SectionHeader label="Transcripción de la entrevista" />
        <textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Pegá aquí la transcripción completa de la entrevista..."
          style={textareaStyle}
        />
        <p style={{ fontSize: '11px', color: '#aaa', marginTop: '6px', fontFamily: FONT_MONO }}>
          {transcript.length > 0 ? `${transcript.length.toLocaleString()} caracteres` : 'Mínimo recomendado: 2.000 caracteres'}
        </p>
      </section>

      {/* ── SKILLS PREVIEW ── */}
      {scorecard && (techSkills.length > 0 || softSkills.length > 0) && (
        <section>
          <SectionHeader label="Skills a evaluar" />
          <div style={{ display: 'grid', gridTemplateColumns: techSkills.length > 0 && softSkills.length > 0 ? '1fr 1fr' : '1fr', gap: '16px' }}>
            {techSkills.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, margin: '0 0 10px', fontFamily: FONT_MONO }}>Técnicos</p>
                {techSkills.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8f8f8', fontSize: '12px' }}>
                    <span style={{ color: '#333' }}>{s.name}</span>
                    <span style={{ color: '#aaa', fontFamily: FONT_MONO }}>×{s.weight}%</span>
                  </div>
                ))}
              </div>
            )}
            {softSkills.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4A90D9', margin: '0 0 10px', fontFamily: FONT_MONO }}>Blandos</p>
                {softSkills.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8f8f8', fontSize: '12px' }}>
                    <span style={{ color: '#333' }}>{s.name}</span>
                    <span style={{ color: '#aaa', fontFamily: FONT_MONO }}>×{s.weight}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── BOTÓN GENERAR ── */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={handleGenerate}
          disabled={loading || !canGenerate}
          style={{ padding: '16px 48px', border: 'none', background: (!canGenerate || loading) ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)`, color: 'white', borderRadius: '12px', cursor: (!canGenerate || loading) ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 800, letterSpacing: '0.02em', boxShadow: (!canGenerate || loading) ? 'none' : '0 4px 20px rgba(224,92,0,0.35)', transition: 'all 0.2s' }}
        >
          {loading ? 'Generando...' : scorecard ? `Generar informe + scorecard ${positionName || clientName}` : 'Generar informe de entrevista'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', color: '#dc2626', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── RESULTADOS ── */}
      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {saved && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#16a34a', fontSize: '13px' }}>
              ✓ Guardado en Supabase
            </div>
          )}

          {(results.technicalScore !== undefined || results.softScore !== undefined) && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <SectionHeader label="Scores" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
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

          {results.screeningReport && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <SectionHeader label="Informe de Screening" />
                <CopyBtn text={results.screeningReport} id="screening" copied={copied} onCopy={copy} />
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>{results.screeningReport}</div>
            </div>
          )}

          {results.scorecardReport && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <SectionHeader label="Evaluación por Scorecard" />
                <CopyBtn text={results.scorecardReport} id="scorecard" copied={copied} onCopy={copy} />
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>{results.scorecardReport}</div>
            </div>
          )}

          {results.culturalFitReport && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <SectionHeader label="Cultural Fit" />
                <CopyBtn text={results.culturalFitReport} id="cultural" copied={copied} onCopy={copy} />
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>{results.culturalFitReport}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
