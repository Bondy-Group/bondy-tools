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
const textareaStyle = { ...inputStyle, resize: 'vertical', lineHeight: '1.6' }

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
      {copied === id ? '\u2713 Copiado' : 'Copiar'}
    </button>
  )
}

export default function InterviewTab() {
  const [candidateName, setCandidateName] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [cvFile, setCvFile] = useState(null)
  const [cvText, setCvText] = useState('')
  const fileRef = useRef()

  const [clients, setClients] = useState([])
  const [clientName, setClientName] = useState('')
  const [positions, setPositions] = useState([])
  const [positionId, setPositionId] = useState('')
  const [positionName, setPositionName] = useState('')

  const [interviewerNotes, setInterviewerNotes] = useState('')
  const [transcript, setTranscript] = useState('')
  const [originalTranscript, setOriginalTranscript] = useState(null)
  const [optimizing, setOptimizing] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState(null)

  const [scorecard, setScorecard] = useState(null)
  const [scorecardLoading, setScorecardLoading] = useState(false)
  const [isDefaultScorecard, setIsDefaultScorecard] = useState(false)

  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(null)

  useEffect(() => {
    fetch('/api/scorecards?clients=true')
      .then(r => r.json())
      .then(d => setClients(d.clients || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setPositions([]); setPositionId(''); setPositionName(''); setScorecard(null)
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

  const handleTranscriptChange = (val) => {
    setTranscript(val)
    if (optimizeResult) { setOptimizeResult(null); setOriginalTranscript(null) }
  }

  const handleOptimize = async () => {
    if (!transcript.trim() || transcript.length < 200) return
    setOptimizing(true)
    setError(null)
    try {
      const res = await fetch('/api/optimize-transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, positionName: positionName || null, clientName: clientName || null })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error optimizando')
      if (data.alreadyShort) {
        setOptimizeResult({ alreadyShort: true })
        return
      }
      setOriginalTranscript(transcript)
      setTranscript(data.optimized)
      setOptimizeResult({ savings: data.savings, originalLength: data.originalLength, optimizedLength: data.optimizedLength })
    } catch (e) {
      setError('Error al limpiar: ' + e.message)
    } finally {
      setOptimizing(false)
    }
  }

  const handleRestoreTranscript = () => {
    if (originalTranscript) {
      setTranscript(originalTranscript)
      setOriginalTranscript(null)
      setOptimizeResult(null)
    }
  }

  const handleCvFile = (file) => {
    if (!file) return
    setCvFile(file)
    const reader = new FileReader()
    reader.onload = e => setCvText(e.target.result)
    reader.readAsText(file)
  }

  const techSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'technical') || []
  const softSkills = scorecard?.scorecard_data?.skills?.filter(s => s.skill_type === 'soft') || []
  const canGenerate = candidateName.trim().length > 0 && transcript.trim().length > 50
  const showOptimizeBtn = transcript.length > 1500 && !optimizeResult

  const handleGenerate = async () => {
    if (!candidateName.trim()) return setError('Ingres\u00e1 el nombre del candidato')
    if (!transcript.trim() || transcript.trim().length < 50) return setError('Peg\u00e1 la transcripci\u00f3n de la entrevista')
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

  const charCount = transcript.length
  const charColor = charCount > 4000 ? '#ef4444' : charCount > 2500 ? '#f59e0b' : '#aaa'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .optimize-btn:hover:not(:disabled) { background: ${BONDY_ORANGE} !important; color: white !important; }
        .input-field:focus { border-color: ${BONDY_ORANGE} !important; }
      `}</style>

      <section>
        <SectionHeader label="Candidato" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <Label required>Nombre completo</Label>
            <input className="input-field" value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Nombre del candidato" style={inputStyle} />
          </div>
          <div>
            <Label>LinkedIn</Label>
            <input className="input-field" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} placeholder="linkedin.com/in/usuario" style={inputStyle} />
          </div>
        </div>
        <div>
          <Label>CV (opcional)</Label>
          <div onClick={() => fileRef.current.click()} style={{ border: `1.5px dashed ${cvFile ? '#86efac' : '#EBEBEB'}`, borderRadius: '10px', padding: '14px 18px', cursor: 'pointer', background: cvFile ? '#f0fdf4' : 'white', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.2s' }}>
            <span style={{ fontSize: '20px' }}>{cvFile ? '\ud83d\udcc4' : '\ud83d\udcce'}</span>
            <div>
              <p style={{ margin: 0, fontSize: '13px', color: cvFile ? '#16a34a' : '#555', fontWeight: cvFile ? 600 : 400 }}>{cvFile ? cvFile.name : 'Subir CV del candidato'}</p>
              {!cvFile && <p style={{ margin: 0, fontSize: '11px', color: '#aaa', fontFamily: FONT_MONO }}>PDF \u00b7 DOCX \u00b7 TXT</p>}
            </div>
            {cvFile && <button onClick={e => { e.stopPropagation(); setCvFile(null); setCvText('') }} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '14px' }}>\u2715</button>}
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }} onChange={e => handleCvFile(e.target.files[0])} />
        </div>
      </section>

      <section>
        <SectionHeader label="Cliente y posici\u00f3n" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <Label>Cliente</Label>
            <select value={clientName} onChange={e => setClientName(e.target.value)} style={selectStyle}>
              <option value="">\u2014 Selecci\u00f3n\u00e1 cliente \u2014</option>
              {clients.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Posici\u00f3n</Label>
            <select value={positionId} onChange={e => { const sel = positions.find(p => p.id === e.target.value); setPositionId(e.target.value); setPositionName(sel?.scorecard_name || '') }} disabled={!clientName || positions.length === 0} style={{ ...selectStyle, opacity: (!clientName || positions.length === 0) ? 0.5 : 1 }}>
              <option value="">{!clientName ? '\u2014 Primero eleg\u00ed cliente \u2014' : positions.length === 0 ? '\u2014 Sin posiciones cargadas \u2014' : '\u2014 Selecci\u00f3n\u00e1 posici\u00f3n \u2014'}</option>
              {positions.map(p => <option key={p.id} value={p.id}>{p.scorecard_name}</option>)}
            </select>
          </div>
        </div>
        {clientName && (
          <div style={{ marginTop: '12px', padding: '12px 16px', borderRadius: '10px', background: scorecardLoading ? '#f9f9f9' : (scorecard ? (isDefaultScorecard ? '#fff7ed' : '#f0fdf4') : '#fafafa'), border: `1px solid ${scorecardLoading ? '#e5e7eb' : (scorecard ? (isDefaultScorecard ? '#fde68a' : '#86efac') : '#e5e7eb')}` }}>
            {scorecardLoading
              ? <span style={{ fontSize: '12px', color: '#aaa', fontFamily: FONT_MONO }}>Buscando scorecard...</span>
              : scorecard
                ? <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#111' }}>{scorecard.scorecard_name}</span>
                    {isDefaultScorecard && <span style={{ fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#d97706', background: '#fef9c3', padding: '2px 6px', borderRadius: '4px', fontFamily: FONT_MONO }}>Default</span>}
                    <span style={{ fontSize: '11px', color: '#888', marginLeft: 'auto' }}>\ud83d\udd27 {techSkills.length} t\u00e9cnicos \u00b7 \ud83d\udcac {softSkills.length} blandos</span>
                  </div>
                : <span style={{ fontSize: '12px', color: '#888' }}>Sin scorecard para este cliente</span>}
          </div>
        )}
      </section>

      <section>
        <SectionHeader label="Notas del entrevistador" />
        <textarea className="input-field" value={interviewerNotes} onChange={e => setInterviewerNotes(e.target.value)} placeholder="Opcional \u2014 impresiones, se\u00f1ales, contexto extra que no qued\u00f3 en la transcripci\u00f3n..." style={{ ...textareaStyle, minHeight: '100px' }} />
      </section>

      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ display: 'block', width: '16px', height: '1px', background: BONDY_ORANGE }} />
            <span style={{ fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: BONDY_ORANGE, fontFamily: FONT_MONO }}>
              Transcripci\u00f3n <span style={{ color: '#ef4444' }}>*</span>
            </span>
          </div>
          {showOptimizeBtn && (
            <button
              className="optimize-btn"
              onClick={handleOptimize}
              disabled={optimizing}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 16px',
                border: `1.5px solid ${BONDY_ORANGE}`,
                background: 'white', color: BONDY_ORANGE,
                borderRadius: '8px', cursor: optimizing ? 'wait' : 'pointer',
                fontSize: '12px', fontWeight: 700, fontFamily: FONT_MONO,
                letterSpacing: '0.03em', transition: 'all 0.18s',
                opacity: optimizing ? 0.7 : 1,
              }}>
              {optimizing
                ? <><span style={{ display: 'inline-block', width: '11px', height: '11px', border: `2px solid ${BONDY_ORANGE}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> Limpiando...</>
                : <><span>\u2702\ufe0f</span> Limpiar transcript</>}
            </button>
          )}
        </div>

        {optimizeResult && (
          <div style={{
            marginBottom: '12px', padding: '12px 16px', borderRadius: '10px',
            animation: 'fadeIn 0.25s ease',
            background: optimizeResult.alreadyShort ? '#f0f9ff' : '#f0fdf4',
            border: `1px solid ${optimizeResult.alreadyShort ? '#bae6fd' : '#86efac'}`,
            display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '16px' }}>{optimizeResult.alreadyShort ? '\u2713' : '\u2705'}</span>
            <div style={{ flex: 1 }}>
              {optimizeResult.alreadyShort
                ? <span style={{ fontSize: '13px', color: '#0369a1' }}>El transcript ya es corto \u2014 no necesita limpieza</span>
                : <>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#16a34a' }}>
                      Transcript limpiado \u2014 {optimizeResult.savings}% m\u00e1s corto
                    </span>
                    <span style={{ fontSize: '11px', color: '#666', marginLeft: '10px', fontFamily: FONT_MONO }}>
                      {(optimizeResult.originalLength / 1000).toFixed(1)}k \u2192 {(optimizeResult.optimizedLength / 1000).toFixed(1)}k chars
                    </span>
                  </>}
            </div>
            {!optimizeResult.alreadyShort && originalTranscript && (
              <button onClick={handleRestoreTranscript}
                style={{ fontSize: '11px', color: '#666', background: 'none', border: '1px solid #d1d5db', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', fontFamily: FONT_MONO, whiteSpace: 'nowrap' }}>
                \u21a9 Restaurar original
              </button>
            )}
          </div>
        )}

        <textarea
          className="input-field"
          value={transcript}
          onChange={e => handleTranscriptChange(e.target.value)}
          placeholder="Peg\u00e1 aqu\u00ed la transcripci\u00f3n completa de la entrevista..."
          style={{ ...textareaStyle, minHeight: charCount > 2000 ? '260px' : '180px' }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
          <span style={{ fontSize: '11px', color: charColor, fontFamily: FONT_MONO, transition: 'color 0.2s' }}>
            {charCount > 0 ? `${charCount.toLocaleString()} caracteres` : 'M\u00ednimo recomendado: 1.000 caracteres'}
          </span>
          {charCount > 2500 && !optimizeResult && (
            <span style={{ fontSize: '11px', color: '#f59e0b', fontFamily: FONT_MONO }}>
              \u26a0\ufe0f Transcript largo \u2014 recomendamos limpiar antes de generar
            </span>
          )}
        </div>
      </section>

      {scorecard && (techSkills.length > 0 || softSkills.length > 0) && (
        <section>
          <SectionHeader label="Skills a evaluar" />
          <div style={{ display: 'grid', gridTemplateColumns: techSkills.length > 0 && softSkills.length > 0 ? '1fr 1fr' : '1fr', gap: '16px' }}>
            {techSkills.length > 0 && (
              <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: '10px', padding: '16px' }}>
                <p style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: BONDY_ORANGE, margin: '0 0 10px', fontFamily: FONT_MONO }}>T\u00e9cnicos</p>
                {techSkills.map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f8f8f8', fontSize: '12px' }}>
                    <span style={{ color: '#333' }}>{s.name}</span>
                    <span style={{ color: '#aaa', fontFamily: FONT_MONO }}>{s.weight}%</span>
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
                    <span style={{ color: '#aaa', fontFamily: FONT_MONO }}>{s.weight}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button onClick={handleGenerate} disabled={loading || !canGenerate}
          style={{ padding: '16px 48px', border: 'none', background: (!canGenerate || loading) ? '#ccc' : `linear-gradient(135deg, ${BONDY_ORANGE}, #F47C20)`, color: 'white', borderRadius: '12px', cursor: (!canGenerate || loading) ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 800, letterSpacing: '0.02em', boxShadow: (!canGenerate || loading) ? 'none' : '0 4px 20px rgba(224,92,0,0.35)', transition: 'all 0.2s' }}>
          {loading ? 'Generando...' : scorecard ? `Generar informe + scorecard ${positionName || clientName}` : 'Generar informe de entrevista'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '16px', color: '#dc2626', fontSize: '14px' }}>\u26a0\ufe0f {error}</div>
      )}

      {results && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', animation: 'fadeIn 0.3s ease' }}>
          {saved && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px 16px', color: '#16a34a', fontSize: '13px' }}>\u2713 Guardado en Supabase</div>}

          {(results.technicalScore != null || results.softScore != null || results.overallScore != null) && (
            <div style={{ background: 'white', border: '1.5px solid #e5e7eb', borderRadius: '14px', padding: '24px' }}>
              <SectionHeader label="Scores" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                {results.technicalScore != null && <div style={{ textAlign: 'center', padding: '16px', background: '#FFF3EC', borderRadius: '10px' }}><div style={{ fontSize: '28px', fontWeight: 900, color: BONDY_ORANGE, fontFamily: FONT_MONO }}>{Math.round(results.technicalScore)}</div><div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>T\u00e9cnico</div></div>}
                {results.softScore != null && <div style={{ textAlign: 'center', padding: '16px', background: '#EFF6FF', borderRadius: '10px' }}><div style={{ fontSize: '28px', fontWeight: 900, color: '#4A90D9', fontFamily: FONT_MONO }}>{Math.round(results.softScore)}</div><div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Blando</div></div>}
                {results.overallScore != null && <div style={{ textAlign: 'center', padding: '16px', background: '#F9F8F6', borderRadius: '10px', border: '1.5px solid #e5e7eb' }}><div style={{ fontSize: '28px', fontWeight: 900, color: '#111', fontFamily: FONT_MONO }}>{Math.round(results.overallScore)}</div><div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' }}>Overall</div></div>}
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
                <SectionHeader label="Evaluaci\u00f3n por Scorecard" />
                <CopyBtn text={results.scorecardReport} id="scorecard" copied={copied} onCopy={copy} />
              </div>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap' }}>{results.scorecardReport}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
