'use client'

import { useState, useRef, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { calculateWeightedScore, getScoreLabel } from '@/lib/scorecards'

const O = '#E05C00', OL = '#F47C20'

const inputBase = { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', outline: 'none', fontFamily: 'inherit', backgroundColor: 'white', color: '#111', transition: 'border-color 0.15s', boxSizing: 'border-box' }
const inputStyle = { ...inputBase, resize: 'vertical' }
const noResizeInput = { ...inputBase, resize: 'none' }

const Label = ({ children }) => <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#555', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: 'DM Mono, monospace' }}>{children}</label>
const Muted = ({ children }) => <span style={{ color: '#bbb', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{children}</span>

function Stars({ value }) {
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[1,2,3,4,5].map(s => (
        <div key={s} style={{ width: '22px', height: '22px', borderRadius: '5px', border: '1.5px solid', fontSize: '10px', fontWeight: 700, borderColor: value >= s ? O : '#e5e7eb', background: value >= s ? O : 'white', color: value >= s ? 'white' : '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace' }}>{s}</div>
      ))}
    </div>
  )
}

function ScorecardResult({ scorecardData }) {
  const { scorecard, skillRatings, generalNotes } = scorecardData
  const ratings = Object.fromEntries(scorecard.skills.map(s => [s.id, skillRatings?.[s.id]?.rating || 0]))
  const score = calculateWeightedScore(ratings, scorecard)
  const label = getScoreLabel(score)
  return (
    <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFAFA' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: O, fontFamily: 'DM Mono, monospace', marginBottom: '4px' }}>Scorecard · Evaluado por IA</div>
          <div style={{ fontSize: '17px', fontWeight: 700, color: '#111', fontFamily: 'Playfair Display, serif' }}>{scorecard.name}</div>
        </div>
        {score !== null && (
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '36px', fontWeight: 800, color: label.color, fontFamily: 'DM Mono, monospace', lineHeight: 1 }}>{score}</div>
            <div style={{ fontSize: '10px', color: '#999', marginTop: '2px' }}>/100 ponderado</div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: label.color, marginTop: '4px' }}>{label.emoji} {label.label}</div>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>{skill.name}</span>
                    <span style={{ fontSize: '10px', color: '#bbb', fontFamily: 'DM Mono, monospace' }}>peso {skill.weight}%</span>
                    {skill.type === 'soft' && <span style={{ fontSize: '9px', color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: '4px', fontFamily: 'DM Mono, monospace' }}>soft</span>}
                  </div>
                  {aiData?.analysis && <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0', lineHeight: 1.6, fontStyle: 'italic' }}>"{aiData.analysis}"</p>}
                  {aiData?.evidence && <p style={{ fontSize: '11px', color: '#777', margin: '6px 0 0', padding: '5px 10px', background: '#f5f5f5', borderRadius: '6px', borderLeft: '3px solid ' + O }}>{aiData.evidence}</p>}
                </div>
                <Stars value={rating} />
              </div>
              {rating > 0 && <div style={{ height: '3px', background: '#e5e7eb', borderRadius: '2px', marginTop: '8px' }}><div style={{ height: '100%', background: O, borderRadius: '2px', width: pct + '%' }} /></div>}
            </div>
          )
        })}
      </div>
      {generalNotes && <div style={{ padding: '14px 20px', borderTop: '1px solid #f0f0f0' }}><div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'DM Mono, monospace', marginBottom: '6px' }}>Notas generales</div><p style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: 1.7 }}>{generalNotes}</p></div>}
    </div>
  )
}

export default function InterviewTab() {
  const { data: session } = useSession()
  const [form, setForm] = useState({ transcript: '', summary: '', jd: '', linkedin: '', candidateName: '', candidateEmail: '', language: 'es' })
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: typeof e === 'string' ? e : e.target.value }))
  const [clients, setClients] = useState([])
  const [clientsLoading, setClientsLoading] = useState(true)
  const [selectedClientId, setSelectedClientId] = useState('')
  const [selectedClientName, setSelectedClientName] = useState('')
  const [techScorecards, setTechScorecards] = useState([])
  const [cultScorecards, setCultScorecards] = useState([])
  const [selectedTechId, setSelectedTechId] = useState('')
  const [selectedCultId, setSelectedCultId] = useState('')
  const [scorecardsLoading, setScorecardsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState(null)
  const [techResult, setTechResult] = useState(null)
  const [cultResult, setCultResult] = useState(null)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)
  const reportRef = useRef(null)
  const recruiterName = session?.user?.name || ''

  useEffect(() => {
    fetch('/api/clients').then(r => r.json()).then(d => setClients(d.clients || [])).finally(() => setClientsLoading(false))
    loadScorecards('DEFAULT_BONDY')
  }, [])

  const loadScorecards = async (clientName) => {
    setScorecardsLoading(true)
    setSelectedTechId(''); setSelectedCultId('')
    try {
      const res = await fetch('/api/scorecards?client=' + encodeURIComponent(clientName))
      const data = await res.json()
      const all = data.scorecards || []
      let tech = all.filter(s => s.scorecard_type === 'technical')
      let cult = all.filter(s => s.scorecard_type === 'cultural')
      if (tech.length === 0 && clientName !== 'DEFAULT_BONDY') {
        const d = await fetch('/api/scorecards?client=DEFAULT_BONDY&type=technical').then(r => r.json())
        tech = d.scorecards || []
      }
      if (cult.length === 0 && clientName !== 'DEFAULT_BONDY') {
        const d = await fetch('/api/scorecards?client=DEFAULT_BONDY&type=cultural').then(r => r.json())
        cult = d.scorecards || []
      }
      setTechScorecards(tech); setCultScorecards(cult)
      if (tech.length > 0) setSelectedTechId(tech[0].id)
      if (cult.length > 0) setSelectedCultId(cult[0].id)
    } catch(e) { console.error(e) }
    finally { setScorecardsLoading(false) }
  }

  const handleClientChange = (clientId) => {
    setSelectedClientId(clientId)
    const client = clients.find(c => c.id === clientId)
    setSelectedClientName(client?.name || '')
    setTechResult(null); setCultResult(null); setReport(null)
    loadScorecards(client?.name || 'DEFAULT_BONDY')
  }

  const generate = async () => {
    if (!form.transcript.trim() || !form.candidateName.trim()) return
    setLoading(true); setError(null); setReport(null); setTechResult(null); setCultResult(null)
    try {
      const res = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, clientName: selectedClientName || null, recruiterName: recruiterName || null, type: 'screening', techScorecardId: selectedTechId || null, cultScorecardId: selectedCultId || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data.result)
      if (data.techScorecard) setTechResult(data.techScorecard)
      if (data.cultScorecard) setCultResult(data.cultScorecard)
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const copyReport = async () => {
    try { await navigator.clipboard.writeText(report) } catch { reportRef.current?.select(); document.execCommand('copy') }
    setCopied(true); setTimeout(() => setCopied(false), 2500)
  }

  const copyScorecardText = (result) => {
    const sc = result.scorecard
    const ratings = Object.fromEntries(sc.skills.map(s => [s.id, result.skillRatings?.[s.id]?.rating || 0]))
    const score = calculateWeightedScore(ratings, sc)
    const label = getScoreLabel(score)
    let text = 'SCORECARD: ' + sc.name + '\nSCORE: ' + score + '/100 — ' + label?.label + '\n\n'
    sc.skills.forEach(sk => { const d = result.skillRatings?.[sk.id]; text += sk.name + ': ' + (d?.rating || 0) + '/5\n'; if (d?.analysis) text += '  → ' + d.analysis + '\n' })
    navigator.clipboard.writeText(text).catch(() => {})
  }

  const techScorecard = techScorecards.find(s => s.id === selectedTechId)
  const cultScorecard = cultScorecards.find(s => s.id === selectedCultId)
  const selectStyle = { ...noResizeInput, cursor: 'pointer', appearance: 'none', fontSize: '13px', backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' strokeWidth='1.5' fill='none' strokeLinecap='round'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '36px' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: '#111', margin: 0 }}>Nueva entrevista</h2>

        {recruiterName && (
          <div style={{ background: '#FFF8F5', border: '1px solid #ffd4b8', borderRadius: '10px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {session?.user?.image && <img src={session.user.image} alt="" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
            <span style={{ fontSize: '13px', color: '#666' }}>Recruiter: <strong style={{ color: '#111' }}>{recruiterName}</strong></span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div><Label>Nombre del candidato *</Label><input value={form.candidateName} onChange={set('candidateName')} placeholder="Juan García" style={noResizeInput} /></div>
          <div><Label>Email <Muted>(opcional)</Muted></Label><input type="email" value={form.candidateEmail} onChange={set('candidateEmail')} placeholder="juan@email.com" style={noResizeInput} /></div>
        </div>

        <div>
          <Label>Cliente</Label>
          <select value={selectedClientId} onChange={e => handleClientChange(e.target.value)} style={selectStyle}>
            <option value="">— Sin cliente asignado —</option>
            {clientsLoading ? <option disabled>Cargando...</option> : clients.filter(c => c.name !== 'DEFAULT_BONDY').map(c => <option key={c.id} value={c.id}>{c.display_name || c.name}</option>)}
          </select>
        </div>

        {!scorecardsLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <Label>Scorecard técnica</Label>
              <select value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)} style={selectStyle}>
                <option value="">— Sin scorecard —</option>
                {techScorecards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Cultural Fit</Label>
              <select value={selectedCultId} onChange={e => setSelectedCultId(e.target.value)} style={selectStyle}>
                <option value="">— Sin cultural fit —</option>
                {cultScorecards.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
        {scorecardsLoading && <div style={{ fontSize: '12px', color: '#bbb', fontFamily: 'DM Mono, monospace' }}>⏳ Cargando scorecards...</div>}

        {(techScorecard || cultScorecard) && (
          <div style={{ background: '#FFF8F5', border: '1px solid #ffd4b8', borderRadius: '10px', padding: '10px 16px', fontSize: '12px', color: '#666' }}>
            📊 {techScorecard && <span>🔧 <strong style={{ color: '#111' }}>{techScorecard.name}</strong> ({techScorecard.skills?.length} skills) </span>}
            {cultScorecard && <span>💬 <strong style={{ color: '#111' }}>{cultScorecard.name}</strong> ({cultScorecard.skills?.length} dim.)</span>}
          </div>
        )}

        <div>
          <Label>Idioma del reporte</Label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['es', 'en'].map(lang => (
              <button key={lang} onClick={() => set('language')(lang)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, border: '1.5px solid', cursor: 'pointer',
                  background: form.language === lang ? O : 'white', color: form.language === lang ? 'white' : '#6b7280', borderColor: form.language === lang ? O : '#e5e7eb' }}>
                {lang === 'es' ? '🇦🇷 Español' : '🇺🇸 English'}
              </button>
            ))}
          </div>
        </div>

        <div><Label>LinkedIn <Muted>(opcional)</Muted></Label><input value={form.linkedin} onChange={set('linkedin')} placeholder="linkedin.com/in/..." style={noResizeInput} /></div>
        <div><Label>Job Description <Muted>(opcional)</Muted></Label><textarea value={form.jd} onChange={set('jd')} placeholder="Pegá la JD de la posición..." rows={4} style={inputStyle} /></div>
        <div><Label>Resumen de Gemini <Muted>(opcional pero recomendado)</Muted></Label><textarea value={form.summary} onChange={set('summary')} placeholder="Pegá el resumen generado por Gemini..." rows={3} style={inputStyle} /></div>
        <div>
          <Label>Transcripción completa *</Label>
          <textarea value={form.transcript} onChange={set('transcript')} placeholder="Pegá la transcripción completa de la entrevista..." rows={10} style={inputStyle} />
          {form.transcript && <p style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>{form.transcript.split(/\s+/).length} palabras</p>}
        </div>

        {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px 16px', color: '#dc2626', fontSize: '13px' }}>⚠️ {error}</div>}

        <button onClick={generate} disabled={!form.transcript.trim() || !form.candidateName.trim() || loading}
          style={{ width: '100%', padding: '14px', borderRadius: '10px', fontWeight: 700, color: 'white', fontSize: '14px', border: 'none',
            cursor: (!form.transcript.trim() || !form.candidateName.trim() || loading) ? 'not-allowed' : 'pointer',
            background: loading || !form.transcript.trim() || !form.candidateName.trim() ? '#ccc' : 'linear-gradient(135deg, ' + O + ', ' + OL + ')' }}>
          {loading ? <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}><span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />Generando...</span>
            : '✨ Generar Screening Report' + (selectedTechId || selectedCultId ? ' + Scorecard' : '')}
        </button>
      </div>

      {report && (
        <div style={{ background: 'white', borderRadius: '14px', border: '1.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: O, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px' }}>✓</div>
              <div><div style={{ fontSize: '13px', fontWeight: 700, color: '#111' }}>Screening Report — {form.candidateName}</div><div style={{ fontSize: '11px', color: '#bbb' }}>Guardado en Supabase</div></div>
            </div>
            <button onClick={copyReport} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, color: 'white', border: 'none', cursor: 'pointer', background: copied ? '#22c55e' : 'linear-gradient(135deg, ' + O + ', ' + OL + ')' }}>
              {copied ? '✓ Copiado!' : '📋 Copiar reporte'}
            </button>
          </div>
          <textarea ref={reportRef} value={report} readOnly style={{ position: 'absolute', left: '-9999px' }} />
          <div style={{ padding: '24px' }}><pre style={{ fontSize: '13px', color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>{report}</pre></div>
        </div>
      )}

      {techResult && report && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'DM Mono, monospace' }}>🔧 Scorecard técnica</span>
            <button onClick={() => copyScorecardText(techResult)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: O, border: '1.5px solid ' + O, background: 'white', cursor: 'pointer' }}>📋 Copiar</button>
          </div>
          <ScorecardResult scorecardData={techResult} />
        </div>
      )}

      {cultResult && report && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#aaa', fontFamily: 'DM Mono, monospace' }}>💬 Cultural Fit</span>
            <button onClick={() => copyScorecardText(cultResult)} style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, color: '#1d4ed8', border: '1.5px solid #1d4ed8', background: 'white', cursor: 'pointer' }}>📋 Copiar</button>
          </div>
          <ScorecardResult scorecardData={cultResult} />
        </div>
      )}

      <style>{'@keyframes spin { to { transform: rotate(360deg); } } textarea:focus, input:focus, select:focus { border-color: ' + O + ' !important; box-shadow: 0 0 0 3px rgba(224,92,0,0.08); }'}</style>
    </div>
  )
}
